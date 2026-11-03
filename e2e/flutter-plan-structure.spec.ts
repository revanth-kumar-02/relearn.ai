import { test, expect } from '@playwright/test';
import { setupFlutterPlanState, FLUTTER_PLAN_ID, flutterTasks, flutterPlan } from './flutter-helpers';

test.describe('Flutter 70-Day Plan — Structure & Curriculum Audit', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlutterPlanState(page);
  });

  test('1. Plan details header displays correct title, difficulty, and stats', async ({ page }) => {
    await page.goto(`/#/plan-details?id=${FLUTTER_PLAN_ID}`);

    // Wait for the plan title to appear
    const titleLocator = page.locator('h1, h2').filter({ hasText: '70-Day Beginner Flutter Learning Plan' });
    await expect(titleLocator.first()).toBeVisible({ timeout: 10000 });

    // Verify metadata badge
    await expect(page.getByText('70 Tasks', { exact: true })).toBeVisible();
    await expect(page.getByText('Beginner', { exact: true })).toBeVisible();
  });

  test('2. Exactly 70 tasks are rendered sequentially from Day 1 to Day 70 without duplicates or gaps', async ({ page }) => {
    await page.goto(`/#/plan-details?id=${FLUTTER_PLAN_ID}`);

    // Verify task count in fixture
    expect(flutterTasks.length).toBe(70);

    // Verify each day 1 through 70 exists in sequence
    const parsedDays: { dayNum: number; title: string; id: string }[] = [];

    for (let i = 1; i <= 70; i++) {
      const dayTask = flutterTasks.find(t => t.title.toLowerCase().startsWith(`day ${i}:`));
      expect(dayTask, `Task for Day ${i} must exist in the curriculum`).toBeDefined();
      if (dayTask) {
        parsedDays.push({
          dayNum: i,
          title: dayTask.title,
          id: dayTask.id
        });
      }
    }

    expect(parsedDays.length).toBe(70);

    // Verify no duplicated task IDs
    const idSet = new Set(parsedDays.map(d => d.id));
    expect(idSet.size).toBe(70);

    // Verify task list elements rendered in UI
    const taskElements = page.locator('section[aria-labelledby="path-heading"] button[aria-expanded]');
    await expect(taskElements.first()).toBeVisible();
    const count = await taskElements.count();
    expect(count).toBe(70);

    // Verify first, intermediate, and final day titles are rendered
    await expect(page.getByText('Day 1: Flutter overview and Dart basics')).toBeVisible();
    await expect(page.getByText('Day 35: GestureDetector basics')).toBeVisible();
    await expect(page.getByText('Day 70: Todo app persistence addition')).toBeVisible();
  });

  test('3. Expanding task cards reveals descriptions and Start Learning Session actions', async ({ page }) => {
    await page.goto(`/#/plan-details?id=${FLUTTER_PLAN_ID}`);

    // Click Day 1 task to expand
    const day1Btn = page.getByRole('button', { name: /Day 1:/i }).first();
    await day1Btn.click();

    // Verify expanded content
    await expect(page.getByText('Read Flutter overview and install Dart SDK')).toBeVisible();
    const startBtn = page.getByRole('button', { name: /Start Learning Session/i }).first();
    await expect(startBtn).toBeVisible();
  });
});
