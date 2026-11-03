import { test, expect } from '@playwright/test';
import { setupFlutterPlanState, FLUTTER_PLAN_ID, flutterTasks } from './flutter-helpers';

test.describe('Flutter 70-Day Plan — Day Navigation & Boundary Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlutterPlanState(page);
  });

  test('1. Navigate from Plan Details into Day 1 Learning Workspace', async ({ page }) => {
    await page.goto(`/#/plan-details?id=${FLUTTER_PLAN_ID}`);

    // Click Day 1 to expand
    const day1Btn = page.getByRole('button', { name: /Day 1:/i }).first();
    await day1Btn.click();

    // Click Start Learning Session
    const startBtn = page.getByRole('button', { name: /Start Learning Session/i }).first();
    await startBtn.click();

    // Verify URL contains /learning-workspace and taskId
    await page.waitForURL(/#\/learning-workspace\?taskId=/);
    await expect(page.locator('header h1')).toHaveText(/Day 1: Flutter overview and Dart basics/);
  });

  test('2. Sequential Forward and Backward Navigation using Next Day & Prev Day buttons', async ({ page }) => {
    const day1Task = flutterTasks.find(t => t.title.startsWith('Day 1:'))!;
    await page.goto(`/#/learning-workspace?taskId=${day1Task.id}`);

    // Verify Day 1 is loaded
    await expect(page.locator('header h1')).toHaveText(/Day 1: Flutter overview and Dart basics/);

    // Verify Prev Day is not present on Day 1 (first day boundary)
    await expect(page.getByRole('button', { name: 'Previous Day' })).toHaveCount(0);

    // Click Next Day
    const nextBtn = page.getByRole('button', { name: 'Next Day' });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Verify Day 2 is loaded
    await expect(page.locator('header h1')).toHaveText(/Day 2: Development environment setup/);

    // Click Prev Day
    const prevBtn = page.getByRole('button', { name: 'Previous Day' });
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();

    // Verify back on Day 1
    await expect(page.locator('header h1')).toHaveText(/Day 1: Flutter overview and Dart basics/);
  });

  test('3. Direct navigation to Mid-Plan (Day 35) and Final Boundary (Day 70)', async ({ page }) => {
    const day35Task = flutterTasks.find(t => t.title.startsWith('Day 35:'))!;
    const day70Task = flutterTasks.find(t => t.title.startsWith('Day 70:'))!;

    // Navigate to Day 35
    await page.goto(`/#/learning-workspace?taskId=${day35Task.id}`);
    await expect(page.locator('header h1')).toHaveText(/Day 35: GestureDetector basics/);

    // Both Prev Day and Next Day must be available on Day 35
    await expect(page.getByRole('button', { name: 'Previous Day' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next Day' })).toBeVisible();

    // Navigate directly to Day 70
    await page.goto(`/#/learning-workspace?taskId=${day70Task.id}`);
    await expect(page.locator('header h1')).toHaveText(/Day 70: Todo app persistence addition/);

    // Verify Next Day is NOT present on Day 70 (last day boundary)
    await expect(page.getByRole('button', { name: 'Next Day' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Previous Day' })).toBeVisible();
  });

  test('4. Browser refresh on a learning day maintains the active day without state loss or redirect', async ({ page }) => {
    const day35Task = flutterTasks.find(t => t.title.startsWith('Day 35:'))!;
    await page.goto(`/#/learning-workspace?taskId=${day35Task.id}`);

    await expect(page.locator('header h1')).toHaveText(/Day 35: GestureDetector basics/);

    // Reload the page
    await page.reload();

    // Verify day remains Day 35 and did NOT kick to /dashboard
    await expect(page.locator('header h1')).toHaveText(/Day 35: GestureDetector basics/);
    expect(page.url()).toContain(day35Task.id);
  });
});
