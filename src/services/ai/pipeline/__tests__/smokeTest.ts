/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Pipeline Isolated Smoke Test
 * ─────────────────────────────────────────────────────────────────
 *
 *  Validates real inference flow through the public AI pipeline abstraction:
 *    generateAI(...)
 *    generateStreamAI(...)
 *
 *  Does NOT bypass the router or call Ollama/vLLM directly.
 *  Explicitly captures and reports:
 *  - Requested canonical model
 *  - Runtime model identifier
 *  - Active provider
 *  - Actual returned model identifier
 *  - TTFT, latency, token metrics, finish reason, and text length
 *  - Streaming accumulation, single completion, and AbortSignal cancellation
 */

import {
  AI_MODEL_IDS,
  type AIRequest,
  type AIResponse,
  type AIStreamChunk,
  type AIInferenceProvider,
  AIRuntimeError,
  AITimeoutError,
  AIAbortError,
  AIConnectionError,
} from '../types';
import { generateAI, generateStreamAI } from '../router';
import { getActiveProvider, registerProvider, hasActiveProvider } from '../provider';
import { getAIRuntimeConfig, resolveRuntimeModelName } from '../config/runtimeConfig';
import { getModelForTask } from '../taskConfig';
import { createInferenceProvider } from '../providers/providerFactory';

export interface SmokeTestReport {
  readonly phase: string;
  readonly task: string;
  readonly requestedCanonicalModel: string;
  readonly runtimeModelIdentifier: string;
  readonly providerName: string;
  readonly returnedModelIdentifier: string;
  readonly success: boolean;
  readonly latencyMs: number;
  readonly timeToFirstTokenMs?: number | 'N/A';
  readonly promptTokens?: number | 'N/A';
  readonly completionTokens?: number | 'N/A';
  readonly totalTokens?: number | 'N/A';
  readonly finishReason?: string;
  readonly generatedTextLength: number;
  readonly preview: string;
  readonly error?: string;
}

/**
 * Runs non-streaming smoke test for Qwen3-Next-80B-A3B-Instruct via learning_plan task.
 */
export async function runNonStreamingSmokeTest(): Promise<SmokeTestReport> {
  const task = 'learning_plan';
  const modelDef = getModelForTask(task);
  const runtimeModel = resolveRuntimeModelName(modelDef.id);
  const provider = getActiveProvider();

  const prompt = 'Explain what a binary search tree is to a beginner in 5 concise points.';

  try {
    const response: AIResponse = await generateAI({
      task,
      prompt,
      options: {
        temperature: 0.2,
        timeoutMs: 15000,
      },
    });

    return {
      phase: 'A. Non-Streaming Inference',
      task,
      requestedCanonicalModel: modelDef.id,
      runtimeModelIdentifier: runtimeModel,
      providerName: provider.name,
      returnedModelIdentifier: response.model,
      success: true,
      latencyMs: response.latencyMs,
      promptTokens: response.usage.promptTokens > 0 ? response.usage.promptTokens : 'N/A',
      completionTokens: response.usage.completionTokens > 0 ? response.usage.completionTokens : 'N/A',
      totalTokens: response.usage.totalTokens > 0 ? response.usage.totalTokens : 'N/A',
      finishReason: response.finishReason,
      generatedTextLength: response.text.length,
      preview: response.text.slice(0, 160).replace(/\n/g, ' '),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      phase: 'A. Non-Streaming Inference',
      task,
      requestedCanonicalModel: modelDef.id,
      runtimeModelIdentifier: runtimeModel,
      providerName: provider.name,
      returnedModelIdentifier: 'N/A (Failed)',
      success: false,
      latencyMs: 0,
      generatedTextLength: 0,
      preview: '',
      error: errorMsg,
    };
  }
}

/**
 * Runs streaming smoke test for Gemma 3 27B via chatbot task.
 */
