/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Pipeline Request & Model Validation
 * ─────────────────────────────────────────────────────────────────
 *
 *  Enforces strict runtime validation on incoming AI requests:
 *  - Rejects unknown task types
 *  - Rejects missing, non-string, or empty/whitespace-only prompts
 *  - Enforces prompt and system prompt maximum length limits
 *  - Validates numerical option boundaries (temperature, topP, maxTokens)
 *  - Ensures model supports the requested task and context limits
 */

import {
  type AIRequest,
  type AITask,
  type ModelDefinition,
  AIValidationError,
  AIUnsupportedTaskError,
} from './types';
import { isKnownTask } from './taskConfig';

// Maximum character length constraints for safety
export const MAX_PROMPT_LENGTH = 500000;
export const MAX_SYSTEM_PROMPT_LENGTH = 100000;

// -----------------------------------------------------------------
// Request Validation
// -----------------------------------------------------------------

/**
 * Validates an incoming AIRequest payload. Throws AIValidationError on invalid input.
 */
export function validateAIRequest(request: unknown): asserts request is AIRequest {
  if (typeof request !== 'object' || request === null) {
    throw new AIValidationError('AIRequest must be a non-null object');
  }

  const req = request as Partial<AIRequest>;

  // 1. Validate task
  if (!req.task) {
    throw new AIValidationError("AIRequest is missing required field: 'task'");
  }

  if (!isKnownTask(req.task)) {
    throw new AIValidationError(
      `Unknown AI task: '${String(req.task)}'. Supported tasks are: learning_plan, learning_space, cheat_sheet, chatbot, flashcards, quizzes, concept_collision.`
    );
  }

  // 2. Validate prompt
  if (typeof req.prompt !== 'string') {
    throw new AIValidationError("AIRequest 'prompt' must be a string");
  }

  if (req.prompt.trim().length === 0) {
    throw new AIValidationError("AIRequest 'prompt' cannot be empty or whitespace only");
  }

  if (req.prompt.length > MAX_PROMPT_LENGTH) {
    throw new AIValidationError(
      `AIRequest 'prompt' exceeds maximum allowed length of ${MAX_PROMPT_LENGTH} characters.`
    );
  }

  // 3. Validate systemPrompt if provided
  if (req.systemPrompt !== undefined) {
    if (typeof req.systemPrompt !== 'string') {
      throw new AIValidationError("AIRequest 'systemPrompt' must be a string if provided");
    }
    if (req.systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
      throw new AIValidationError(
        `AIRequest 'systemPrompt' exceeds maximum allowed length of ${MAX_SYSTEM_PROMPT_LENGTH} characters.`
      );
    }
  }

  // 4. Validate options if provided
  if (req.options !== undefined) {
    validateRequestOptions(req.options);
  }
}

/**
 * Validates request configuration options.
 */
export function validateRequestOptions(options: unknown): void {
  if (typeof options !== 'object' || options === null) {
    throw new AIValidationError("AIRequest 'options' must be an object if provided");
  }

  const opts = options as Record<string, unknown>;

  if (opts.temperature !== undefined) {
    if (typeof opts.temperature !== 'number' || isNaN(opts.temperature) || opts.temperature < 0 || opts.temperature > 2) {
      throw new AIValidationError("Option 'temperature' must be a number between 0.0 and 2.0");
    }
  }

  if (opts.topP !== undefined) {
    if (typeof opts.topP !== 'number' || isNaN(opts.topP) || opts.topP <= 0 || opts.topP > 1) {
      throw new AIValidationError("Option 'topP' must be a number between (0.0, 1.0]");
    }
  }

  if (opts.maxTokens !== undefined) {
    if (typeof opts.maxTokens !== 'number' || isNaN(opts.maxTokens) || opts.maxTokens <= 0 || !Number.isInteger(opts.maxTokens)) {
      throw new AIValidationError("Option 'maxTokens' must be a positive integer");
    }
  }

  if (opts.responseFormat !== undefined) {
    if (opts.responseFormat !== 'text' && opts.responseFormat !== 'json') {
      throw new AIValidationError("Option 'responseFormat' must be either 'text' or 'json'");
    }
  }

  if (opts.timeoutMs !== undefined) {
    if (typeof opts.timeoutMs !== 'number' || isNaN(opts.timeoutMs) || opts.timeoutMs <= 0) {
      throw new AIValidationError("Option 'timeoutMs' must be a positive number");
    }
  }
}

/**
 * Validates that a model supports the specific task requested and adheres to context bounds.
 */
export function validateTaskModelSupport(task: AITask, modelDef: ModelDefinition): void {
  if (!modelDef.supportedTasks.includes(task)) {
    throw new AIUnsupportedTaskError(task, modelDef.id);
  }
}
