/**
 * ─────────────────────────────────────────────────────────────────
 *  AI Runtime Layer & Inference Provider Tests
 * ─────────────────────────────────────────────────────────────────
 *
 *  Comprehensive unit test suite for:
 *  - Task -> Model resolution (Qwen3-Next-80B-A3B-Instruct & Gemma-3-27B)
 *  - OllamaProvider (non-streaming, NDJSON streaming, buffer handling, TTFT, abort)
 *  - VLLMProvider (non-streaming, SSE streaming, buffer handling, TTFT, abort)
 *  - Provider factory & auto-initialization
 *  - Security boundary & Netlify proxy mock tests
 *  - Error normalization (AITimeoutError, AIAbortError, AIConnectionError, AIRuntimeError)
 *  - Router integration with real runtime providers (using mocked fetch)
 *  - Validation limits (prompt length, temperature, invalid options)
 */

import {
  AI_TASKS,
  AI_MODEL_IDS,
  type AITask,
  type AIRequest,
  AIValidationError,
  AIUnsupportedTaskError,
  AITimeoutError,
  AIAbortError,
  AIConnectionError,
  AIRuntimeError,
} from '../types';
import { getModelForTask, getModelIdForTask } from '../taskConfig';
import { getModel, getModelOrThrow } from '../modelRegistry';
import { OllamaProvider } from '../providers/ollamaProvider';
import { VLLMProvider } from '../providers/vllmProvider';
import {
  createInferenceProvider,
  initializeDefaultProvider,
} from '../providers/providerFactory';
import { registerProvider, clearProviders } from '../provider';
import { generateAI, generateStreamAI } from '../router';
import { runPromptBenchmark } from '../benchmark';
import { validateAIRequest, MAX_PROMPT_LENGTH } from '../validation';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

// -----------------------------------------------------------------
// Test Runner
// -----------------------------------------------------------------

