/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Benchmark Runner & Model Evaluation Harness
 * ─────────────────────────────────────────────────────────────────
 *
 *  Enables evaluating Qwen3-Next-80B-A3B and Gemma 3 27B across identical
 *  prompts and task payloads. Measures latency, throughput (tokens/sec),
 *  output length, finish reason, and success rates.
 */

import {
  type AIModelId,
  type AIRequest,
  type AITask,
  type BenchmarkPrompt,
  type BenchmarkRunMetric,
  type BenchmarkSuiteResult,
  type ModelBenchmarkSummary,
} from './types';
import { generateAI } from './router';
import { getModelOrThrow } from './modelRegistry';

export type {
  BenchmarkPrompt,
  BenchmarkRunMetric,
  BenchmarkSuiteResult,
  ModelBenchmarkSummary,
};

// -----------------------------------------------------------------
// Benchmark Execution Functions
// -----------------------------------------------------------------

/**
 * Executes a single benchmark prompt against a specific target model.
 */
export async function runPromptBenchmark(
  promptConfig: BenchmarkPrompt,
  targetModelId: AIModelId
): Promise<BenchmarkRunMetric> {
  const modelDef = getModelOrThrow(targetModelId);
  const startTime = performance.now();

  try {
    const request: AIRequest = {
      task: promptConfig.task,
      prompt: promptConfig.prompt,
      systemPrompt: promptConfig.systemPrompt,
      options: {
        ...promptConfig.options,
        overrideModel: targetModelId,
        responseFormat: promptConfig.expectedFormat,
      },
    };

    const response = await generateAI(request);
    const totalDurationMs = Math.max(1, response.latencyMs || Math.round(performance.now() - startTime));
    const completionTokens = response.usage.completionTokens;
    const tokensPerSecond = Number(
      ((completionTokens / totalDurationMs) * 1000).toFixed(2)
    );

    const actualRuntimeModel = String(
      response.metadata?.runtimeModel || response.model || targetModelId
    );
    const providerName = String(response.metadata?.provider || 'unknown');

    return {
      promptId: promptConfig.id,
      task: promptConfig.task,
      canonicalModel: modelDef.id,
      modelId: targetModelId,
      actualRuntimeModelIdentifier: actualRuntimeModel,
      provider: providerName,
      latencyMs: totalDurationMs,
      timeToFirstTokenMs: response.timeToFirstTokenMs,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      tokensPerSecond,
      finishReason: response.finishReason,
      success: true,
      outputPreview: response.text.slice(0, 120),
      generatedResponse: response.text,
    };
  } catch (err: unknown) {
    const totalDurationMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : String(err);

    return {
      promptId: promptConfig.id,
      task: promptConfig.task,
      canonicalModel: modelDef.id,
      modelId: targetModelId,
      actualRuntimeModelIdentifier: targetModelId,
      provider: 'unknown',
      latencyMs: totalDurationMs,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      tokensPerSecond: 0,
      finishReason: 'error',
      success: false,
      error: errorMessage,
      outputPreview: '',
      generatedResponse: '',
    };
  }
}

/**
 * Runs a benchmark suite across multiple prompts and models, summarizing aggregate metrics.
 */
export async function runBenchmarkSuite(
  prompts: readonly BenchmarkPrompt[],
  targetModelIds: readonly AIModelId[]
): Promise<BenchmarkSuiteResult> {
  const runs: BenchmarkRunMetric[] = [];

  for (const promptConfig of prompts) {
    const iterations = promptConfig.iterations || 1;

    for (const modelId of targetModelIds) {
      for (let i = 0; i < iterations; i++) {
        const result = await runPromptBenchmark(promptConfig, modelId);
        runs.push(result);
      }
    }
  }

  // Aggregate summaries per model
  const modelSummaries: Record<string, ModelBenchmarkSummary> = {};

  for (const modelId of targetModelIds) {
    const modelRuns = runs.filter((r) => r.modelId === modelId);
    const successfulRuns = modelRuns.filter((r) => r.success);

    const totalRuns = modelRuns.length;
    const successRate = totalRuns > 0 ? (successfulRuns.length / totalRuns) * 100 : 0;

    const latencies = successfulRuns.map((r) => r.latencyMs);
    const avgLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
    const minLatencyMs = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : 0;

    const tpsList = successfulRuns.map((r) => r.tokensPerSecond);
    const avgTokensPerSecond =
      tpsList.length > 0
        ? Number((tpsList.reduce((a, b) => a + b, 0) / tpsList.length).toFixed(2))
        : 0;

    const totalTokensGenerated = successfulRuns.reduce(
      (sum, r) => sum + r.completionTokens,
      0
    );

    const providerName = runs.find((r) => r.modelId === modelId)?.provider;

    modelSummaries[modelId] = {
      modelId,
      provider: providerName,
      totalRuns,
      successRate,
      avgLatencyMs,
      minLatencyMs,
      maxLatencyMs,
      avgTokensPerSecond,
      totalTokensGenerated,
    };
  }

  return {
    timestamp: new Date().toISOString(),
    runs,
    modelSummaries,
  };
}

/**
 * Standard benchmark suite for comparing task performance between models.
 */
export const STANDARD_BENCHMARK_PROMPTS: readonly BenchmarkPrompt[] = [
  {
    id: 'plan_gen_01',
    task: 'learning_plan',
    prompt: 'Generate a 5-day introductory curriculum for TypeScript generics with daily goals.',
    expectedFormat: 'json',
  },
  {
    id: 'cheat_sheet_01',
    task: 'cheat_sheet',
    prompt: 'Create a concise cheat sheet for CSS Grid layout properties and use cases.',
    expectedFormat: 'text',
  },
];
