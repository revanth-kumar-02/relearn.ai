import { UserStats } from '../types';

// ─── XP Rewards ──────────────────────────────────────────────────────
export const XP_REWARDS = {
  COMPLETE_TASK: 25,
  COMPLETE_PLAN: 100,
  COMPLETE_QUIZ: 50,    // New quiz completion reward
  CREATE_PLAN: 50,      // New plan creation reward
  PASS_QUIZ: 50,        // ≥80% score
  STUDY_SESSION_30: 15, // ≥30 min session
  DAILY_LOGIN: 5,
  STREAK_BONUS_7: 75,
  STREAK_BONUS_30: 200,
} as const;

// ─── Badge Definitions ───────────────────────────────────────────────
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const BADGES: Badge[] = [
  { id: 'first_spark', name: 'First Spark', description: 'Complete your first task', icon: '🔥', color: 'from-orange-400 to-red-500', rarity: 'common' },
  { id: 'bookworm', name: 'Bookworm', description: 'Complete 3 plans', icon: '📚', color: 'from-blue-400 to-indigo-500', rarity: 'rare' },
  { id: 'speed_learner', name: 'Speed Learner', description: 'Complete 10 tasks in one day', icon: '⚡', color: 'from-yellow-400 to-amber-500', rarity: 'epic' },
  { id: 'night_owl', name: 'Night Owl', description: 'Study after 10 PM', icon: '🦉', color: 'from-purple-400 to-indigo-600', rarity: 'common' },
  { id: 'early_bird', name: 'Early Bird', description: 'Study before 7 AM', icon: '🌅', color: 'from-pink-400 to-orange-400', rarity: 'common' },
  { id: 'streak_7', name: '7-Day Warrior', description: 'Maintain a 7-day streak', icon: '💪', color: 'from-green-400 to-emerald-500', rarity: 'rare' },
  { id: 'streak_30', name: '30-Day Legend', description: 'Maintain a 30-day streak', icon: '🏆', color: 'from-yellow-500 to-orange-600', rarity: 'legendary' },
  { id: 'quiz_master', name: 'Quiz Master', description: 'Score 100% on 5 quizzes', icon: '🧠', color: 'from-cyan-400 to-blue-500', rarity: 'epic' },
  { id: 'centurion', name: 'Centurion', description: 'Earn 1000 XP', icon: '🎖️', color: 'from-amber-500 to-yellow-600', rarity: 'rare' },
  { id: 'scholar', name: 'Scholar', description: 'Reach Level 5', icon: '🎓', color: 'from-violet-500 to-purple-600', rarity: 'epic' },
  { id: 'marathon', name: 'Marathon Learner', description: 'Study for 10+ hours total', icon: '🏃', color: 'from-teal-400 to-green-500', rarity: 'rare' },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Complete all tasks in a plan', icon: '✨', color: 'from-rose-400 to-pink-500', rarity: 'common' },
  
  // New Badges
  { id: 'novice_planner', name: 'Novice Planner', description: 'Create 5 plans', icon: '📋', color: 'from-blue-300 to-cyan-400', rarity: 'common' },
  { id: 'architect', name: 'Architect', description: 'Create 15 plans', icon: '🏗️', color: 'from-indigo-400 to-violet-500', rarity: 'rare' },
  { id: 'streak_3', name: 'Consistent Start', description: 'Maintain a 3-day streak', icon: '🔱', color: 'from-orange-300 to-yellow-400', rarity: 'common' },
  { id: 'streak_50', name: 'Half-Century Warrior', description: 'Maintain a 50-day streak', icon: '🎖️', color: 'from-red-500 to-orange-600', rarity: 'epic' },
  { id: 'streak_100', name: 'Centennial Legend', description: 'Maintain a 100-day streak', icon: '👑', color: 'from-yellow-400 via-pink-500 to-purple-600', rarity: 'legendary' },
  { id: 'task_master', name: 'Task Master', description: 'Complete 50 tasks total', icon: '✅', color: 'from-green-400 to-emerald-600', rarity: 'rare' },
  { id: 'xp_5000', name: 'Overachiever', description: 'Earn 5000 XP', icon: '💎', color: 'from-sky-400 to-blue-500', rarity: 'epic' },
  { id: 'xp_10000', name: 'Knowledge Titan', description: 'Earn 10000 XP', icon: '🏔️', color: 'from-slate-700 to-indigo-900', rarity: 'legendary' },
  { id: 'dawn_warrior', name: 'Dawn Warrior', description: 'Complete a task before 6 AM', icon: '🌅', color: 'from-orange-400 to-yellow-200', rarity: 'rare' },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Study on both Saturday and Sunday', icon: '⚔️', color: 'from-red-600 to-brown-700', rarity: 'rare' },
  { id: 'ai_explorer', name: 'AI Explorer', description: 'Generate 10 AI learning plans', icon: '🤖', color: 'from-cyan-400 to-blue-600', rarity: 'common' },
  { id: 'room_joiner', name: 'Knowledge Seeker', description: 'Join your first study room', icon: '🤝', color: 'from-teal-400 to-emerald-500', rarity: 'common' },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Send 50 messages in study rooms', icon: '🦋', color: 'from-pink-400 to-rose-500', rarity: 'rare' },
  { id: 'room_host', name: 'Mentor', description: 'Host a study room for the first time', icon: '🎓', color: 'from-orange-500 to-amber-600', rarity: 'rare' },
  { id: 'pdf_collector', name: 'PDF Collector', description: 'Export 5 plans as PDF', icon: '📄', color: 'from-red-400 to-orange-500', rarity: 'common' },
  { id: 'shortcut_ninja', name: 'Shortcut Ninja', description: 'Check out the keyboard shortcuts', icon: '🥷', color: 'from-gray-600 to-black', rarity: 'common' },
  { id: 'perfect_week', name: 'Perfect Week', description: 'Maintain a 7-day streak', icon: '🌟', color: 'from-yellow-300 to-gold-500', rarity: 'rare' },
  { id: 'deep_diver', name: 'Deep Diver', description: 'Study for 2+ hours in a single session', icon: '🌊', color: 'from-blue-600 to-indigo-900', rarity: 'epic' },
  { id: 'librarian', name: 'Library Keeper', description: 'Have 20 active plans', icon: '🏛️', color: 'from-amber-800 to-yellow-900', rarity: 'rare' },
  { id: 'quiz_novice', name: 'Quiz Novice', description: 'Complete your first quiz', icon: '📝', color: 'from-slate-300 to-gray-400', rarity: 'common' },
];

