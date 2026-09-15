/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Pipeline Core Types & Interfaces
 * ─────────────────────────────────────────────────────────────────
 *
 *  Provider-independent type system for Relearn.ai's AI pipeline.
 *  Defines tasks, models, requests, normalized responses, and provider
 *  interfaces without coupling to any specific LLM provider/runtime.
 */

// -----------------------------------------------------------------
// 1. AI Task Definitions
// -----------------------------------------------------------------

export const AI_TASKS = [
  'learning_plan',
  'learning_space',
  'cheat_sheet',
  'chatbot',
  'flashcards',
  'quizzes',
  'concept_collision',
] as const;

export type AITask = (typeof AI_TASKS)[number];

// -----------------------------------------------------------------
// 2. Model Definitions & Capabilities
// -----------------------------------------------------------------

export const AI_MODEL_IDS = {
  QWEN_80B: 'Qwen3-Next-80B-A3B-Instruct',
  QWEN_80B_SHORT: 'Qwen3-Next-80B-A3B',
  GEMMA_27B: 'Gemma-3-27B',
} as const;

export type AIModelId = (typeof AI_MODEL_IDS)[keyof typeof AI_MODEL_IDS] | (string & {});

export interface ModelCapabilities {
  readonly streaming: boolean;
  readonly structuredOutput: boolean;
  readonly toolCalling: boolean;
  readonly systemPrompt: boolean;
  readonly multimodal?: boolean;
}

export interface ModelContextInfo {
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
}

export interface ModelConfigDefaults {
  readonly temperature: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: readonly string[];
}

export interface ModelDefinition {
  readonly id: AIModelId;
  readonly name: string;
  readonly description?: string;
  readonly supportedTasks: readonly AITask[];
  readonly context: ModelContextInfo;
  readonly capabilities: ModelCapabilities;
  readonly defaultConfig: ModelConfigDefaults;
}

// -----------------------------------------------------------------
// 3. Task Configuration & Metadata
// -----------------------------------------------------------------

export interface TaskConfig {
  readonly task: AITask;
  readonly defaultModelId: AIModelId;
  readonly recommendedTemperature: number;
  readonly responseFormat?: 'text' | 'json';
  readonly description?: string;
  readonly defaultSystemPrompt?: string;
}

// -----------------------------------------------------------------
// 4. Request & Response Normalization
// -----------------------------------------------------------------

export interface AIRequestOptions {
  readonly temperature?: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: string[];
  readonly responseFormat?: 'text' | 'json';
  readonly jsonSchema?: Record<string, unknown>;
  /** Model override primarily for benchmarking/evaluation */
  readonly overrideModel?: AIModelId | string;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface AIRequest {
  readonly task: AITask;
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly options?: AIRequestOptions;
}

export interface AIUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export type AIFinishReason =
  | 'stop'
  | 'length'
  | 'content_filter'
  | 'tool_calls'
  | 'error'
  | 'unknown';

export interface AIResponse {
  readonly text: string;
  readonly model: string;
  readonly usage: AIUsage;
  readonly finishReason: AIFinishReason;
  readonly latencyMs: number;
  readonly timeToFirstTokenMs?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface AIStreamChunk {
  readonly textDelta: string;
  readonly accumulatedText: string;
  readonly isComplete: boolean;
  readonly timeToFirstTokenMs?: number;
  readonly usage?: AIUsage;
  readonly finishReason?: AIFinishReason;
}

// -----------------------------------------------------------------
// 5. Provider-Independent Inference Interface
// -----------------------------------------------------------------

export interface AIInferenceProvider {
  /** Unique provider identifier (e.g. 'ollama', 'vllm', 'mock', etc.) */
  readonly name: string;

  /**
   * Generates a single complete normalized AI response.
   */
  generate(
    request: AIRequest,
    modelDef: ModelDefinition,
    effectiveConfig: ModelConfigDefaults
  ): Promise<AIResponse>;

