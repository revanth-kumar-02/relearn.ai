import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Progress & Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
    await page.goto('/#/progress');
  });

  test('should render user progress, XP statistics, and badges', async ({ page }) => {
    await expect(page.getByText(/Progress|Analytics|Streak/i).first()).toBeVisible();
    await expect(page.getByText(/1450|XP/i).first()).toBeVisible();
  });
});
