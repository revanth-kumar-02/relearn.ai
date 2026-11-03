/**
 * ─────────────────────────────────────────────────────────────────
 *  Centralized AI Runtime Configuration & Environment Separation
 * ─────────────────────────────────────────────────────────────────
 *
 *  Single source of truth for AI inference runtime settings.
 *  Supports Groq (primary production), OpenRouter (free fallback),
 *  Hugging Face, Ollama, and vLLM.
 *
 *  CLIENT-SAFE vs SERVER-ONLY Configuration:
 *  - Client-safe / Proxy defaults:
 *      - AI_PRIMARY_PROVIDER: 'groq' (default) | 'openrouter' | 'ollama' | 'vllm' | 'mock'
 *      - AI_FALLBACK_PROVIDER: 'openrouter' (default)
 *      - AI_FALLBACK_ENABLED: 'true' (default)
 *      - AI_GROQ_MODEL_DEFAULT: 'openai/gpt-oss-120b'
 *      - AI_OPENROUTER_FALLBACK_MODEL: 'openai/gpt-oss-120b:free'
 *      - AI_TIMEOUT_MS: default 60000
 *
 *  - Server-only (used exclusively in Netlify serverless functions and server processes, NEVER exposed to client):
 *      - GROQ_API_KEY: Authorization key for Groq API.
 *      - OPENROUTER_API_KEY: Authorization key for OpenRouter API.
 *      - VLLM_API_KEY: Authorization token for private vLLM clusters.
 *      - HF_API_KEY: Authorization token for Hugging Face.
 *      - SUPABASE_URL / SUPABASE_ANON_KEY: JWT verification credentials.
 */

export type AIProviderType = 'groq' | 'openrouter' | 'ollama' | 'vllm' | 'mock';

export interface AIRuntimeConfig {
  /** Active primary provider type */
  readonly provider: AIProviderType;

  /** Active fallback provider type (defaults to 'openrouter') */
  readonly fallbackProvider: AIProviderType;

  /** Whether cross-provider fallback is enabled */
  readonly fallbackEnabled: boolean;

  /** Base URL for Groq endpoint */
  readonly groqBaseUrl: string;

  /** Base URL for OpenRouter endpoint */
  readonly openRouterBaseUrl: string;

  /** Base URL for Ollama runtime endpoint */
  readonly ollamaBaseUrl: string;

  /** Base URL for vLLM runtime endpoint */
  readonly vllmBaseUrl: string;

  /** Default network timeout in milliseconds */
  readonly defaultTimeoutMs: number;

  /** Configured default Groq model identifier */
  readonly groqDefaultModel: string;

  /** Configured fallback OpenRouter model identifier */
  readonly openRouterFallbackModel: string;

  /** Runtime model identifier mappings */
  readonly modelMappings: {
    readonly qwenModelName: string;
    readonly gemmaModelName: string;
    readonly groqDefaultModel: string;
    readonly openRouterFallbackModel: string;
  };
}

/**
 * Safely retrieve environment variable across Vite (client) and Node.js (test/server).
 * Strictly guards sensitive API keys from client exposure (never checks VITE_ for Groq or OpenRouter).
 */
export function getEnvVar(key: string, defaultValue = ''): string {
  // Security guard: never load Groq or OpenRouter API keys from Vite browser env
  if (key === 'GROQ_API_KEY' || key === 'OPENROUTER_API_KEY') {
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[key];
      if (val !== undefined && val !== null && val !== '') {
        return String(val);
      }
    }
    return defaultValue;
  }

  // Vite browser environment
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteKey = key.startsWith('VITE_') ? key : `VITE_${key}`;
    const value = import.meta.env[viteKey] ?? import.meta.env[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }

  // Node.js / Netlify runtime environment
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key] ?? process.env[`VITE_${key}`];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }

  return defaultValue;
}

/**
 * Default runtime configuration object.
 */
