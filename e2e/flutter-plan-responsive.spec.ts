import { test, expect } from '@playwright/test';
import { setupFlutterPlanState, FLUTTER_PLAN_ID, flutterTasks } from './flutter-helpers';

const VIEWPORTS = [
  { width: 320, height: 720, label: '320x720 (Mobile Small)' },
  { width: 360, height: 800, label: '360x800 (Android Common)' },
  { width: 390, height: 844, label: '390x844 (iPhone 12/13/14)' },
  { width: 430, height: 932, label: '430x932 (iPhone Pro Max)' },
  { width: 768, height: 1024, label: '768x1024 (Tablet Portrait)' },
  { width: 1024, height: 768, label: '1024x768 (Tablet Landscape)' },
  { width: 1440, height: 900, label: '1440x900 (Desktop Laptop)' },
];

test.describe('Flutter 70-Day Plan — Responsive Layout & Viewports Audit', () => {
  for (const vp of VIEWPORTS) {
    test(`Viewport ${vp.label} renders Plan Details without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setupFlutterPlanState(page);

      await page.goto(`/#/plan-details?id=${FLUTTER_PLAN_ID}`);

      // Verify header rendered
      await expect(page.locator('h1, h2').filter({ hasText: '70-Day Beginner Flutter Learning Plan' }).first()).toBeVisible();

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow, `Horizontal overflow detected at ${vp.label}`).toBe(false);

      // Verify Day 1 item is visible and touch target is accessible
      const day1 = page.getByRole('button', { name: /Day 1:/i }).first();
      await expect(day1).toBeVisible();
    });

    test(`Viewport ${vp.label} renders Learning Workspace without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setupFlutterPlanState(page);

      const day1Task = flutterTasks.find(t => t.title.startsWith('Day 1:'))!;
      await page.goto(`/#/learning-workspace?taskId=${day1Task.id}`);

      // Verify header rendered
      await expect(page.locator('header h1')).toBeVisible();

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow, `Horizontal overflow detected in workspace at ${vp.label}`).toBe(false);
    });
  }
});
