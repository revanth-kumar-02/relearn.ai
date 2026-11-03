import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, './fixtures/flutter-70-day-plan.json');
const flutterFixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

export const FLUTTER_PLAN_ID = 'c7d534c9-6868-40cb-8bba-ab87d0f1c663';
export const FLUTTER_USER_ID = 'e01b805f-e67f-4bb1-bb4d-9cccc32ff276';

export const flutterUser = flutterFixtureData.user;
export const flutterPlan = flutterFixtureData.plan;
export const flutterTasks = flutterFixtureData.tasks;

export async function setupFlutterPlanState(
  page: Page,
  options?: {
    customTasks?: any[];
    customPlan?: any;
  }
) {
  const user = flutterUser;
  const plan = options?.customPlan || flutterPlan;
  const tasks = options?.customTasks || flutterTasks;

  await page.addInitScript(
    ({ u, p, t }) => {
      localStorage.clear();
      sessionStorage.clear();

      const users = { [u.id]: u };
      localStorage.setItem('relearn_session', u.id);
      localStorage.setItem('relearn_users', JSON.stringify(users));
      localStorage.setItem(`relearn_plans_${u.id}`, JSON.stringify([p]));
      localStorage.setItem(`relearn_tasks_${u.id}`, JSON.stringify(t));
      localStorage.setItem('relearn_help_prompt_dismissed', 'true');
    },
    { u: user, p: plan, t: tasks }
  );
}
