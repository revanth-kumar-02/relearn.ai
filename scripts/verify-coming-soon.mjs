import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 }
  });
  const page = await context.newPage();

  const port = 3000;
  const userId = 'e01b805f-e67f-4bb1-bb4d-9cccc32ff276';

  const mockUser = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@relearn.ai',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    confirmed_at: '2026-01-01T00:00:00Z',
    user_metadata: { name: 'Admin', is_verified: true },
    app_metadata: { provider: 'email' }
  };

  const authSession = {
    access_token: 'fake.jwt.token',
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: 'fake-refresh-token',
    user: mockUser
  };

  await page.route('**/auth/v1/user*', route => route.fulfill({ status: 200, json: mockUser }));
  await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, json: authSession }));
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, json: [{ id: userId, name: 'Admin', email: 'admin@relearn.ai', role: 'admin', is_verified: true, preferences: {} }] }));
  await page.route('**/rest/v1/plans*', route => route.fulfill({ status: 200, json: [] }));
  await page.route('**/rest/v1/tasks*', route => route.fulfill({ status: 200, json: [] }));
  await page.route('**/rest/v1/activity*', route => route.fulfill({ status: 200, json: [] }));
  await page.route('**/rest/v1/notifications*', route => route.fulfill({ status: 200, json: [] }));
  await page.route('**/rest/v1/mistakes*', route => route.fulfill({ status: 200, json: [] }));

  await page.addInitScript(({ userId, authSession }) => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('relearn_theme', 'dark');

    const userProfile = {
      id: userId,
      name: 'Admin',
      email: 'admin@relearn.ai',
      role: 'admin',
      isVerified: true,
      preferences: {
        contentLanguage: 'en',
        videoLanguage: 'en'
      }
    };

    localStorage.setItem('relearn_session', userId);
    localStorage.setItem('relearn_users', JSON.stringify({ [userId]: userProfile }));
    localStorage.setItem('sb-uflcypwtplruaurvwbje-auth-token', JSON.stringify(authSession));
  }, { userId, authSession });

  // 1. Projects Coming Soon Overlay (Dark)
  await page.goto(`http://localhost:${port}/#/projects`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#coming-soon-title-projects', { timeout: 8000 });
  await page.waitForTimeout(450);

  // Test interactive tab switch & Notify button
  await page.locator('button[role="tab"]:has-text("Workspace")').click();
  await page.waitForTimeout(250);
  await page.locator('button:has-text("Notify Me When Live")').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${ARTIFACT_DIR}/23_projects_coming_soon_dark.png` });

  // 2. Playground Coming Soon Overlay (Dark)
  await page.goto(`http://localhost:${port}/#/playground`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#coming-soon-title-playground', { timeout: 8000 });
  await page.waitForTimeout(450);
  await page.locator('button[role="tab"]:has-text("I/O Stream")').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${ARTIFACT_DIR}/24_playground_coming_soon_dark.png` });

  // 3. Light Mode Check (Projects)
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    localStorage.setItem('relearn_theme', 'light');
  });
  await page.goto(`http://localhost:${port}/#/projects`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#coming-soon-title-projects', { timeout: 8000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${ARTIFACT_DIR}/25_projects_coming_soon_light.png` });

  console.log('Coming Soon overlay verification complete!');
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
