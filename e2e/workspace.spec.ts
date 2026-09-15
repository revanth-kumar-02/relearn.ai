import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Learning Workspace & Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
    await page.goto('/#/learning-workspace');
  });

  test('should display active learning workspace with tasks', async ({ page }) => {
    // Workspace main header or task list
    await expect(page.getByText(/Learning Workspace|Workspace|Build React UI Components/i).first()).toBeVisible();
  });

  test('should open add task page', async ({ page }) => {
    await page.goto('/#/add-task');
    await expect(page.getByText(/Add Task|New Task|Task Title/i).first()).toBeVisible();
  });
});
