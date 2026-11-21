import { chromium } from 'playwright';
import fs from 'fs';

const fixture = JSON.parse(fs.readFileSync('e2e/fixtures/flutter-70-day-plan.json', 'utf-8'));
const { user, plan, tasks } = fixture;
const plans = [plan];

async function check() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(({ user, plans, tasks, plan }) => {
    localStorage.setItem('relearn_theme', 'dark');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('relearn_session', user.id);
    localStorage.setItem('relearn_users', JSON.stringify({ [user.id]: user }));
    localStorage.setItem('relearn_plans_' + user.id, JSON.stringify(plans));
    localStorage.setItem('relearn_tasks_' + user.id, JSON.stringify(tasks));
    localStorage.setItem('relearn_active_plan_id', plan.id);
  }, { user, plans, tasks, plan });

  await page.goto(`http://localhost:3000/#/plan-details?id=${plan.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const renderedCount = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button[aria-label^="Task:"]');
    return buttons.length;
  });
  const badgeText = await page.evaluate(() => {
    const span = document.querySelector('#path-heading + span');
    return span ? span.textContent : null;
  });
  const currentUrl = page.url();

  console.log('Current URL:', currentUrl);
  console.log('Badge text:', badgeText);
  console.log('Rendered task buttons count:', renderedCount);

  // Take screenshot of Plan Details with all 70 tasks loaded
  await page.screenshot({ path: 'screenshots/validation/plan-details-with-tasks-dark.png', fullPage: false });

  await browser.close();
}

check().catch(console.error);
