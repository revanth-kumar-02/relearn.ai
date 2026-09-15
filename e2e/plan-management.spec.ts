import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Plan Management & Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test('should render plan generation interface', async ({ page }) => {
    await page.goto('/#/create-plan');
    await expect(page.getByText(/Create AI Plan|Generate Plan|What do you want to learn/i).first()).toBeVisible();
  });

  test('should view plan details', async ({ page }) => {
    await page.goto('/#/plan-details');
    await expect(page.getByText(/Plan Details|Fullstack Web Development|Overview/i).first()).toBeVisible();
  });

  test('should display archived plans section', async ({ page }) => {
    await page.goto('/#/archived');
    await expect(page.getByText(/Archived Plans|Machine Learning Basics/i).first()).toBeVisible();
  });
});
