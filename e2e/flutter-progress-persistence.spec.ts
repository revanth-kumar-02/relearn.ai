import { test, expect } from '@playwright/test';
import { setupFlutterPlanState, FLUTTER_PLAN_ID, flutterTasks } from './flutter-helpers';

test.describe('Flutter 70-Day Plan — Progress Tracking, Calculations & Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlutterPlanState(page);
  });

  test('1. Baseline state shows 0% progress and 0 of 70 completed tasks', async ({ page }) => {
    await page.goto(`/#/plan-details?id=${FLUTTER_PLAN_ID}`);

    // Verify 0% progress
    await expect(page.getByText('0%')).toBeVisible();
    await expect(page.getByText('0 of 70 completed', { exact: false })).toBeVisible();
  });

  test('2. Mark Day 1 complete in Plan Details and verify progress calculation and persistence across refresh', async ({ page }) => {
    await page.goto(`/#/plan-details?id=${FLUTTER_PLAN_ID}`);

    // Find Day 1 completion toggle button
    const day1Toggle = page.locator('button[aria-label*="Day 1:"]').locator('div[role="button"][aria-label="Mark as completed"]');
    await expect(day1Toggle).toBeVisible();

    // Click to mark complete
    await day1Toggle.click();

    // Verify progress updates to 1% (1/70 is ~1.43%, rounded to 1%)
    await expect(page.getByText('1 of 70 completed', { exact: false })).toBeVisible();
    await expect(page.getByText('1%')).toBeVisible();

    // Verify task label is struck through or shows checked icon
    const checkedToggle = page.locator('button[aria-label*="Day 1:"]').locator('div[role="button"][aria-label="Mark incomplete"]');
    await expect(checkedToggle).toBeVisible();

    // Reload page to verify persistence in storage
    await page.reload();

    // Verify state after reload
    await expect(page.getByText('1 of 70 completed', { exact: false })).toBeVisible();
    await expect(page.getByText('1%')).toBeVisible();
    await expect(page.locator('button[aria-label*="Day 1:"]').locator('div[role="button"][aria-label="Mark incomplete"]')).toBeVisible();

    // Reversible rollback: Unmark complete
    await page.locator('button[aria-label*="Day 1:"]').locator('div[role="button"][aria-label="Mark incomplete"]').click();

    // Verify restored to 0%
    await expect(page.getByText('0 of 70 completed', { exact: false })).toBeVisible();
    await expect(page.getByText('0%')).toBeVisible();
  });

  test('3. Complete Day 1 from Learning Workspace and verify progress updates', async ({ page }) => {
    // Seed task with content so "Mark Session Complete" is accessible
    const customTasks = flutterTasks.map((t, idx) => {
      if (idx === 0) {
        return {
          ...t,
          learningObjective: 'Master Dart type system',
          aiExplanation: '## Flutter Basics',
          status: 'In Progress'
        };
      }
      return t;
    });

    await setupFlutterPlanState(page, { customTasks });

    const day1Task = customTasks[0];
    await page.goto(`/#/learning-workspace?taskId=${day1Task.id}`);

    // Click Mark Session Complete
    const completeBtn = page.getByRole('button', { name: /Mark Session Complete/i });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // Should navigate back or update status
    await page.waitForTimeout(500);

    // Navigate to Plan Details
    await page.goto(`/#/plan-details?id=${FLUTTER_PLAN_ID}`);
    await expect(page.getByText('1 of 70 completed', { exact: false })).toBeVisible();
  });
});
