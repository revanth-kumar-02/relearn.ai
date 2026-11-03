/**
 * ─────────────────────────────────────────────────────────────────
 *  Centralized Task Configuration & Model Assignment
 * ─────────────────────────────────────────────────────────────────
 *
 *  Single source of truth for routing tasks to models.
 *  Maintains strict task-to-model assignments:
 *
 *  Qwen3-Next-80B-A3B:
 *    - learning_plan
 *    - learning_space
 *    - cheat_sheet
 *
 *  Gemma 3 27B:
 *    - chatbot
 *    - flashcards
 *    - quizzes
 *    - concept_collision
 */

import {
  type AITask,
  AI_TASKS,
  type AIModelId,
  AI_MODEL_IDS,
  type TaskConfig,
  type ModelDefinition,
  AIValidationError,
} from './types';
import { getModelOrThrow } from './modelRegistry';

// -----------------------------------------------------------------
// Task to Model Mapping
// -----------------------------------------------------------------

export const TASK_MODEL_MAPPING: Record<AITask, AIModelId> = {
  learning_plan: AI_MODEL_IDS.GPT_OSS_120B,
  learning_space: AI_MODEL_IDS.GPT_OSS_120B,
  cheat_sheet: AI_MODEL_IDS.GPT_OSS_120B,
  chatbot: AI_MODEL_IDS.GPT_OSS_120B,
  flashcards: AI_MODEL_IDS.GPT_OSS_120B,
  quizzes: AI_MODEL_IDS.GPT_OSS_120B,
  concept_collision: AI_MODEL_IDS.GPT_OSS_120B,
  quality_scoring: AI_MODEL_IDS.GPT_OSS_120B,
  content_safety: AI_MODEL_IDS.GPT_OSS_20B,
  youtube_query: AI_MODEL_IDS.GPT_OSS_20B,
  translation: AI_MODEL_IDS.GPT_OSS_120B,
} as const;

// -----------------------------------------------------------------
// Task Metadata & Recommended Configurations
// -----------------------------------------------------------------

export const TASK_CONFIGURATIONS: Record<AITask, TaskConfig> = {
  learning_plan: {
    task: 'learning_plan',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.2,
    responseFormat: 'json',
    description: 'Generates structured multi-day curriculum with daily milestones and topics.',
  },
  learning_space: {
    task: 'learning_space',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.4,
    responseFormat: 'text',
    description: 'Generates comprehensive study guides, deep-dive explanations, and notes.',
  },
  cheat_sheet: {
    task: 'cheat_sheet',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.2,
    responseFormat: 'text',
    description: 'Distills core formulas, definitions, and code syntax into concise reference sheets.',
  },
  chatbot: {
    task: 'chatbot',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.7,
    responseFormat: 'text',
    description: 'Interactive AI tutor providing conversational guidance and Socratic questioning.',
  },
  flashcards: {
    task: 'flashcards',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.3,
    responseFormat: 'json',
    description: 'Generates active-recall front/back flashcard pairs.',
  },
  quizzes: {
    task: 'quizzes',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.3,
    responseFormat: 'json',
    description: 'Generates multiple-choice and conceptual assessment questions with explanations.',
  },
  concept_collision: {
    task: 'concept_collision',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.8,
    responseFormat: 'text',
    description: 'Combines two unrelated concepts to uncover non-obvious analogies and insights.',
  },
  quality_scoring: {
    task: 'quality_scoring',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.3,
    responseFormat: 'json',
    description: 'Analyzes and audits learning plans across multiple educational quality dimensions.',
  },
  content_safety: {
    task: 'content_safety',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_20B,
    recommendedTemperature: 0.1,
    responseFormat: 'json',
    description: 'Validates academic and educational topics for safety.',
  },
  youtube_query: {
    task: 'youtube_query',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_20B,
    recommendedTemperature: 0.1,
    responseFormat: 'text',
    description: 'Optimizes targeted YouTube educational video search queries.',
  },
  translation: {
    task: 'translation',
    defaultModelId: AI_MODEL_IDS.GPT_OSS_120B,
    recommendedTemperature: 0.3,
    responseFormat: 'json',
    description: 'Accurately translates curriculum milestones and tasks while preserving IDs and schemas.',
  },
};

// -----------------------------------------------------------------
// Configuration Accessors & Helpers
// -----------------------------------------------------------------

/**
 * Type guard to check if a value is a valid recognized AITask.
 */
export function isKnownTask(task: unknown): task is AITask {
  return typeof task === 'string' && (AI_TASKS as readonly string[]).includes(task);
}

/**
 * Returns the assigned model ID for a given task.
 */
export function getModelIdForTask(task: AITask): AIModelId {
  const modelId = TASK_MODEL_MAPPING[task];
  if (!modelId) {
    throw new AIValidationError(`No model mapping configured for task: '${task}'`);
  }
  return modelId;
}

/**
 * Returns the full ModelDefinition assigned to the given task.
 */
export function getModelForTask(task: AITask): ModelDefinition {
  const modelId = getModelIdForTask(task);
  return getModelOrThrow(modelId);
}

/**
 * Returns the detailed task configuration for a given task.
 */
export function getTaskConfig(task: AITask): TaskConfig {
  const config = TASK_CONFIGURATIONS[task];
  if (!config) {
    throw new AIValidationError(`No task configuration found for task: '${task}'`);
  }
  return config;
}
