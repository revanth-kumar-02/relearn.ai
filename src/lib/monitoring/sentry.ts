/**
 * ─────────────────────────────────────────────────────────────────
 *  Frontend Sentry Monitoring & Privacy-Safe Error Reporter
 * ─────────────────────────────────────────────────────────────────
 *
 *  Integrates `@sentry/react` for the Relearn.ai client application.
 *
 *  Privacy & Security Rules:
 *  - sendDefaultPii: false (never send learner PII or session tokens).
 *  - beforeSend: strips API keys, JWT tokens, auth headers, passwords, and sensitive query params.
 *  - beforeBreadcrumb: sanitizes URLs, navigation, and console logs.
 *  - Session Replay is NOT enabled by default.
 *  - DSN check: Cleanly no-ops when VITE_SENTRY_DSN is absent.
 *  - Prevents duplicate initialization.
 */

import * as Sentry from '@sentry/react';

let isInitialized = false;

// Regex patterns for sensitive secrets and tokens
const SENSITIVE_PATTERNS = [
  /\b(eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)\b/g, // JWT
  /\b(gsk_[A-Za-z0-9_]{20,})\b/g, // Groq Key
  /\b(sk-or-[A-Za-z0-9_]{20,})\b/g, // OpenRouter Key
  /\b(sbp_[A-Za-z0-9_]{20,})\b/g, // Supabase Key
  /\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/g, // Email address
];

const SENSITIVE_QUERY_PARAMS = [
  'code',
  'access_token',
  'refresh_token',
  'token',
  'api_key',
  'password',
  'secret',
];

/**
 * Sanitizes strings by redacting known secret formats, tokens, and emails.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

/**
 * Sanitizes URLs by stripping sensitive query parameters and fragments.
 */
export function sanitizeUrl(urlStr: string): string {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const url = new URL(urlStr, window.location.origin);
    for (const param of SENSITIVE_QUERY_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, '[REDACTED]');
      }
    }
    // Also sanitize hash if it contains tokens
    if (url.hash && (url.hash.includes('token') || url.hash.includes('code'))) {
      url.hash = '#[REDACTED_AUTH_FRAGMENT]';
    }
    return url.toString();
  } catch {
    return sanitizeString(urlStr);
  }
}

/**
 * Recursively sanitizes data objects/records before sending to Sentry.
 */
export function sanitizeData(data: unknown): unknown {
  if (!data) return data;
  if (typeof data === 'string') return sanitizeString(data);
  if (typeof data === 'number' || typeof data === 'boolean') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key') ||
        lowerKey.includes('prompt') ||
        lowerKey.includes('cookie')
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeData(value);
      }
    }
    return result;
  }
  return '[UNSERIALIZABLE]';
}

export interface SentryInitOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
}

/**
 * Initializes Sentry for the React frontend application.
 * Safe to call multiple times; only initializes once.
 */
export function initSentry(options?: SentryInitOptions): boolean {
  if (isInitialized) {
    return true;
  }

  const dsn =
    options?.dsn ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SENTRY_DSN
      : undefined);

  if (!dsn || !dsn.trim()) {
    // Sentry remains cleanly disabled in development or when no DSN is provided
    return false;
  }

  const environment =
    options?.environment ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'production'
      : 'production');

  const release =
    options?.release ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SENTRY_RELEASE || 'relearn-ai@1.0.0'
      : 'relearn-ai@1.0.0');

  const tracesSampleRate =
    options?.tracesSampleRate !== undefined
      ? options.tracesSampleRate
      : environment === 'production'
      ? 0.05
      : 0;

  try {
    Sentry.init({
      dsn: dsn.trim(),
      environment,
      release,
      tracesSampleRate,
      sendDefaultPii: false,
      beforeSend(event, hint) {
        // 1. Drop routine client aborts and cancellations
        const originalError = hint?.originalException;
        if (
          originalError instanceof Error &&
          (originalError.name === 'AbortError' ||
            originalError.name === 'AIAbortError' ||
            originalError.message.includes('aborted'))
        ) {
          return null;
        }

        // 2. Drop offline network dropouts
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return null;
        }

        // 3. Drop handled chunk load errors
        if (
          originalError instanceof Error &&
          (originalError.message.includes('Failed to fetch dynamically imported module') ||
            originalError.message.includes('ChunkLoadError'))
        ) {
          return null;
        }

        // 4. Sanitize event messages and exceptions
        if (event.message) {
          event.message = sanitizeString(event.message);
        }

        if (event.exception?.values) {
          for (const exc of event.exception.values) {
            if (exc.value) {
              exc.value = sanitizeString(exc.value);
            }
          }
        }

        // 5. Sanitize request URLs and headers
        if (event.request) {
          if (event.request.url) {
            event.request.url = sanitizeUrl(event.request.url);
          }
          if (event.request.headers) {
            event.request.headers = sanitizeData(event.request.headers) as Record<string, string>;
          }
          // Remove query string entirely if it was parsed
          if (event.request.query_string) {
            event.request.query_string = sanitizeUrl(String(event.request.query_string));
          }
        }

        // 6. Sanitize extra context and tags
        if (event.extra) {
          event.extra = sanitizeData(event.extra) as Record<string, unknown>;
        }

        // 7. Ensure no user PII is attached
        if (event.user) {
          delete event.user.email;
          delete event.user.username;
          delete event.user.ip_address;
        }

        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        // Drop any breadcrumbs containing auth or sensitive requests
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = sanitizeUrl(String(breadcrumb.data.url));
        }
        if (breadcrumb.message) {
          breadcrumb.message = sanitizeString(breadcrumb.message);
        }
        return breadcrumb;
      },
    } as any);

    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('[Sentry] Failed to initialize:', err);
    return false;
  }
}

/**
 * Checks whether Sentry is currently active and initialized.
 */
export function isSentryEnabled(): boolean {
  return isInitialized;
}

/**
 * Captures an exception with optional sanitized tags and extra context.
 */
export function captureException(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
  }
): string | undefined {
  if (!isInitialized) {
    return undefined;
  }

  // Do not report abort or cancellation errors
  if (
    error instanceof Error &&
    (error.name === 'AbortError' ||
      error.name === 'AIAbortError' ||
      error.message.includes('aborted'))
  ) {
    return undefined;
  }

  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra ? (sanitizeData(context.extra) as Record<string, unknown>) : undefined,
    level: context?.level,
  });
}

/**
 * Captures a message with sanitized context.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): string | undefined {
  if (!isInitialized) {
    return undefined;
  }

  return Sentry.captureMessage(sanitizeString(message), {
    level,
    tags: context?.tags,
    extra: context?.extra ? (sanitizeData(context.extra) as Record<string, unknown>) : undefined,
  });
}

/**
 * Records a lightweight breadcrumb for contextual debugging.
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    message: sanitizeString(breadcrumb.message),
    category: breadcrumb.category || 'app',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data ? (sanitizeData(breadcrumb.data) as Record<string, unknown>) : undefined,
  });
}

/**
 * Sets low-cardinality tags for filtering.
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized) return;
  Sentry.setTag(key, value);
}

/**
 * Resets initialized state (primarily for unit testing).
 */
export function resetSentryForTesting(): void {
  isInitialized = false;
}
