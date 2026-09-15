/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Router
 * ─────────────────────────────────────────────────────────────────
 *
 *  Main entry point for generating AI completions in Relearn.ai.
 *
 *  Workflow:
 *  1. Validates the incoming AIRequest.
 *  2. Resolves model assignment from the Task Configuration (or validated override).
 *  3. Validates model capability and task compatibility.
 *  4. Merges task/model configuration defaults with request options.
 *  5. Dispatches request to the active AIInferenceProvider adapter.
 *  6. Measures latency and normalizes output into a standard AIResponse or Stream.
 */

import {
  type AIRequest,
  type AIResponse,
  type AIStreamChunk,
  type ModelConfigDefaults,
  type ModelDefinition,
  AIValidationError,
  AIRuntimeError,
} from './types';
import { getModelForTask, getTaskConfig } from './taskConfig';
import { getModelOrThrow } from './modelRegistry';
import { getActiveProvider } from './provider';
import { validateAIRequest, validateTaskModelSupport } from './validation';

// -----------------------------------------------------------------
// Internal Helpers
// -----------------------------------------------------------------

/**
 * Resolves the target model definition, taking into account any explicit
 * model override (e.g., in benchmark comparisons).
 */
function resolveModelDefinition(request: AIRequest): ModelDefinition {
  if (request.options?.overrideModel) {
    const overrideDef = getModelOrThrow(request.options.overrideModel);
    // When an override is requested, ensure the model actually supports the task
    validateTaskModelSupport(request.task, overrideDef);
    return overrideDef;
  }

  const modelDef = getModelForTask(request.task);
  validateTaskModelSupport(request.task, modelDef);
  return modelDef;
}

/**
 * Merges model defaults, task defaults, and request options into effective configuration.
 */
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
 *
 * @example
 * ```ts
 * const response = await generateAI({
 *   task: 'learning_plan',
 *   prompt: 'Create a 7-day plan to learn WebGPU',
 *   systemPrompt: 'You are an expert curriculum planner.',
 *   options: { temperature: 0.2 }
 * });
 * console.log(response.text, response.model, response.latencyMs);
 * ```
 */
export async function generateAI(request: AIRequest): Promise<AIResponse> {
  // 1. Strict request validation
  validateAIRequest(request);

  // 2. Resolve target model definition
  const modelDef = resolveModelDefinition(request);

  // 3. Compute effective configuration
  const effectiveConfig = computeEffectiveConfig(request, modelDef);

  // 4. Retrieve active provider
  const provider = getActiveProvider();

  // 5. Measure latency and dispatch
  const startTime = performance.now();
  let rawResponse: AIResponse;

  try {
    rawResponse = await provider.generate(request, modelDef, effectiveConfig);
  } catch (err) {
    if (err instanceof AIRuntimeError || (err instanceof Error && err.name.startsWith('AI'))) {
      throw err;
    }
    throw new AIRuntimeError(err instanceof Error ? err.message : String(err));
  }

  const endTime = performance.now();

  // 6. Guarantee normalized response structure
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
      provider: provider.name,
    },
  };
}

/**
 * Streaming interface for AI completions (for Chatbot and Learning Space).
 *
 * @example
 * ```ts
 * for await (const chunk of generateStreamAI({
 *   task: 'chatbot',
 *   prompt: 'Explain quantum superposition'
 * })) {
 *   console.log(chunk.textDelta);
 * }
 * ```
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

  // 5. Retrieve active provider
  const provider = getActiveProvider();

  if (!provider.generateStream) {
    throw new AIValidationError(
      `Provider '${provider.name}' does not implement streaming.`
    );
  }

  // 6. Stream chunks from provider
  yield* provider.generateStream(request, modelDef, effectiveConfig);
}
