/**
 * ─────────────────────────────────────────────────────────────────
 *  Centralized AI Runtime Configuration & Environment Separation
 * ─────────────────────────────────────────────────────────────────
 *
 *  Single source of truth for AI inference runtime settings.
 *  Production provider: Groq exclusively.
 *
 *  CLIENT-SAFE vs SERVER-ONLY Configuration:
 *  - Client-safe / Proxy defaults:
 *      - AI_PRIMARY_PROVIDER: 'groq'
 *      - AI_GROQ_MODEL_DEFAULT: 'openai/gpt-oss-120b'
 *      - AI_TIMEOUT_MS: default 60000
 *
 *  - Server-only (used exclusively in Netlify serverless functions and server processes, NEVER exposed to client):
 *      - GROQ_API_KEY: Authorization key for Groq API.
 *      - SUPABASE_URL / SUPABASE_ANON_KEY: JWT verification credentials.
 */

import { type ModelDefinition } from '../types';

export type AIProviderType = 'groq' | 'mock';

export interface AIRuntimeConfig {
  /** Active provider type (Groq) */
  readonly provider: AIProviderType;

  /** Base URL for Groq endpoint */
  readonly groqBaseUrl: string;

  /** Default network timeout in milliseconds */
  readonly defaultTimeoutMs: number;

  /** Configured default Groq model identifier */
  readonly groqDefaultModel: string;

  /** Runtime model identifier mappings */
  readonly modelMappings: {
    readonly qwenModelName: string;
    readonly gemmaModelName: string;
    readonly groqDefaultModel: string;
  };
}

/**
 * Safely retrieve environment variable across Vite (client) and Node.js (test/server).
 * Strictly guards sensitive API keys from client exposure (never checks VITE_ for Groq).
 */
export function getEnvVar(key: string, defaultValue = ''): string {
  // Security guard: never load Groq API keys from Vite browser env
  if (key === 'GROQ_API_KEY') {
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
  const isBrowser = typeof window !== 'undefined';
  const defaultGroqUrl = isBrowser ? '/api/groq' : 'https://api.groq.com/openai/v1';
  const groqBaseUrl = getEnvVar('AI_GROQ_BASE_URL', defaultGroqUrl).replace(/\/+$/, '');
  const timeoutMs = parseInt(getEnvVar('AI_TIMEOUT_MS', '60000'), 10) || 60000;
  const groqDefaultModel = getEnvVar('AI_GROQ_MODEL_DEFAULT', 'openai/gpt-oss-120b');
  const qwenModelName = getEnvVar('AI_MODEL_QWEN', 'openai/gpt-oss-120b');
  const gemmaModelName = getEnvVar('AI_MODEL_GEMMA', 'openai/gpt-oss-20b');

  return {
    provider: 'groq',
    groqBaseUrl,
    defaultTimeoutMs: timeoutMs,
    groqDefaultModel,
    modelMappings: {
      qwenModelName,
      gemmaModelName,
      groqDefaultModel,
    },
  };
}

/**
 * Resolves the wire model identifier for the Groq provider.
 */
export function resolveRuntimeModelName(
  modelId: string | ModelDefinition,
  config: AIRuntimeConfig = getAIRuntimeConfig(),
  _providerOverride?: AIProviderType
): string {
  const modelStr = typeof modelId === 'string' ? modelId : modelId.id;
  if (modelStr.toLowerCase().includes('gpt-oss') || modelStr === 'openai/gpt-oss-120b') {
    return config.groqDefaultModel;
  }
  return modelStr;
}
