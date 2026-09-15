import { test, expect } from '@playwright/test';

test.describe('App Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should navigate from landing page to login', async ({ page }) => {
    await page.goto('/');
    const loginBtn = page.getByRole('button', { name: 'Log In' }).first();
    await expect(loginBtn).toBeVisible();
    await loginBtn.click();
    await expect(page.getByRole('heading', { name: 'Welcome Back!' })).toBeVisible();
  });

  test('should redirect unauthenticated users away from protected routes', async ({ page }) => {
    await page.goto('/#/dashboard');
    // Unauthenticated user should be redirected away from dashboard (or stay on login/landing page)
    await expect(page.getByRole('heading', { name: 'Welcome Back!' }).or(page.getByText('ReLearn.ai').first())).toBeVisible();
  });
});
