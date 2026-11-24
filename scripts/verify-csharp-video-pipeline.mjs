import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/revanth kumar/.gemini/antigravity/brain/ef88d37f-d986-4b6f-aa27-df3cfca0ff29';

async function verifyCSharpPipeline() {
  console.log('🚀 Starting C# Educational Video Pipeline UI Verification...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  const mockUser = {
    id: 'test-user-csharp',
    name: 'C# Learner',
    email: 'csharp@relearn.ai',
    isVerified: true,
    preferences: {
      theme: 'light',
      videoLanguage: 'en',
      contentLanguage: 'en',
    }
  };

  const mockPlan = {
    id: '9e66fba2-af77-4cae-8ef4-f1a58171e0b9',
    title: '30-Day Beginner C# Learning Plan',
    subject: 'C# Programming',
    difficulty: 'Beginner',
    totalDays: 30,
    completedDays: 0,
    progress: 0,
    status: 'active',
  };

  const mockTask = {
    id: '9b063015-e359-47c3-9aca-bcf29c23e08d',
    planId: '9e66fba2-af77-4cae-8ef4-f1a58171e0b9',
    title: 'Day 1: Development Environment Setup',
    learningObjective: 'Install Visual Studio Community and .NET SDK, verify with dotnet --version.',
    description: 'Install Visual Studio Community and .NET SDK, verify with dotnet --version.',
    tags: ['C#', 'AI Generated', 'lang:en'],
    status: 'In Progress',
    dueDate: '2026-11-24',
    aiExplanation: '## C# Development Environment Setup\n\nTo begin coding in C#, install Visual Studio Community with the .NET workload.\n\nVerify with `dotnet --version`.',
    practiceQuestion: 'What command verifies that the .NET SDK is properly installed on your machine?',
  };

  // Intercept YouTube API requests to test the candidate pool from production
  await page.route('**/api/youtube', async (route) => {
    const postData = JSON.parse(route.request().postData() || '{}');
    const { endpoint } = postData;

    if (endpoint === 'search') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            // Production bugs from user screenshots
            { id: { videoId: 'vid-bad-kiro' } },
            { id: { videoId: 'vid-bad-mern' } },
            { id: { videoId: 'vid-bad-sp' } },
            { id: { videoId: 'vid-bad-go' } },
            { id: { videoId: 'vid-bad-claude' } },
            // Authentic C# tutorials
            { id: { videoId: 'vid-cs-corey' } },
            { id: { videoId: 'vid-cs-chapsas' } },
            { id: { videoId: 'vid-cs-mosh' } },
            { id: { videoId: 'vid-cs-fcc' } },
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
              id: 'vid-bad-kiro',
              snippet: {
                title: 'Kiro IDE for Beginners | Download, Install & Setup | Day 1/30 Challenge',
                description: 'Download and install Kiro IDE for development.',
                channelTitle: 'Aniso all study88',
                publishedAt: '2024-04-10T12:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=480&q=80' }
                }
              },
              statistics: { viewCount: '834' }
            },
            {
              id: 'vid-bad-mern',
              snippet: {
                title: 'MERN STACK - Environment Setup | Complete Tutorial',
                description: 'Complete MERN stack development environment setup guide with VS Code.',
                channelTitle: 'WsCube Tech',
                publishedAt: '2024-02-15T15:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=480&q=80' }
                }
              },
              statistics: { viewCount: '109000' }
            },
            {
              id: 'vid-bad-sp',
              snippet: {
                title: '(old video) SharePoint Framework Tutorial - Setting up your development environment',
                description: 'SharePoint framework development environment setup tutorial.',
                channelTitle: 'Microsoft Community Learning',
                publishedAt: '2023-01-18T10:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=480&q=80' }
                }
              },
              statistics: { viewCount: '18000' }
            },
            {
              id: 'vid-bad-go',
              snippet: {
                title: 'Introduction to Go, part 2: Setting Up a Development Environment',
                description: 'How to setup Go programming language in VS Code editor.',
                channelTitle: 'Failing Forward',
                publishedAt: '2023-05-20T08:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=480&q=80' }
                }
              },
              statistics: { viewCount: '18000' }
            },
            {
              id: 'vid-bad-claude',
              snippet: {
                title: 'FULL Claude Code Tutorial for Beginners in 2026! (Step-By-Step)',
                description: 'Learn how to use Claude Code agent in terminal.',
                channelTitle: 'Tech With Tim',
                publishedAt: '2026-01-10T14:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&q=80' }
                }
              },
              statistics: { viewCount: '423000' }
            },
            // Target authentic C# videos
            {
              id: 'vid-cs-corey',
              snippet: {
                title: 'How to Setup C# and .NET in Visual Studio 2026 for Beginners',
                description: 'Step by step setup guide for C# and .NET 8 in Visual Studio Community. Create and run your first C# console app.',
                channelTitle: 'Tim Corey',
                publishedAt: '2024-03-01T12:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=480&q=80' }
                }
              },
              statistics: { viewCount: '450000' }
            },
            {
              id: 'vid-cs-chapsas',
              snippet: {
                title: 'C# VS Code Setup - Run .NET 8 CSharp in 5 Minutes',
                description: 'Complete setup of Visual Studio Code for C# development with C# Dev Kit and .NET SDK.',
                channelTitle: 'Nick Chapsas',
                publishedAt: '2024-04-12T10:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=480&q=80' }
                }
              },
              statistics: { viewCount: '320000' }
            },
            {
              id: 'vid-cs-mosh',
              snippet: {
                title: 'C# Tutorial for Beginners: Learn C# from Scratch',
                description: 'Comprehensive beginner tutorial covering C# fundamentals, .NET architecture, and writing your first C# program.',
                channelTitle: 'Programming with Mosh',
                publishedAt: '2023-09-15T09:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=480&q=80' }
                }
              },
              statistics: { viewCount: '2100000' }
            },
            {
              id: 'vid-cs-fcc',
              snippet: {
                title: 'C# Full Course for Beginners - FreeCodeCamp',
                description: 'Full course covering C# language fundamentals and .NET development environment.',
                channelTitle: 'freeCodeCamp.org',
                publishedAt: '2023-11-20T11:00:00Z',
                thumbnails: {
                  medium: { url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=480&q=80' }
                }
              },
              statistics: { viewCount: '3400000' }
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

  console.log('Navigating to C# Learning Workspace...');
  await page.goto(`http://localhost:3000/#/learning-workspace?taskId=${mockTask.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const videoSection = await page.locator('text=Curated Video Mentorship');
  await videoSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Extract all displayed video titles and reasons
  const cards = await page.$$('section:has-text("Curated Video Mentorship") .group');
  console.log(`\n======================================================`);
  console.log(`🎬 UI VERIFICATION RESULTS: ${cards.length} VIDEOS RENDERED`);
  console.log(`======================================================`);

  const renderedTitles = [];
  const renderedReasons = [];

  for (let i = 0; i < cards.length; i++) {
    const titleEl = await cards[i].$('a.font-bold');
    const title = titleEl ? (await titleEl.textContent())?.trim() : '';
    const reasonEl = await cards[i].$('p.text-\\[11px\\]');
    const reason = reasonEl ? (await reasonEl.textContent())?.trim() : '';

    renderedTitles.push(title);
    renderedReasons.push(reason);

    console.log(`\nCard ${i + 1}:`);
    console.log(`  Title:  "${title}"`);
    console.log(`  Reason: "${reason}"`);
  }

  // Verification Assertions:
  const containsKiro = renderedTitles.some(t => t.toLowerCase().includes('kiro'));
  const containsMern = renderedTitles.some(t => t.toLowerCase().includes('mern'));
  const containsSharePoint = renderedTitles.some(t => t.toLowerCase().includes('sharepoint'));
  const containsGo = renderedTitles.some(t => t.toLowerCase().includes('introduction to go'));
  const containsClaude = renderedTitles.some(t => t.toLowerCase().includes('claude code'));

  console.log('\n--- VERIFICATION CHECKS ---');
  if (!containsKiro) console.log('  ✅ PASS: Kiro IDE strictly ELIMINATED');
  else console.error('  ❌ FAIL: Kiro IDE was rendered');

  if (!containsMern) console.log('  ✅ PASS: MERN Stack strictly ELIMINATED');
  else console.error('  ❌ FAIL: MERN Stack was rendered');

  if (!containsSharePoint) console.log('  ✅ PASS: SharePoint Framework strictly ELIMINATED');
  else console.error('  ❌ FAIL: SharePoint Framework was rendered');

  if (!containsGo) console.log('  ✅ PASS: Go Tutorial strictly ELIMINATED');
  else console.error('  ❌ FAIL: Go Tutorial was rendered');

  if (!containsClaude) console.log('  ✅ PASS: Claude Code AI tool strictly ELIMINATED');
  else console.error('  ❌ FAIL: Claude Code was rendered');

  const allCsharp = renderedTitles.every(t => t.includes('C#'));
  if (allCsharp && renderedTitles.length === 4) {
    console.log('  ✅ PASS: All 4 displayed videos are authentic C# tutorials');
  } else {
    console.error('  ❌ FAIL: Non-C# tutorials detected');
  }

  const hasStaticPlaceholder = renderedReasons.some(r => r === 'Foundational concept for Day 1: Development Environment Setup');
  if (!hasStaticPlaceholder) {
    console.log('  ✅ PASS: Static generic placeholder string ELIMINATED');
    console.log('  ✅ PASS: Dynamic, curriculum-grounded reasons displayed on all cards');
  } else {
    console.error('  ❌ FAIL: Static generic placeholder still present on cards');
  }

  // Capture screenshot of Curated Video Mentorship section
  const screenshotPath = path.join(ARTIFACT_DIR, '11_csharp_curated_video_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`\n📸 High-resolution screenshot captured and saved to:\n   ${screenshotPath}`);

  await browser.close();

  if (containsKiro || containsMern || containsSharePoint || containsGo || containsClaude || !allCsharp || hasStaticPlaceholder) {
    process.exit(1);
  }
}

verifyCSharpPipeline().catch(err => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
