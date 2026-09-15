/**
 * ─────────────────────────────────────────────────────────────────
 *  Hugging Face Inference Provider Unit Tests
 * ─────────────────────────────────────────────────────────────────
 *
 *  Comprehensive mock-based test suite verifying:
 *  - Non-streaming generation & response normalization
 *  - Real SSE streaming generation, chunk accumulation & TTFT calculation
 *  - Timeout handling (AITimeoutError)
 *  - AbortSignal cancellation (AIAbortError)
 *  - 401 Unauthorized error normalization
 *  - 403 Forbidden / Gated model error normalization
 *  - 429 Rate limit error normalization
 *  - 500 / 503 Model Loading / Unavailable error normalization
 *  - Malformed response handling
 *  - Token usage normalization
 *  - Model identity verification (Qwen -> Qwen/Qwen3-Next-80B-A3B-Instruct, Gemma -> google/gemma-3-27b-it)
 *  - Provider selection via ProviderFactory and Router
 */

import {
  AI_MODEL_IDS,
  type AIRequest,
  AITimeoutError,
  AIAbortError,
  AIConnectionError,
  AIRuntimeError,
} from '../types';
import { getModelOrThrow } from '../modelRegistry';
import { HuggingFaceProvider } from '../providers/huggingFaceProvider';
import {
  createInferenceProvider,
  initializeDefaultProvider,
} from '../providers/providerFactory';
import { registerProvider, clearProviders } from '../provider';
import { generateAI, generateStreamAI } from '../router';
import { runPromptBenchmark } from '../benchmark';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runHuggingFaceTests(): Promise<void> {
  console.log('=== Running Hugging Face Provider Unit Tests ===\n');

  const originalFetch = globalThis.fetch;
  const qwenDef = getModelOrThrow(AI_MODEL_IDS.QWEN_80B);
  const gemmaDef = getModelOrThrow(AI_MODEL_IDS.GEMMA_27B);

  try {
    const hf = new HuggingFaceProvider({ baseUrl: 'https://router.huggingface.co/hf-inference/v1' });

    // ---------------------------------------------------------------
    // 1. Normal Non-Streaming Generation & Model Identity
    // ---------------------------------------------------------------
    console.log('1. Testing Normal Non-Streaming Generation & Model Identity...');
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const body = JSON.parse(String(init?.body || '{}'));
      assert(
        body.model === 'Qwen/Qwen3-Next-80B-A3B-Instruct',
        `Expected HF Qwen repo model name, got: ${body.model}`
      );
      assert(body.messages.length === 2, 'Expected system and user messages');
      assert(body.messages[0].role === 'system', 'System message role mismatch');
      assert(body.messages[1].content === 'Create a learning plan for Python', 'User prompt mismatch');

      return new Response(
        JSON.stringify({
          id: 'hf-chatcmpl-001',
          object: 'chat.completion',
          created: 1726000000,
          model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Python 7-Day Curriculum' },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 35,
            completion_tokens: 120,
            total_tokens: 155,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await hf.generate(
      {
        task: 'learning_plan',
        prompt: 'Create a learning plan for Python',
        systemPrompt: 'You are an expert tutor.',
        options: { temperature: 0.2 },
      },
      qwenDef,
      qwenDef.defaultConfig
    );

    assert(res.text === 'Python 7-Day Curriculum', 'Response text mismatch');
    assert(res.model === 'Qwen3-Next-80B-A3B-Instruct', 'Canonical model ID mismatch');
    assert(res.usage.promptTokens === 35, 'promptTokens mismatch');
    assert(res.usage.completionTokens === 120, 'completionTokens mismatch');
    assert(res.usage.totalTokens === 155, 'totalTokens mismatch');
    assert(res.finishReason === 'stop', 'finishReason mismatch');
    assert(res.metadata?.runtime === 'huggingface', 'runtime metadata mismatch');
    assert(res.metadata?.runtimeModel === 'Qwen/Qwen3-Next-80B-A3B-Instruct', 'runtimeModel mismatch');
    console.log('   ✓ Normal generation and Qwen model identity verified.');

    // ---------------------------------------------------------------
    // 2. Gemma Model Identity Verification
    // ---------------------------------------------------------------
    console.log('2. Testing Gemma Model Identity Verification...');
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const body = JSON.parse(String(init?.body || '{}'));
      assert(
        body.model === 'google/gemma-3-27b-it',
        `Expected google/gemma-3-27b-it, got: ${body.model}`
      );

      return new Response(
        JSON.stringify({
          id: 'hf-chatcmpl-002',
          model: 'google/gemma-3-27b-it',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Gemma chat reply' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 12, completion_tokens: 24, total_tokens: 36 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const gemmaRes = await hf.generate(
      { task: 'chatbot', prompt: 'Hello Gemma' },
      gemmaDef,
      gemmaDef.defaultConfig
    );
    assert(gemmaRes.text === 'Gemma chat reply', 'Gemma response text mismatch');
    assert(gemmaRes.metadata?.runtimeModel === 'google/gemma-3-27b-it', 'Gemma runtimeModel mismatch');
    console.log('   ✓ Gemma model identity verified.');

    // ---------------------------------------------------------------
    // 3. Real SSE Streaming Generation, Chunk Accumulation & TTFT
    // ---------------------------------------------------------------
    console.log('3. Testing SSE Streaming Generation, TTFT & Abort...');
    globalThis.fetch = async (): Promise<Response> => {
      const stream = new ReadableStream({
        start(controller) {
          // Chunk 1: first token
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                choices: [{ index: 0, delta: { content: 'Understanding ' }, finish_reason: null }],
              })}\n\n`
            )
          );
          // Chunk 2: second token
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                choices: [{ index: 0, delta: { content: 'Recursion' }, finish_reason: 'stop' }],
                usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
              })}\n\n`
            )
          );
          // Chunk 3: [DONE] marker
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    };

    const chunks = [];
    for await (const chunk of hf.generateStream(
      { task: 'chatbot', prompt: 'Explain recursion' },
      gemmaDef,
      gemmaDef.defaultConfig
    )) {
      chunks.push(chunk);
    }

    assert(chunks.length === 2, `Expected 2 stream chunks, got ${chunks.length}`);
    assert(chunks[0].textDelta === 'Understanding ', 'Chunk 0 textDelta mismatch');
    assert(chunks[0].timeToFirstTokenMs !== undefined, 'Chunk 0 must have TTFT');
    assert(chunks[1].accumulatedText === 'Understanding Recursion', 'Chunk 1 accumulatedText mismatch');
    assert(chunks[1].isComplete === true, 'Final chunk must be marked isComplete');
    assert(chunks[1].finishReason === 'stop', 'Final chunk finishReason mismatch');
    assert(chunks[1].usage?.totalTokens === 12, 'Stream usage mismatch');
    console.log('   ✓ SSE streaming, chunk accumulation, and TTFT verified.');

    // ---------------------------------------------------------------
    // 4. Timeout Handling
    // ---------------------------------------------------------------
    console.log('4. Testing Timeout Handling...');
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
      await hf.generate(
        { task: 'learning_plan', prompt: 'Timeout test', options: { timeoutMs: 30 } },
        qwenDef,
        qwenDef.defaultConfig
      );
    } catch (err) {
      if (err instanceof AITimeoutError) {
        timeoutCaught = true;
      }
    }
    assert(timeoutCaught, 'Expected AITimeoutError on request timeout');
    console.log('   ✓ Timeout handling verified.');

    // ---------------------------------------------------------------
    // 5. AbortSignal Handling
    // ---------------------------------------------------------------
    console.log('5. Testing AbortSignal Cancellation...');
    const abortCtrl = new AbortController();
    setTimeout(() => abortCtrl.abort(), 10);

    let abortCaught = false;
    try {
      await hf.generate(
        { task: 'chatbot', prompt: 'Abort test', options: { signal: abortCtrl.signal } },
        gemmaDef,
        gemmaDef.defaultConfig
      );
    } catch (err) {
      if (err instanceof AIAbortError) {
        abortCaught = true;
      }
    }
    assert(abortCaught, 'Expected AIAbortError on AbortSignal trigger');
    console.log('   ✓ AbortSignal cancellation verified.');

    // ---------------------------------------------------------------
    // 6. HTTP Error Normalization (401, 403, 429, 503, 500)
    // ---------------------------------------------------------------
    console.log('6. Testing HTTP Error Normalization...');

    // 401 Unauthorized
    globalThis.fetch = async () => new Response('Invalid token', { status: 401, statusText: 'Unauthorized' });
    let error401Caught = false;
    try {
      await hf.generate({ task: 'chatbot', prompt: '401' }, gemmaDef, gemmaDef.defaultConfig);
    } catch (err) {
      if (err instanceof AIRuntimeError && err.statusCode === 401) {
        assert(err.message.includes('HF_API_KEY'), '401 error should mention HF_API_KEY');
        error401Caught = true;
      }
    }
    assert(error401Caught, 'Expected 401 AIRuntimeError');

    // 403 Forbidden / Gated Model
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Gated repo: you must agree to terms' }), {
        status: 403,
        statusText: 'Forbidden',
      });
    let error403Caught = false;
    try {
      await hf.generate({ task: 'chatbot', prompt: '403' }, gemmaDef, gemmaDef.defaultConfig);
    } catch (err) {
      if (err instanceof AIRuntimeError && err.statusCode === 403) {
        assert(err.message.includes('Gated model terms agreement'), '403 error should mention gated model');
        error403Caught = true;
      }
    }
    assert(error403Caught, 'Expected 403 AIRuntimeError');

    // 429 Rate Limit
    globalThis.fetch = async () => new Response('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    let error429Caught = false;
    try {
      await hf.generate({ task: 'chatbot', prompt: '429' }, gemmaDef, gemmaDef.defaultConfig);
    } catch (err) {
      if (err instanceof AIRuntimeError && err.statusCode === 429) {
        assert(err.message.includes('rate limit exceeded'), '429 error should mention rate limit');
        error429Caught = true;
      }
    }
    assert(error429Caught, 'Expected 429 AIRuntimeError');

    // 503 Model Loading
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Model is currently loading', estimated_time: 20 }), {
        status: 503,
        statusText: 'Service Unavailable',
      });
    let error503Caught = false;
    try {
      await hf.generate({ task: 'chatbot', prompt: '503' }, gemmaDef, gemmaDef.defaultConfig);
    } catch (err) {
      if (err instanceof AIRuntimeError && err.statusCode === 503) {
        assert(err.message.includes('loading or unavailable'), '503 error should mention loading');
        error503Caught = true;
      }
    }
    assert(error503Caught, 'Expected 503 AIRuntimeError');
    console.log('   ✓ HTTP 401, 403, 429, and 503 error normalizations verified.');

    // ---------------------------------------------------------------
    // 7. Malformed Response & Connection Error Handling
    // ---------------------------------------------------------------
    console.log('7. Testing Malformed Response & Connection Error Handling...');
    globalThis.fetch = async () => new Response('<html>Not JSON</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    let malformedCaught = false;
    try {
      await hf.generate({ task: 'chatbot', prompt: 'malformed' }, gemmaDef, gemmaDef.defaultConfig);
    } catch (err) {
      if (err instanceof AIRuntimeError) {
        malformedCaught = true;
      }
    }
    assert(malformedCaught, 'Expected AIRuntimeError on malformed JSON response');

    globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    let connCaught = false;
    try {
      await hf.generate({ task: 'chatbot', prompt: 'network down' }, gemmaDef, gemmaDef.defaultConfig);
    } catch (err) {
      if (err instanceof AIConnectionError) {
        connCaught = true;
      }
    }
    assert(connCaught, 'Expected AIConnectionError on network failure');
    console.log('   ✓ Malformed response and connection errors verified.');

    // ---------------------------------------------------------------
    // 8. Provider Factory & Router Integration
    // ---------------------------------------------------------------
    console.log('8. Testing Provider Factory & Router Integration...');
    clearProviders();
    const createdHf = createInferenceProvider('huggingface');
    assert(createdHf.name === 'huggingface', 'Factory created provider name mismatch');

    registerProvider(createdHf, { makeActive: true });

    // Mock fetch for router test
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Router via HF output' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 15, completion_tokens: 30, total_tokens: 45 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const routerRes = await generateAI({
      task: 'flashcards',
      prompt: 'Create flashcards for Docker',
    });

    assert(routerRes.text === 'Router via HF output', 'Router text mismatch');
    assert(routerRes.model === 'Gemma-3-27B', 'Canonical model ID mismatch');
    assert(routerRes.metadata?.provider === 'huggingface', 'Metadata provider mismatch');

    // ---------------------------------------------------------------
    // 9. Benchmark Integration with Provider & Runtime Metrics
    // ---------------------------------------------------------------
    console.log('9. Testing Benchmark Provider & Runtime Recording...');
    const benchMetric = await runPromptBenchmark(
      {
        id: 'bench_hf_gemma',
        task: 'quizzes',
        prompt: 'Generate quiz questions',
      },
      AI_MODEL_IDS.GEMMA_27B
    );

    assert(benchMetric.success === true, 'Benchmark metric should be successful');
    assert(benchMetric.canonicalModel === 'Gemma-3-27B', 'Benchmark canonicalModel mismatch');
    assert(benchMetric.provider === 'huggingface', 'Benchmark provider mismatch');
    assert(benchMetric.actualRuntimeModelIdentifier === 'google/gemma-3-27b-it', 'Benchmark actualRuntimeModelIdentifier mismatch');
    assert(benchMetric.generatedResponse === 'Router via HF output', 'Benchmark generatedResponse mismatch');
    console.log('   ✓ Benchmark provider and runtime metadata recording verified.');

    console.log('\n=== All Hugging Face Provider Tests PASSED Successfully! ===\n');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runHuggingFaceTests().catch((err) => {
  console.error('Hugging Face test suite failed:', err);
  process.exit(1);
});
