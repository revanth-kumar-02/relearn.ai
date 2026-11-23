import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29';

async function verifyVideoUI() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const mockUser = {
    id: 'test-user-verified',
    name: 'Verified Student',
    email: 'student@relearn.ai',
    isVerified: true,
    preferences: {
      theme: 'light',
      videoLanguage: 'en',
      contentLanguage: 'en',
    }
  };

  const mockPlan = {
    id: 'plan-data-analyst-101',
    title: 'Data Analyst for Beginners',
    subject: 'Data Analyst',
    difficulty: 'Beginner',
    totalDays: 30,
    completedDays: 2,
    progress: 7,
    status: 'active',
  };

  const mockTask = {
    id: 'task-excel-data-cleaning',
    planId: 'plan-data-analyst-101',
    title: 'Data Cleaning Using Excel',
    learningObjective: 'Understand missing values, identify duplicate records, clean inconsistent data, and apply data validation in spreadsheets',
    description: 'Learn foundational data cleaning techniques using Microsoft Excel',
    tags: ['Excel', 'Data Cleaning', 'Spreadsheets'],
    status: 'In Progress',
    dueDate: '2026-11-24',
    aiExplanation: '## Data Cleaning Fundamentals\n\nData cleaning is the process of fixing or removing incorrect, corrupted, incorrectly formatted, duplicate, or incomplete data within a dataset.\n\n### Core Operations:\n- **Removing duplicates**: Use Excel Data > Remove Duplicates\n- **Handling missing values**: Fill with mean/median or flag nulls\n- **Standardizing text**: Clean and TRIM unwanted whitespace.',
    practiceQuestion: 'How would you identify and remove duplicate rows across multiple columns in Excel without losing genuine data?',
  };

  // ─────────────────────────────────────────────────────────────
  // 1. English Mode Page
  // ─────────────────────────────────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();

    await page.route('**/api/youtube', async (route) => {
      const postData = JSON.parse(route.request().postData() || '{}');
      const { endpoint } = postData;

      if (endpoint === 'search') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              { id: { videoId: 'vid-ex-clean-1' } },
              { id: { videoId: 'vid-cursor-ai' } },
              { id: { videoId: 'vid-ex-clean-2' } },
              { id: { videoId: 'vid-big-data' } },
              { id: { videoId: 'vid-power-bi' } },
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
                id: 'vid-ex-clean-1',
                snippet: {
                  title: 'Excel Data Cleaning Tutorial for Beginners - Clean Data in 15 Minutes',
                  description: 'Complete step by step tutorial on cleaning messy data in Microsoft Excel spreadsheets including duplicate removal and missing value imputation.',
                  channelTitle: 'Kevin Stratvert',
                  publishedAt: '2024-03-10T12:00:00Z',
                  thumbnails: {
                    medium: { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=480&q=80' }
                  }
                },
                statistics: { viewCount: '620000' }
              },
              {
                id: 'vid-cursor-ai',
                snippet: {
                  title: 'Cursor Tutorial for Beginners (AI Code Editor)',
                  description: 'Learn the new Cursor AI code editor built on VS Code for software engineers.',
                  channelTitle: 'Tech With Tim',
                  publishedAt: '2024-05-15T15:00:00Z',
                  thumbnails: {
                    medium: { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=480&q=80' }
                  }
                },
                statistics: { viewCount: '1200000' }
              },
              {
                id: 'vid-ex-clean-2',
                snippet: {
                  title: 'How to Handle Missing Data and Duplicates in Excel Spreadsheets',
                  description: 'Learn practical methods for identifying nulls, duplicates, and cleaning spreadsheet columns step by step.',
                  channelTitle: 'Chandoo',
                  publishedAt: '2024-02-18T10:00:00Z',
                  thumbnails: {
                    medium: { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=480&q=80' }
                  }
                },
                statistics: { viewCount: '410000' }
              },
              {
                id: 'vid-big-data',
                snippet: {
                  title: 'Big Data In 5 Minutes | What Is Big Data? | Simplilearn',
                  description: 'Overview of Big Data and enterprise data lakes.',
                  channelTitle: 'Simplilearn',
                  publishedAt: '2023-08-20T08:00:00Z',
                  thumbnails: {
                    medium: { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=480&q=80' }
                  }
                },
                statistics: { viewCount: '2300000' }
              },
              {
                id: 'vid-power-bi',
                snippet: {
                  title: 'Your first 10 minutes of Power BI - A no nonsense guide',
                  description: 'Build your first Power BI desktop dashboard.',
                  channelTitle: 'Chandoo',
                  publishedAt: '2023-11-12T14:00:00Z',
                  thumbnails: {
                    medium: { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=480&q=80' }
                  }
                },
                statistics: { viewCount: '800000' }
              }
            ]
          })
        });
      }
      return route.continue();
    });

    await page.addInitScript(({ mockUser, mockPlan, mockTask }) => {
      localStorage.clear();
      localStorage.setItem('relearn_theme', 'light');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('relearn_session', mockUser.id);
      localStorage.setItem('relearn_users', JSON.stringify({ [mockUser.id]: mockUser }));
      localStorage.setItem('relearn_plans_' + mockUser.id, JSON.stringify([mockPlan]));
      localStorage.setItem('relearn_tasks_' + mockUser.id, JSON.stringify([mockTask]));
      localStorage.setItem('relearn_active_plan_id', mockPlan.id);
      localStorage.setItem('videoLanguagePreference', 'en');
    }, { mockUser, mockPlan, mockTask });

    console.log('Navigating to English Workspace...');
    await page.goto(`http://localhost:3000/#/learning-workspace?taskId=${mockTask.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const videoSection = await page.locator('text=Curated Video Mentorship');
    await videoSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const shot1Path = path.join(ARTIFACT_DIR, '07_curated_video_mentorship_verified.png');
    await page.screenshot({ path: shot1Path, fullPage: false });
    console.log(`Saved screenshot 1: ${shot1Path}`);
    await context.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Tamil Mode Page (Verifying Strict Language Gate)
  // ─────────────────────────────────────────────────────────────
  {
    const mockUserTa = {
      ...mockUser,
      preferences: {
        ...mockUser.preferences,
        videoLanguage: 'ta',
      }
    };

    const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await context.newPage();

    // When YouTube returns English videos for a Tamil search (reproducing the exact production bug)
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
                  description: 'Learn the new Cursor AI code editor built on VS Code for software engineers.',
                  channelTitle: 'Tech With Tim',
                  publishedAt: '2024-05-15T15:00:00Z',
                  thumbnails: { medium: { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=480&q=80' } }
                },
                statistics: { viewCount: '1200000' }
              },
              {
                id: 'vid-big-data',
                snippet: {
                  title: 'Big Data In 5 Minutes | What Is Big Data? | Simplilearn',
                  description: 'Overview of Big Data.',
                  channelTitle: 'Simplilearn',
                  publishedAt: '2023-08-20T08:00:00Z',
                  thumbnails: { medium: { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=480&q=80' } }
                },
                statistics: { viewCount: '2300000' }
              }
            ]
          })
        });
      }
      return route.continue();
    });

    await page.addInitScript(({ mockUserTa, mockPlan, mockTask }) => {
      localStorage.clear();
      localStorage.setItem('relearn_theme', 'light');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('relearn_session', mockUserTa.id);
      localStorage.setItem('relearn_users', JSON.stringify({ [mockUserTa.id]: mockUserTa }));
      localStorage.setItem('relearn_plans_' + mockUserTa.id, JSON.stringify([mockPlan]));
      localStorage.setItem('relearn_tasks_' + mockUserTa.id, JSON.stringify([mockTask]));
      localStorage.setItem('relearn_active_plan_id', mockPlan.id);
      localStorage.setItem('videoLanguagePreference', 'ta');
    }, { mockUserTa, mockPlan, mockTask });

    console.log('Navigating to Tamil Mode Workspace...');
    await page.goto(`http://localhost:3000/#/learning-workspace?taskId=${mockTask.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const videoSection = await page.locator('text=Curated Video Mentorship');
    await videoSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const shot2Path = path.join(ARTIFACT_DIR, '08_video_tamil_filter_verified.png');
    await page.screenshot({ path: shot2Path, fullPage: false });
    console.log(`Saved screenshot 2: ${shot2Path}`);
    await context.close();
  }

  await browser.close();
  console.log('Video UI Verification complete!');
}

verifyVideoUI().catch(console.error);
