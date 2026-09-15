import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Learning Diary & Gratitude Log', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test('should render learning diary interface', async ({ page }) => {
    await page.goto('/#/diary');
    await expect(page.getByText(/Learning Diary|Diary|Reflection/i).first()).toBeVisible();
  });

  test('should render gratitude log page', async ({ page }) => {
    await page.goto('/#/gratitude');
    await expect(page.getByText(/Gratitude Log|Gratitude|Reflection/i).first()).toBeVisible();
  });
});
