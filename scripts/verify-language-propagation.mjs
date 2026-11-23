import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29';

async function runLanguagePropagationTests() {
  console.log('\n======================================================');
  console.log('🌐 RUNNING END-TO-END MULTI-USER LANGUAGE TEST SUITE');
  console.log('======================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  let passed = 0;
  let total = 0;

  function assert(cond, name, detail) {
    total++;
    if (cond) {
      passed++;
      console.log(`  ✅ PASS: ${name}`);
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 1: User 1 (Tamil Text & Tamil Video) with Mismatch Banner
  // ─────────────────────────────────────────────────────────────
  console.log('--- TEST 1: User 1 (Tamil Text & Tamil Video Preferences) ---');
  {
    const userTamil = {
      id: 'user-tamil-001',
      name: 'Karthik Raja',
      email: 'karthik@relearn.ai',
      isVerified: true,
      preferences: {
        theme: 'light',
        videoLanguage: 'ta',
        contentLanguage: 'ta',
      }
    };

    const planTamil = {
      id: 'plan-data-analyst-ta',
      title: 'Data Analyst for Beginners',
      subject: 'Data Analyst',
      difficulty: 'Beginner',
      totalDays: 30,
      completedDays: 1,
      progress: 3,
      status: 'active',
      language: 'ta'
    };

    // Existing task in English to trigger the Language Mismatch banner
    const taskEnglish = {
      id: 'task-excel-cleaning-en',
      planId: 'plan-data-analyst-ta',
      title: 'Data Cleaning Using Excel',
      learningObjective: 'Understand missing values, identify duplicate records, clean inconsistent data in Excel spreadsheets',
      description: 'Hands-on practice cleaning raw datasets with Excel formulas',
      tags: ['Excel', 'Data Cleaning', 'Spreadsheets', 'lang:en'],
      language: 'en',
      status: 'In Progress',
      dueDate: '2026-11-24',
      aiExplanation: '## Data Cleaning Fundamentals\n\nData cleaning is the process of fixing or removing incorrect, corrupted, incorrectly formatted, duplicate, or incomplete data within a dataset.\n\n### Core Operations:\n- **Removing duplicates**: Use Excel Data > Remove Duplicates\n- **Handling missing values**: Fill with mean/median or flag nulls.',
      practiceQuestion: 'How would you identify and remove duplicate rows in Excel without losing genuine data?',
    };

    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();

    // Mock YouTube API returning the exact 4 offending English videos seen in user screenshot
    await page.route('**/api/youtube', async (route) => {
      const postData = JSON.parse(route.request().postData() || '{}');
      const { endpoint } = postData;

      if (endpoint === 'search') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              { id: { videoId: 'vid-cursor-ai' } },
              { id: { videoId: 'vid-big-data' } },
              { id: { videoId: 'vid-power-bi' } },
              { id: { videoId: 'vid-data-analysis-guide' } },
            ]
          })
        });
      }

      if (endpoint === 'videos') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'vid-cursor-ai',
                snippet: {
                  title: 'Cursor Tutorial for Beginners (AI Code Editor)',
                  description: 'Learn Cursor AI code editor for programming in English.',
                  channelTitle: 'Tech With Tim',
                  thumbnails: { medium: { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=480&q=80' } }
                },
                statistics: { viewCount: '1200000' }
              },
              {
                id: 'vid-big-data',
                snippet: {
                  title: 'Big Data In 5 Minutes | What Is Big Data? | Simplilearn',
                  description: 'Big data concepts explained in English.',
                  channelTitle: 'Simplilearn',
                  thumbnails: { medium: { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=480&q=80' } }
                },
                statistics: { viewCount: '2300000' }
              },
              {
                id: 'vid-power-bi',
                snippet: {
                  title: 'Your first 10 minutes of Power BI - A no nonsense guide',
                  description: 'Power BI basics tutorial.',
                  channelTitle: 'Chandoo',
                  thumbnails: { medium: { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=480&q=80' } }
                },
                statistics: { viewCount: '800000' }
              },
              {
                id: 'vid-data-analysis-guide',
                snippet: {
                  title: 'A Beginners Guide To The Data Analysis Process',
                  description: 'Step by step guide to the general data analysis workflow.',
                  channelTitle: 'CareerFoundry',
                  thumbnails: { medium: { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=480&q=80' } }
                },
                statistics: { viewCount: '950000' }
              }
            ]
          })
        });
      }
      return route.continue();
    });

    await page.addInitScript(({ userTamil, planTamil, taskEnglish }) => {
      localStorage.clear();
      localStorage.setItem('relearn_theme', 'light');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('relearn_session', userTamil.id);
      localStorage.setItem('relearn_users', JSON.stringify({ [userTamil.id]: userTamil }));
      localStorage.setItem('relearn_plans_' + userTamil.id, JSON.stringify([planTamil]));
      localStorage.setItem('relearn_tasks_' + userTamil.id, JSON.stringify([taskEnglish]));
      localStorage.setItem('relearn_active_plan_id', planTamil.id);
      localStorage.setItem(`relearn_video_lang_${userTamil.id}`, 'ta');
      localStorage.setItem(`relearn_content_lang_${userTamil.id}`, 'ta');
    }, { userTamil, planTamil, taskEnglish });

    console.log('Navigating to User 1 (Tamil) Workspace...');
    await page.goto(`http://localhost:3000/#/learning-workspace?taskId=${taskEnglish.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Assert Language Mismatch Alert Banner is visible
    const mismatchBanner = page.locator('text=Language Setting Changed');
    const isBannerVisible = await mismatchBanner.isVisible();
    assert(isBannerVisible, 'Language Mismatch Banner is rendered when task language (en) differs from user preference (ta)');

    const regenButton = page.locator('button:has-text("Regenerate in Tamil")');
    const isRegenBtnVisible = await regenButton.isVisible();
    assert(isRegenBtnVisible, '"Regenerate in Tamil" button is presented to the user');

    // Scroll to Curated Video Mentorship
    const videoSection = page.locator('text=Curated Video Mentorship');
    await videoSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Verify the offending English videos were NOT shown
    const cursorVisible = await page.locator('text=Cursor Tutorial for Beginners').isVisible();
    assert(!cursorVisible, 'English Cursor AI video is HARD REJECTED and NOT shown under Tamil search');

    const bigDataVisible = await page.locator('text=Big Data In 5 Minutes').isVisible();
    assert(!bigDataVisible, 'English Big Data video is HARD REJECTED and NOT shown under Tamil search');

    const powerBiVisible = await page.locator('text=Your first 10 minutes of Power BI').isVisible();
    assert(!powerBiVisible, 'English Power BI video is HARD REJECTED and NOT shown under Tamil search');

    // Verify empty state is displayed because no authentic Tamil videos were in the pool
    const emptyStateHeader = page.locator('text=Strict Educational Relevance Filter');
    const isEmptyVisible = await emptyStateHeader.isVisible();
    assert(isEmptyVisible, 'Strict Educational Relevance Empty State is displayed instead of deceptive English videos');

    const searchInEnglishBtn = page.locator('button:has-text("Search in English")');
    const isSearchEngVisible = await searchInEnglishBtn.isVisible();
    assert(isSearchEngVisible, '"Search in English" fallback action is available');

    const shot1Path = path.join(ARTIFACT_DIR, '09_tamil_language_preference_verified.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`Saved screenshot: ${shot1Path}`);

    await context.close();
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 2: User 2 (English Text & English Video) Isolation
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: User 2 (English Text & English Video Preferences) ---');
  {
    const userEnglish = {
      id: 'user-english-002',
      name: 'Sarah Connor',
      email: 'sarah@relearn.ai',
      isVerified: true,
      preferences: {
        theme: 'light',
        videoLanguage: 'en',
        contentLanguage: 'en',
      }
    };

    const planEnglish = {
      id: 'plan-python-en',
      title: 'Python for Beginners',
      subject: 'Python',
      difficulty: 'Beginner',
      totalDays: 20,
      completedDays: 0,
      progress: 0,
      status: 'active',
      language: 'en'
    };

    const taskEnglishPython = {
      id: 'task-python-loops',
      planId: 'plan-python-en',
      title: 'Python Loops & Iteration',
      learningObjective: 'Master for loops, while loops, and range() function in Python 3',
      description: 'Hands-on practice writing loops in Python',
      tags: ['Python', 'Loops', 'Iteration', 'lang:en'],
      language: 'en',
      status: 'In Progress',
      dueDate: '2026-11-24',
      aiExplanation: '## Python Loops\n\nLoops allow executing code blocks repeatedly based on conditions or sequences.',
      practiceQuestion: 'Write a for loop that iterates from 1 to 10 and prints only even numbers.',
    };

    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();

    // YouTube returns Python loop tutorial
    await page.route('**/api/youtube', async (route) => {
      const postData = JSON.parse(route.request().postData() || '{}');
      const { endpoint } = postData;

      if (endpoint === 'search') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              { id: { videoId: 'vid-py-loops-1' } },
              { id: { videoId: 'vid-cursor-ai' } },
            ]
          })
        });
      }

      if (endpoint === 'videos') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'vid-py-loops-1',
                snippet: {
                  title: 'Python Loops Tutorial - For Loops and While Loops for Beginners',
                  description: 'Complete guide to Python loops with range() and iteration.',
                  channelTitle: 'Corey Schafer',
                  thumbnails: { medium: { url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=480&q=80' } }
                },
                statistics: { viewCount: '850000' }
              },
              {
                id: 'vid-cursor-ai',
                snippet: {
                  title: 'Cursor Tutorial for Beginners (AI Code Editor)',
                  description: 'Cursor IDE overview.',
                  channelTitle: 'Tech With Tim',
                  thumbnails: { medium: { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=480&q=80' } }
                },
                statistics: { viewCount: '1200000' }
              }
            ]
          })
        });
      }
      return route.continue();
    });

    await page.addInitScript(({ userEnglish, planEnglish, taskEnglishPython }) => {
      localStorage.clear();
      localStorage.setItem('relearn_theme', 'light');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('relearn_session', userEnglish.id);
      localStorage.setItem('relearn_users', JSON.stringify({ [userEnglish.id]: userEnglish }));
      localStorage.setItem('relearn_plans_' + userEnglish.id, JSON.stringify([planEnglish]));
      localStorage.setItem('relearn_tasks_' + userEnglish.id, JSON.stringify([taskEnglishPython]));
      localStorage.setItem('relearn_active_plan_id', planEnglish.id);
      localStorage.setItem(`relearn_video_lang_${userEnglish.id}`, 'en');
      localStorage.setItem(`relearn_content_lang_${userEnglish.id}`, 'en');
    }, { userEnglish, planEnglish, taskEnglishPython });

    console.log('Navigating to User 2 (English) Workspace...');
    await page.goto(`http://localhost:3000/#/learning-workspace?taskId=${taskEnglishPython.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Assert NO mismatch banner (because task lang 'en' matches user preference 'en')
    const mismatchBanner = page.locator('text=Language Setting Changed');
    const isBannerVisible = await mismatchBanner.isVisible();
    assert(!isBannerVisible, 'Language Mismatch Banner is NOT shown when task matches user preference');

    // Scroll to Curated Video Mentorship
    const videoSection = page.locator('text=Curated Video Mentorship');
    await videoSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Verify curriculum match pill says English
    const pill = page.locator('text=Curriculum Match: English');
    const isPillVisible = await pill.isVisible();
    assert(isPillVisible, 'Curriculum Match pill correctly indicates "English" for User 2');

    // Verify Python Loops video is displayed
    const pyVideo = page.locator('text=Python Loops Tutorial - For Loops and While Loops');
    const isPyVisible = await pyVideo.isVisible();
    assert(isPyVisible, 'Directly relevant Python loops video is accepted and displayed');

    // Verify Cursor AI video is rejected
    const cursorVisible = await page.locator('text=Cursor Tutorial for Beginners').isVisible();
    assert(!cursorVisible, 'Cursor AI video is rejected even in English mode (unrelated tool)');

    const shot2Path = path.join(ARTIFACT_DIR, '10_english_language_preference_verified.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`Saved screenshot: ${shot2Path}`);

    await context.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log(`📊 E2E TEST SUMMARY: ${passed} / ${total} ASSERTIONS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runLanguagePropagationTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
