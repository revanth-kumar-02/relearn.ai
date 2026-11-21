/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Router & Inference Coordinator (Groq Exclusive)
 * ─────────────────────────────────────────────────────────────────
 *
 *  Main entry point for generating AI completions in Relearn.ai.
 *  Uses Groq as the exclusive high-performance inference engine.
 *
 *  Workflow:
 *  1. Validates incoming AIRequest.
 *  2. Resolves model assignment from Task Configuration (or override).
 *  3. Validates model capability and task compatibility.
 *  4. Merges task/model configuration defaults with request options.
 *  5. Dispatches directly to Groq.
 *  6. Normalizes response with accurate provider & model metadata.
 */

import {
  type AIRequest,
  type AIResponse,
  type AIStreamChunk,
  type ModelConfigDefaults,
  type ModelDefinition,
  AIValidationError,
  AIRuntimeError,
  AITimeoutError,
  AIAbortError,
  AIConnectionError,
} from './types';
import { getModelForTask, getTaskConfig } from './taskConfig';
import { getModelOrThrow } from './modelRegistry';
import { ensureActiveProvider } from './providers/providerFactory';
import { validateAIRequest, validateTaskModelSupport } from './validation';

// -----------------------------------------------------------------
// Error Classification
// -----------------------------------------------------------------

export interface RetryableClassification {
  readonly isRetryable: boolean;
  readonly reason: string;
  readonly statusCode?: number;
}

/**
 * Determines whether a provider error represents a transient network or server issue.
 */
export function isRetryableProviderError(err: unknown): RetryableClassification {
  if (!err) {
    return { isRetryable: false, reason: 'unknown_empty_error' };
  }

  if (err instanceof AIValidationError) {
    return { isRetryable: false, reason: 'validation_error' };
  }
  if (err instanceof AIAbortError) {
    return { isRetryable: false, reason: 'request_aborted' };
  }

  if (err instanceof AITimeoutError) {
    return { isRetryable: true, reason: 'request_timeout', statusCode: 408 };
  }
  if (err instanceof AIConnectionError) {
    return { isRetryable: true, reason: 'connection_error', statusCode: 503 };
  }

  if (err instanceof AIRuntimeError) {
    const status = err.statusCode;

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

    const msg = err.message.toLowerCase();
    if (msg.includes('429') || msg.includes('rate limit')) {
      return { isRetryable: true, reason: 'rate_limit_exceeded', statusCode: 429 };
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
      return { isRetryable: true, reason: 'upstream_server_error', statusCode: 503 };
    }
    if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('econnrefused')) {
      return { isRetryable: true, reason: 'connection_error', statusCode: 503 };
    }

    return { isRetryable: false, reason: 'unclassified_runtime_error', statusCode: status };
  }

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
  const sanitizedPayload = {
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
    console.info(`[AI-ROUTER] ${JSON.stringify(sanitizedPayload)}`);
  }
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
 * Primary interface to generate AI content through the pipeline via Groq.
 */
export async function generateAI(request: AIRequest): Promise<AIResponse> {
  // 1. Strict request validation
  validateAIRequest(request);

  // 2. Resolve target model definition & compute configuration
  const modelDef = resolveModelDefinition(request);
  const effectiveConfig = computeEffectiveConfig(request, modelDef);

  // 3. Retrieve Groq provider
  const primaryProvider = ensureActiveProvider();

  const startTime = performance.now();
  let rawResponse: AIResponse | null = null;

  // 4. Dispatch directly to Groq
  try {
    rawResponse = await primaryProvider.generate(request, modelDef, effectiveConfig);
  } catch (err: unknown) {
    const check = isRetryableProviderError(err);
    safeLog('ai_request_failed', {
      task: request.task,
      provider: primaryProvider.name,
      model: modelDef.id,
      reason: check.reason,
      statusCode: check.statusCode,
    });

    if (err instanceof AIRuntimeError || (err instanceof Error && err.name.startsWith('AI'))) {
      throw err;
    }
    throw new AIRuntimeError(err instanceof Error ? err.message : String(err));
  }

  if (!rawResponse) {
    throw new AIRuntimeError('No response generated by Groq', 500);
  }

  const endTime = performance.now();

  // 5. Guarantee normalized response structure with accurate observability metadata
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
      provider: primaryProvider.name,
      actualModel: String(rawResponse.metadata?.runtimeModel || rawResponse.model),
      fallbackOccurred: false,
      primaryProvider: primaryProvider.name,
    },
  };
}

/**
 * Streaming interface for AI completions (for Chatbot and Learning Space).
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

  // 5. Retrieve Groq provider
  const primaryProvider = ensureActiveProvider();

  if (!primaryProvider.generateStream) {
    throw new AIValidationError(
      `Provider '${primaryProvider.name}' does not implement streaming.`
    );
  }

  // 6. Stream directly from Groq
  try {
    for await (const chunk of primaryProvider.generateStream(request, modelDef, effectiveConfig)) {
      yield chunk;
    }
  } catch (err: unknown) {
    safeLog('ai_stream_interrupted', {
      task: request.task,
      provider: primaryProvider.name,
    });
    if (err instanceof AIRuntimeError || (err instanceof Error && err.name.startsWith('AI'))) {
      throw err;
    }
    throw new AIRuntimeError(err instanceof Error ? err.message : String(err));
  }
}
