import { config } from 'dotenv';
config();

import { generateAI, isRetryableProviderError } from '../src/services/ai/pipeline';
import { GroqProvider } from '../src/services/ai/pipeline/providers/groqProvider';

async function testPipeline() {
  console.log('--- Testing Groq-Exclusive AI Pipeline ---');

  // Test 1: Verify isRetryableProviderError classification
  console.log('\n[Test 1] Error Classification:');
  const { AIRuntimeError, AIValidationError, AITimeoutError } = await import('../src/services/ai/pipeline/types');
  const err401 = new AIRuntimeError('Unauthorized', 401);
  const err429 = new AIRuntimeError('Rate limit reached', 429);
  const err500 = new AIRuntimeError('Internal Server Error', 500);
  const errTimeout = new AITimeoutError(60000);
  const errValidation = new AIValidationError('Invalid prompt');
  const errNetwork = new Error('fetch failed: network error');

  console.log('401 retryable?', isRetryableProviderError(err401).isRetryable === false ? 'PASS (non-retryable)' : 'FAIL');
  console.log('429 retryable?', isRetryableProviderError(err429).isRetryable === true ? 'PASS (retryable)' : 'FAIL');
  console.log('500 retryable?', isRetryableProviderError(err500).isRetryable === true ? 'PASS (retryable)' : 'FAIL');
  console.log('Timeout retryable?', isRetryableProviderError(errTimeout).isRetryable === true ? 'PASS (retryable)' : 'FAIL');
  console.log('Validation retryable?', isRetryableProviderError(errValidation).isRetryable === false ? 'PASS (non-retryable)' : 'FAIL');
  console.log('Network error retryable?', isRetryableProviderError(errNetwork).isRetryable === true ? 'PASS (retryable)' : 'FAIL');

  // Test 2: Test Groq Direct Call using server-side GROQ_API_KEY
  console.log('\n[Test 2] Groq Provider Direct Test:');
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.log('GROQ_API_KEY is not set in environment!');
  } else {
    try {
      const groq = new GroqProvider({
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: groqApiKey,
      });
      const response = await groq.generate(
        {
          task: 'learning_space',
          prompt: 'State "Relearn AI Groq Active" in 5 words.',
        },
        {
          id: 'openai/gpt-oss-120b',
          name: 'GPT-OSS 120B',
          description: 'Groq Primary',
          supportedTasks: ['learning_space'],
          context: { contextWindow: 131072, maxOutputTokens: 8192 },
          capabilities: { streaming: true, structuredOutput: true, toolCalling: true, systemPrompt: true, multimodal: false },
          defaultConfig: { temperature: 0.3 },
        },
        { temperature: 0.3, maxTokens: 50 }
      );
      console.log('Groq Response Text:', response.text.trim());
      console.log('Groq Model:', response.model);
      console.log('Groq Latency:', response.latencyMs, 'ms');
      console.log('Groq Status: SUCCESS');
    } catch (e: any) {
      console.error('Groq test error:', e.message);
    }
  }

  // Test 3: Test generateAI router execution with Groq
  console.log('\n[Test 3] Router generateAI Test (Groq):');
  try {
    const res = await generateAI({
      task: 'chatbot',
      prompt: 'Hello Groq! Respond with "Groq Ready".',
      options: { maxTokens: 20 },
    });
    console.log('Router Response:', res.text.trim());
    console.log('Provider used:', res.metadata?.provider);
    console.log('Model used:', res.model);
    console.log('Router Status: SUCCESS');
  } catch (e: any) {
    console.error('Router test error:', e.message);
  }

  console.log('\n--- Groq Pipeline Testing Complete ---');
}

testPipeline().catch(console.error);
