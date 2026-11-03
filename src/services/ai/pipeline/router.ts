/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Router & Centralized Fallback Coordinator
 * ─────────────────────────────────────────────────────────────────
 *
 *  Main entry point for generating AI completions in Relearn.ai.
 *
 *  Workflow:
 *  1. Validates incoming AIRequest.
 *  2. Resolves model assignment from Task Configuration (or override).
 *  3. Validates model capability and task compatibility.
 *  4. Merges task/model configuration defaults with request options.
 *  5. Primary Attempt: Dispatches to Groq (or active primary provider).
 *  6. Controlled Fallback: On eligible retryable failure (429, 402, 408, 5xx,
 *     connection failure), falls back once to OpenRouter free model.
 *  7. Non-retryable errors (401, 403, 404, 400, validation) fail fast.
 *  8. Streaming Fallback: Fallback allowed only BEFORE first token is emitted.
 *  9. Normalizes response with accurate provider & model metadata.
 */

import {
  type AIRequest,
  type AIResponse,
  type AIStreamChunk,
  type ModelConfigDefaults,
  type ModelDefinition,
  type AIInferenceProvider,
  AIValidationError,
  AIRuntimeError,
  AITimeoutError,
  AIAbortError,
  AIConnectionError,
} from './types';
import { getModelForTask, getTaskConfig } from './taskConfig';
import { getModelOrThrow } from './modelRegistry';
import { getActiveProvider, getProvider, registerProvider } from './provider';
import { validateAIRequest, validateTaskModelSupport } from './validation';
import { getAIRuntimeConfig } from './config/runtimeConfig';
import { createInferenceProvider } from './providers/providerFactory';

// -----------------------------------------------------------------
// Retryable Error Classification
// -----------------------------------------------------------------

export interface RetryableClassification {
  readonly isRetryable: boolean;
  readonly reason: string;
  readonly statusCode?: number;
}

/**
 * Determines whether a provider failure qualifies for cross-provider fallback.
 * Strictly distinguishes operational transient failures from permanent configuration/auth errors.
 */
export function isRetryableProviderError(err: unknown): RetryableClassification {
  if (!err) {
    return { isRetryable: false, reason: 'unknown_empty_error' };
  }

  // 1. Validation and intentional cancellation are NEVER retryable
  if (err instanceof AIValidationError) {
    return { isRetryable: false, reason: 'validation_error' };
  }
  if (err instanceof AIAbortError) {
    return { isRetryable: false, reason: 'request_aborted' };
  }

  // 2. Explicit Timeout & Connection errors ARE retryable
  if (err instanceof AITimeoutError) {
    return { isRetryable: true, reason: 'request_timeout', statusCode: 408 };
  }
  if (err instanceof AIConnectionError) {
    return { isRetryable: true, reason: 'connection_error', statusCode: 503 };
  }

  // 3. AIRuntimeError inspection by status code & message
  if (err instanceof AIRuntimeError) {
    const status = err.statusCode;

    // Hard configuration / authorization failures MUST NOT be masked
    if (status === 401) {
      return { isRetryable: false, reason: 'authentication_failure', statusCode: 401 };
    }
    if (status === 403) {
      return { isRetryable: false, reason: 'forbidden_permissions', statusCode: 403 };
    }
    if (status === 404) {
      return { isRetryable: false, reason: 'model_not_found', statusCode: 404 };
    }
    if (status === 400) {
      return { isRetryable: false, reason: 'bad_request_payload', statusCode: 400 };
    }

    // Eligible transient provider errors
    if (status === 402) {
      return { isRetryable: true, reason: 'payment_or_quota_exhausted', statusCode: 402 };
    }
    if (status === 408 || status === 425) {
      return { isRetryable: true, reason: 'request_timeout_or_early', statusCode: status };
    }
    if (status === 429) {
      return { isRetryable: true, reason: 'rate_limit_exceeded', statusCode: 429 };
    }
    if (status && status >= 500 && status <= 504) {
      return { isRetryable: true, reason: 'upstream_server_error', statusCode: status };
    }

    // Inspect error message for transient patterns if status code was omitted
    const msg = err.message.toLowerCase();
    if (msg.includes('429') || msg.includes('rate limit')) {
      return { isRetryable: true, reason: 'rate_limit_exceeded', statusCode: 429 };
    }
    if (msg.includes('402') || msg.includes('quota') || msg.includes('credits') || msg.includes('payment')) {
      return { isRetryable: true, reason: 'payment_or_quota_exhausted', statusCode: 402 };
    }
    if (msg.includes('408') || msg.includes('timeout') || msg.includes('timed out')) {
      return { isRetryable: true, reason: 'request_timeout', statusCode: 408 };
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
      return { isRetryable: true, reason: 'upstream_server_error', statusCode: 503 };
    }
    if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('econnrefused')) {
      return { isRetryable: true, reason: 'connection_error', statusCode: 503 };
    }

    return { isRetryable: false, reason: 'unclassified_runtime_error', statusCode: status };
  }

  // 4. Standard Error object inspection
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return { isRetryable: false, reason: 'request_aborted' };
    }
    const msg = err.message.toLowerCase();
    if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('connection')) {
      return { isRetryable: true, reason: 'connection_error', statusCode: 503 };
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return { isRetryable: true, reason: 'request_timeout', statusCode: 408 };
    }
    if (msg.includes('rate limit') || msg.includes('429')) {
      return { isRetryable: true, reason: 'rate_limit_exceeded', statusCode: 429 };
    }
  }

  return { isRetryable: false, reason: 'unknown_failure' };
}

