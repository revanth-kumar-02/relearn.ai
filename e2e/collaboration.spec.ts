import { test, expect } from '@playwright/test';
import { setupAuthenticatedState } from './helpers';

test.describe('Collaboration Hub, Study Rooms & Templates', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test('should render collaboration hub', async ({ page }) => {
    await page.goto('/#/collaboration');
    await expect(page.getByText(/Collaboration Hub|Study Partners|Friends/i).first()).toBeVisible();
  });

  test('should render study rooms page', async ({ page }) => {
    await page.goto('/#/rooms');
    await expect(page.getByText(/Study Rooms|Rooms|Create Room/i).first()).toBeVisible();
  });

  test('should render template gallery', async ({ page }) => {
    await page.goto('/#/templates');
    await expect(page.getByText(/Template Gallery|Templates|Plan Templates/i).first()).toBeVisible();
  });
});