// ─── Level Calculation ───────────────────────────────────────────────
/**
 * Calculate level from XP. Each level requires progressively more XP.
 * Level formula: level = floor(sqrt(totalXP / 100)) + 1
 * Level 1:    0 XP
 * Level 2:  100 XP
 * Level 3:  400 XP
 * Level 4:  900 XP
 * Level 5: 1600 XP
 */
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/** XP required to reach a specific level */
export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

/** XP progress within the current level (0 to 1) */
export function levelProgress(totalXP: number): number {
  const level = calculateLevel(totalXP);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const range = nextLevelXP - currentLevelXP;
  if (range <= 0) return 1;
  return (totalXP - currentLevelXP) / range;
}

// ─── Streak Management ───────────────────────────────────────────────
/**
 * Checks and updates the study streak based on the last study date.
 * Should be called when the user completes a task.
 */
export function updateStreak(stats: UserStats): UserStats {
  const today = new Date().toISOString().split('T')[0];
  const lastStudy = stats.lastStudyDate;

  if (lastStudy === today) {
    // Already studied today — no change needed
    return stats;
  }

  const updated = { ...stats, lastStudyDate: today };

  if (!lastStudy) {
    // First ever study session
    updated.studyStreak = 1;
    updated.longestStreak = Math.max(1, stats.longestStreak || 0);
    return updated;
  }

  // Calculate day difference
  const lastDate = new Date(lastStudy);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Consecutive day — increment streak
    updated.studyStreak = (stats.studyStreak || 0) + 1;
  } else if (diffDays === 2 && (stats.streakFreezes || 0) > 0) {
    // Missed one day but has a freeze — preserve streak
    updated.studyStreak = (stats.studyStreak || 0) + 1;
    updated.streakFreezes = (stats.streakFreezes || 0) - 1;
  } else {
    // Streak broken
    updated.studyStreak = 1;
  }

  updated.longestStreak = Math.max(updated.studyStreak, stats.longestStreak || 0);
  return updated;
}

// ─── XP Award ────────────────────────────────────────────────────────
export interface XPAwardResult {
  stats: UserStats;
  xpGained: number;
  newBadges: Badge[];
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
}

/**
 * Awards XP to the user and checks for new badges and level-ups.
 */
