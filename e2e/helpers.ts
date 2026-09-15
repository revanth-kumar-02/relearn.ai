import { Page } from '@playwright/test';

export const MOCK_USER_ID = 'e2e-test-user-id';
export const MOCK_ADMIN_ID = 'e2e-test-admin-id';

export const mockUser = {
  id: MOCK_USER_ID,
  name: 'Test Scholar',
  username: 'test_scholar',
  email: 'scholar@example.com',
  role: 'user',
  isVerified: true,
  createdAt: new Date().toISOString(),
  stats: {
    studyStreak: 5,
    longestStreak: 12,
    totalStudyHours: 24,
    plansCreated: 3,
    plansCompleted: 1,
    totalXP: 1450,
    level: 3,
    badges: ['First Step', 'Streak Master'],
    streakFreezes: 2,
    totalTasksCompleted: 15,
  },
  preferences: {
    theme: 'light',
    videoLanguage: 'en',
    contentLanguage: 'en',
    aiPersona: 'Chill Friend',
    learningStyle: 'Standard',
    notifications: {
      dailyReminder: true,
      dailyReminderTime: '09:00',
      progressUpdates: true,
      newPlanSuggestions: false,
      streakNotifications: true,
      taskOverdueAlerts: true,
    },
  },
  profileSettings: {
    gradientTheme: 'theme-1',
  },
};

export const mockAdmin = {
  ...mockUser,
  id: MOCK_ADMIN_ID,
  name: 'Test Admin',
  username: 'admin_user',
  email: 'admin@example.com',
  role: 'admin',
};

export const mockPlans = [
  {
    id: 'plan-1',
    title: 'Fullstack Web Development',
    subject: 'Computer Science',
    totalDays: 30,
    completedDays: 10,
    progress: 33,
    dailyGoalMins: 45,
    status: 'active',
    isArchived: false,
    createdAt: new Date().toISOString(),
    journal: 'Notes on fullstack development progress.',
  },
  {
    id: 'plan-2',
    title: 'Machine Learning Basics',
    subject: 'Data Science',
    totalDays: 14,
    completedDays: 14,
    progress: 100,
    dailyGoalMins: 30,
    status: 'completed',
    isArchived: true,
    createdAt: new Date().toISOString(),
  },
];

export const mockTasks = [
  {
    id: 'task-1',
    title: 'Build React UI Components',
    description: 'Implement reusable layout elements and state controls',
    durationMinutes: 45,
    dueDate: new Date().toISOString().split('T')[0],
    status: 'In Progress',
    planId: 'plan-1',
    tags: ['React', 'TypeScript'],
    type: 'coding',
    priority: 'High',
    notes: 'Initial work on components completed.',
  },
  {
    id: 'task-2',
    title: 'Review Neural Network Architecture',
    description: 'Read chapter 4 on backpropagation and activation functions',
    durationMinutes: 30,
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Completed',
    planId: 'plan-2',
    tags: ['AI', 'Math'],
    type: 'reading',
    priority: 'Medium',
  },
];

export async function setupAuthenticatedState(page: Page, isAdmin = false) {
  const currentUser = isAdmin ? mockAdmin : mockUser;
  await page.addInitScript(
    ({ user, plans, tasks }) => {
      localStorage.clear();
      sessionStorage.clear();

      const users = { [user.id]: user };
      localStorage.setItem('relearn_session', user.id);
      localStorage.setItem('relearn_users', JSON.stringify(users));
      localStorage.setItem(`relearn_plans_${user.id}`, JSON.stringify(plans));
      localStorage.setItem(`relearn_tasks_${user.id}`, JSON.stringify(tasks));
      localStorage.setItem('relearn_help_prompt_dismissed', 'true');
    },
    { user: currentUser, plans: mockPlans, tasks: mockTasks }
  );
}
