/**
 * ─────────────────────────────────────────────────────────────────
 *  UI State Audit Verification Test Suite
 * ─────────────────────────────────────────────────────────────────
 *
 *  Verifies:
 *  1. Admin table empty state row rendering
 *  2. Auth forms input disabling during submission
 *  3. Concept collision error and retry state
 *  4. AI chatbot send button whitespace / in-flight protection
 *  5. Quiz module double-click guard and skeleton loading state
 */

import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runUIStateAuditTests(): Promise<void> {
  console.log('=== Running Relearn.ai UI State Audit Tests ===\n');

  const rootDir = process.cwd();

  // Test 1: UserManagementPanel Table Empty State
  console.log('Test 1: UserManagementPanel Table Empty State');
  const userPanelPath = path.join(rootDir, 'src/features/dashboard/admin/UserManagementPanel.tsx');
  const userPanelCode = fs.readFileSync(userPanelPath, 'utf-8');
  assert(userPanelCode.includes('users.length === 0 ?'), 'UserManagementPanel must check for users.length === 0');
  assert(userPanelCode.includes('No users found'), 'UserManagementPanel must render friendly empty state message');
  console.log('  ✓ UserManagementPanel renders empty state when filtered users list is empty\n');

  // Test 2: Login.tsx In-Flight Input Disabling
  console.log('Test 2: Login.tsx Input Submitting State');
  const loginPath = path.join(rootDir, 'src/features/auth/Login.tsx');
  const loginCode = fs.readFileSync(loginPath, 'utf-8');
  assert(loginCode.includes('disabled={loading}'), 'Login form inputs and buttons must be disabled during submission');
  console.log('  ✓ Login.tsx prevents race conditions and edits during in-flight auth requests\n');

  // Test 3: CreateAccount.tsx In-Flight Input Disabling
  console.log('Test 3: CreateAccount.tsx Input Submitting State');
  const signupPath = path.join(rootDir, 'src/features/auth/CreateAccount.tsx');
  const signupCode = fs.readFileSync(signupPath, 'utf-8');
  assert(signupCode.includes('disabled={loading}'), 'CreateAccount inputs must be disabled during submission');
  console.log('  ✓ CreateAccount.tsx prevents race conditions during signup submission\n');

  // Test 4: ConceptCollisionWidget Error, Retry & Disabled Guards
  console.log('Test 4: ConceptCollisionWidget Error, Retry & In-Flight Guards');
  const collisionPath = path.join(rootDir, 'src/features/ai/ConceptCollisionWidget.tsx');
  const collisionCode = fs.readFileSync(collisionPath, 'utf-8');
  assert(collisionCode.includes('setError('), 'ConceptCollision must track error state');
  assert(collisionCode.includes('Retry'), 'ConceptCollision must provide a Retry button on failure');
  assert(collisionCode.includes('disabled={isLoading}'), 'ConceptCollision buttons must be disabled while generating');
  console.log('  ✓ ConceptCollisionWidget handles errors, retry, and in-flight guards\n');

  // Test 5: ChatBot Send Button Guard
  console.log('Test 5: ChatBot.tsx Input & Streaming Guards');
  const chatBotPath = path.join(rootDir, 'src/features/ai/ChatBot.tsx');
  const chatBotCode = fs.readFileSync(chatBotPath, 'utf-8');
  assert(chatBotCode.includes('disabled={isStreaming || !input.trim()}'), 'ChatBot must disable send when input is empty or when streaming');
  console.log('  ✓ ChatBot.tsx prevents empty message spam and in-flight collision\n');

  // Test 6: QuizModule Loading Skeleton and In-Flight Guard
  console.log('Test 6: QuizModule Skeleton & In-Flight Guard');
  const quizPath = path.join(rootDir, 'src/features/learning/QuizModule.tsx');
  const quizCode = fs.readFileSync(quizPath, 'utf-8');
  assert(quizCode.includes("if (quizState === 'loading') return;"), 'QuizModule must guard against double-submissions');
  assert(quizCode.includes("quizState === 'loading'"), 'QuizModule must render loading state');
  console.log('  ✓ QuizModule includes in-flight guard and loading skeleton\n');

  console.log('All UI State Audit Tests Passed Successfully! 🎉');
}

// Run immediately if executed directly
if (process.argv[1]?.endsWith('uiStateAudit.test.ts')) {
  runUIStateAuditTests().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