// -----------------------------------------------------------------
// Safe Structured Observability Logging
// -----------------------------------------------------------------

function safeLog(event: string, payload: Record<string, unknown>): void {
  // Never log keys, headers, prompt bodies, or user data
  const sanitizedPayload = {
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
    // Structured server-safe logging
    console.info(`[AI-ROUTER] ${JSON.stringify(sanitizedPayload)}`);
  }
}

// -----------------------------------------------------------------
// Fallback Provider Resolution
// -----------------------------------------------------------------

function getFallbackProviderInstance(): AIInferenceProvider | undefined {
  const config = getAIRuntimeConfig();
  const fallbackName = config.fallbackProvider;

  let provider = getProvider(fallbackName);
  if (!provider) {
    try {
      provider = createInferenceProvider(fallbackName);
      registerProvider(provider);
    } catch {
      return undefined;
    }
  }
  return provider;
}

// -----------------------------------------------------------------
// Internal Helpers
// -----------------------------------------------------------------

function resolveModelDefinition(request: AIRequest): ModelDefinition {
  if (request.options?.overrideModel) {
    const overrideDef = getModelOrThrow(request.options.overrideModel);
    validateTaskModelSupport(request.task, overrideDef);
    return overrideDef;
  }

  const modelDef = getModelForTask(request.task);
  validateTaskModelSupport(request.task, modelDef);
  return modelDef;
}

function computeEffectiveConfig(
  request: AIRequest,
  modelDef: ModelDefinition
): ModelConfigDefaults {
  const taskConfig = getTaskConfig(request.task);
  const opts = request.options || {};

  return {
    temperature:
      opts.temperature ??
      taskConfig.recommendedTemperature ??
      modelDef.defaultConfig.temperature,
    topP: opts.topP ?? modelDef.defaultConfig.topP,
    topK: opts.topK ?? modelDef.defaultConfig.topK,
    maxTokens: opts.maxTokens ?? modelDef.defaultConfig.maxTokens,
    stopSequences: opts.stopSequences ?? modelDef.defaultConfig.stopSequences,
  };
}

// -----------------------------------------------------------------
// Public Router API
// -----------------------------------------------------------------

/**
 * Primary interface to generate AI content through the pipeline.
 * Routes to Groq primary with automated OpenRouter free fallback on eligible transient errors.
 */
