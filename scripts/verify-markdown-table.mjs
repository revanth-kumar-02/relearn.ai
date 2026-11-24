import { chromium } from 'playwright';

const testMarkdownContent = `The code above demonstrates each declaration method. Note that \`final\` can be assigned once at runtime, whereas \`const\` must be known at compile time.

### Fundamental Types

| Type | Description | |-------|--------------| | \`int\` | Whole numbers | | \`double\` | Floating-point numbers | | \`String\` | Textual data | | \`bool\` | \`true\` or \`false\` | | \`List<T>\` | Ordered collection of \`T\` | | \`Map<K, V>\` | Key-value pairs |

\`\`\`dart
int age = 30;
double price = 19.99;
String greeting = "Hello, Dart!";
bool isActive = false;
List<String> colors = ['red', 'green', 'blue'];
Map<String, int> scores = {'Alice': 10, 'Bob': 8};
\`\`\`

These examples illustrate the syntax for each primitive and collection type.

### Type Inference Rules
- If the initializer is a literal, Dart infers the most specific type.`;

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const port = 3000;
  const userId = 'e01b805f-e67f-4bb1-bb4d-9cccc32ff276';
  const samplePlanId = 'plan-table-test-123';
  const sampleTaskId = 'ba4e2efc-2bdb-440a-abe3-4e89e60948d5';
  
  const mockPlan = {
    id: samplePlanId,
    title: 'Dart & Flutter Mastery',
    category: 'Computer Science',
    language: 'Dart',
    days: []
  };

  const mockTask = {
    id: sampleTaskId,
    title: 'Variables, Constants, and Fundamental Types',
    dueDate: '2026-11-24',
    status: 'In Progress',
    planId: samplePlanId,
    tags: ['Dart'],
    type: 'reading',
    learningObjective: 'Understand Dart data types, type inference, and immutability.',
    aiExplanation: testMarkdownContent,
    practiceActivities: ['Declare integers and doubles', 'Create a Map and a List'],
    resources: [],
    language: 'en'
  };

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
    access_token: 'fake-access-token',
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: 'fake-refresh-token',
    user: mockUser
  };

  // Intercept Supabase Auth & REST endpoints
  await page.route('**/auth/v1/user*', route => route.fulfill({ status: 200, json: mockUser }));
  await page.route('**/auth/v1/token*', route => route.fulfill({ status: 200, json: authSession }));
  await page.route('**/rest/v1/plans*', route => route.fulfill({ status: 200, json: [mockPlan] }));
  await page.route('**/rest/v1/tasks*', route => route.fulfill({ status: 200, json: [mockTask] }));
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, json: [{ id: userId, name: 'Admin', email: 'admin@relearn.ai', role: 'admin', is_verified: true, preferences: {} }] }));
  await page.route('**/rest/v1/activity*', route => route.fulfill({ status: 200, json: [] }));
  await page.route('**/rest/v1/notifications*', route => route.fulfill({ status: 200, json: [] }));
  await page.route('**/rest/v1/mistakes*', route => route.fulfill({ status: 200, json: [] }));

  await page.addInitScript(({ userId, plan, task, authSession }) => {
    try {
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
      localStorage.setItem(`relearn_plans_${userId}`, JSON.stringify([plan]));
      localStorage.setItem(`relearn_tasks_${userId}`, JSON.stringify([task]));
      localStorage.setItem('relearn_active_plan_id', plan.id);
      localStorage.setItem('sb-uflcypwtplruaurvwbje-auth-token', JSON.stringify(authSession));
    } catch (e) {
      console.error('Init script error:', e);
    }
  }, { userId, plan: mockPlan, task: mockTask, authSession });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Navigate to Learning Workspace
  const targetUrl = `http://localhost:${port}/#/learning-workspace?taskId=${sampleTaskId}`;
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle' });

  try {
    // Wait for table to appear
    console.log('Waiting for table in .prose-content...');
    await page.waitForSelector('.prose-content table', { timeout: 10000 });
  } catch (err) {
    await page.screenshot({ path: 'scripts/debug-page.png' });
    console.log('Page URL on failure:', page.url());
    const bodyText = await page.textContent('body');
    console.log('Body text:', bodyText?.slice(0, 400));
    throw err;
  }
  
  const thCount = await page.locator('.prose-content table th').count();
  const trCount = await page.locator('.prose-content table tbody tr').count();
  const firstHeader = await page.locator('.prose-content table th').first().textContent();
  const secondHeader = await page.locator('.prose-content table th').nth(1).textContent();
  
  console.log(`✓ Found table with ${thCount} headers and ${trCount} data rows.`);
  console.log(`Header 1: "${firstHeader?.trim()}", Header 2: "${secondHeader?.trim()}"`);

  if (thCount !== 2 || trCount !== 6) {
    throw new Error(`Expected 2 headers and 6 rows, but got ${thCount} headers and ${trCount} rows!`);
  }

  // Scroll so the Fundamental Types table is clearly in view
  const tableLocator = page.locator('.table-container').first();
  await tableLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Capture Dark Mode Screenshot
  const darkArtifactPath = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29/16_markdown_table_dark_verified.png';
  try {
    await page.screenshot({ path: darkArtifactPath, timeout: 8000 });
  } catch {
    await tableLocator.screenshot({ path: darkArtifactPath });
  }
  console.log(`✓ Saved Dark Mode screenshot to ${darkArtifactPath}`);

  // Switch to Light Mode and capture
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await page.waitForTimeout(500);

  const lightArtifactPath = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29/17_markdown_table_light_verified.png';
  try {
    await page.screenshot({ path: lightArtifactPath, timeout: 8000 });
  } catch {
    await tableLocator.screenshot({ path: lightArtifactPath });
  }
  console.log(`✓ Saved Light Mode screenshot to ${lightArtifactPath}`);

  await browser.close();
  console.log('SUCCESS: All markdown table visual and structural tests passed cleanly!');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
