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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ u, p, t }) => {
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

  const page = await context.newPage();
  await page.goto('http://localhost:3000/#/dashboard', { waitUntil: 'commit' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
  });
  await page.screenshot({ path: path.resolve(rootDir, 'screenshots/06_dashboard.png'), timeout: 5000 });
  console.log('06_dashboard captured successfully!');
  await browser.close();
}

run().catch(console.error);
