/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Model Pipeline - Public Interface
 * ─────────────────────────────────────────────────────────────────
 *
 *  Groq-powered AI inference pipeline for Relearn.ai.
 *  Exports types, model registry, task configuration, router,
 *  Groq provider adapter, and benchmarking harness.
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

// Runtime Inference Providers (Groq Exclusive)
export * from './providers/groqProvider';
export * from './providers/providerFactory';

// Validation
export * from './validation';

// AI Router (generateAI, generateStreamAI)
export * from './router';

// Benchmarking Runner & Evaluation
export * from './benchmark';
