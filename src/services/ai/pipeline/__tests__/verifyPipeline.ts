/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Pipeline Verification Script
 * ─────────────────────────────────────────────────────────────────
 *
 *  Validates all components of the new AI pipeline:
 *  - Centralized Model Registry
 *  - Task Configuration & Model Assignment
 *  - Request Validation & Error Handling
 *  - Provider Decoupling & Active Provider Switching
 *  - Router generateAI & Streaming generateStreamAI
 *  - Benchmarking Runner
 */

import {
  AI_TASKS,
  AI_MODEL_IDS,
  type AITask,
  type AIRequest,
  type AIInferenceProvider,
  type ModelDefinition,
  type ModelConfigDefaults,
  type AIResponse,
  type AIStreamChunk,
  AIValidationError,
  AIUnsupportedTaskError,
  AIProviderNotConfiguredError,
} from '../types';
import {
  getModel,
  getModelOrThrow,
  getAllModels,
  MODEL_QWEN_80B,
  MODEL_GEMMA_27B,
} from '../modelRegistry';
import {
  TASK_MODEL_MAPPING,
  getModelIdForTask,
  getModelForTask,
  isKnownTask,
} from '../taskConfig';
import {
  registerProvider,
  getActiveProvider,
  hasActiveProvider,
  clearProviders,
} from '../provider';
import { generateAI, generateStreamAI } from '../router';
import { runBenchmarkSuite, type BenchmarkPrompt } from '../benchmark';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runPipelineVerification(): Promise<void> {
  console.log('=== Starting AI Pipeline Verification ===\n');

  // 1. Verify Model Registry
  console.log('1. Verifying Model Registry...');
  const allModels = getAllModels();
  assert(allModels.length === 2, 'Expected exactly 2 registered models in default list');

  const qwen = getModelOrThrow(AI_MODEL_IDS.QWEN_80B);
  assert(qwen.id === 'Qwen3-Next-80B-A3B-Instruct', 'Qwen ID mismatch');
  assert(qwen.context.contextWindow === 131072, 'Qwen context window mismatch');
  assert(qwen.capabilities.streaming === true, 'Qwen should support streaming');
  assert(qwen.capabilities.toolCalling === true, 'Qwen should support toolCalling');
  assert(qwen.defaultConfig.temperature === 0.3, 'Qwen default temperature mismatch');

  const gemma = getModelOrThrow(AI_MODEL_IDS.GEMMA_27B);
  assert(gemma.id === 'Gemma-3-27B', 'Gemma ID mismatch');
  assert(gemma.context.contextWindow === 32768, 'Gemma context window mismatch');
  assert(gemma.capabilities.streaming === true, 'Gemma should support streaming');
  assert(gemma.capabilities.toolCalling === false, 'Gemma toolCalling should be false');
  assert(gemma.defaultConfig.temperature === 0.7, 'Gemma default temperature mismatch');
  console.log('   ✓ Model Registry validated successfully.');

  // 2. Verify Task to Model Mapping
  console.log('2. Verifying Task to Model Mappings...');
  const expectedMappings: Record<AITask, string> = {
    learning_plan: 'Qwen3-Next-80B-A3B-Instruct',
    learning_space: 'Qwen3-Next-80B-A3B-Instruct',
    cheat_sheet: 'Qwen3-Next-80B-A3B-Instruct',
    chatbot: 'Gemma-3-27B',
    flashcards: 'Gemma-3-27B',
    quizzes: 'Gemma-3-27B',
    concept_collision: 'Gemma-3-27B',
  };

  for (const task of AI_TASKS) {
    const assignedModelId = getModelIdForTask(task);
    const expectedModelId = expectedMappings[task];
    assert(
      assignedModelId === expectedModelId,
      `Task '${task}' expected '${expectedModelId}' but got '${assignedModelId}'`
    );

    const modelDef = getModelForTask(task);
    assert(
      modelDef.supportedTasks.includes(task),
      `Model '${modelDef.id}' definition does not include '${task}' in supportedTasks`
    );
    assert(isKnownTask(task) === true, `isKnownTask should return true for '${task}'`);
  }
  assert(isKnownTask('unknown_task') === false, 'isKnownTask should return false for invalid task');
  console.log('   ✓ All 7 tasks strictly map to their designated models.');

  // 3. Verify Provider Decoupling & Errors
  console.log('3. Verifying Provider Decoupling & Error Handling...');
  clearProviders();
  assert(hasActiveProvider() === false, 'Providers should be cleared');

  let errorCaught = false;
  try {
    await generateAI({
      task: 'learning_plan',
      prompt: 'Test prompt',
    });
  } catch (err) {
    if (err instanceof AIProviderNotConfiguredError) {
      errorCaught = true;
    }
  }
  assert(errorCaught, 'Expected AIProviderNotConfiguredError when no provider is registered');
  console.log('   ✓ AIProviderNotConfiguredError handled properly.');

  // 4. Verify Validation Layer
  console.log('4. Verifying Validation Layer...');
  // Invalid task
  let validationPassed = false;
  try {
    // @ts-expect-error test runtime rejection of invalid task
    await generateAI({ task: 'invalid_task', prompt: 'Hello' });
  } catch (err) {
    if (err instanceof AIValidationError) {
      validationPassed = true;
    }
  }
  assert(validationPassed, 'Expected AIValidationError for invalid task');

  // Empty prompt
  validationPassed = false;
  try {
    await generateAI({ task: 'chatbot', prompt: '   ' });
  } catch (err) {
    if (err instanceof AIValidationError) {
      validationPassed = true;
    }
  }
  assert(validationPassed, 'Expected AIValidationError for empty whitespace prompt');

  // Invalid temperature
  validationPassed = false;
  try {
    await generateAI({
      task: 'chatbot',
      prompt: 'Hello',
      options: { temperature: 3.5 },
    });
  } catch (err) {
    if (err instanceof AIValidationError) {
      validationPassed = true;
    }
  }
  assert(validationPassed, 'Expected AIValidationError for temperature > 2.0');
  console.log('   ✓ Validation layer rejects invalid inputs as expected.');

  // 5. Test Router Execution with a Mock Provider
  console.log('5. Verifying Router with Mock Provider...');
  const mockProvider: AIInferenceProvider = {
    name: 'test-mock-provider',
    async generate(
      request: AIRequest,
      modelDef: ModelDefinition,
      effectiveConfig: ModelConfigDefaults
    ): Promise<AIResponse> {
      return {
        text: `Generated response for [${request.task}] using [${modelDef.id}] (temp: ${effectiveConfig.temperature})`,
        model: modelDef.id,
        usage: {
          promptTokens: 15,
          completionTokens: 30,
          totalTokens: 45,
        },
        finishReason: 'stop',
        latencyMs: 12,
      };
    },
    async *generateStream(
      request: AIRequest,
      modelDef: ModelDefinition
    ): AsyncIterable<AIStreamChunk> {
      yield {
        textDelta: 'Chunk 1',
        accumulatedText: 'Chunk 1',
        isComplete: false,
      };
      yield {
        textDelta: ' Chunk 2',
        accumulatedText: 'Chunk 1 Chunk 2',
        isComplete: true,
        finishReason: 'stop',
      };
    },
  };

  registerProvider(mockProvider);
  assert(hasActiveProvider() === true, 'Active provider should be true');
  assert(getActiveProvider().name === 'test-mock-provider', 'Active provider name mismatch');

  const res = await generateAI({
    task: 'learning_plan',
    prompt: 'Create a plan for React 19',
  });

  assert(res.model === 'Qwen3-Next-80B-A3B-Instruct', 'Model in response should be Qwen3-Next-80B-A3B-Instruct');
  assert(res.usage.totalTokens === 45, 'Total tokens mismatch');
  assert(res.finishReason === 'stop', 'Finish reason mismatch');
  assert(res.text.includes('learning_plan'), 'Response text mismatch');
  console.log('   ✓ Router generateAI normalized response verified.');

  // Test streaming
  const chunks: string[] = [];
  for await (const chunk of generateStreamAI({
    task: 'chatbot',
    prompt: 'Explain closures',
  })) {
    chunks.push(chunk.textDelta);
  }
  assert(chunks.length === 2, 'Expected 2 stream chunks');
  assert(chunks.join('') === 'Chunk 1 Chunk 2', 'Stream chunks join mismatch');
  console.log('   ✓ Router generateStreamAI verified.');

  // 6. Test Benchmarking Runner
  console.log('6. Verifying Benchmark Runner...');
  const testPrompts: BenchmarkPrompt[] = [
    {
      id: 'bench_01',
      task: 'learning_plan',
      prompt: 'Benchmark prompt for curriculum generation',
      iterations: 2,
    },
  ];

  const benchResults = await runBenchmarkSuite(testPrompts, [AI_MODEL_IDS.QWEN_80B]);
  assert(benchResults.runs.length === 2, 'Expected 2 benchmark runs');
  assert(benchResults.runs[0].success === true, 'Benchmark run 0 should succeed');
  assert(
    benchResults.modelSummaries[AI_MODEL_IDS.QWEN_80B].successRate === 100,
    'Qwen benchmark success rate should be 100%'
  );
  console.log('   ✓ Benchmark suite executed and aggregated successfully.');

  console.log('\n=== All AI Pipeline Verifications PASSED! ===\n');
}

runPipelineVerification().catch((err) => {
  console.error('Pipeline verification failed:', err);
  process.exit(1);
});
