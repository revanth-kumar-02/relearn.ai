import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Settings, Profile & Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test('should render settings page with options', async ({ page }) => {
    await page.goto('/#/settings');
    await expect(page.getByText(/Settings|Preferences|AI Persona/i).first()).toBeVisible();
  });

  test('should render user profile page', async ({ page }) => {
    await page.goto('/#/profile');
    await expect(page.getByText(/Test Scholar|Profile|Account/i).first()).toBeVisible();
  });

  test('should render notifications view', async ({ page }) => {
    await page.goto('/#/notifications');
    await expect(page.getByText(/Notifications|Alerts/i).first()).toBeVisible();
  });

  test('should render notification settings page', async ({ page }) => {
    await page.goto('/#/notification-settings');
    await expect(page.getByText(/Notification Settings|Reminder/i).first()).toBeVisible();
  });
});