export function getAIRuntimeConfig(): AIRuntimeConfig {
  const primaryRaw = getEnvVar('AI_PRIMARY_PROVIDER', getEnvVar('AI_PROVIDER', 'groq')).toLowerCase();
  const provider: AIProviderType =
    primaryRaw === 'groq'
      ? 'groq'
      : primaryRaw === 'openrouter'
      ? 'openrouter'
      : primaryRaw === 'vllm'
      ? 'vllm'
      : primaryRaw === 'mock'
      ? 'mock'
      : primaryRaw === 'ollama'
      ? 'ollama'
      : 'groq';

  const fallbackRaw = getEnvVar('AI_FALLBACK_PROVIDER', 'openrouter').toLowerCase();
  const fallbackProvider: AIProviderType =
    fallbackRaw === 'openrouter'
      ? 'openrouter'
      : fallbackRaw === 'groq'
      ? 'groq'
      : fallbackRaw === 'mock'
      ? 'mock'
      : 'openrouter';

  const fallbackEnabled = getEnvVar('AI_FALLBACK_ENABLED', 'true').toLowerCase() !== 'false';

  const isBrowser = typeof window !== 'undefined';

  // In browser development, default to relative proxy paths (/api/...) to avoid CORS issues.
  // In Node/server/test environments, direct URLs can be used.
  const defaultGroqUrl = isBrowser ? '/api/groq' : 'https://api.groq.com/openai/v1';
  const defaultOpenRouterUrl = isBrowser ? '/api/openrouter' : 'https://openrouter.ai/api/v1';
  const defaultOllamaUrl = isBrowser ? '/api/ai/ollama' : 'http://localhost:11434';
  const defaultVllmUrl = isBrowser ? '/api/ai/vllm/v1' : 'http://localhost:8000/v1';

  const groqBaseUrl = getEnvVar('AI_GROQ_BASE_URL', defaultGroqUrl).replace(/\/+$/, '');
  const openRouterBaseUrl = getEnvVar('AI_OPENROUTER_BASE_URL', defaultOpenRouterUrl).replace(/\/+$/, '');
  const ollamaBaseUrl = getEnvVar('AI_OLLAMA_BASE_URL', defaultOllamaUrl).replace(/\/+$/, '');
  const vllmBaseUrl = getEnvVar('AI_VLLM_BASE_URL', defaultVllmUrl).replace(/\/+$/, '');

  const timeoutMs = parseInt(getEnvVar('AI_TIMEOUT_MS', '60000'), 10) || 60000;

  // Exact model names
  const groqDefaultModel = getEnvVar('AI_GROQ_MODEL_DEFAULT', 'openai/gpt-oss-120b');
  const openRouterFallbackModel = getEnvVar('AI_OPENROUTER_FALLBACK_MODEL', 'openai/gpt-oss-120b:free');

  const qwenModelName = getEnvVar('AI_MODEL_QWEN', 'Qwen3-Next-80B-A3B-Instruct');
  const gemmaModelName = getEnvVar('AI_MODEL_GEMMA', 'Gemma-3-27B');

  return {
    provider,
    fallbackProvider,
    fallbackEnabled,
    groqBaseUrl,
    openRouterBaseUrl,
    ollamaBaseUrl,
    vllmBaseUrl,
    defaultTimeoutMs: timeoutMs,
    groqDefaultModel,
    openRouterFallbackModel,
    modelMappings: {
      qwenModelName,
      gemmaModelName,
      groqDefaultModel,
      openRouterFallbackModel,
    },
  };
}

/**
 * Resolves the underlying runtime model name for a given ModelDefinition or ID.
 */
export function resolveRuntimeModelName(
  modelId: string,
  config: AIRuntimeConfig = getAIRuntimeConfig(),
  providerOverride?: AIProviderType
): string {
  const activeProvider = providerOverride || config.provider;
  const lower = modelId.toLowerCase();

  if (activeProvider === 'groq') {
    if (lower.includes('gpt-oss') || lower === 'openai/gpt-oss-120b') {
      return config.groqDefaultModel;
    }
    return modelId;
  }

  if (activeProvider === 'openrouter') {
    if (lower.includes('gpt-oss') || lower.includes('120b')) {
      const fallback = config.openRouterFallbackModel;
      return fallback.endsWith(':free') ? fallback : `${fallback}:free`;
    }
    // Always enforce :free suffix for OpenRouter fallback
    return modelId.endsWith(':free') ? modelId : `${modelId}:free`;
  }

  if (lower.includes('qwen')) {
    return config.modelMappings.qwenModelName;
  }
  if (lower.includes('gemma')) {
    return config.modelMappings.gemmaModelName;
  }
  return modelId;
}
