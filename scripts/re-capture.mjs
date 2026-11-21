import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fixturePath = path.resolve(rootDir, 'e2e/fixtures/flutter-70-day-plan.json');
const flutterData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const { user, plan, tasks } = flutterData;
user.role = 'admin';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Landing and Login
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const publicPage = await publicContext.newPage();

  console.log('Capturing 01_landing...');
  await publicPage.goto('http://localhost:3000/#/', { waitUntil: 'load' });
  await publicPage.waitForTimeout(3000);
  await publicPage.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
  });
  await publicPage.screenshot({ path: path.resolve(rootDir, 'screenshots/01_landing.png') });

  console.log('Capturing 02_login...');
  await publicPage.goto('http://localhost:3000/#/login', { waitUntil: 'load' });
  await publicPage.waitForTimeout(3000);
  await publicPage.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
  });
  await publicPage.screenshot({ path: path.resolve(rootDir, 'screenshots/02_login.png') });
  await publicContext.close();

  // 2. Dashboard
  const authContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await authContext.addInitScript(({ u, p, t }) => {
    localStorage.clear();
    sessionStorage.clear();
    const users = { [u.id]: u };
    localStorage.setItem('relearn_session', u.id);
    localStorage.setItem('relearn_users', JSON.stringify(users));
    localStorage.setItem(`relearn_plans_${u.id}`, JSON.stringify([p]));
    localStorage.setItem(`relearn_tasks_${u.id}`, JSON.stringify(t));
    localStorage.setItem('relearn_active_plan_id', p.id);
    localStorage.setItem('relearn_help_prompt_dismissed', 'true');
    localStorage.setItem('relearn_sidebar_expanded', 'true');
    localStorage.setItem('relearn_theme', 'dark');
    sessionStorage.setItem('relearn_active_task_id', t[0].id);
    document.documentElement.classList.add('dark');
  }, { u: user, p: plan, t: tasks });

  const authPage = await authContext.newPage();
  console.log('Capturing 06_dashboard...');
  await authPage.goto('http://localhost:3000/#/dashboard', { waitUntil: 'load' });
  await authPage.waitForTimeout(3000);
  await authPage.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
  });
  await authPage.screenshot({ path: path.resolve(rootDir, 'screenshots/06_dashboard.png') });

  await authContext.close();
  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