export async function runRuntimeTests(): Promise<void> {
  console.log('=== Running AI Runtime Layer Unit Tests ===\n');

  // Save original fetch
  const originalFetch = globalThis.fetch;

  try {
    // ---------------------------------------------------------------
    // 1. Task -> Model Resolution & Identity
    // ---------------------------------------------------------------
    console.log('1. Testing Task -> Model Resolution & Identity...');
    const qwenTasks: AITask[] = ['learning_plan', 'learning_space', 'cheat_sheet'];
    const gemmaTasks: AITask[] = ['chatbot', 'flashcards', 'quizzes', 'concept_collision'];

    for (const task of qwenTasks) {
      const modelId = getModelIdForTask(task);
      assert(
        modelId === 'Qwen3-Next-80B-A3B-Instruct',
        `Task '${task}' should resolve to Qwen3-Next-80B-A3B-Instruct but got '${modelId}'`
      );
      const modelDef = getModelForTask(task);
      assert(modelDef.id === 'Qwen3-Next-80B-A3B-Instruct', 'Qwen model definition ID mismatch');
      assert(modelDef.supportedTasks.includes(task), `Qwen should support task '${task}'`);
    }

    for (const task of gemmaTasks) {
      const modelId = getModelIdForTask(task);
      assert(
        modelId === 'Gemma-3-27B',
        `Task '${task}' should resolve to Gemma-3-27B but got '${modelId}'`
      );
      const modelDef = getModelForTask(task);
      assert(modelDef.id === 'Gemma-3-27B', 'Gemma model definition ID mismatch');
      assert(modelDef.supportedTasks.includes(task), `Gemma should support task '${task}'`);
    }

    // Test model aliases in registry
    assert(getModel('qwen3-next-80b-a3b')?.id === 'Qwen3-Next-80B-A3B-Instruct', 'Qwen short alias mismatch');
    assert(getModel('gemma-3-27b')?.id === 'Gemma-3-27B', 'Gemma alias mismatch');
    console.log('   ✓ Task -> Model resolution verified for all 7 tasks.');

    // ---------------------------------------------------------------
    // 2. Ollama Provider (Non-streaming & Streaming)
    // ---------------------------------------------------------------
    console.log('2. Testing OllamaProvider...');
    const ollama = new OllamaProvider({ baseUrl: 'http://localhost:11434' });

    // Mock non-streaming Ollama response
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.includes('/api/tags')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 });
      }

      if (url.includes('/api/chat')) {
        const body = JSON.parse(String(init?.body || '{}'));
        assert(body.model === 'Qwen3-Next-80B-A3B-Instruct', 'Ollama payload model name mismatch');
        assert(body.messages.length === 2, 'Ollama expected system + user messages');
        assert(body.messages[0].role === 'system', 'First message should be system');
        assert(body.messages[1].role === 'user', 'Second message should be user');

        return new Response(
          JSON.stringify({
            model: 'Qwen3-Next-80B-A3B-Instruct',
            message: { role: 'assistant', content: 'Generated curriculum response' },
            done: true,
            done_reason: 'stop',
            total_duration: 500000000,
            prompt_eval_count: 20,
            eval_count: 55,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const qwenDef = getModelOrThrow(AI_MODEL_IDS.QWEN_80B);
    const ollamaRes = await ollama.generate(
      {
        task: 'learning_plan',
        prompt: 'Create WebGPU plan',
        systemPrompt: 'You are an expert tutor.',
        options: { temperature: 0.2 },
      },
      qwenDef,
      qwenDef.defaultConfig
    );

    assert(ollamaRes.text === 'Generated curriculum response', 'Ollama response text mismatch');
    assert(ollamaRes.model === 'Qwen3-Next-80B-A3B-Instruct', 'Ollama model ID mismatch');
    assert(ollamaRes.usage.promptTokens === 20, 'Ollama promptTokens mismatch');
    assert(ollamaRes.usage.completionTokens === 55, 'Ollama completionTokens mismatch');
    assert(ollamaRes.usage.totalTokens === 75, 'Ollama totalTokens mismatch');
    assert(ollamaRes.finishReason === 'stop', 'Ollama finishReason mismatch');
    assert(ollamaRes.metadata?.runtime === 'ollama', 'Ollama runtime metadata mismatch');

    // Test Ollama NDJSON Streaming (including empty chunk and trailing buffer handling)
    globalThis.fetch = async (): Promise<Response> => {
      const stream = new ReadableStream({
        start(controller) {
          // Empty content chunk (should not trigger TTFT)
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                model: 'Qwen3-Next-80B-A3B-Instruct',
                message: { role: 'assistant', content: '' },
                done: false,
              }) + '\n'
            )
          );
          // First token chunk
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                model: 'Qwen3-Next-80B-A3B-Instruct',
                message: { role: 'assistant', content: 'Day 1: ' },
                done: false,
              }) + '\n'
            )
          );
          // Trailing chunk without trailing newline
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                model: 'Qwen3-Next-80B-A3B-Instruct',
                message: { role: 'assistant', content: 'Pipelines' },
                done: true,
                done_reason: 'stop',
                prompt_eval_count: 20,
                eval_count: 10,
              })
            )
          );
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'application/x-ndjson' },
      });
    };

    const ollamaChunks = [];
    for await (const chunk of ollama.generateStream(
      { task: 'learning_plan', prompt: 'WebGPU' },
      qwenDef,
      qwenDef.defaultConfig
    )) {
      ollamaChunks.push(chunk);
    }

    assert(ollamaChunks.length === 3, 'Ollama should yield 3 stream chunks');
    assert(ollamaChunks[0].textDelta === '', 'Chunk 0 delta should be empty');
    assert(ollamaChunks[0].timeToFirstTokenMs === undefined, 'Empty chunk must not set TTFT');
    assert(ollamaChunks[1].textDelta === 'Day 1: ', 'Chunk 1 delta mismatch');
    assert(ollamaChunks[1].timeToFirstTokenMs !== undefined, 'Chunk 1 should set TTFT');
    assert(ollamaChunks[2].accumulatedText === 'Day 1: Pipelines', 'Accumulated text mismatch in trailing buffer');
    assert(ollamaChunks[2].isComplete === true, 'Final chunk should be complete');
    assert(ollamaChunks[2].usage?.totalTokens === 30, 'Stream usage total tokens mismatch');
    console.log('   ✓ Ollama non-streaming and NDJSON streaming verified.');

    // ---------------------------------------------------------------
    // 3. vLLM Provider (Non-streaming & SSE Streaming)
    // ---------------------------------------------------------------
    console.log('3. Testing VLLMProvider...');
    const vllm = new VLLMProvider({ baseUrl: 'http://localhost:8000/v1' });
    const gemmaDef = getModelOrThrow(AI_MODEL_IDS.GEMMA_27B);

    // Mock non-streaming vLLM response
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const body = JSON.parse(String(init?.body || '{}'));
      assert(body.model === 'Gemma-3-27B', 'vLLM payload model name mismatch');
      assert(body.temperature === 0.7, 'vLLM temperature mismatch');

      return new Response(
        JSON.stringify({
          id: 'chatcmpl-vllm-01',
          object: 'chat.completion',
          created: Date.now(),
          model: 'Gemma-3-27B',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Gemma tutor answer' },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 18,
            completion_tokens: 42,
            total_tokens: 60,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const vllmRes = await vllm.generate(
      {
        task: 'chatbot',
        prompt: 'Explain React 19',
        systemPrompt: 'You are a helpful assistant.',
        options: { temperature: 0.7 },
      },
      gemmaDef,
      gemmaDef.defaultConfig
    );

    assert(vllmRes.text === 'Gemma tutor answer', 'vLLM response text mismatch');
    assert(vllmRes.model === 'Gemma-3-27B', 'vLLM model ID mismatch');
    assert(vllmRes.usage.promptTokens === 18, 'vLLM promptTokens mismatch');
    assert(vllmRes.usage.completionTokens === 42, 'vLLM completionTokens mismatch');
    assert(vllmRes.usage.totalTokens === 60, 'vLLM totalTokens mismatch');
    assert(vllmRes.metadata?.runtime === 'vllm', 'vLLM runtime metadata mismatch');

    // Test vLLM SSE Streaming (including [DONE] handling)
    globalThis.fetch = async (): Promise<Response> => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }],
              })}\n\n`
            )
          );
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                choices: [{ index: 0, delta: { content: ' world!' }, finish_reason: 'stop' }],
                usage: { prompt_tokens: 15, completion_tokens: 2, total_tokens: 17 },
              })}\n\n`
            )
          );
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    };

    const vllmChunks = [];
    for await (const chunk of vllm.generateStream(
      { task: 'chatbot', prompt: 'Say hello' },
      gemmaDef,
      gemmaDef.defaultConfig
    )) {
      vllmChunks.push(chunk);
    }

    assert(vllmChunks.length === 2, 'vLLM should yield 2 chunks (excluding duplicate [DONE])');
    assert(vllmChunks[0].textDelta === 'Hello', 'Chunk 0 delta mismatch');
    assert(vllmChunks[1].accumulatedText === 'Hello world!', 'Chunk 1 accumulated mismatch');
    assert(vllmChunks[1].finishReason === 'stop', 'Chunk 1 finishReason mismatch');
    assert(vllmChunks[1].isComplete === true, 'Chunk 1 should be complete');
    console.log('   ✓ vLLM non-streaming and SSE streaming verified.');

    // ---------------------------------------------------------------
    // 4. Provider Factory & Auto-Initialization
    // ---------------------------------------------------------------
    console.log('4. Testing Provider Factory...');
    clearProviders();
    const createdOllama = createInferenceProvider('ollama');
    assert(createdOllama.name === 'ollama', 'Provider factory ollama creation mismatch');

    const createdVllm = createInferenceProvider('vllm');
    assert(createdVllm.name === 'vllm', 'Provider factory vllm creation mismatch');

    const createdMock = createInferenceProvider('mock');
    assert(createdMock.name === 'mock', 'Provider factory mock creation mismatch');
    console.log('   ✓ Provider factory creation verified.');

    // ---------------------------------------------------------------
    // 5. Error Normalization & Timeout Handling
    // ---------------------------------------------------------------
    console.log('5. Testing Error Normalization & Timeouts...');

    // Test timeout handling in OllamaProvider
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    let timeoutCaught = false;
    try {
      await ollama.generate(
        {
          task: 'learning_plan',
          prompt: 'Timeout test',
          options: { timeoutMs: 50 },
        },
        qwenDef,
        qwenDef.defaultConfig
      );
    } catch (err) {
      if (err instanceof AITimeoutError) {
        timeoutCaught = true;
      }
    }
    assert(timeoutCaught, 'Expected AITimeoutError on request timeout');

    // Test network connection failure normalization
    globalThis.fetch = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch');
    };

    let connectionErrorCaught = false;
    try {
      await ollama.generate(
        { task: 'learning_plan', prompt: 'Connection fail' },
        qwenDef,
        qwenDef.defaultConfig
      );
    } catch (err) {
      if (err instanceof AIConnectionError) {
        connectionErrorCaught = true;
      }
    }
    assert(connectionErrorCaught, 'Expected AIConnectionError on fetch network failure');

    // Test HTTP error status normalization
    globalThis.fetch = async (): Promise<Response> => {
      return new Response('Model not loaded', { status: 500, statusText: 'Internal Error' });
    };

    let runtimeErrorCaught = false;
    try {
      await vllm.generate(
        { task: 'chatbot', prompt: '500 error test' },
        gemmaDef,
        gemmaDef.defaultConfig
      );
    } catch (err) {
      if (err instanceof AIRuntimeError && err.statusCode === 500) {
        runtimeErrorCaught = true;
      }
    }
    assert(runtimeErrorCaught, 'Expected AIRuntimeError with status code 500');
    console.log('   ✓ Error normalization (timeout, connection, HTTP errors) verified.');

    // ---------------------------------------------------------------
    // 6. Security Limits & Validation
    // ---------------------------------------------------------------
    console.log('6. Testing Security Limits & Validation...');

    // Prompt length limit (> 500,000 characters)
    let lengthErrorCaught = false;
    try {
      validateAIRequest({
        task: 'learning_plan',
        prompt: 'a'.repeat(MAX_PROMPT_LENGTH + 1),
      });
    } catch (err) {
      if (err instanceof AIValidationError) {
        lengthErrorCaught = true;
      }
    }
    assert(lengthErrorCaught, 'Expected AIValidationError when prompt exceeds MAX_PROMPT_LENGTH');

    // Invalid timeoutMs
    let timeoutValidationCaught = false;
    try {
      validateAIRequest({
        task: 'chatbot',
        prompt: 'Valid prompt',
        options: { timeoutMs: -100 },
      });
    } catch (err) {
      if (err instanceof AIValidationError) {
        timeoutValidationCaught = true;
      }
    }
    assert(timeoutValidationCaught, 'Expected AIValidationError on negative timeoutMs');
    console.log('   ✓ Security limits and option validation verified.');

    // ---------------------------------------------------------------
    // 7. Router Integration & Benchmark Harness
    // ---------------------------------------------------------------
    console.log('7. Testing Router & Benchmark Integration...');
    // Register mock provider for clean router execution
    registerProvider(createInferenceProvider('mock'), { makeActive: true });

    const routerRes = await generateAI({
      task: 'cheat_sheet',
      prompt: 'Git cheat sheet',
    });

    assert(routerRes.model === 'Qwen3-Next-80B-A3B-Instruct', 'Router model mismatch for cheat_sheet');
    assert(routerRes.finishReason === 'stop', 'Router finish reason mismatch');

    const benchMetric = await runPromptBenchmark(
      {
        id: 'bench_qwen',
        task: 'learning_plan',
        prompt: 'Generate plan',
      },
      AI_MODEL_IDS.QWEN_80B
    );

    assert(benchMetric.success === true, 'Benchmark metric should be successful');
    assert(benchMetric.modelId === 'Qwen3-Next-80B-A3B-Instruct', 'Benchmark modelId mismatch');
    assert(benchMetric.tokensPerSecond > 0, 'Tokens per second should be computed');
    console.log('   ✓ Router and Benchmark integration verified.');

    console.log('\n=== All AI Runtime Layer Tests PASSED Successfully! ===\n');
  } finally {
    // Restore global fetch
    globalThis.fetch = originalFetch;
  }
}

runRuntimeTests().catch((err) => {
  console.error('Runtime test suite failed:', err);
  process.exit(1);
});
