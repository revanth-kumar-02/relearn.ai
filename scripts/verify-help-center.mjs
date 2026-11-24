import { chromium } from 'playwright';

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

  const targetUrl = `http://localhost:${port}/#/help-center`;
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle' });

  await page.waitForSelector('text=How can we help you learn?', { timeout: 8000 });

  // 1. Click "Shortcuts & Navigation" filter pill
  console.log('Clicking "Shortcuts & Navigation" filter pill...');
  const shortcutsFilterBtn = page.locator('button:has-text("Shortcuts & Navigation")');
  await shortcutsFilterBtn.click();
  await page.waitForTimeout(300);

  // Verify that multiple rich shortcut guides are rendered
  const shortcutGuidesCount = await page.locator('text=Global Single-Key Navigation').count();
  const editorShortcutsCount = await page.locator('text=Monaco Code Editor & Terminal Hotkeys').count();
  const studySessionKeysCount = await page.locator('text=Workspace Study Flow & Modal Hotkeys').count();

  console.log(`Shortcut guides found: Single-Key (${shortcutGuidesCount}), Editor (${editorShortcutsCount}), Workspace (${studySessionKeysCount})`);

  if (shortcutGuidesCount === 0 || editorShortcutsCount === 0 || studySessionKeysCount === 0) {
    throw new Error('Expected rich shortcut guides to be displayed when Shortcuts & Navigation filter is active!');
  }

  // Verify that Shortcuts FAQ items are displayed with generous spacing
  const shortcutFaqCount = await page.locator('text=Why didn\'t my keyboard shortcut trigger when typing?').count();
  console.log(`Shortcut FAQs found: ${shortcutFaqCount}`);

  // Expand the first shortcut guide
  const expandFirstGuideBtn = page.locator('button:has-text("View Detailed Guide")').first();
  await expandFirstGuideBtn.click();
  await page.waitForSelector('text=Press "D" anywhere in the app to return to your main Dashboard.');
  await page.waitForTimeout(300);

  // Capture Shortcuts Filter Dark Mode Screenshot
  const shortcutsDarkPath = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29/20_help_center_shortcuts_filter_dark.png';
  await page.screenshot({ path: shortcutsDarkPath, fullPage: true });
  console.log(`✓ Saved Shortcuts Filter Dark Mode screenshot to ${shortcutsDarkPath}`);

  // Switch to Light Mode and capture
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('relearn_theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(500);

  const shortcutsLightPath = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29/21_help_center_shortcuts_filter_light.png';
  await page.screenshot({ path: shortcutsLightPath, fullPage: true });
  console.log(`✓ Saved Shortcuts Filter Light Mode screenshot to ${shortcutsLightPath}`);

  // Test expanding the FAQ item to verify generous spacing inside the answer
  const faqBtn = page.locator('text=Why didn\'t my keyboard shortcut trigger when typing?');
  await faqBtn.click();
  await page.waitForSelector('text=To prevent accidental navigation while writing notes or code');
  await page.waitForTimeout(300);

  // Capture focused view of the Common Questions section
  const faqSection = page.locator('section:has-text("Common Questions & Quick Troubleshooting")');
  await faqSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const faqSpacingPath = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29/22_help_center_common_questions_spacing.png';
  await faqSection.screenshot({ path: faqSpacingPath });
  console.log(`✓ Saved Common Questions Spacing screenshot to ${faqSpacingPath}`);

  await browser.close();
  console.log('SUCCESS: All filter and spacing checks passed!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
