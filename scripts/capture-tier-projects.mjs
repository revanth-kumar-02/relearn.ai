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

const rustPlan = {
  id: 'plan-rust-game',
  userId: user.id,
  title: 'Beginner Rust Game Engine Learning Plan',
  subject: 'AI Generated',
  description: 'Master Rust memory safety, ownership, borrowing, lifetimes, Cargo, Tokio, and systems programming.',
  targetDurationDays: 45,
  difficultyLevel: 'Beginner',
  status: 'in_progress',
  progress: 15,
  totalDays: 45,
  completedDays: 6,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const allPlans = [csharpPlan, rustPlan, plan];

async function run() {
  console.log('Launching browser to capture 10 Beginner / 10 Intermediate / 10 Hard projects...');
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
  }, { u: user, pList: allPlans, t: tasks });

  const page = await authContext.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });

  console.log('Navigating to http://127.0.0.1:3000/#/projects...');
  await page.goto('http://127.0.0.1:3000/#/projects', { waitUntil: 'commit', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
  });
  await page.waitForTimeout(2000);

  // Wait for the project cards or blueprints to load
  try {
    await page.waitForSelector('text=Select & Launch Lab', { timeout: 15000 });
    console.log('Blueprint cards loaded successfully!');
  } catch (e) {
    console.log('Warning waiting for cards:', e.message);
  }

  // 1. Beginner Tier (10)
  console.log('Capturing 01_beginner_tier_10_projects.png...');
  await page.waitForTimeout(2000);
  const beginnerPath = path.join(artifactDir, '01_beginner_tier_10_projects.png');
  await page.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
  });
  await page.screenshot({ path: beginnerPath, timeout: 7000 });
  console.log('Saved:', beginnerPath);

  // 2. Click Intermediate (10)
  console.log('Switching to Intermediate (10)...');
  const interBtn = await page.$('button:has-text("Intermediate (10)")');
  if (interBtn) {
    await interBtn.click({ force: true });
    console.log('Clicked Intermediate (10), waiting for blueprints...');
    try {
      await page.waitForSelector('text=Select & Launch Lab', { timeout: 30000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('Timeout waiting for intermediate cards:', e.message);
    }
    const interPath = path.join(artifactDir, '02_intermediate_tier_10_projects.png');
    await page.evaluate(() => {
      document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
    });
    await page.screenshot({ path: interPath, timeout: 7000 });
    console.log('Saved:', interPath);
  } else {
    console.warn('Could not find Intermediate (10) button');
  }

  // 3. Click Hard (10)
  console.log('Switching to Hard (10)...');
  const hardBtn = await page.$('button:has-text("Hard (10)")');
  if (hardBtn) {
    await hardBtn.click({ force: true });
    console.log('Clicked Hard (10), waiting for blueprints...');
    try {
      await page.waitForSelector('text=Select & Launch Lab', { timeout: 30000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('Timeout waiting for hard cards:', e.message);
    }
    const hardPath = path.join(artifactDir, '03_hard_tier_10_projects.png');
    await page.evaluate(() => {
      document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
    });
    await page.screenshot({ path: hardPath, timeout: 7000 });
    console.log('Saved:', hardPath);
  } else {
    console.warn('Could not find Hard (10) button');
  }

  // 4. Click All (30)
  console.log('Switching to All (30)...');
  const allBtn = await page.$('button:has-text("All (30)")');
  if (allBtn) {
    await allBtn.click({ force: true });
    console.log('Clicked All (30), waiting for all 30 blueprints...');
    try {
      await page.waitForSelector('text=Select & Launch Lab', { timeout: 30000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('Timeout waiting for all cards:', e.message);
    }
    const allPath = path.join(artifactDir, '04_all_30_projects_matrix.png');
    await page.evaluate(() => {
      document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
    });
    await page.screenshot({ path: allPath, timeout: 7000 });
    console.log('Saved:', allPath);
  } else {
    console.warn('Could not find All (30) button');
  }

  await authContext.close();
  await browser.close();
  console.log('All tier captures completed successfully!');
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
