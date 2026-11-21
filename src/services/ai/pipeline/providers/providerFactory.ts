/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Provider Factory & Auto-Initialization
 * ─────────────────────────────────────────────────────────────────
 *
 *  Instantiates and configures AIInferenceProvider instances.
 *  Uses Groq exclusively.
 */

import { type AIInferenceProvider } from '../types';
import {
  type AIProviderType,
} from '../config/runtimeConfig';
import { GroqProvider, type GroqProviderOptions } from './groqProvider';

export interface ProviderCreationOptions {
  readonly groqOptions?: GroqProviderOptions;
}

import { registerProvider, hasActiveProvider, getActiveProvider } from '../provider';
import { getAIRuntimeConfig, type AIRuntimeConfig } from '../config/runtimeConfig';

/**
 * Creates an inference provider instance for the specified type.
 */
export function createInferenceProvider(
  type: AIProviderType = 'groq',
  options?: ProviderCreationOptions
): AIInferenceProvider {
  switch (type) {
    case 'groq':
      return new GroqProvider(options?.groqOptions);
    case 'mock':
      // Return a lightweight mock provider for test/benchmark simulation
      return {
        name: 'mock',
        async generate(req, modelDef, config) {
          return {
            text: `[Mock output for ${req.task} using ${modelDef.id} (temp: ${config.temperature})]`,
            model: modelDef.id,
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            finishReason: 'stop',
            latencyMs: 15,
            metadata: {
              runtime: 'mock',
              runtimeModel: modelDef.id,
              provider: 'mock',
            },
          };
        },
      };
    default:
      return new GroqProvider(options?.groqOptions);
  }
}

/**
 * Automatically initializes and registers the default provider (Groq).
 */
export function initializeDefaultProvider(
  config: AIRuntimeConfig = getAIRuntimeConfig()
): AIInferenceProvider {
  const provider = createInferenceProvider(config.provider);
  registerProvider(provider, { makeActive: true });
  return provider;
}

/**
 * Ensures at least one active provider is configured in the pipeline, initializing
 * the default runtime provider if none has been registered yet.
 */
export function ensureActiveProvider(): AIInferenceProvider {
  if (!hasActiveProvider()) {
    return initializeDefaultProvider();
  }
  return getActiveProvider();
}

// Auto-initialize default provider on module load
try {
  initializeDefaultProvider();
} catch {
  // Silent fallback in test/mocking environments
}
