import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
  });

  test('should display main landing page elements', async ({ page }) => {
    // Check main title
    await expect(page).toHaveTitle(/ReLearn|Relearn/i);
    
    // Check main brand / heading text
    await expect(page.getByText('ReLearn.ai').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Learn Smarter/i })).toBeVisible();
  });

  test('should render 404 page for invalid route', async ({ page }) => {
    await page.goto('/#/non-existent-page-route');
    await expect(page.getByText(/404/i).or(page.getByText(/Lost in Space/i)).or(page.getByText(/Page Not Found/i))).toBeVisible();
  });
});
