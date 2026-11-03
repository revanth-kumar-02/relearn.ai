/**
 * ─────────────────────────────────────────────────────────────────
 *  Centralized Model Registry
 * ─────────────────────────────────────────────────────────────────
 *
 *  Single source of truth for model specifications and capabilities.
 *  Defines Qwen3-Next-80B-A3B-Instruct and Gemma-3-27B with their
 *  supported tasks, context windows, capabilities, and configuration defaults.
 */

import {
  AI_MODEL_IDS,
  type AIModelId,
  type AITask,
  type ModelDefinition,
  AIModelNotFoundError,
} from './types';

// -----------------------------------------------------------------
// Model Definitions
// -----------------------------------------------------------------

export const MODEL_GPT_OSS_120B: ModelDefinition = {
  id: AI_MODEL_IDS.GPT_OSS_120B, // 'openai/gpt-oss-120b'
  name: 'GPT-OSS 120B',
  description:
    'Primary frontier open-weights model for curriculum planning, deep conceptual study, reference synthesis, Socratic tutoring, quizzes, flashcards, concept collisions, quality scoring, and translation.',
  supportedTasks: [
    'learning_plan',
    'learning_space',
    'cheat_sheet',
    'chatbot',
    'flashcards',
    'quizzes',
    'concept_collision',
    'quality_scoring',
    'content_safety',
    'youtube_query',
    'translation',
  ],
  context: {
    contextWindow: 131072, // 128k context window
    maxOutputTokens: 8192,
  },
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    systemPrompt: true,
    multimodal: false,
  },
  defaultConfig: {
    temperature: 0.3,
    topP: 0.9,
    topK: 40,
    maxTokens: 8192,
  },
};

export const MODEL_GPT_OSS_20B: ModelDefinition = {
  id: AI_MODEL_IDS.GPT_OSS_20B, // 'openai/gpt-oss-20b'
  name: 'GPT-OSS 20B',
  description:
    'Fast, lightweight frontier open-weights model for rapid safety validation, queries, and quick responses.',
  supportedTasks: [
    'content_safety',
    'youtube_query',
    'quizzes',
    'flashcards',
    'chatbot',
  ],
  context: {
    contextWindow: 65536,
    maxOutputTokens: 4096,
  },
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    systemPrompt: true,
    multimodal: false,
  },
  defaultConfig: {
    temperature: 0.1,
    topP: 0.9,
    topK: 40,
    maxTokens: 2048,
  },
};

export const MODEL_QWEN_80B: ModelDefinition = {
  id: AI_MODEL_IDS.QWEN_80B, // 'Qwen3-Next-80B-A3B-Instruct'
  name: 'Qwen3 Next 80B A3B Instruct',
  description:
    'High-capacity reasoning model specialized for curriculum design, extensive workspace context, and cheat sheet synthesis.',
  supportedTasks: ['learning_plan', 'learning_space', 'cheat_sheet'],
  context: {
    contextWindow: 131072, // 128k context window
    maxOutputTokens: 8192,
  },
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    systemPrompt: true,
    multimodal: false,
  },
  defaultConfig: {
    temperature: 0.3,
    topP: 0.9,
    topK: 40,
    maxTokens: 4096,
  },
};

export const MODEL_GEMMA_27B: ModelDefinition = {
  id: AI_MODEL_IDS.GEMMA_27B, // 'Gemma-3-27B'
  name: 'Gemma 3 27B',
  description:
    'Responsive, instruction-tuned conversational model optimized for interactive tutoring, flashcards, quizzes, and creative collisions.',
  supportedTasks: ['chatbot', 'flashcards', 'quizzes', 'concept_collision'],
  context: {
    contextWindow: 32768, // 32k context window
    maxOutputTokens: 4096,
  },
  capabilities: {
    streaming: true,
    structuredOutput: true,
    toolCalling: false,
    systemPrompt: true,
    multimodal: false,
  },
  defaultConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 50,
    maxTokens: 2048,
  },
};

/**
 * Registry map indexed by model ID and common alias variants.
 */
const MODEL_REGISTRY = new Map<string, ModelDefinition>([
  [MODEL_GPT_OSS_120B.id, MODEL_GPT_OSS_120B],
  [AI_MODEL_IDS.GPT_OSS_120B_FREE, MODEL_GPT_OSS_120B],
  ['gpt-oss-120b', MODEL_GPT_OSS_120B],
  ['gpt-oss-120b:free', MODEL_GPT_OSS_120B],
  ['openai/gpt-oss-120b', MODEL_GPT_OSS_120B],
  ['openai/gpt-oss-120b:free', MODEL_GPT_OSS_120B],
  [MODEL_GPT_OSS_20B.id, MODEL_GPT_OSS_20B],
  [AI_MODEL_IDS.GPT_OSS_20B_FREE, MODEL_GPT_OSS_20B],
  ['gpt-oss-20b', MODEL_GPT_OSS_20B],
  ['gpt-oss-20b:free', MODEL_GPT_OSS_20B],
  ['openai/gpt-oss-20b', MODEL_GPT_OSS_20B],
  ['openai/gpt-oss-20b:free', MODEL_GPT_OSS_20B],
  [MODEL_QWEN_80B.id, MODEL_QWEN_80B],
  [AI_MODEL_IDS.QWEN_80B_SHORT, MODEL_QWEN_80B],
  ['qwen3-next-80b-a3b-instruct', MODEL_QWEN_80B],
  ['qwen3-next-80b-a3b', MODEL_QWEN_80B],
  ['qwen/qwen3-next-80b-a3b-instruct', MODEL_QWEN_80B],
  [MODEL_GEMMA_27B.id, MODEL_GEMMA_27B],
  ['gemma-3-27b', MODEL_GEMMA_27B],
  ['google/gemma-3-27b', MODEL_GEMMA_27B],
  ['google/gemma-3-27b-it', MODEL_GEMMA_27B],
  ['gemma3:27b', MODEL_GEMMA_27B],
]);

// -----------------------------------------------------------------
// Registry Accessors & Helpers
// -----------------------------------------------------------------

/**
 * Retrieve a model definition by its identifier or alias.
 */
export function getModel(modelId: string): ModelDefinition | undefined {
  if (!modelId) return undefined;
  return MODEL_REGISTRY.get(modelId) || MODEL_REGISTRY.get(modelId.toLowerCase());
}

/**
 * Retrieve a model definition or throw an AIModelNotFoundError if missing.
 */
export function getModelOrThrow(modelId: string): ModelDefinition {
  const model = getModel(modelId);
  if (!model) {
    throw new AIModelNotFoundError(modelId);
  }
  return model;
}

/**
 * List all unique model definitions registered in the pipeline.
 */
export function getAllModels(): readonly ModelDefinition[] {
  return [MODEL_GPT_OSS_120B, MODEL_GPT_OSS_20B, MODEL_QWEN_80B, MODEL_GEMMA_27B];
}

/**
 * Check if a model supports a given task.
 */
export function isTaskSupportedByModel(task: AITask, modelId: string): boolean {
  const model = getModel(modelId);
  if (!model) return false;
  return model.supportedTasks.includes(task);
}

/**
 * Dynamically register or override a model definition (useful for testing & extensions).
 */
export function registerModel(model: ModelDefinition): void {
  MODEL_REGISTRY.set(model.id, model);
  MODEL_REGISTRY.set(model.id.toLowerCase(), model);
}