export async function generateAI(request: AIRequest): Promise<AIResponse> {
  // 1. Strict request validation
  validateAIRequest(request);

  // 2. Resolve target model definition & compute configuration
  const modelDef = resolveModelDefinition(request);
  const effectiveConfig = computeEffectiveConfig(request, modelDef);

  // 3. Retrieve runtime configuration & primary provider
  const config = getAIRuntimeConfig();
  const primaryProvider = getActiveProvider();

  const startTime = performance.now();
  let rawResponse: AIResponse | null = null;
  let primaryError: unknown = null;
  let usedProvider = primaryProvider;
  let fallbackOccurred = false;
  let fallbackReason: string | undefined;

  // 4. Primary attempt (Groq)
  try {
    rawResponse = await primaryProvider.generate(request, modelDef, effectiveConfig);
  } catch (err: unknown) {
    primaryError = err;
  }

  // 5. Eligible fallback evaluation
  if (primaryError) {
    const retryable = isRetryableProviderError(primaryError);
    const allowFallback =
      config.fallbackEnabled &&
      request.options?.disableFallback !== true &&
      retryable.isRetryable &&
      primaryProvider.name !== config.fallbackProvider;

    if (!allowFallback) {
      safeLog('ai_request_failed_no_fallback', {
        task: request.task,
        primaryProvider: primaryProvider.name,
        model: modelDef.id,
        retryable: retryable.isRetryable,
        reason: retryable.reason,
        statusCode: retryable.statusCode,
      });

      if (primaryError instanceof AIRuntimeError || (primaryError instanceof Error && primaryError.name.startsWith('AI'))) {
        throw primaryError;
      }
      throw new AIRuntimeError(primaryError instanceof Error ? primaryError.message : String(primaryError));
    }

    // Exactly one fallback attempt
    const fallbackProvider = getFallbackProviderInstance();
    if (!fallbackProvider) {
      if (primaryError instanceof AIRuntimeError || (primaryError instanceof Error && primaryError.name.startsWith('AI'))) {
        throw primaryError;
      }
      throw new AIRuntimeError(primaryError instanceof Error ? primaryError.message : String(primaryError));
    }

    fallbackOccurred = true;
    fallbackReason = retryable.reason;

    safeLog('ai_fallback_triggered', {
      task: request.task,
      primaryProvider: primaryProvider.name,
      fallbackProvider: fallbackProvider.name,
      reason: fallbackReason,
      statusCode: retryable.statusCode,
    });

    try {
      rawResponse = await fallbackProvider.generate(request, modelDef, effectiveConfig);
      usedProvider = fallbackProvider;
    } catch (fallbackErr: unknown) {
      const fallbackCheck = isRetryableProviderError(fallbackErr);
      safeLog('ai_fallback_failed', {
        task: request.task,
        fallbackProvider: fallbackProvider.name,
        reason: fallbackCheck.reason,
        statusCode: fallbackCheck.statusCode,
      });

      if (fallbackErr instanceof AIRuntimeError || (fallbackErr instanceof Error && fallbackErr.name.startsWith('AI'))) {
        throw fallbackErr;
      }
      throw new AIRuntimeError(fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
    }
  }

  if (!rawResponse) {
    throw new AIRuntimeError('No response generated by AI providers', 500);
  }

  const endTime = performance.now();

  // 6. Guarantee normalized response structure with accurate observability metadata
  return {
    text: rawResponse.text ?? '',
    model: rawResponse.model || modelDef.id,
    usage: {
      promptTokens: rawResponse.usage?.promptTokens ?? 0,
      completionTokens: rawResponse.usage?.completionTokens ?? 0,
      totalTokens:
        rawResponse.usage?.totalTokens ??
        (rawResponse.usage?.promptTokens ?? 0) +
          (rawResponse.usage?.completionTokens ?? 0),
    },
    finishReason: rawResponse.finishReason || 'stop',
    latencyMs: rawResponse.latencyMs || Math.round(endTime - startTime),
    timeToFirstTokenMs: rawResponse.timeToFirstTokenMs,
    metadata: {
      ...rawResponse.metadata,
      task: request.task,
      provider: usedProvider.name,
      actualModel: String(rawResponse.metadata?.runtimeModel || rawResponse.model),
      fallbackOccurred,
      fallbackReason,
      primaryProvider: primaryProvider.name,
    },
  };
}

/**
 * Streaming interface for AI completions (for Chatbot and Learning Space).
 * Allows single fallback to OpenRouter ONLY if zero content tokens have been emitted.
 */
export async function* generateStreamAI(
  request: AIRequest
): AsyncIterable<AIStreamChunk> {
  // 1. Strict request validation
  validateAIRequest(request);

  // 2. Resolve target model definition
  const modelDef = resolveModelDefinition(request);

  // 3. Validate streaming capability
  if (!modelDef.capabilities.streaming) {
    throw new AIValidationError(
      `Model '${modelDef.id}' does not support streaming.`
    );
  }

  // 4. Compute effective configuration
  const effectiveConfig = computeEffectiveConfig(request, modelDef);

  // 5. Retrieve runtime configuration & primary provider
  const config = getAIRuntimeConfig();
  const primaryProvider = getActiveProvider();

  if (!primaryProvider.generateStream) {
    throw new AIValidationError(
      `Provider '${primaryProvider.name}' does not implement streaming.`
    );
  }

  let hasEmittedContent = false;
  let primaryError: unknown = null;

  // 6. Attempt streaming from primary provider
  try {
    for await (const chunk of primaryProvider.generateStream(request, modelDef, effectiveConfig)) {
      if (chunk.textDelta && chunk.textDelta.length > 0) {
        hasEmittedContent = true;
      }
      yield chunk;
    }
  } catch (err: unknown) {
    // If content has already been emitted, NEVER restart/append fallback stream
    if (hasEmittedContent) {
      safeLog('ai_stream_interrupted_after_emission', {
        task: request.task,
        provider: primaryProvider.name,
      });
      if (err instanceof AIRuntimeError || (err instanceof Error && err.name.startsWith('AI'))) {
        throw err;
      }
      throw new AIRuntimeError(err instanceof Error ? err.message : String(err));
    }
    primaryError = err;
  }

  // 7. If failed BEFORE emitting any content, attempt fallback if eligible
  if (primaryError && !hasEmittedContent) {
    const retryable = isRetryableProviderError(primaryError);
    const allowFallback =
      config.fallbackEnabled &&
      request.options?.disableFallback !== true &&
      retryable.isRetryable &&
      primaryProvider.name !== config.fallbackProvider;

    if (!allowFallback) {
      if (primaryError instanceof AIRuntimeError || (primaryError instanceof Error && primaryError.name.startsWith('AI'))) {
        throw primaryError;
      }
      throw new AIRuntimeError(primaryError instanceof Error ? primaryError.message : String(primaryError));
    }

    const fallbackProvider = getFallbackProviderInstance();
    if (!fallbackProvider || !fallbackProvider.generateStream) {
      if (primaryError instanceof AIRuntimeError || (primaryError instanceof Error && primaryError.name.startsWith('AI'))) {
        throw primaryError;
      }
      throw new AIRuntimeError(primaryError instanceof Error ? primaryError.message : String(primaryError));
    }

    safeLog('ai_stream_fallback_triggered', {
      task: request.task,
      primaryProvider: primaryProvider.name,
      fallbackProvider: fallbackProvider.name,
      reason: retryable.reason,
    });

    try {
      yield* fallbackProvider.generateStream(request, modelDef, effectiveConfig);
    } catch (fallbackErr: unknown) {
      if (fallbackErr instanceof AIRuntimeError || (fallbackErr instanceof Error && fallbackErr.name.startsWith('AI'))) {
        throw fallbackErr;
      }
      throw new AIRuntimeError(fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
    }
  }
}
