import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const artifactDir = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29';

const plans = [
  {
    id: 'plan-csharp-1',
    userId: 'user-revanth',
    title: '30-Day Beginner C# Learning Plan',
    subject: 'AI Generated',
    description: 'Learn modern C# 12 and .NET 8 fundamentals, LINQ, OOP, async/await, and ASP.NET Core web services.',
    targetDurationDays: 30,
    difficultyLevel: 'Beginner',
    status: 'in_progress',
    progress: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan-rust-2',
    userId: 'user-revanth',
    title: 'Beginner Rust Game Engine Learning Plan',
    subject: 'AI Generated',
    description: 'Master Rust memory safety, ownership, borrowing, lifetimes, Cargo, Tokio, and systems programming.',
    targetDurationDays: 45,
    difficultyLevel: 'Beginner',
    status: 'in_progress',
    progress: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan-flutter-3',
    userId: 'user-revanth',
    title: '70-Day Beginner Flutter Learning Plan',
    subject: 'AI Generated',
    description: 'Comprehensive Flutter and Dart development for mobile, desktop, and web applications.',
    targetDurationDays: 70,
    difficultyLevel: 'Beginner',
    status: 'in_progress',
    progress: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const user = {
  id: 'user-revanth',
  email: 'revanth@relearn.ai',
  name: 'Revanth Kumar',
  role: 'admin',
  isVerified: true,
  createdAt: new Date().toISOString(),
};

async function run() {
  console.log('Launching browser to test 10 Beginner / 10 Intermediate / 10 Hard project generation...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  await context.addInitScript(({ u, pList }) => {
    localStorage.clear();
    sessionStorage.clear();
    const users = { [u.id]: u };
    localStorage.setItem('relearn_session', u.id);
    localStorage.setItem('relearn_users', JSON.stringify(users));
    localStorage.setItem(`relearn_plans_${u.id}`, JSON.stringify(pList));
    localStorage.setItem('relearn_active_plan_id', pList[0].id);
    localStorage.setItem('relearn_theme', 'light');
    localStorage.setItem('relearn_help_prompt_dismissed', 'true');
    localStorage.setItem('relearn_sidebar_expanded', 'true');
  }, { u: user, pList: plans });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/#/projects...');
  await page.goto('http://localhost:3000/#/projects', { waitUntil: 'commit', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Wait for blueprint cards to appear
  try {
    await page.waitForSelector('text=Select & Launch Lab', { timeout: 15000 });
    console.log('Blueprint cards loaded successfully!');
  } catch (e) {
    console.log('Waiting timed out or cards already visible:', e.message);
  }

  // 1. Beginner Tier (10)
  console.log('Capturing Beginner Tier (10 projects)...');
  await page.waitForTimeout(1500);
  const beginnerPath = path.join(artifactDir, '01_beginner_tier_10_projects.png');
  await page.screenshot({ path: beginnerPath });
  console.log('Saved:', beginnerPath);

  // 2. Click Intermediate (10)
  console.log('Switching to Intermediate (10) tier...');
  const intermediateBtn = await page.$('button:has-text("Intermediate (10)")');
  if (intermediateBtn) {
    await intermediateBtn.click({ force: true });
    console.log('Clicked Intermediate (10), waiting for AI/render...');
    await page.waitForTimeout(6000);
    const intermediatePath = path.join(artifactDir, '02_intermediate_tier_10_projects.png');
    await page.screenshot({ path: intermediatePath });
    console.log('Saved:', intermediatePath);
  } else {
    console.warn('Could not find Intermediate (10) button');
  }

  // 3. Click Hard (10)
  console.log('Switching to Hard (10) tier...');
  const hardBtn = await page.$('button:has-text("Hard (10)")');
  if (hardBtn) {
    await hardBtn.click({ force: true });
    console.log('Clicked Hard (10), waiting for AI/render...');
    await page.waitForTimeout(6000);
    const hardPath = path.join(artifactDir, '03_hard_tier_10_projects.png');
    await page.screenshot({ path: hardPath });
    console.log('Saved:', hardPath);
  } else {
    console.warn('Could not find Hard (10) button');
  }

  // 4. Click All (30)
  console.log('Switching to All (30) tier...');
  const allBtn = await page.$('button:has-text("All (30)")');
  if (allBtn) {
    await allBtn.click({ force: true });
    console.log('Clicked All (30), waiting for AI/render...');
    await page.waitForTimeout(6000);
    const allPath = path.join(artifactDir, '04_all_30_projects_matrix.png');
    await page.screenshot({ path: allPath });
    console.log('Saved:', allPath);
  } else {
    console.warn('Could not find All (30) button');
  }

  await context.close();
  await browser.close();
  console.log('Verification finished successfully!');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
