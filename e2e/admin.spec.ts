import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Admin Panel & Management Features', () => {
  test.beforeEach(async ({ page }) => {
    // Setup admin user
    await setupAuthenticatedState(page, true);
    await page.goto('/#/admin');
  });

  test('should render admin dashboard for admin users', async ({ page }) => {
    await expect(page.getByText(/System Console|Admin|Dashboard/i).first()).toBeVisible();
  });

  test('should navigate between admin management tabs', async ({ page }) => {
    // Click Users admin tab
    const usersTab = page.getByRole('button', { name: 'users', exact: true });
    await expect(usersTab).toBeVisible();
    await usersTab.click();
    await expect(page).toHaveURL(/.*tab=users/);

    // Click System admin tab
    const systemTab = page.getByRole('button', { name: 'system', exact: true });
    await expect(systemTab).toBeVisible();
    await systemTab.click();
    await expect(page).toHaveURL(/.*tab=system/);
  });
});
