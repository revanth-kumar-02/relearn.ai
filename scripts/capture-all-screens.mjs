import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const screenshotsDir = path.resolve(rootDir, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const fixturePath = path.resolve(rootDir, 'e2e/fixtures/flutter-70-day-plan.json');
const flutterData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const { user, plan, tasks } = flutterData;
user.role = 'admin'; // Ensure admin privileges

async function run() {
  console.log('Launching Chrome to capture all screens...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const publicRoutes = [
    { name: '01_landing', url: 'http://localhost:3000/#/' },
    { name: '02_login', url: 'http://localhost:3000/#/login' },
    { name: '03_signup', url: 'http://localhost:3000/#/signup' },
    { name: '04_reset_password', url: 'http://localhost:3000/#/reset-password' },
    { name: '05_not_found', url: 'http://localhost:3000/#/unknown-page' },
  ];

  const authRoutes = [
    { name: '06_dashboard', url: 'http://localhost:3000/#/dashboard' },
    { name: '07_progress', url: 'http://localhost:3000/#/progress' },
    { name: '08_plan_details', url: `http://localhost:3000/#/plan-details?id=${plan.id}` },
    { name: '09_learning_workspace', url: `http://localhost:3000/#/learning-workspace?taskId=${tasks[0].id}` },
    { name: '10_create_plan', url: 'http://localhost:3000/#/create-plan' },
    { name: '11_playground', url: 'http://localhost:3000/#/playground' },
    { name: '12_learning_diary', url: 'http://localhost:3000/#/diary' },
    { name: '13_gratitude_log', url: 'http://localhost:3000/#/gratitude' },
    { name: '14_templates', url: 'http://localhost:3000/#/templates' },
    { name: '15_study_rooms', url: 'http://localhost:3000/#/rooms' },
    { name: '16_collaboration_hub', url: 'http://localhost:3000/#/collaboration' },
    { name: '17_profile', url: 'http://localhost:3000/#/profile' },
    { name: '18_settings', url: 'http://localhost:3000/#/settings' },
    { name: '19_notifications', url: 'http://localhost:3000/#/notifications' },
    { name: '20_notification_settings', url: 'http://localhost:3000/#/notification-settings' },
    { name: '21_help_center', url: 'http://localhost:3000/#/help-center' },
    { name: '22_feedback', url: 'http://localhost:3000/#/feedback' },
    { name: '23_archived_plans', url: 'http://localhost:3000/#/archived' },
    { name: '24_admin_dashboard', url: 'http://localhost:3000/#/admin' },
  ];

  // 1. Capture Public Pages
  console.log('\n--- Capturing Public Screens ---');
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const publicPage = await publicContext.newPage();

  for (const item of publicRoutes) {
    try {
      console.log(`Navigating to ${item.name} (${item.url})...`);
      await publicPage.goto(item.url, { waitUntil: 'commit', timeout: 15000 });
      await publicPage.waitForTimeout(1500);
      await publicPage.evaluate(() => {
        document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
      });
      const filePath = path.join(screenshotsDir, `${item.name}.png`);
      await publicPage.screenshot({ path: filePath, timeout: 5000 });
      console.log(`Saved screenshot: ${filePath}`);
    } catch (err) {
      console.error(`Failed to capture ${item.name}:`, err.message);
    }
  }
  await publicContext.close();

  // 2. Capture Authenticated Pages
  console.log('\n--- Capturing Authenticated Screens ---');
  const authContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
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

  for (const item of authRoutes) {
    try {
      console.log(`Navigating to ${item.name} (${item.url})...`);
      await authPage.goto(item.url, { waitUntil: 'commit', timeout: 15000 });
      await authPage.waitForTimeout(1800);
      await authPage.evaluate(() => {
        document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => el.remove());
      });
      const filePath = path.join(screenshotsDir, `${item.name}.png`);
      await authPage.screenshot({ path: filePath, timeout: 5000 });
      console.log(`Saved screenshot: ${filePath}`);
    } catch (err) {
      console.error(`Failed to capture ${item.name}:`, err.message);
    }
  }

  await authContext.close();
  await browser.close();
  console.log('\nAll screens captured successfully in screenshots/ directory!');
}

run().catch(console.error);
