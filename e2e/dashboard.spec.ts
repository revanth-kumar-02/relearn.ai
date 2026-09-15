import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Dashboard & Core Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
    await page.goto('/#/dashboard');
  });

  test('should render authenticated user dashboard with stats and plans', async ({ page }) => {
    // Check main dashboard header and user first name greeting ('Test')
    await expect(page.getByText('Test', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Fullstack Web Development').first()).toBeVisible();
    await expect(page.getByText(/Learning Pathways/i).first()).toBeVisible();
  });

  test('should navigate via desktop sidebar links', async ({ page }) => {
    // Click Progress sidebar link
    const progressLink = page.getByRole('button', { name: /Progress/i }).first();
    await expect(progressLink).toBeVisible();
    await progressLink.click();
    await expect(page).toHaveURL(/.*progress/);

    // Click Learning Diary link
    const diaryLink = page.getByRole('button', { name: /Learning Diary|Diary/i }).first();
    await expect(diaryLink).toBeVisible();
    await diaryLink.click();
    await expect(page).toHaveURL(/.*diary/);
  });

  test('should navigate to create plan page', async ({ page }) => {
    await page.goto('/#/create-plan');
    await expect(page).toHaveURL(/.*create-plan/);
    await expect(page.getByText(/Create AI Plan|Generate Plan|What do you want to learn/i).first()).toBeVisible();
  });
});
