import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Help Center & Feedback Submission', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test('should render help center with search and FAQ sections', async ({ page }) => {
    await page.goto('/#/help-center');
    await expect(page.getByText(/Help Center|How can we help|FAQ/i).first()).toBeVisible();
  });

  test('should render feedback form page', async ({ page }) => {
    await page.goto('/#/feedback');
    await expect(page.getByText(/Feedback|Send Feedback|Ideas/i).first()).toBeVisible();
  });
});
