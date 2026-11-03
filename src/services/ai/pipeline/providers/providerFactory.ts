/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Provider Factory & Auto-Initialization
 * ─────────────────────────────────────────────────────────────────
 *
 *  Instantiates and configures AIInferenceProvider instances.
 *  Auto-initializes the default provider (Groq primary) based
 *  on centralized runtime configuration.
 */

import { type AIInferenceProvider } from '../types';
import {
  getAIRuntimeConfig,
  type AIProviderType,
  type AIRuntimeConfig,
} from '../config/runtimeConfig';
import { registerProvider, hasActiveProvider, getActiveProvider, setActiveProvider } from '../provider';
import { GroqProvider, type GroqProviderOptions } from './groqProvider';
import { OpenRouterProvider, type OpenRouterProviderOptions } from './openRouterProvider';
import { OllamaProvider, type OllamaProviderOptions } from './ollamaProvider';
import { VLLMProvider, type VLLMProviderOptions } from './vllmProvider';

export interface ProviderCreationOptions {
  readonly groqOptions?: GroqProviderOptions;
  readonly openRouterOptions?: OpenRouterProviderOptions;
  readonly ollamaOptions?: OllamaProviderOptions;
  readonly vllmOptions?: VLLMProviderOptions;
}

/**
 * Creates an inference provider instance for the specified type.
 */
export function createInferenceProvider(
  type: AIProviderType,
  options?: ProviderCreationOptions
): AIInferenceProvider {
  switch (type) {
    case 'groq':
      return new GroqProvider(options?.groqOptions);
    case 'openrouter':
      return new OpenRouterProvider(options?.openRouterOptions);
    case 'ollama':
      return new OllamaProvider(options?.ollamaOptions);
    case 'vllm':
      return new VLLMProvider(options?.vllmOptions);
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
      throw new Error(`Unsupported AI provider type: '${String(type)}'`);
  }
}

/**
 * Automatically initializes and registers the default provider based on runtime environment configuration.
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
