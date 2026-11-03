import { test, expect } from '@playwright/test';
import { setupFlutterPlanState, flutterTasks } from './flutter-helpers';

test.describe('Flutter Practical Learning — Code Sandbox & Project Lab Modules', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlutterPlanState(page);
  });

  test('1. Code Playground route (/#/playground) renders correctly with all navigation elements', async ({ page }) => {
    await page.goto('/#/playground');

    // Header and tags
    await expect(page.getByText('Relearn.ai Code Playground')).toBeVisible();
    await expect(page.getByText('Engineering Sandbox')).toBeVisible();
    await expect(page.getByText('Multi-Language Sandboxes')).toBeVisible();

    // Verify Run Code button is present
    const runBtn = page.getByRole('button', { name: /Run Code/i });
    await expect(runBtn).toBeVisible();

    // Verify language selector is present
    await expect(page.getByRole('button', { name: /JavaScript/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /HTML \/ CSS/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Python/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /SQL/i })).toBeVisible();
  });

  test('2. Execute JavaScript in Code Playground and capture console output', async ({ page }) => {
    await page.goto('/#/playground');

    // Click Run Code
    const runBtn = page.getByRole('button', { name: /Run Code/i });
    await runBtn.click();

    // Output console should display log entries
    const consoleArea = page.getByText('Console Output');
    await expect(consoleArea).toBeVisible();

    await expect(page.getByText('Analyzing mastery metrics...')).toBeVisible();
    await expect(page.getByText('Average Mastery Score: 88%')).toBeVisible();
  });

  test('3. Switch Code Playground language to HTML/CSS and verify Live Preview tab', async ({ page }) => {
    await page.goto('/#/playground');

    // Switch to HTML/CSS
    const htmlTab = page.getByRole('button', { name: /HTML \/ CSS/i });
    await htmlTab.click();

    // Click Run Code to render preview
    const runBtn = page.getByRole('button', { name: /Run Code/i });
    await runBtn.click();

    // Preview tab should be active and render iframe preview
    const previewTab = page.getByRole('tab', { name: /Live Preview/i }).or(page.getByRole('button', { name: /Preview/i }));
    await expect(previewTab.first()).toBeVisible();
  });

  test('4. Learning Workspace with practical content renders Project Lab and Code Sandbox', async ({ page }) => {
    // Seed task 1 with sample practical content to test rich learning components
    const customTasks = flutterTasks.map((t, idx) => {
      if (idx === 0) {
        return {
          ...t,
          learningObjective: 'Master Dart type system, variables, functions, and Flutter widget fundamentals.',
          aiExplanation: `## 🚀 Flutter & Dart Foundations\n\nFlutter is Google's UI toolkit for building natively compiled applications for mobile, web, and desktop from a single codebase.\n\n### Key Concepts\n- **Widgets**: Everything in Flutter is a widget.\n- **Stateful vs Stateless**: Reactive UI state models.\n\n\`\`\`dart\nvoid main() {\n  print('Hello Flutter 70-Day Journey!');\n}\n\`\`\``,
          practiceActivities: [
            'Install the Flutter SDK and verify with flutter doctor',
            'Write a Dart function to compute layout constraints',
            'Inspect widget tree hierarchy using Flutter DevTools'
          ],
          practiceQuestion: 'Create a Stateless widget that displays a user card with name and avatar.',
          status: 'In Progress'
        };
      }
      return t;
    });

    await setupFlutterPlanState(page, { customTasks });

    const day1Task = customTasks[0];
    await page.goto(`/#/learning-workspace?taskId=${day1Task.id}`);

    // Verify Theory Content is rendered
    await expect(page.getByText('Learning Objective')).toBeVisible();
    await expect(page.getByText('Master Dart type system')).toBeVisible();
    await expect(page.getByText('Concept Explanation')).toBeVisible();
    await expect(page.getByText('Flutter & Dart Foundations')).toBeVisible();

    // Verify Practice Tasks are rendered
    await expect(page.getByText('What To Practice Today')).toBeVisible();
    await expect(page.getByText('Install the Flutter SDK and verify with flutter doctor')).toBeVisible();

    // Verify Hands-On Project Lab section is rendered
    await expect(page.getByText('Hands-On Project Lab')).toBeVisible();

    // Verify Interactive Code Sandbox is rendered in workspace
    await expect(page.getByText('Interactive Code Sandbox')).toBeVisible();
  });
});
