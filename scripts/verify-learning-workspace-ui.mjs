import { chromium } from 'playwright';
import fs from 'fs';

const fixture = JSON.parse(fs.readFileSync('e2e/fixtures/flutter-70-day-plan.json', 'utf-8'));
const { user, plan, tasks } = fixture;
const plans = [plan];
const targetTask = tasks[0]; // Day 1 task

async function checkWorkspace() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Ensure target task has no aiExplanation so workspace enters generation flow
  const ungeneratedTask = { ...targetTask, aiExplanation: undefined };
  const updatedTasks = [ungeneratedTask, ...tasks.slice(1)];

  await page.addInitScript(({ user, plans, updatedTasks, plan, ungeneratedTask }) => {
    localStorage.setItem('relearn_theme', 'dark');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('relearn_session', user.id);
    localStorage.setItem('relearn_users', JSON.stringify({ [user.id]: user }));
    localStorage.setItem('relearn_plans_' + user.id, JSON.stringify(plans));
    localStorage.setItem('relearn_tasks_' + user.id, JSON.stringify(updatedTasks));
    localStorage.setItem('relearn_active_plan_id', plan.id);
  }, { user, plans, updatedTasks, plan, ungeneratedTask });

  // Route to Learning Workspace with state
  await page.goto(`http://localhost:3000/#/learning-workspace?taskId=${ungeneratedTask.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Check PDF Upload Panel and Auto-generating timer visibility
  const uploadPanelVisible = await page.isVisible('text=Upload Study Material');
  const autoGenVisible = await page.isVisible('text=Auto-generating lesson in');
  console.log('Upload panel visible:', uploadPanelVisible);
  console.log('Auto-generating timer visible:', autoGenVisible);

  await page.screenshot({ path: 'screenshots/validation/learning-workspace-initial-dark.png', fullPage: false });

  // Now trigger an error by intercepting /api/groq and /api/openrouter to return 500
  await page.route('**/api/groq/**', route => route.fulfill({ status: 500, json: { error: 'Groq provider unavailable' } }));
  await page.route('**/api/openrouter/**', route => route.fulfill({ status: 500, json: { error: 'OpenRouter provider unavailable' } }));

  // Click "Generate Now"
  const generateNowBtn = await page.$('button:has-text("Generate Now")');
  if (generateNowBtn) {
    await generateNowBtn.click();
    console.log('Clicked "Generate Now" with simulated provider 500');
    await page.waitForTimeout(2000);

    const errorBannerVisible = await page.isVisible('text=Session generation failed');
    const tryAgainBtnVisible = await page.isVisible('button:has-text("Try Again")');
    const dismissBtnVisible = await page.isVisible('button:has-text("Dismiss")');
    const autoGenStillVisible = await page.isVisible('text=Auto-generating lesson in');

    console.log('Error banner visible:', errorBannerVisible);
    console.log('Try Again button visible:', tryAgainBtnVisible);
    console.log('Dismiss button visible:', dismissBtnVisible);
    console.log('Auto-generating timer visible during error:', autoGenStillVisible);

    await page.screenshot({ path: 'screenshots/validation/learning-workspace-error-dark.png', fullPage: false });

    // Click Dismiss to ensure clean recovery
    const dismissBtn = await page.$('button:has-text("Dismiss")');
    if (dismissBtn) {
      await dismissBtn.click();
      await page.waitForTimeout(500);
      const errorStillThere = await page.isVisible('text=Session generation failed');
      console.log('Error dismissed cleanly?', !errorStillThere ? 'YES' : 'NO');
    }
  }

  await browser.close();
  console.log('Learning workspace verification complete.');
}

checkWorkspace().catch(console.error);
