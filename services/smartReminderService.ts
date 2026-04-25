import { Plan, Task, UserPreferences, UserStats, Notification } from '../types';
import { sendBrowserNotification } from './notificationService';

export interface StudyNudge {
  id: string;
  type: 'stale_plan' | 'no_progress_today' | 'streak_at_risk' | 'overdue_task';
  title: string;
  message: string;
  icon: string;
  color: string;
  bg: string;
  planId?: string;
  actionLabel?: string;
}

const NUDGE_COOLDOWN_KEY = 'relearn_nudge_last_shown';

/**
 * Generates contextual study nudges based on current plan/task state.
 * Called on app load to produce smart reminders.
 */
export function generateStudyNudges(
  plans: Plan[],
  tasks: Task[],
  preferences?: UserPreferences,
  stats?: UserStats
): StudyNudge[] {
  const nudges: StudyNudge[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const activePlans = plans.filter(p => !p.isArchived && p.progress < 100);

  // 1. Stale Plan Detection — plans with no recent task completion
  for (const plan of activePlans) {
    const planTasks = tasks.filter(t => t.planId === plan.id);
    const completedTasks = planTasks.filter(t => t.status === 'Completed' && t.completedAt);

    if (completedTasks.length === 0 && planTasks.length > 0) {
      // Plan has tasks but none completed
      const createdDate = plan.createdAt ? new Date(plan.createdAt) : null;
      const daysSinceCreation = createdDate
        ? Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysSinceCreation >= 2) {
        nudges.push({
          id: `stale-${plan.id}`,
          type: 'stale_plan',
          title: `Start "${plan.title}"`,
          message: `You created this plan ${daysSinceCreation} days ago but haven't started yet. Begin your first task today!`,
          icon: 'rocket_launch',
          color: 'text-amber-600',
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          planId: plan.id,
          actionLabel: 'Start Now',
        });
      }
    } else if (completedTasks.length > 0) {
      // Find most recent completion
      const lastCompleted = completedTasks
        .map(t => new Date(t.completedAt!))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const daysSinceLastStudy = Math.floor(
        (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastStudy >= 3) {
        nudges.push({
          id: `stale-${plan.id}`,
          type: 'stale_plan',
          title: `Resume "${plan.title}"`,
          message: `You haven't studied this in ${daysSinceLastStudy} days. Pick up where you left off!`,
          icon: 'history',
          color: 'text-orange-600',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          planId: plan.id,
          actionLabel: 'Continue',
        });
      }
    }
  }

  // 2. No Progress Today
  const todayCompletions = tasks.filter(
    t => t.completedAt && t.completedAt.startsWith(todayStr)
  );

  if (todayCompletions.length === 0 && activePlans.length > 0) {
    const nextTask = tasks
      .filter(t => t.status !== 'Completed' && activePlans.some(p => p.id === t.planId))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    if (nextTask) {
      nudges.push({
        id: 'no-progress-today',
        type: 'no_progress_today',
        title: "Start your day right!",
        message: `Your next task is "${nextTask.title}". Just ${nextTask.durationMinutes} minutes to get going!`,
        icon: 'wb_sunny',
        color: 'text-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        planId: nextTask.planId,
        actionLabel: 'Begin Task',
      });
    }
  }

  // 3. Overdue Tasks
  const overdueTasks = tasks.filter(
    t => t.status !== 'Completed' && t.dueDate < todayStr && activePlans.some(p => p.id === t.planId)
  );

  if (overdueTasks.length > 0 && preferences?.notifications?.taskOverdueAlerts !== false) {
    const count = overdueTasks.length;
    nudges.push({
      id: 'overdue-tasks',
      type: 'overdue_task',
      title: `${count} overdue task${count > 1 ? 's' : ''}`,
      message: count === 1
        ? `"${overdueTasks[0].title}" was due ${overdueTasks[0].dueDate}. Let's catch up!`
        : `You have ${count} tasks past their due date. Time to catch up!`,
      icon: 'warning',
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
      actionLabel: 'Review Tasks',
    });
  }

  // 4. Streak at Risk
  if (stats?.studyStreak && stats.studyStreak > 0) {
    // This is simplified; in a real app, we'd check last_study_date vs today
    // For now, if no progress today and they have a streak, it's "at risk"
    if (todayCompletions.length === 0) {
      nudges.push({
        id: 'streak-at-risk',
        type: 'streak_at_risk',
        title: "Streak at risk!",
        message: `You've studied for ${stats.studyStreak} days straight. Don't let it break today!`,
        icon: 'local_fire_department',
        color: 'text-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-950/20',
        actionLabel: 'Keep Streak',
      });
    }
  }

  // Prioritize "Active Learning" to be first
  nudges.sort((a, b) => {
    const priority: Record<string, number> = {
      'no_progress_today': 1,
      'streak_at_risk': 2,
      'stale_plan': 3,
      'overdue_task': 4
    };
    return (priority[a.type] || 99) - (priority[b.type] || 99);
  });

  // Limit to 3 most relevant nudges
  return nudges.slice(0, 3);
}

/**
 * Sends a browser notification for the most urgent nudge.
 * Respects a cooldown (once per 4 hours) to avoid spamming.
 */
export function sendSmartReminder(nudges: StudyNudge[]): void {
  if (nudges.length === 0) return;

  // Cooldown check
  try {
    const lastShown = localStorage.getItem(NUDGE_COOLDOWN_KEY);
    if (lastShown) {
      const elapsed = Date.now() - parseInt(lastShown, 10);
      if (elapsed < 4 * 60 * 60 * 1000) return; // 4 hour cooldown
    }
  } catch { /* ignore localStorage errors */ }

  const topNudge = nudges[0];
  sendBrowserNotification(
    `📚 ${topNudge.title}`,
    topNudge.message
  );

  try {
    localStorage.setItem(NUDGE_COOLDOWN_KEY, Date.now().toString());
  } catch { /* ignore */ }
}
