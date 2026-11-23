import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const artifactDir = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29';

const fixturePath = path.resolve(rootDir, 'e2e/fixtures/flutter-70-day-plan.json');
const flutterData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const { user, plan, tasks } = flutterData;
user.role = 'admin';
user.isVerified = true;

const csharpPlan = {
  id: 'plan-csharp-30day',
  userId: user.id,
  title: '30-Day Beginner C# Learning Plan',
  subject: 'AI Generated',
  description: 'Master C# 12, .NET 8, LINQ, OOP, async/await, and ASP.NET Core web services.',
  targetDurationDays: 30,
  difficultyLevel: 'Beginner',
  status: 'in_progress',
  progress: 25,
  totalDays: 30,
  completedDays: 7,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const authContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });

  await authContext.addInitScript(({ u, pList, t }) => {
    localStorage.clear();
    sessionStorage.clear();
    const users = { [u.id]: u };
    localStorage.setItem('relearn_session', u.id);
    localStorage.setItem('relearn_users', JSON.stringify(users));
    localStorage.setItem(`relearn_plans_${u.id}`, JSON.stringify(pList));
    localStorage.setItem(`relearn_tasks_${u.id}`, JSON.stringify(t));
    localStorage.setItem('relearn_active_plan_id', pList[0].id);
    localStorage.setItem('relearn_help_prompt_dismissed', 'true');
    localStorage.setItem('relearn_sidebar_expanded', 'true');
    localStorage.setItem('relearn_theme', 'light');
    sessionStorage.setItem('relearn_active_task_id', t[0].id);
  }, { u: user, pList: [csharpPlan, plan], t: tasks });

  const page = await authContext.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.goto('http://127.0.0.1:3000/#/projects', { waitUntil: 'commit', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
  });

  // Wait for initial load
  console.log('Waiting for initial project cards...');
  await page.waitForSelector('text=Select & Launch Lab', { timeout: 20000 });

  // Click Intermediate
  console.log('Clicking Intermediate (10)...');
  await page.click('button:has-text("Intermediate (10)")', { force: true });

  console.log('Waiting for intermediate blueprint text indicator...');
  await page.waitForSelector('text=Showing 10 Intermediate engineering blueprints', { timeout: 20000 });
  
  console.log('Waiting for cards to stabilize...');
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
  });

  const interPath = path.join(artifactDir, '02_intermediate_tier_10_projects.png');
  await page.screenshot({ path: interPath, timeout: 5000 });
  console.log('Successfully saved fully rendered Intermediate projects screenshot:', interPath);

  await authContext.close();
  await browser.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
