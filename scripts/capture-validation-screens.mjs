import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('screenshots/validation');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Load fixture data
const fixture = JSON.parse(fs.readFileSync('e2e/fixtures/flutter-70-day-plan.json', 'utf-8'));
const { user, plan, tasks } = fixture;
const plans = [plan];

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-1024x768', width: 1024, height: 768 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

async function run() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  for (const vp of viewports) {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      const page = await context.newPage();

      // Seed localStorage
      await page.addInitScript(({ user, plans, tasks, theme, plan }) => {
        localStorage.setItem('relearn_theme', theme);
        localStorage.setItem('theme', theme);
        localStorage.setItem('relearn_user', JSON.stringify(user));
        localStorage.setItem('relearn_session', user.id);
        localStorage.setItem('relearn_users', JSON.stringify({ [user.id]: user }));
        localStorage.setItem('relearn_plans_' + user.id, JSON.stringify(plans));
        localStorage.setItem('relearn_tasks_' + user.id, JSON.stringify(tasks));
        localStorage.setItem('relearn_active_plan_id', plan.id);
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, { user, plans, tasks, theme, plan });

      // 1. Dashboard
      await page.goto(`http://localhost:3000/#/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      await page.evaluate((theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, theme);

      await page.waitForTimeout(600);

      const dashFile = path.join(outDir, `dashboard-${theme}-${vp.name}.png`);
      await page.screenshot({ path: dashFile, fullPage: false });
      console.log(`Captured: ${dashFile}`);

      // 2. Plan Details
      await page.goto(`http://localhost:3000/#/plan-details?id=${plan.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      await page.evaluate((theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, theme);

      await page.waitForTimeout(600);

      const planFile = path.join(outDir, `plan-details-${theme}-${vp.name}.png`);
      await page.screenshot({ path: planFile, fullPage: false });
      console.log(`Captured: ${planFile}`);

      await context.close();
    }
  }

  await browser.close();
  console.log('Visual validation captures complete.');
}

run().catch(err => {
  console.error('Validation capture error:', err);
  process.exit(1);
});
