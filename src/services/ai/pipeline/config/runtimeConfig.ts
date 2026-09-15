/**
 * ─────────────────────────────────────────────────────────────────
 *  Centralized AI Runtime Configuration & Environment Separation
 * ─────────────────────────────────────────────────────────────────
 *
 *  Single source of truth for AI inference runtime settings.
 *  Supports Ollama (local development) and vLLM (server/production).
 *
 *  CLIENT-SAFE vs SERVER-ONLY Configuration:
 *  - Client-safe (prefixed with VITE_ or public defaults):
 *      - VITE_AI_PROVIDER: 'ollama' | 'vllm' | 'mock'
 *      - VITE_AI_OLLAMA_BASE_URL: e.g. '/api/ai/ollama' (proxied) or 'http://localhost:11434' (local)
 *      - VITE_AI_VLLM_BASE_URL: e.g. '/api/ai/vllm/v1' (proxied) or 'http://localhost:8000/v1' (local)
 *      - VITE_AI_TIMEOUT_MS: default 60000
 *      - VITE_AI_MODEL_QWEN: exact model tag in runtime (default: 'Qwen3-Next-80B-A3B-Instruct')
 *      - VITE_AI_MODEL_GEMMA: exact model tag in runtime (default: 'Gemma-3-27B')
 *
 *  - Server-only (used exclusively in Netlify serverless functions, NEVER exposed to client):
 *      - VLLM_API_KEY: Authorization token for private vLLM clusters.
 *      - AI_OLLAMA_SERVER_URL: Upstream private cluster endpoint for Ollama.
 *      - AI_VLLM_SERVER_URL: Upstream private cluster endpoint for vLLM.
 *      - SUPABASE_URL / SUPABASE_ANON_KEY: JWT verification credentials.
 */

export type AIProviderType = 'ollama' | 'vllm' | 'huggingface' | 'mock';

export interface AIRuntimeConfig {
  /** Active provider type ('ollama' | 'vllm' | 'huggingface' | 'mock') */
  readonly provider: AIProviderType;

  /** Base URL for Ollama runtime endpoint */
  readonly ollamaBaseUrl: string;

  /** Base URL for vLLM runtime endpoint */
  readonly vllmBaseUrl: string;

  /** Base URL for Hugging Face runtime endpoint */
  readonly hfBaseUrl: string;

  /** Default network timeout in milliseconds */
  readonly defaultTimeoutMs: number;

  /** Runtime model identifier mappings */
  readonly modelMappings: {
    readonly qwenModelName: string;
    readonly gemmaModelName: string;
    readonly hfQwenModelName: string;
    readonly hfGemmaModelName: string;
  };
}

/**
 * Safely retrieve environment variable across Vite (client) and Node.js (test/server).
 * Client bundles only ever receive public VITE_* variables.
 */
function getEnvVar(key: string, defaultValue = ''): string {
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
  const providerRaw = getEnvVar('AI_PROVIDER', 'ollama').toLowerCase();
  const provider: AIProviderType =
    providerRaw === 'vllm'
      ? 'vllm'
      : providerRaw === 'huggingface' || providerRaw === 'hf'
      ? 'huggingface'
      : providerRaw === 'mock'
      ? 'mock'
      : 'ollama';

  const isBrowser = typeof window !== 'undefined';

  // In browser development, default to relative proxy paths (/api/ai/...) to avoid CORS issues.
  // In Node/server/test environments, direct URLs can be used.
  const defaultOllamaUrl = isBrowser ? '/api/ai/ollama' : 'http://localhost:11434';
  const defaultVllmUrl = isBrowser ? '/api/ai/vllm/v1' : 'http://localhost:8000/v1';
  const defaultHfUrl = isBrowser ? '/api/ai/hf' : 'https://router.huggingface.co/v1';

  const ollamaBaseUrl = getEnvVar('AI_OLLAMA_BASE_URL', defaultOllamaUrl).replace(/\/+$/, '');
  const vllmBaseUrl = getEnvVar('AI_VLLM_BASE_URL', defaultVllmUrl).replace(/\/+$/, '');
  const hfBaseUrl = getEnvVar('AI_HF_BASE_URL', getEnvVar('HF_BASE_URL', defaultHfUrl)).replace(/\/+$/, '');

  const timeoutMs = parseInt(getEnvVar('AI_TIMEOUT_MS', '60000'), 10) || 60000;

  // Exact model names for local inference runtimes
  const qwenModelName = getEnvVar('AI_MODEL_QWEN', 'Qwen3-Next-80B-A3B-Instruct');
  const gemmaModelName = getEnvVar('AI_MODEL_GEMMA', 'Gemma-3-27B');

  // Exact model names for Hugging Face hosted inference
  const hfQwenModelName = getEnvVar('HF_MODEL_QWEN', 'Qwen/Qwen3-Next-80B-A3B-Instruct');
  const hfGemmaModelName = getEnvVar('HF_MODEL_GEMMA', 'google/gemma-3-27b-it');

  return {
    provider,
    ollamaBaseUrl,
    vllmBaseUrl,
    hfBaseUrl,
    defaultTimeoutMs: timeoutMs,
    modelMappings: {
      qwenModelName,
      gemmaModelName,
      hfQwenModelName,
      hfGemmaModelName,
    },
  };
}

/**
 * Resolves the underlying runtime model name for a given ModelDefinition or ID.
 * When runtime is Hugging Face, uses HF repository identifiers.
 * Otherwise uses local/vLLM runtime identifiers.
 */
export function resolveRuntimeModelName(
  modelId: string,
  config: AIRuntimeConfig = getAIRuntimeConfig(),
  providerOverride?: AIProviderType
): string {
  const activeProvider = providerOverride || config.provider;
  const lower = modelId.toLowerCase();

  if (activeProvider === 'huggingface') {
    if (lower.includes('qwen')) {
      return config.modelMappings.hfQwenModelName;
    }
    if (lower.includes('gemma')) {
      return config.modelMappings.hfGemmaModelName;
    }
    return modelId;
  }

  if (lower.includes('qwen')) {
    return config.modelMappings.qwenModelName;
  }
  if (lower.includes('gemma')) {
    return config.modelMappings.gemmaModelName;
  }
  return modelId;
}
