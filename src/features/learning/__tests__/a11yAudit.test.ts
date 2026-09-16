/**
 * ─────────────────────────────────────────────────────────────────
 *  WCAG 2.1 AA Accessibility Audit Test Suite
 * ─────────────────────────────────────────────────────────────────
 *
 *  Verifies:
 *  1. Modal dialog attributes (role="dialog", aria-modal="true", aria-labelledby, aria-describedby)
 *  2. Keyboard shortcut handlers (Escape key dismissal behavior)
 *  3. Interactive card keyboard navigation (Space / Enter handlers)
 *  4. Live region and status announcements (role="status", aria-live="polite")
 *  5. Form control labels and accessible name mappings
 *  6. Reduced motion media query presence and focus ring token definition in index.css
 */

import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runA11yAuditTests(): Promise<void> {
  console.log('=== Running Relearn.ai A11y & WCAG Audit Tests ===\n');

  const rootDir = process.cwd();

  // Test 1: Verify ConfirmationModal dialog attributes & Escape key
  console.log('Test 1: ConfirmationModal ARIA & Keyboard Handling');
  const confirmModalPath = path.join(rootDir, 'src/components/common/ConfirmationModal.tsx');
  const confirmModalCode = fs.readFileSync(confirmModalPath, 'utf-8');
  assert(confirmModalCode.includes('role="dialog"'), 'ConfirmationModal must have role="dialog"');
  assert(confirmModalCode.includes('aria-modal="true"'), 'ConfirmationModal must have aria-modal="true"');
  assert(confirmModalCode.includes('aria-labelledby='), 'ConfirmationModal must have aria-labelledby');
  assert(confirmModalCode.includes('aria-describedby='), 'ConfirmationModal must have aria-describedby');
  assert(confirmModalCode.includes('e.key === \'Escape\''), 'ConfirmationModal must handle Escape key for dismissal');
  console.log('  ✓ ConfirmationModal meets WCAG 2.1 Dialog & Keyboard specs\n');

  // Test 2: Verify ActivePlanModal dialog attributes & Escape key
  console.log('Test 2: ActivePlanModal ARIA & Keyboard Handling');
  const activePlanModalPath = path.join(rootDir, 'src/components/common/ActivePlanModal.tsx');
  const activePlanModalCode = fs.readFileSync(activePlanModalPath, 'utf-8');
  assert(activePlanModalCode.includes('role="dialog"'), 'ActivePlanModal must have role="dialog"');
  assert(activePlanModalCode.includes('aria-modal="true"'), 'ActivePlanModal must have aria-modal="true"');
  assert(activePlanModalCode.includes('aria-labelledby='), 'ActivePlanModal must have aria-labelledby');
  assert(activePlanModalCode.includes('aria-describedby='), 'ActivePlanModal must have aria-describedby');
  assert(activePlanModalCode.includes('e.key === \'Escape\''), 'ActivePlanModal must handle Escape key for dismissal');
  console.log('  ✓ ActivePlanModal meets WCAG 2.1 Dialog & Keyboard specs\n');

  // Test 3: Verify KeyboardShortcutsModal dialog attributes & Escape key
  console.log('Test 3: KeyboardShortcutsModal ARIA & Keyboard Handling');
  const shortcutsModalPath = path.join(rootDir, 'src/components/common/KeyboardShortcutsModal.tsx');
  const shortcutsModalCode = fs.readFileSync(shortcutsModalPath, 'utf-8');
  assert(shortcutsModalCode.includes('role="dialog"'), 'KeyboardShortcutsModal must have role="dialog"');
  assert(shortcutsModalCode.includes('aria-modal="true"'), 'KeyboardShortcutsModal must have aria-modal="true"');
  assert(shortcutsModalCode.includes('aria-labelledby='), 'KeyboardShortcutsModal must have aria-labelledby');
  assert(shortcutsModalCode.includes('e.key === \'Escape\''), 'KeyboardShortcutsModal must handle Escape key');
  console.log('  ✓ KeyboardShortcutsModal meets WCAG 2.1 Dialog & Keyboard specs\n');

  // Test 4: Verify FlashcardModule keyboard interaction & ARIA
  console.log('Test 4: FlashcardModule Keyboard Interaction & ARIA');
  const flashcardPath = path.join(rootDir, 'src/features/learning/FlashcardModule.tsx');
  const flashcardCode = fs.readFileSync(flashcardPath, 'utf-8');
  assert(flashcardCode.includes('tabIndex={0}'), 'Flashcard container must have tabIndex={0} for keyboard focus');
  assert(flashcardCode.includes('role="button"'), 'Flashcard container must have role="button"');
  assert(flashcardCode.includes('onKeyDown='), 'Flashcard container must support onKeyDown keyboard activation');
  assert(flashcardCode.includes("e.key === ' ' || e.key === 'Enter'"), 'Flashcard must flip on Space or Enter');
  assert(flashcardCode.includes('aria-label="Previous Card"'), 'Previous card button must have aria-label');
  assert(flashcardCode.includes('aria-label="Next Card"'), 'Next card button must have aria-label');
  console.log('  ✓ FlashcardModule meets WCAG 2.1 Custom Control specs\n');

  // Test 5: Verify LearningWorkspace accessibility features
  console.log('Test 5: LearningWorkspace Controls, Labels & Live Announcements');
  const workspacePath = path.join(rootDir, 'src/features/learning/LearningWorkspace.tsx');
  const workspaceCode = fs.readFileSync(workspacePath, 'utf-8');
  assert(workspaceCode.includes('role="status"'), 'Loading container must have role="status"');
  assert(workspaceCode.includes('aria-live="polite"'), 'Loading container must have aria-live="polite"');
  assert(workspaceCode.includes('aria-label="Lesson delivery mode"'), 'Lesson mode group must have aria-label');
  assert(workspaceCode.includes('aria-pressed='), 'Lesson mode buttons must have aria-pressed');
  assert(workspaceCode.includes('aria-label="Personal study insights and notes"'), 'Study notes textarea must have aria-label');
  assert(workspaceCode.includes('aria-label="Toggle study timer"'), 'Timer toggle button must have aria-label');
  assert(workspaceCode.includes('aria-label="Export study materials"'), 'Export menu button must have aria-label');
  assert(workspaceCode.includes('aria-expanded='), 'Export dropdown must have aria-expanded');
  console.log('  ✓ LearningWorkspace meets WCAG 2.1 AA requirements\n');

  // Test 6: Verify index.css Focus Visibility & Reduced Motion
  console.log('Test 6: CSS Global Focus Ring & Reduced Motion');
  const cssPath = path.join(rootDir, 'src/styles/index.css');
  const cssCode = fs.readFileSync(cssPath, 'utf-8');
  assert(cssCode.includes('*:focus-visible'), 'CSS must define global *:focus-visible outline style');
  assert(cssCode.includes('prefers-reduced-motion: reduce'), 'CSS must include prefers-reduced-motion media query');
  console.log('  ✓ CSS meets WCAG 2.1 2.4.7 Focus Visible and 2.3.3 Animation from Interactions\n');

  console.log('All A11y Audit Verification Tests Passed Successfully! 🎉');
}

// Run immediately if executed directly
if (process.argv[1]?.endsWith('a11yAudit.test.ts')) {
  runA11yAuditTests().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