  /**
   * Optional streaming generation interface.
   */
  generateStream?(
    request: AIRequest,
    modelDef: ModelDefinition,
    effectiveConfig: ModelConfigDefaults
  ): AsyncIterable<AIStreamChunk>;

  /**
   * Optional health check method for runtime diagnostics.
   */
  isHealthy?(): Promise<boolean>;
}

// -----------------------------------------------------------------
// 6. Benchmarking Types
// -----------------------------------------------------------------

export interface BenchmarkPrompt {
  readonly id: string;
  readonly task: AITask;
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly expectedFormat?: 'text' | 'json';
  readonly iterations?: number;
  readonly options?: AIRequestOptions;
}

export interface BenchmarkRunMetric {
  readonly promptId: string;
  readonly task: AITask;
  readonly canonicalModel: AIModelId;
  readonly modelId: string; // Backward compatibility with modelId
  readonly actualRuntimeModelIdentifier: string;
  readonly provider: string;
  readonly latencyMs: number;
  readonly timeToFirstTokenMs?: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly tokensPerSecond: number;
  readonly finishReason: AIFinishReason;
  readonly success: boolean;
  readonly error?: string;
  readonly outputPreview: string;
  readonly generatedResponse: string;
}

export interface ModelBenchmarkSummary {
  readonly modelId: string;
  readonly provider?: string;
  readonly totalRuns: number;
  readonly successRate: number;
  readonly avgLatencyMs: number;
  readonly minLatencyMs: number;
  readonly maxLatencyMs: number;
  readonly avgTokensPerSecond: number;
  readonly totalTokensGenerated: number;
}

export interface BenchmarkSuiteResult {
  readonly timestamp: string;
  readonly runs: readonly BenchmarkRunMetric[];
  readonly modelSummaries: Record<string, ModelBenchmarkSummary>;
}

// -----------------------------------------------------------------
// 7. Pipeline & Runtime Errors
// -----------------------------------------------------------------

export class AIRouterError extends Error {
  constructor(message: string, public readonly code: string = 'ROUTER_ERROR') {
    super(message);
    this.name = 'AIRouterError';
  }
}

export class AIValidationError extends AIRouterError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'AIValidationError';
  }
}

export class AIModelNotFoundError extends AIRouterError {
  constructor(public readonly modelId: string) {
    super(`AI Model '${modelId}' not found in registry`, 'MODEL_NOT_FOUND');
    this.name = 'AIModelNotFoundError';
  }
}

export class AIUnsupportedTaskError extends AIRouterError {
  constructor(public readonly task: string, public readonly modelId: string) {
    super(
      `Task '${task}' is not supported by model '${modelId}'`,
      'UNSUPPORTED_TASK'
    );
    this.name = 'AIUnsupportedTaskError';
  }
}

export class AIProviderNotConfiguredError extends AIRouterError {
  constructor(message = 'No active AIInferenceProvider registered in pipeline') {
    super(message, 'PROVIDER_NOT_CONFIGURED');
    this.name = 'AIProviderNotConfiguredError';
  }
}

export class AIRuntimeError extends AIRouterError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    code = 'RUNTIME_ERROR'
  ) {
    super(message, code);
    this.name = 'AIRuntimeError';
  }
}

export class AITimeoutError extends AIRuntimeError {
  constructor(timeoutMs: number) {
    super(`AI inference request timed out after ${timeoutMs}ms`, 408, 'TIMEOUT');
    this.name = 'AITimeoutError';
  }
}

export class AIAbortError extends AIRuntimeError {
  constructor(message = 'AI inference request was cancelled') {
    super(message, 499, 'CANCELLED');
    this.name = 'AIAbortError';
  }
}

export class AIConnectionError extends AIRuntimeError {
  constructor(message: string) {
    super(message, 503, 'CONNECTION_ERROR');
    this.name = 'AIConnectionError';
  }
}
