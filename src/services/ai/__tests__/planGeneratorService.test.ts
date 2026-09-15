/**
 * ─────────────────────────────────────────────────────────────────
 *  Learning Plan Generator Service Unit Tests
 * ─────────────────────────────────────────────────────────────────
 *
 *  Verifies:
 *  - planGeneratorService invokes generateAI with task 'learning_plan'
 *  - Router resolves Qwen3-Next-80B-A3B-Instruct
 *  - Zero Gemini or Groq calls are made
 *  - Response parsing & structure validation work
 *  - Invalid AI output format throws clean error
 *  - AbortSignal cancellation works
 *  - Rate limiting via checkPlanCreationLimit works
 *  - Errors (401, 403, 429, timeout, connection) are normalized
 */

import {
  generateLearningPlan,
  validatePlanStructure,
} from '../planGeneratorService';
import {
  registerProvider,
  clearProviders,
} from '../pipeline/provider';
import {
  type AIInferenceProvider,
  type AIRequest,
  type ModelDefinition,
  type AIResponse,
  AIRuntimeError,
  AITimeoutError,
  AIAbortError,
  AIConnectionError,
} from '../pipeline/types';
import { checkPlanCreationLimit } from '../../../utils/planRateLimiter';
import { Plan } from '../../../types/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runPlanGeneratorTests(): Promise<void> {
  console.log('=== Running Plan Generator Service Unit Tests ===\n');

  try {
    // ---------------------------------------------------------------
    // 1. Plan Generation with AI Router & Qwen 80B Resolution
    // ---------------------------------------------------------------
    console.log('1. Testing Plan Generation & Model Resolution...');
    let lastCapturedRequest: AIRequest | null = null;
    let lastCapturedModel: ModelDefinition | null = null;

    const mockProvider: AIInferenceProvider = {
      name: 'mock-plan-provider',
      async generate(req, modelDef, config): Promise<AIResponse> {
        lastCapturedRequest = req;
        lastCapturedModel = modelDef;

        const validPlanJson = JSON.stringify({
          title: 'Mastering TypeScript Generics',
          description: 'A 5-day deep dive into generic types and constraints in TypeScript.',
          days: [
            { day: 1, topic: 'Generic Functions', guidance: 'Understand type parameters in standalone functions and methods.' },
            { day: 2, topic: 'Generic Interfaces', guidance: 'Design flexible data contracts using interface type parameters.' },
            { day: 3, topic: 'Generic Constraints', guidance: 'Use the extends keyword to narrow allowable generic types.' },
            { day: 4, topic: 'Conditional Types', guidance: 'Learn the ternary type syntax and the infer keyword.' },
            { day: 5, topic: 'Mapped Types & Keyof', guidance: 'Transform existing types dynamically with mapped type syntax.' },
          ],
        });

        return {
          text: validPlanJson,
          model: modelDef.id,
          usage: { promptTokens: 50, completionTokens: 120, totalTokens: 170 },
          finishReason: 'stop',
          latencyMs: 120,
        };
      },
    };

    clearProviders();
    registerProvider(mockProvider, { makeActive: true });

    const resultJson = await generateLearningPlan(
      'TypeScript Generics',
      5,
      'Intermediate',
      undefined,
      'English',
      'Preferred study time: 1 hour daily'
    );

    assert(lastCapturedRequest !== null, 'Request must be sent to provider');
    assert(lastCapturedRequest!.task === 'learning_plan', 'Task must be learning_plan');
    assert(
      lastCapturedModel!.id === 'Qwen3-Next-80B-A3B-Instruct',
      `Model must resolve to Qwen3-Next-80B-A3B-Instruct, got: ${lastCapturedModel!.id}`
    );

    const parsed = JSON.parse(resultJson);
    assert(parsed.title === 'Mastering TypeScript Generics', 'Title mismatch');
    assert(parsed.days.length === 5, 'Must have 5 days');
    assert(parsed.days[0].topic === 'Generic Functions', 'Day 1 topic mismatch');
    assert(parsed.days[4].day === 5, 'Day 5 number mismatch');
    console.log('   ✓ Plan generation routed to Qwen3-Next-80B-A3B-Instruct and parsed successfully.');

    // ---------------------------------------------------------------
    // 2. Response Parsing & Structure Validation
    // ---------------------------------------------------------------
    console.log('2. Testing Response Parsing & Structure Validation...');
    // Handle dailyTopics fallback and missing titles
    const rawWithDailyTopics = {
      dailyTopics: [
        { title: 'Introduction', summary: 'Get started with fundamentals.' },
        { day: 2, topic: 'Deep Dive', description: 'Explore advanced concepts.' },
      ],
    };
    const validated = validatePlanStructure(rawWithDailyTopics);
    assert(validated.title === 'New Learning Plan', 'Default title fallback mismatch');
    assert(validated.days.length === 2, 'Must validate 2 days from dailyTopics');
    assert(validated.days[0].topic === 'Introduction', 'Topic fallback mismatch');
    assert(validated.days[0].guidance === 'Get started with fundamentals.', 'Guidance fallback mismatch');

    // Handle invalid non-object
    let nonObjectError = false;
    try {
      validatePlanStructure('not an object');
    } catch {
      nonObjectError = true;
    }
    assert(nonObjectError, 'Expected error on non-object plan data');

    // Handle missing days array
    let missingDaysError = false;
    try {
      validatePlanStructure({ title: 'Plan with no days' });
    } catch {
      missingDaysError = true;
    }
    assert(missingDaysError, 'Expected error on missing days array');
    console.log('   ✓ Plan structure validation and fallbacks verified.');

    // ---------------------------------------------------------------
    // 3. Error Handling & Normalization
    // ---------------------------------------------------------------
    console.log('3. Testing Error Handling & Normalization...');

    // 401 Unauthorized
    const authErrorProvider: AIInferenceProvider = {
      name: 'auth-error-provider',
      async generate() {
        throw new AIRuntimeError('Unauthorized', 401);
      },
    };
    registerProvider(authErrorProvider, { makeActive: true });
    let caught401 = false;
    try {
      await generateLearningPlan('Python', 5);
    } catch (err: any) {
      if (err.message.includes('API key is missing or invalid')) {
        caught401 = true;
      }
    }
    assert(caught401, 'Expected normalized 401 message');

    // 403 Forbidden
    const forbiddenProvider: AIInferenceProvider = {
      name: 'forbidden-provider',
      async generate() {
        throw new AIRuntimeError('Forbidden', 403);
      },
    };
    registerProvider(forbiddenProvider, { makeActive: true });
    let caught403 = false;
    try {
      await generateLearningPlan('Python', 5);
    } catch (err: any) {
      if (err.message.includes('Access forbidden')) {
        caught403 = true;
      }
    }
    assert(caught403, 'Expected normalized 403 message');

    // 429 Rate Limit
    const rateLimitProvider: AIInferenceProvider = {
      name: 'rate-limit-provider',
      async generate() {
        throw new AIRuntimeError('Rate limit', 429);
      },
    };
    registerProvider(rateLimitProvider, { makeActive: true });
    let caught429 = false;
    try {
      await generateLearningPlan('Python', 5);
    } catch (err: any) {
      if (err.message.includes('high demand')) {
        caught429 = true;
      }
    }
    assert(caught429, 'Expected normalized 429 message');

    // Timeout Error
    const timeoutProvider: AIInferenceProvider = {
      name: 'timeout-provider',
      async generate() {
        throw new AITimeoutError(60000);
      },
    };
    registerProvider(timeoutProvider, { makeActive: true });
    let caughtTimeout = false;
    try {
      await generateLearningPlan('Python', 5);
    } catch (err: any) {
      if (err.message.includes('timed out')) {
        caughtTimeout = true;
      }
    }
    assert(caughtTimeout, 'Expected normalized timeout message');

    // Connection Error
    const connErrorProvider: AIInferenceProvider = {
      name: 'conn-error-provider',
      async generate() {
        throw new AIConnectionError('Cannot reach runtime');
      },
    };
    registerProvider(connErrorProvider, { makeActive: true });
    let caughtConn = false;
    try {
      await generateLearningPlan('Python', 5);
    } catch (err: any) {
      if (err.message.includes('No internet connection or AI runtime is currently unreachable')) {
        caughtConn = true;
      }
    }
    assert(caughtConn, 'Expected normalized connection error message');
    console.log('   ✓ Error normalization for 401, 403, 429, timeout, and connection verified.');

    // ---------------------------------------------------------------
    // 4. AbortSignal Cancellation
    // ---------------------------------------------------------------
    console.log('4. Testing AbortSignal Cancellation...');
    const abortProvider: AIInferenceProvider = {
      name: 'abort-provider',
      async generate(req) {
        if (req.options?.signal?.aborted) {
          throw new AIAbortError();
        }
        return {
          text: '{}',
          model: 'Qwen3-Next-80B-A3B-Instruct',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: 'stop',
          latencyMs: 10,
        };
      },
    };
    registerProvider(abortProvider, { makeActive: true });

    const abortCtrl = new AbortController();
    abortCtrl.abort();

    let caughtAbort = false;
    try {
      await generateLearningPlan('Python', 5, 'Beginner', undefined, 'English', undefined, abortCtrl.signal);
    } catch (err: any) {
      if (err.message === 'AbortError') {
        caughtAbort = true;
      }
    }
    assert(caughtAbort, 'Expected AbortError when signal is aborted');
    console.log('   ✓ AbortSignal cancellation verified.');

    // ---------------------------------------------------------------
    // 5. Rate Limiting via planRateLimiter
    // ---------------------------------------------------------------
    console.log('5. Testing Plan Rate Limiter...');
    const dummyPlans: Plan[] = [
      {
        id: '1',
        userId: 'u1',
        title: 'Plan 1',
        subject: 'WebGPU',
        totalDays: 5,
        completedDays: 0,
        progress: 0,
        dailyGoalMins: 30,
        status: 'active',
        difficulty: 'Beginner',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'u1',
        title: 'Plan 2',
        subject: 'Rust',
        totalDays: 5,
        completedDays: 0,
        progress: 0,
        dailyGoalMins: 30,
        status: 'active',
        difficulty: 'Beginner',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        userId: 'u1',
        title: 'Plan 3',
        subject: 'TypeScript',
        totalDays: 5,
        completedDays: 0,
        progress: 0,
        dailyGoalMins: 30,
        status: 'active',
        difficulty: 'Beginner',
        createdAt: new Date().toISOString(),
      },
    ];

    const limitStatus = checkPlanCreationLimit(dummyPlans, 3, 48);
    assert(limitStatus.allowed === false, 'Should block 4th plan within 48h limit');
    assert(limitStatus.remainingQuota === 0, 'Remaining quota should be 0');
    assert(limitStatus.cooldownText !== null, 'Cooldown text should be provided');

    // With only 2 plans:
    const allowedStatus = checkPlanCreationLimit(dummyPlans.slice(0, 2), 3, 48);
    assert(allowedStatus.allowed === true, 'Should allow 3rd plan when only 2 exist');
    assert(allowedStatus.remainingQuota === 1, 'Remaining quota should be 1');
    console.log('   ✓ Plan rate limiter constraint verified.');

    console.log('\n=== All Plan Generator Service Unit Tests PASSED! ===\n');
  } finally {
    clearProviders();
  }
}

runPlanGeneratorTests().catch((err) => {
  console.error('Plan Generator test suite failed:', err);
  process.exit(1);
});