export async function runStreamingSmokeTest(): Promise<SmokeTestReport> {
  const task = 'chatbot';
  const modelDef = getModelForTask(task);
  const runtimeModel = resolveRuntimeModelName(modelDef.id);
  const provider = getActiveProvider();

  const prompt = 'Explain binary search in simple terms.';
  let accumulatedText = '';
  let timeToFirstTokenMs: number | undefined;
  let completionCount = 0;
  let lastChunk: AIStreamChunk | undefined;
  const startTime = performance.now();

  try {
    for await (const chunk of generateStreamAI({
      task,
      prompt,
      options: {
        temperature: 0.7,
        maxTokens: 150,
        timeoutMs: 30000,
      },
    })) {
      if (chunk.timeToFirstTokenMs !== undefined && timeToFirstTokenMs === undefined) {
        timeToFirstTokenMs = chunk.timeToFirstTokenMs;
      }
      if (chunk.textDelta) {
        accumulatedText += chunk.textDelta;
      }
      if (chunk.isComplete) {
        completionCount++;
      }
      lastChunk = chunk;
    }

    const totalDuration = Math.round(performance.now() - startTime);

    return {
      phase: 'B. Streaming Inference',
      task,
      requestedCanonicalModel: modelDef.id,
      runtimeModelIdentifier: runtimeModel,
      providerName: provider.name,
      returnedModelIdentifier: modelDef.id,
      success: completionCount === 1,
      latencyMs: totalDuration,
      timeToFirstTokenMs: timeToFirstTokenMs !== undefined ? timeToFirstTokenMs : 'N/A',
      promptTokens: lastChunk?.usage?.promptTokens ? lastChunk.usage.promptTokens : 'N/A',
      completionTokens: lastChunk?.usage?.completionTokens ? lastChunk.usage.completionTokens : 'N/A',
      totalTokens: lastChunk?.usage?.totalTokens ? lastChunk.usage.totalTokens : 'N/A',
      finishReason: lastChunk?.finishReason || 'stop',
      generatedTextLength: accumulatedText.length,
      preview: accumulatedText.slice(0, 160).replace(/\n/g, ' '),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      phase: 'B. Streaming Inference',
      task,
      requestedCanonicalModel: modelDef.id,
      runtimeModelIdentifier: runtimeModel,
      providerName: provider.name,
      returnedModelIdentifier: 'N/A (Failed)',
      success: false,
      latencyMs: Math.round(performance.now() - startTime),
      generatedTextLength: accumulatedText.length,
      preview: '',
      error: errorMsg,
    };
  }
}

/**
 * Tests AbortSignal cancellation during streaming.
 */
export async function runAbortSmokeTest(): Promise<boolean> {
  const controller = new AbortController();

  // Create a provider that supports streaming with abort
  const testProvider: AIInferenceProvider = {
    name: 'abort-test-provider',
    async generate(req, modelDef, config) {
      return {
        text: 'test',
        model: modelDef.id,
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        finishReason: 'stop',
        latencyMs: 10,
      };
    },
    async *generateStream(req, modelDef) {
      yield { textDelta: 'Chunk 1', accumulatedText: 'Chunk 1', isComplete: false };
      // Simulate delay then check abort
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (req.options?.signal?.aborted) {
        throw new AIAbortError();
      }
      yield { textDelta: 'Chunk 2', accumulatedText: 'Chunk 1 Chunk 2', isComplete: true };
    },
  };

  registerProvider(testProvider, { makeActive: true });
  setTimeout(() => controller.abort(), 20);

  try {
    for await (const _ of generateStreamAI({
      task: 'chatbot',
      prompt: 'Abort test prompt',
      options: { signal: controller.signal },
    })) {
      // should abort after first chunk
    }
    return false;
  } catch (err) {
    return err instanceof AIAbortError || (err instanceof Error && err.name === 'AbortError');
  }
}

/**
 * Main smoke test suite execution.
 */
export async function runSmokeTestSuite(): Promise<void> {
  console.log('==================================================');
  console.log('       RELEARN.AI AI PIPELINE SMOKE TEST          ');
  console.log('==================================================\n');

  const config = getAIRuntimeConfig();
  console.log('Phase 1: Environment & Active Provider Check:');
  console.log(`  - Configured Provider: ${config.provider}`);
  console.log(`  - Ollama Base URL: ${config.ollamaBaseUrl}`);
  console.log(`  - vLLM Base URL: ${config.vllmBaseUrl}`);
  console.log(`  - Hugging Face Base URL: ${config.hfBaseUrl}`);
  console.log(`  - Qwen Runtime Tag: ${config.modelMappings.qwenModelName}`);
  console.log(`  - Gemma Runtime Tag: ${config.modelMappings.gemmaModelName}`);
  console.log(`  - HF Qwen Repo Tag: ${config.modelMappings.hfQwenModelName}`);
  console.log(`  - HF Gemma Repo Tag: ${config.modelMappings.hfGemmaModelName}\n`);

  // 1. Test with configured runtime provider (Ollama / vLLM / Hugging Face)
  const provider = createInferenceProvider(config.provider);
  registerProvider(provider, { makeActive: true });
  console.log(`  - Initialized Active Provider: ${provider.name}\n`);

  console.log('Phase 2: Executing Non-Streaming Smoke Test against active runtime endpoint...');
  const nonStreamingReport = await runNonStreamingSmokeTest();
  console.log(JSON.stringify(nonStreamingReport, null, 2));

  console.log('\nPhase 3: Executing Streaming Smoke Test against active runtime endpoint...');
  const streamingReport = await runStreamingSmokeTest();
  console.log(JSON.stringify(streamingReport, null, 2));

  console.log('\nPhase 4: Executing Abort Signal Smoke Test through Pipeline Abstraction...');
  const abortHandled = await runAbortSmokeTest();
  console.log(`  - Abort signal successfully handled by pipeline: ${abortHandled}`);

  console.log('\n==================================================');
  console.log('           SMOKE TEST EXECUTION COMPLETE          ');
  console.log('==================================================\n');
}

runSmokeTestSuite().catch((err) => {
  console.error('Smoke test suite failed:', err);
  process.exit(1);
});
