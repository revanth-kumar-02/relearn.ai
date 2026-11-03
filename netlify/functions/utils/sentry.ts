/**
 * ─────────────────────────────────────────────────────────────────
 *  Server-Side Sentry Integration for Netlify Serverless Functions
 * ─────────────────────────────────────────────────────────────────
 *
 *  Provides centralized, privacy-safe error monitoring for Netlify Functions
 *  using `@sentry/node`.
 *
 *  Requirements:
 *  - Initializes once per container runtime when SENTRY_DSN is configured.
 *  - Cleanly no-ops when SENTRY_DSN is absent.
 *  - Strips API keys, Supabase service keys, Bearer tokens, and sensitive headers.
 *  - Filters out expected 400 validation, 401/403 auth, and 404 errors.
 *  - Captures unexpected server errors (5xx) and uncaught exceptions.
 *  - Flushes events before lambda execution terminates.
 */

import * as Sentry from '@sentry/node';
import type { Context } from '@netlify/functions';

let isServerInitialized = false;

const SENSITIVE_PATTERNS = [
  /\b(eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)\b/g, // JWT
  /\b(gsk_[A-Za-z0-9_]{20,})\b/g, // Groq Key
  /\b(sk-or-[A-Za-z0-9_]{20,})\b/g, // OpenRouter Key
  /\b(hf_[A-Za-z0-9_]{20,})\b/g, // Hugging Face Key
  /\b(sbp_[A-Za-z0-9_]{20,})\b/g, // Supabase Key
  /\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/g, // Email address
];

export function sanitizeServerString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export function sanitizeServerData(data: unknown): unknown {
  if (!data) return data;
  if (typeof data === 'string') return sanitizeServerString(data);
  if (typeof data === 'number' || typeof data === 'boolean') return data;
  if (Array.isArray(data)) return data.map(sanitizeServerData);
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
        lowerKey.includes('body')
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeServerData(value);
      }
    }
    return result;
  }
  return '[UNSERIALIZABLE]';
}

/**
 * Initializes server-side Sentry.
 */
export function initServerSentry(): boolean {
  if (isServerInitialized) {
    return true;
  }

  const dsn = (process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    return false;
  }

  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production';
  const release = process.env.SENTRY_RELEASE || 'relearn-ai@1.0.0';

  try {
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: environment === 'production' ? 0.05 : 0,
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.message) {
          event.message = sanitizeServerString(event.message);
        }

        if (event.exception?.values) {
          for (const exc of event.exception.values) {
            if (exc.value) {
              exc.value = sanitizeServerString(exc.value);
            }
          }
        }

        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          event.request.headers = sanitizeServerData(event.request.headers) as Record<string, string>;
        }

        if (event.extra) {
          event.extra = sanitizeServerData(event.extra) as Record<string, unknown>;
        }

        return event;
      },
    } as any);

    isServerInitialized = true;
    return true;
  } catch (err) {
    console.warn('[ServerSentry] Init failed:', err);
    return false;
  }
}

/**
 * Flushes events before serverless function execution terminates.
 */
export async function flushServerEvents(timeoutMs = 2000): Promise<boolean> {
  if (!isServerInitialized) return true;
  try {
    return await Sentry.flush(timeoutMs);
  } catch {
    return false;
  }
}

/**
 * Captures an exception with server context.
 */
export async function captureServerException(
  error: unknown,
  context?: {
    functionName?: string;
    statusCode?: number;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): Promise<string | undefined> {
  if (!isServerInitialized) return undefined;

  // Do not report expected client errors (400, 401, 403, 404)
  if (context?.statusCode && context.statusCode < 500) {
    return undefined;
  }

  const eventId = Sentry.captureException(error, {
    tags: {
      serverless: 'netlify_functions',
      functionName: context?.functionName || 'unknown',
      ...(context?.statusCode ? { statusCode: String(context.statusCode) } : {}),
      ...(context?.tags || {}),
    },
    extra: context?.extra ? (sanitizeServerData(context.extra) as Record<string, unknown>) : undefined,
  });

  await flushServerEvents(1000);
  return eventId;
}

/**
 * Resets initialized state (for testing).
 */
export function resetServerSentryForTesting(): void {
  isServerInitialized = false;
}
