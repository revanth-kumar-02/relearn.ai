/**
 * ─────────────────────────────────────────────────────────────────
 *  Migrated AI Features Unit Tests
 * ─────────────────────────────────────────────────────────────────
 *
 *  Verifies that all 6 migrated AI features:
 *  1. learning_space -> Qwen3-Next-80B-A3B-Instruct
 *  2. cheat_sheet -> Qwen3-Next-80B-A3B-Instruct
 *  3. chatbot -> Gemma-3-27B (non-streaming + streaming)
 *  4. flashcards -> Gemma-3-27B
 *  5. quizzes -> Gemma-3-27B
 *  6. concept_collision -> Gemma-3-27B
 *
 *  Correctly invoke the provider-independent pipeline with exact task IDs,
 *  canonical model resolutions, schemas, and error fallbacks.
 */

import { generateLessonContent } from '../learningWorkspaceService';
import { generateCheatSheet } from '../cheatSheetService';
import { sendChatMessage, sendChatMessageStreaming } from '../chatbotService';
import { generateFlashcards } from '../flashcardService';
import { generateQuiz } from '../quizService';
import { generateConceptCollision } from '../conceptCollisionService';
import { registerProvider, clearProviders } from '../pipeline/provider';
import {
  type AIInferenceProvider,
  type AIRequest,
  type ModelDefinition,
  type AIResponse,
  type AIStreamChunk,
} from '../pipeline/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runMigratedFeaturesTests(): Promise<void> {
  console.log('=== Running Migrated AI Features Unit Tests ===\n');

  try {
    let capturedRequest: AIRequest | null = null;
    let capturedModel: ModelDefinition | null = null;
    let mockResponseText = '{}';

    const mockProvider: AIInferenceProvider = {
      name: 'mock-features-provider',
      async generate(req, modelDef, config): Promise<AIResponse> {
        capturedRequest = req;
        capturedModel = modelDef;
        return {
          text: mockResponseText,
          model: modelDef.id,
          usage: { promptTokens: 30, completionTokens: 60, totalTokens: 90 },
          finishReason: 'stop',
          latencyMs: 80,
        };
      },
      async *generateStream(req, modelDef, config): AsyncIterable<AIStreamChunk> {
        capturedRequest = req;
        capturedModel = modelDef;
        yield {
          textDelta: 'Hello ',
          accumulatedText: 'Hello ',
          isComplete: false,
        };
        yield {
          textDelta: 'from Gemma!',
          accumulatedText: 'Hello from Gemma!',
          isComplete: true,
          finishReason: 'stop',
        };
      },
    };

    clearProviders();
    registerProvider(mockProvider, { makeActive: true });

    // ---------------------------------------------------------------
    // 1. Learning Space -> Qwen3-Next-80B-A3B-Instruct
    // ---------------------------------------------------------------
    console.log('1. Testing Learning Space Migration...');
    mockResponseText = JSON.stringify({
      topic: 'React Hooks',
      aiExplanation: 'Hooks let you use state and lifecycle features without writing a class.',
      activities: [
        {
          type: 'read',
          instruction: 'Read the official docs on useState',
          estimatedMinutes: 10,
        },
      ],
      practiceQuestion: {
        question: 'What does useState return?',
        options: ['State value only', 'State value and updater function', 'Reducer function', 'Effect handler'],
        correctAnswer: 1,
        explanation: 'useState returns a 2-element tuple with the state and its setter.',
      },
    });

    const lessonText = await generateLessonContent(
      'React Hooks',
      'React Mastery 30 Days',
      'English'
    );

    assert(capturedRequest !== null, 'Learning Space request must be captured');
    assert(capturedRequest!.task === 'learning_space', `Expected task 'learning_space', got: ${capturedRequest!.task}`);
    assert(
      capturedModel!.id === 'Qwen3-Next-80B-A3B-Instruct',
      `Expected model Qwen3-Next-80B-A3B-Instruct, got: ${capturedModel!.id}`
    );
    const parsedLesson = JSON.parse(lessonText);
    assert(parsedLesson.topic === 'React Hooks', 'Lesson topic mismatch');
    assert(parsedLesson.activities.length === 1, 'Lesson activities count mismatch');
    console.log('   ✓ Learning Space routed to Qwen3-Next-80B-A3B-Instruct and returned JSON successfully.');

    // ---------------------------------------------------------------
    // 2. Cheat Sheet -> Qwen3-Next-80B-A3B-Instruct
    // ---------------------------------------------------------------
    console.log('2. Testing Cheat Sheet Migration...');
    mockResponseText = JSON.stringify({
      title: 'Cheat Sheet: Docker Commands',
      sections: [
        {
          heading: 'Container Lifecycle',
          content: '* `docker run -d -p 80:80 nginx` - Run detached container\n* `docker stop [id]` - Stop container',
        },
      ],
      quickReference: ['docker ps -a', 'docker logs -f'],
      commonMistakes: ['Forgetting to map ports with -p'],
    });

    const cheatSheet = await generateCheatSheet('Docker');
    assert(capturedRequest !== null, 'Cheat Sheet request must be captured');
    assert(capturedRequest!.task === 'cheat_sheet', `Expected task 'cheat_sheet', got: ${capturedRequest!.task}`);
    assert(
      capturedModel!.id === 'Qwen3-Next-80B-A3B-Instruct',
      `Expected model Qwen3-Next-80B-A3B-Instruct, got: ${capturedModel!.id}`
    );
    assert(cheatSheet.title === 'Cheat Sheet: Docker Commands', 'Cheat sheet title mismatch');
    assert(cheatSheet.quickReference.length === 2, 'Quick reference count mismatch');
    console.log('   ✓ Cheat Sheet routed to Qwen3-Next-80B-A3B-Instruct and parsed successfully.');

    // ---------------------------------------------------------------
    // 3. AI Chatbot -> Gemma-3-27B (Non-streaming & Streaming)
    // ---------------------------------------------------------------
    console.log('3. Testing AI Chatbot Migration (Non-streaming & Streaming)...');
    mockResponseText = 'Hello! I am your study assistant.';

    const chatResponse = await sendChatMessage(
      'Explain binary search',
      [{ role: 'user', parts: [{ text: 'Hi' }] }, { role: 'model', parts: [{ text: 'Hello!' }] }],
      'English'
    );
    assert(capturedRequest !== null, 'Chat request must be captured');
    assert(capturedRequest!.task === 'chatbot', `Expected task 'chatbot', got: ${capturedRequest!.task}`);
    assert(
      capturedModel!.id === 'Gemma-3-27B',
      `Expected model Gemma-3-27B, got: ${capturedModel!.id}`
    );
    assert(chatResponse === 'Hello! I am your study assistant.', 'Chat response mismatch');
    console.log('   ✓ AI Chatbot (non-streaming) routed to Gemma-3-27B successfully.');

    // Test Streaming
    const streamChunks: string[] = [];
    const streamedResponse = await sendChatMessageStreaming(
      'Can you help me practice?',
      [],
      (chunk) => streamChunks.push(chunk),
      'English'
    );
    assert(capturedRequest!.task === 'chatbot', `Expected streaming task 'chatbot', got: ${capturedRequest!.task}`);
    assert(capturedModel!.id === 'Gemma-3-27B', `Expected model Gemma-3-27B, got: ${capturedModel!.id}`);
    assert(streamedResponse === 'Hello from Gemma!', 'Streamed response mismatch');
    assert(streamChunks.length === 2, 'Expected 2 streamed chunks');
    console.log('   ✓ AI Chatbot (streaming) routed to Gemma-3-27B and streamed successfully.');

    // ---------------------------------------------------------------
    // 4. Flashcards -> Gemma-3-27B
    // ---------------------------------------------------------------
    console.log('4. Testing Flashcards Migration...');
    mockResponseText = JSON.stringify({
      flashcards: [
        { front: 'What is a pure function?', back: 'A function that produces the same output for the same input with no side effects.', mnemonic: 'Purity = Predictability' },
        { front: 'What is immutability?', back: 'Data that cannot be modified after creation.', mnemonic: 'Immutable = Unchangeable' },
      ],
    });

    const flashcards = await generateFlashcards('Functional Programming', 'Pure functions and immutability are key.');
    assert(capturedRequest !== null, 'Flashcards request must be captured');
    assert(capturedRequest!.task === 'flashcards', `Expected task 'flashcards', got: ${capturedRequest!.task}`);
    assert(
      capturedModel!.id === 'Gemma-3-27B',
      `Expected model Gemma-3-27B, got: ${capturedModel!.id}`
    );
    assert(flashcards.length === 2, 'Expected 2 flashcards');
    assert(typeof flashcards[0].id === 'string' && flashcards[0].id.length > 0, 'Flashcard must have generated ID');
    assert(flashcards[0].front === 'What is a pure function?', 'Flashcard 1 front mismatch');
    console.log('   ✓ Flashcards routed to Gemma-3-27B and parsed with IDs successfully.');

    // ---------------------------------------------------------------
    // 5. Quizzes -> Gemma-3-27B
    // ---------------------------------------------------------------
    console.log('5. Testing Quizzes Migration...');
    mockResponseText = JSON.stringify({
      questions: [
        {
          question: 'What is the time complexity of binary search?',
          options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
          correctIndex: 2,
          explanation: 'Binary search halves the search space each step, giving O(log n).',
        },
      ],
    });

    const quiz = await generateQuiz('Binary Search', 'Binary search operates on sorted arrays in logarithmic time.');
    assert(capturedRequest !== null, 'Quiz request must be captured');
    assert(capturedRequest!.task === 'quizzes', `Expected task 'quizzes', got: ${capturedRequest!.task}`);
    assert(
      capturedModel!.id === 'Gemma-3-27B',
      `Expected model Gemma-3-27B, got: ${capturedModel!.id}`
    );
    assert(quiz.topic === 'Binary Search', 'Quiz topic mismatch');
    assert(quiz.questions.length === 1, 'Quiz question count mismatch');
    assert(quiz.questions[0].correctIndex === 2, 'Quiz correct answer mismatch');
    console.log('   ✓ Quizzes routed to Gemma-3-27B and parsed successfully.');

    // ---------------------------------------------------------------
    // 6. Concept Collision -> Gemma-3-27B
    // ---------------------------------------------------------------
    console.log('6. Testing Concept Collision Migration...');
    mockResponseText = JSON.stringify({
      topicA: 'Quantum Physics',
      topicB: 'Cooking',
      question: 'How is measuring a quantum state like opening a pressure cooker?',
      hint: 'Think about observation altering the state.',
      sampleAnswer: 'Both irreversible actions alter the system.',
    });

    const collision = await generateConceptCollision(['Quantum Physics', 'Cooking']);
    assert(capturedRequest !== null, 'Concept collision request must be captured');
    assert(capturedRequest!.task === 'concept_collision', `Expected task 'concept_collision', got: ${capturedRequest!.task}`);
    assert(
      capturedModel!.id === 'Gemma-3-27B',
      `Expected model Gemma-3-27B, got: ${capturedModel!.id}`
    );
    assert(collision.topicA === 'Quantum Physics', 'Topic A mismatch');
    assert(collision.topicB === 'Cooking', 'Topic B mismatch');
    assert(collision.question.includes('measuring a quantum state'), 'Question mismatch');
    console.log('   ✓ Concept Collision routed to Gemma-3-27B and parsed successfully.');

    console.log('\n=== All Migrated AI Features Unit Tests PASSED! ===\n');
  } finally {
    clearProviders();
  }
}

runMigratedFeaturesTests().catch((err) => {
  console.error('Migrated features test suite failed:', err);
  process.exit(1);
});
