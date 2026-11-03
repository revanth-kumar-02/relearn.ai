import { test, expect } from '@playwright/test';
import { setupFlutterPlanState, FLUTTER_PLAN_ID } from './flutter-helpers';

test.describe('Flutter 70-Day Plan — Error Recovery & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlutterPlanState(page);
  });

  test('1. Navigating to Learning Workspace with non-existent task ID redirects gracefully to Dashboard', async ({ page }) => {
    await page.goto('/#/learning-workspace?taskId=invalid-non-existent-task-id');

    // Should redirect to dashboard without crashing or throwing unhandled React error
    await page.waitForURL(/#\/dashboard/);
    await expect(page).toHaveURL(/#\/dashboard/);
  });

  test('2. Navigating to Plan Details with non-existent plan ID redirects gracefully to Dashboard', async ({ page }) => {
    await page.goto('/#/plan-details?id=invalid-non-existent-plan-id');

    // Should redirect to dashboard
    await page.waitForURL(/#\/dashboard/);
    await expect(page).toHaveURL(/#\/dashboard/);
  });

  test('3. Code Playground executes invalid JavaScript and catches errors gracefully in console', async ({ page }) => {
    await page.goto('/#/playground');

    // Replace code with syntax/runtime error
    const editor = page.locator('textarea').first();
    await editor.fill('throw new Error("Deliberate test runtime exception");');

    // Click Run Code
    const runBtn = page.getByRole('button', { name: /Run Code/i });
    await runBtn.click();

    // Console output should display the error gracefully
    await expect(page.getByText('Deliberate test runtime exception')).toBeVisible();

    // Verify UI is still fully responsive and Run Code button is not broken
    await expect(runBtn).toBeEnabled();
  });
});
