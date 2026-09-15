/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Inference Provider Registry & Abstraction
 * ─────────────────────────────────────────────────────────────────
 *
 *  Provides a strict decoupling layer between the AI Router and
 *  underlying LLM runtimes (e.g. future vLLM, Ollama, Hugging Face, etc.).
 *
 *  The router and feature services depend purely on this interface.
 *  No vendor-specific packages or SDKs are referenced here.
 */

import {
  type AIInferenceProvider,
  AIProviderNotConfiguredError,
} from './types';

// -----------------------------------------------------------------
// Internal Provider State
// -----------------------------------------------------------------

const PROVIDERS = new Map<string, AIInferenceProvider>();
let activeProviderName: string | null = null;

// -----------------------------------------------------------------
// Provider Registration & Lifecycle
// -----------------------------------------------------------------

/**
 * Register an inference provider implementation in the pipeline.
 * If no active provider is currently set, the registered provider becomes active.
 */
export function registerProvider(
  provider: AIInferenceProvider,
  options?: { makeActive?: boolean }
): void {
  if (!provider || !provider.name) {
    throw new Error('Invalid provider: Provider must define a non-empty name');
  }

  PROVIDERS.set(provider.name, provider);

  if (options?.makeActive || activeProviderName === null) {
    activeProviderName = provider.name;
  }
}

/**
 * Retrieves a registered provider by name, or undefined if not registered.
 */
export function getProvider(name?: string): AIInferenceProvider | undefined {
  if (name) {
    return PROVIDERS.get(name);
  }
  if (activeProviderName) {
    return PROVIDERS.get(activeProviderName);
  }
  return undefined;
}

/**
 * Retrieves the currently active provider, throwing an error if none is configured.
 */
export function getActiveProvider(): AIInferenceProvider {
  const provider = getProvider();
  if (!provider) {
    throw new AIProviderNotConfiguredError(
      'No AIInferenceProvider is registered in the pipeline. Register an adapter via registerProvider().'
    );
  }
  return provider;
}

/**
 * Sets the active provider by name or instance.
 */
export function setActiveProvider(nameOrProvider: string | AIInferenceProvider): void {
  if (typeof nameOrProvider === 'string') {
    if (!PROVIDERS.has(nameOrProvider)) {
      throw new Error(`Provider '${nameOrProvider}' is not registered.`);
    }
    activeProviderName = nameOrProvider;
  } else {
    registerProvider(nameOrProvider, { makeActive: true });
  }
}

/**
 * Checks whether an active inference provider is currently registered.
 */
export function hasActiveProvider(): boolean {
  return activeProviderName !== null && PROVIDERS.has(activeProviderName);
}

/**
 * Clears all registered providers (primarily for unit tests and clean re-initialization).
 */
export function clearProviders(): void {
  PROVIDERS.clear();
  activeProviderName = null;
}
