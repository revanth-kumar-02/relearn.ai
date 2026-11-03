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
    await expect(page.getByText(/Relearn\.ai/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Turn what you want to learn into/i })).toBeVisible();

    // Check Plan, Practice, Reflect sections
    await expect(page.getByText('01 / PLAN')).toBeVisible();
    await expect(page.getByText('02 / PRACTICE')).toBeVisible();
    await expect(page.getByText('03 / REFLECT')).toBeVisible();

    // Check support email links
    await expect(page.locator('a[href="mailto:imposterz.rev02@gmail.com"]')).toBeVisible();
    await expect(page.locator('a[href="mailto:imposterz.rith08@gmail.com"]')).toBeVisible();
  });

  test('should support interactive active-recall reveal/hide', async ({ page }) => {
    const revealBtn = page.getByRole('button', { name: /Reveal explanation/i });
    await expect(revealBtn).toBeVisible();
    await revealBtn.click();

    await expect(page.getByText('Meaning, structure, and access.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Hide explanation/i })).toBeVisible();

    // Toggle back
    await page.getByRole('button', { name: /Hide explanation/i }).click();
    await expect(page.getByRole('button', { name: /Reveal explanation/i })).toBeVisible();
  });

  test('should navigate to login and signup from header CTAs', async ({ page }) => {
    const loginBtn = page.getByRole('button', { name: 'Log in' }).first();
    await expect(loginBtn).toBeVisible();
    await loginBtn.click();
    await expect(page.getByRole('heading', { name: 'Welcome Back!' })).toBeVisible();

    await page.goto('/');
    const getStartedBtn = page.getByRole('button', { name: /Get started/i }).first();
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();
    await expect(page.getByRole('heading', { name: /Create Account|Join Relearn/i })).toBeVisible();
  });

  test('should render 404 page for invalid route', async ({ page }) => {
    await page.goto('/#/non-existent-page-route');
    await expect(page.getByText(/404/i).or(page.getByText(/Lost in Space/i)).or(page.getByText(/Page Not Found/i))).toBeVisible();
  });
});

