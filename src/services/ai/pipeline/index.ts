/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Model Pipeline - Public Interface
 * ─────────────────────────────────────────────────────────────────
 *
 *  Provider-independent AI foundation for Relearn.ai.
 *  Exports types, model registry, task configuration, router,
 *  runtime adapters (Ollama & vLLM), provider abstraction,
 *  and benchmarking harness.
 */

// Types & Errors
export * from './types';

// Centralized Model Registry
export * from './modelRegistry';

// Centralized Task Configuration & Mapping
export * from './taskConfig';

// Centralized Runtime Environment Configuration
export * from './config/runtimeConfig';

// Provider Interface & Registry
export * from './provider';

// Runtime Inference Providers
export * from './providers/ollamaProvider';
export * from './providers/vllmProvider';
export * from './providers/huggingFaceProvider';
export * from './providers/providerFactory';

// Validation
export * from './validation';

// AI Router (generateAI, generateStreamAI)
export * from './router';

// Benchmarking Runner & Evaluation
export * from './benchmark';