export function awardXP(stats: UserStats, amount: number, context?: {
  tasksCompletedToday?: number;
  plansCompleted?: number;
  quizPerfectScores?: number;
  totalStudyHours?: number;
}): XPAwardResult {
  const oldLevel = calculateLevel(stats.totalXP || 0);
  
  // Update stats
  const updatedStats: UserStats = {
    ...stats,
    totalXP: (stats.totalXP || 0) + amount,
  };
  updatedStats.level = calculateLevel(updatedStats.totalXP);

  const newLevel = updatedStats.level;
  const leveledUp = newLevel > oldLevel;

  // Check for new badges
  const newBadges: Badge[] = [];
  const currentBadges = new Set(stats.badges || []);

  const checkBadge = (id: string, condition: boolean) => {
    if (!currentBadges.has(id) && condition) {
      newBadges.push(BADGES.find(b => b.id === id)!);
      currentBadges.add(id);
    }
  };

  const hour = new Date().getHours();

  // Badge checks
  checkBadge('first_spark', (stats.plansCreated || 0) > 0 || amount >= XP_REWARDS.COMPLETE_TASK);
  checkBadge('night_owl', hour >= 22 || hour < 4);
  checkBadge('early_bird', hour >= 4 && hour < 7);
  checkBadge('streak_7', updatedStats.studyStreak >= 7);
  checkBadge('streak_30', updatedStats.studyStreak >= 30);
  checkBadge('centurion', updatedStats.totalXP >= 1000);
  checkBadge('scholar', updatedStats.level >= 5);
  checkBadge('bookworm', (context?.plansCompleted || stats.plansCompleted || 0) >= 3);
  checkBadge('speed_learner', (context?.tasksCompletedToday || 0) >= 10);
  checkBadge('quiz_master', (context?.quizPerfectScores || stats.totalQuizzesCompleted || 0) >= 5);
  checkBadge('marathon', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 10);

  // New badge logic
  checkBadge('novice_planner', (stats.plansCreated || 0) >= 5);
  checkBadge('architect', (stats.plansCreated || 0) >= 15);
  checkBadge('streak_3', updatedStats.studyStreak >= 3);
  checkBadge('streak_50', updatedStats.studyStreak >= 50);
  checkBadge('streak_100', updatedStats.studyStreak >= 100);
  checkBadge('task_master', (stats.totalTasksCompleted || 0) >= 50);
  checkBadge('xp_5000', updatedStats.totalXP >= 5000);
  checkBadge('xp_10000', updatedStats.totalXP >= 10000);
  checkBadge('dawn_warrior', hour >= 4 && hour < 6);
  checkBadge('ai_explorer', (stats.totalAIPlansGenerated || 0) >= 10);
  checkBadge('room_joiner', (stats.badges || []).includes('room_joiner') || false); // Actual check in roomService
  checkBadge('social_butterfly', (stats.totalMessagesSent || 0) >= 50);
  checkBadge('pdf_collector', (stats.totalPDFExports || 0) >= 5);
  checkBadge('perfect_week', updatedStats.studyStreak >= 7);
  checkBadge('librarian', (stats.plansCreated || 0) - (stats.plansCompleted || 0) >= 20);
  checkBadge('quiz_novice', (stats.totalQuizzesCompleted || 0) >= 1);

  updatedStats.badges = Array.from(currentBadges);

  return {
    stats: updatedStats,
    xpGained: amount,
    newBadges,
    leveledUp,
    oldLevel,
    newLevel,
  };
}

/**
 * Returns the list of all badges with earned status.
 */
export function getBadgesWithStatus(earnedBadgeIds: string[]): (Badge & { earned: boolean })[] {
  const earnedSet = new Set(earnedBadgeIds || []);
  return BADGES.map(badge => ({
    ...badge,
    earned: earnedSet.has(badge.id),
  }));
}

/**
 * Ensures backward compatibility — fills in missing gamification fields with defaults.
 */
export function ensureGamificationStats(stats?: UserStats): UserStats {
  return {
    studyStreak: stats?.studyStreak || 0,
    longestStreak: stats?.longestStreak || 0,
    totalStudyHours: stats?.totalStudyHours || 0,
    plansCreated: stats?.plansCreated || 0,
    plansCompleted: stats?.plansCompleted || 0,
    totalXP: stats?.totalXP || 0,
    level: stats?.level || calculateLevel(stats?.totalXP || 0),
    badges: stats?.badges || [],
    lastStudyDate: stats?.lastStudyDate,
    streakFreezes: stats?.streakFreezes ?? 1,
    totalTasksCompleted: stats?.totalTasksCompleted || 0,
    totalQuizzesCompleted: stats?.totalQuizzesCompleted || 0,
    totalMessagesSent: stats?.totalMessagesSent || 0,
    totalPDFExports: stats?.totalPDFExports || 0,
    totalAIPlansGenerated: stats?.totalAIPlansGenerated || 0,
  };
}
