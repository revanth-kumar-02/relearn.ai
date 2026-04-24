/**
 * ─────────────────────────────────────────────────────────────────
 *  Centralized AI Model Configuration
 * ─────────────────────────────────────────────────────────────────
 *
 *  Single source of truth for all model IDs used across the app.
 *  When Google releases new models or you need to A/B test,
 *  change them here — every service picks up the update automatically.
 */

export const AI_MODELS = {
  /** Primary stable model for high-speed plan generation */
  PRIMARY: import.meta.env.VITE_LLM_MODEL_PRIMARY || 'gemini-2.0-flash',

  /** Ultra-high efficiency model for lightweight tasks */
  FAST_LITE: 'gemini-2.0-flash',

  /** Flagship reasoning model for chat and complex tutoring */
  CHAT: import.meta.env.VITE_LLM_MODEL_CHAT || 'gemini-2.0-pro-exp-02-05',

  /** Premium image generation model */
  IMAGE: 'imagen-3.0-generate-001',

  /** Ordered fallback chain for peak demand */
  FALLBACK_CHAIN: [
    'gemini-2.0-flash',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-pro-preview',
    'gemini-2.0-pro-exp-02-05',
    'gemini-2.0-flash-lite-preview-02-05',
  ],
} as const;

export const isNetworkError = (error: any): boolean => {
  const message = (error?.message || error?.toString() || '').toLowerCase();
  return message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('err_name_not_resolved') ||
    message.includes('err_connection_reset') ||
    message.includes('err_internet_disconnected') ||
    message.includes('timeout') ||
    message.includes('abort');
};

export const isRetryableError = (error: any): boolean => {
  if (isNetworkError(error)) return true;
  const message = (error?.message || error?.toString() || '').toUpperCase();
  const status = error?.status || error?.code;

  // 404 means the specific model is missing, so we should retry the next model in the fallback chain.
  return status === 503 || status === 429 || status === 404 ||
    message.includes('UNAVAILABLE') ||
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('OVERLOADED') ||
    message.includes('NOT_FOUND') ||
    message.includes('HIGH DEMAND');
};

/** Maximum retries before a sync item is marked as permanently failed */
export const SYNC_MAX_RETRIES = 5;

/** Exponential backoff base in ms for network retries */
export const RETRY_BACKOFF_BASE_MS = 2000;
