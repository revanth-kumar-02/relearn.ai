import { UserStats } from '../../types/index';

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
  
  // Comeback badges
  { id: 'comeback_legend', name: 'Comeback Legend', description: 'Return after 7+ days away', icon: '👑', color: 'from-amber-400 to-orange-600', rarity: 'rare' },

  // XP Achievements
  { id: 'xp_250', name: 'Novice Spark', description: 'Earn 250 XP total', icon: '✨', color: 'from-amber-300 to-yellow-400', rarity: 'common' },
  { id: 'xp_500', name: 'Glowing Learner', description: 'Earn 500 XP total', icon: '🌟', color: 'from-amber-400 to-orange-400', rarity: 'common' },
  { id: 'xp_2500', name: 'Aspiration Hunter', description: 'Earn 2500 XP total', icon: '💫', color: 'from-indigo-400 to-purple-500', rarity: 'rare' },
  { id: 'xp_7500', name: 'Deep Mind', description: 'Earn 7500 XP total', icon: '🌌', color: 'from-purple-600 to-pink-600', rarity: 'epic' },
  { id: 'xp_15000', name: 'Ethereal Scholar', description: 'Earn 15000 XP total', icon: '🔮', color: 'from-indigo-600 to-purple-850', rarity: 'epic' },
  { id: 'xp_20000', name: 'Sage of ReLearn', description: 'Earn 20000 XP total', icon: '🧿', color: 'from-blue-700 to-purple-900', rarity: 'legendary' },
  { id: 'xp_25000', name: 'Infinite Wisdom', description: 'Earn 25000 XP total', icon: '🌀', color: 'from-teal-500 via-emerald-600 to-indigo-900', rarity: 'legendary' },
  { id: 'xp_50000', name: 'Apex Intellect', description: 'Earn 50000 XP total', icon: '🌠', color: 'from-yellow-400 via-rose-500 to-indigo-950', rarity: 'legendary' },
  { id: 'xp_100000', name: 'Omniscient Being', description: 'Earn 100000 XP total', icon: '🪐', color: 'from-rose-500 via-red-600 to-purple-950', rarity: 'legendary' },

  // Level Milestones
  { id: 'level_2', name: 'First Ascent', description: 'Reach Level 2', icon: '🪜', color: 'from-gray-300 to-zinc-400', rarity: 'common' },
  { id: 'level_3', name: 'Climbing Higher', description: 'Reach Level 3', icon: '⛰️', color: 'from-emerald-300 to-teal-400', rarity: 'common' },
  { id: 'level_4', name: 'Steady Progress', description: 'Reach Level 4', icon: '🧗', color: 'from-teal-400 to-cyan-500', rarity: 'common' },
  { id: 'level_10', name: 'Double Digits', description: 'Reach Level 10', icon: '🔟', color: 'from-blue-500 to-cyan-600', rarity: 'rare' },
  { id: 'level_15', name: 'Elite Scholar', description: 'Reach Level 15', icon: '🎖️', color: 'from-indigo-500 to-blue-600', rarity: 'rare' },
  { id: 'level_20', name: 'Ascended Mind', description: 'Reach Level 20', icon: '⚡', color: 'from-violet-600 to-indigo-700', rarity: 'epic' },
  { id: 'level_25', name: 'High Sage', description: 'Reach Level 25', icon: '🧙‍♂️', color: 'from-fuchsia-600 to-purple-855', rarity: 'epic' },
  { id: 'level_30', name: 'Archmage of Learning', description: 'Reach Level 30', icon: '🧙‍♀️', color: 'from-rose-600 to-violet-800', rarity: 'legendary' },
  { id: 'level_40', name: 'Grandmaster', description: 'Reach Level 40', icon: '👑', color: 'from-amber-500 to-rose-600', rarity: 'legendary' },
  { id: 'level_55', name: 'Ultimate Master', description: 'Reach Level 55', icon: '🏆', color: 'from-yellow-400 via-amber-600 to-orange-700', rarity: 'legendary' },

  // Streak Milestones
  { id: 'streak_5', name: 'Streak Starter', description: 'Maintain a 5-day streak', icon: '🔥', color: 'from-orange-300 to-red-400', rarity: 'common' },
  { id: 'streak_10', name: 'Tenacious Learner', description: 'Maintain a 10-day streak', icon: '🎯', color: 'from-red-400 to-orange-500', rarity: 'common' },
  { id: 'streak_14', name: 'Fortnight Fighter', description: 'Maintain a 14-day streak', icon: '🛡️', color: 'from-emerald-400 to-teal-500', rarity: 'rare' },
  { id: 'streak_21', name: 'Habit Former', description: 'Maintain a 21-day streak', icon: '🌱', color: 'from-teal-400 to-green-500', rarity: 'rare' },
  { id: 'streak_40', name: 'Unstoppable Force', description: 'Maintain a 40-day streak', icon: '🌪️', color: 'from-blue-400 to-cyan-500', rarity: 'rare' },
  { id: 'streak_60', name: 'Diamond Will', description: 'Maintain a 60-day streak', icon: '💎', color: 'from-sky-400 to-indigo-500', rarity: 'epic' },
  { id: 'streak_75', name: 'Streak Master', description: 'Maintain a 75-day streak', icon: '🌀', color: 'from-indigo-500 to-purple-600', rarity: 'epic' },
  { id: 'streak_120', name: 'Immutable Scholar', description: 'Maintain a 120-day streak', icon: '🧱', color: 'from-slate-600 to-zinc-800', rarity: 'epic' },
  { id: 'streak_150', name: 'Streak Overlord', description: 'Maintain a 150-day streak', icon: '🛸', color: 'from-purple-600 to-rose-600', rarity: 'legendary' },
  { id: 'streak_200', name: 'Iron Discipline', description: 'Maintain a 200-day streak', icon: '⛓️', color: 'from-amber-600 to-stone-800', rarity: 'legendary' },
  { id: 'streak_300', name: 'Time Bender', description: 'Maintain a 300-day streak', icon: '⏳', color: 'from-yellow-400 to-rose-600', rarity: 'legendary' },
  { id: 'streak_365', name: 'Year-Long Orbit', description: 'Maintain a 365-day streak', icon: '☀️', color: 'from-yellow-500 via-orange-600 to-red-600', rarity: 'legendary' },

  // Study Hour Milestones
  { id: 'hours_1', name: 'First Hour Done', description: 'Study for 1+ hours total', icon: '⏱️', color: 'from-slate-300 to-slate-400', rarity: 'common' },
  { id: 'hours_5', name: 'Committed Learner', description: 'Study for 5+ hours total', icon: '⏳', color: 'from-amber-400 to-amber-500', rarity: 'common' },
  { id: 'hours_20', name: 'Dedicated Explorer', description: 'Study for 20+ hours total', icon: '🧭', color: 'from-blue-400 to-cyan-500', rarity: 'rare' },
  { id: 'hours_30', name: 'Knowledge Sponge', description: 'Study for 30+ hours total', icon: '🧽', color: 'from-teal-400 to-green-500', rarity: 'rare' },
  { id: 'hours_50', name: 'Deep Concentration', description: 'Study for 50+ hours total', icon: '🧘', color: 'from-indigo-400 to-purple-500', rarity: 'epic' },
  { id: 'hours_75', name: 'Scholar\'s Dedication', description: 'Study for 75+ hours total', icon: '🖋️', color: 'from-fuchsia-500 to-pink-600', rarity: 'epic' },
  { id: 'hours_100', name: 'Century Club', description: 'Study for 100+ hours total', icon: '💯', color: 'from-yellow-400 via-orange-500 to-red-500', rarity: 'epic' },
  { id: 'hours_150', name: 'Time Investor', description: 'Study for 150+ hours total', icon: '📈', color: 'from-emerald-500 to-teal-600', rarity: 'epic' },
  { id: 'hours_200', name: 'Grand Academician', description: 'Study for 200+ hours total', icon: '🏛️', color: 'from-violet-600 to-indigo-800', rarity: 'legendary' },
  { id: 'hours_300', name: 'Infinite Hours', description: 'Study for 300+ hours total', icon: '♾️', color: 'from-rose-500 to-purple-800', rarity: 'legendary' },
  { id: 'hours_500', name: 'Apex Thinker', description: 'Study for 500+ hours total', icon: '💡', color: 'from-yellow-400 via-red-500 to-indigo-950', rarity: 'legendary' },
  { id: 'hours_1000', name: 'Omniscience Hour', description: 'Study for 1000+ hours total', icon: '🌌', color: 'from-violet-950 via-purple-700 to-cyan-500', rarity: 'legendary' },

  // Plan Creation Milestones
  { id: 'plans_create_1', name: 'Blueprint Initiator', description: 'Create your first learning plan', icon: '🗺️', color: 'from-blue-200 to-cyan-300', rarity: 'common' },
  { id: 'plans_create_3', name: 'Design Enthusiast', description: 'Create 3 learning plans', icon: '📐', color: 'from-cyan-300 to-teal-400', rarity: 'common' },
  { id: 'plans_create_8', name: 'Plan Crafter', description: 'Create 8 learning plans', icon: '🛠️', color: 'from-teal-400 to-emerald-500', rarity: 'rare' },
  { id: 'plans_create_10', name: 'Organized Scholar', description: 'Create 10 learning plans', icon: '📂', color: 'from-emerald-500 to-green-600', rarity: 'rare' },
  { id: 'plans_create_20', name: 'Master Planner', description: 'Create 20 learning plans', icon: '🗂️', color: 'from-blue-500 to-indigo-600', rarity: 'epic' },
  { id: 'plans_create_30', name: 'Curator of Wisdom', description: 'Create 30 learning plans', icon: '🧠', color: 'from-indigo-600 to-purple-700', rarity: 'epic' },
  { id: 'plans_create_40', name: 'Grand Director', description: 'Create 40 learning plans', icon: '🎬', color: 'from-purple-700 to-fuchsia-800', rarity: 'epic' },
  { id: 'plans_create_50', name: 'Architect of Destiny', description: 'Create 50 learning plans', icon: '🏛️', color: 'from-rose-500 to-orange-600', rarity: 'legendary' },
  { id: 'plans_create_75', name: 'Sovereign Planner', description: 'Create 75 learning plans', icon: '👑', color: 'from-amber-400 via-pink-500 to-purple-600', rarity: 'legendary' },
  { id: 'plans_create_100', name: 'Infinite Blueprints', description: 'Create 100 learning plans', icon: '🌌', color: 'from-cyan-500 via-purple-600 to-slate-900', rarity: 'legendary' },

  // Plan Completion Milestones
  { id: 'plans_complete_1', name: 'Goal Achieved', description: 'Complete 1 learning plan', icon: '🏁', color: 'from-green-200 to-emerald-300', rarity: 'common' },
  { id: 'plans_complete_5', name: 'Plan Finisher', description: 'Complete 5 learning plans', icon: '🏆', color: 'from-emerald-400 to-teal-500', rarity: 'common' },
  { id: 'plans_complete_10', name: 'Consistent Closer', description: 'Complete 10 learning plans', icon: '🤝', color: 'from-teal-500 to-cyan-600', rarity: 'rare' },
  { id: 'plans_complete_15', name: 'Milestone Master', description: 'Complete 15 learning plans', icon: '🥇', color: 'from-cyan-600 to-blue-700', rarity: 'rare' },
  { id: 'plans_complete_20', name: 'Closer Emeritus', description: 'Complete 20 learning plans', icon: '🎖️', color: 'from-blue-700 to-indigo-800', rarity: 'epic' },
  { id: 'plans_complete_25', name: 'Knowledge Conqueror', description: 'Complete 25 learning plans', icon: '🏰', color: 'from-indigo-800 to-violet-900', rarity: 'epic' },
  { id: 'plans_complete_30', name: 'Syllabus Destroyer', description: 'Complete 30 learning plans', icon: '💥', color: 'from-fuchsia-600 to-rose-700', rarity: 'epic' },
  { id: 'plans_complete_45', name: 'Grand Completer', description: 'Complete 45 learning plans', icon: '🌌', color: 'from-rose-600 to-amber-500', rarity: 'legendary' },
  { id: 'plans_complete_50', name: 'Legendary Finisher', description: 'Complete 50 learning plans', icon: '👑', color: 'from-yellow-400 via-rose-500 to-indigo-900', rarity: 'legendary' },

  // Task Completion Milestones
  { id: 'tasks_complete_1', name: 'Task Initiated', description: 'Complete 1 task', icon: '✔️', color: 'from-slate-200 to-slate-300', rarity: 'common' },
  { id: 'tasks_complete_5', name: 'Task Handled', description: 'Complete 5 tasks', icon: '📝', color: 'from-yellow-300 to-orange-400', rarity: 'common' },
  { id: 'tasks_complete_10', name: 'Decisive Action', description: 'Complete 10 tasks', icon: '🔨', color: 'from-orange-400 to-red-500', rarity: 'common' },
  { id: 'tasks_complete_20', name: 'Workhorse', description: 'Complete 20 tasks', icon: '🐎', color: 'from-red-400 to-pink-500', rarity: 'rare' },
  { id: 'tasks_complete_30', name: 'Efficiency Expert', description: 'Complete 30 tasks', icon: '📊', color: 'from-pink-500 to-rose-600', rarity: 'rare' },
  { id: 'tasks_complete_75', name: 'Unstoppable Worker', description: 'Complete 75 tasks', icon: '🌪️', color: 'from-purple-500 to-indigo-600', rarity: 'rare' },
  { id: 'tasks_complete_100', name: 'Centurion of Tasks', description: 'Complete 100 tasks', icon: '💯', color: 'from-indigo-600 to-blue-700', rarity: 'epic' },
  { id: 'tasks_complete_150', name: 'Overdrive', description: 'Complete 150 tasks', icon: '⚡', color: 'from-blue-700 to-cyan-500', rarity: 'epic' },
  { id: 'tasks_complete_200', name: 'Industrialist', description: 'Complete 200 tasks', icon: '🏭', color: 'from-cyan-500 to-teal-600', rarity: 'epic' },
  { id: 'tasks_complete_300', name: 'Grand Taskmaster', description: 'Complete 300 tasks', icon: '👑', color: 'from-emerald-500 to-green-700', rarity: 'legendary' },
  { id: 'tasks_complete_400', name: 'Task Devourer', description: 'Complete 400 tasks', icon: '🦖', color: 'from-orange-500 to-amber-700', rarity: 'legendary' },
  { id: 'tasks_complete_500', name: 'Task Singularity', description: 'Complete 500 tasks', icon: '🕳️', color: 'from-purple-800 to-slate-950', rarity: 'legendary' },
  { id: 'tasks_complete_1000', name: 'Ultimate Grind', description: 'Complete 1000 tasks', icon: '🌌', color: 'from-yellow-400 via-rose-500 to-indigo-950', rarity: 'legendary' },

  // Quiz Completion Milestones
  { id: 'quiz_complete_3', name: 'Quiz Scholar', description: 'Complete 3 quizzes', icon: '✏️', color: 'from-blue-200 to-cyan-300', rarity: 'common' },
  { id: 'quiz_complete_5', name: 'Knowledge Tester', description: 'Complete 5 quizzes', icon: '📓', color: 'from-cyan-300 to-teal-400', rarity: 'common' },
  { id: 'quiz_complete_10', name: 'Exam Veteran', description: 'Complete 10 quizzes', icon: '🎓', color: 'from-teal-400 to-emerald-500', rarity: 'rare' },
  { id: 'quiz_complete_15', name: 'Quiz Mastermind', description: 'Complete 15 quizzes', icon: '👑', color: 'from-emerald-500 to-green-600', rarity: 'rare' },
  { id: 'quiz_complete_20', name: 'Quiz Devotee', description: 'Complete 20 quizzes', icon: '📖', color: 'from-blue-500 to-indigo-600', rarity: 'epic' },
  { id: 'quiz_complete_30', name: 'Intellectual Champion', description: 'Complete 30 quizzes', icon: '🏆', color: 'from-indigo-600 to-purple-700', rarity: 'epic' },
  { id: 'quiz_complete_50', name: 'Testing Titan', description: 'Complete 50 quizzes', icon: '⚡', color: 'from-purple-700 to-fuchsia-800', rarity: 'legendary' },
  { id: 'quiz_complete_75', name: 'Apex Quizzer', description: 'Complete 75 quizzes', icon: '💡', color: 'from-rose-500 to-orange-500', rarity: 'legendary' },
  { id: 'quiz_complete_100', name: 'Omni-Quizzer', description: 'Complete 100 quizzes', icon: '🌌', color: 'from-yellow-400 via-pink-500 to-purple-600', rarity: 'legendary' },

  // Quiz Perfect Score Milestones
  { id: 'quiz_perfect_1', name: 'Perfect Marks', description: 'Score 100% on a quiz', icon: '🎯', color: 'from-green-200 to-emerald-300', rarity: 'common' },
  { id: 'quiz_perfect_3', name: 'Flawless Performance', description: 'Score 100% on 3 quizzes', icon: '⭐', color: 'from-emerald-400 to-teal-500', rarity: 'common' },
  { id: 'quiz_perfect_8', name: 'Straight A\'s', description: 'Score 100% on 8 quizzes', icon: '💯', color: 'from-teal-500 to-cyan-600', rarity: 'rare' },
  { id: 'quiz_perfect_10', name: 'Quiz Perfectionist', description: 'Score 100% on 10 quizzes', icon: '🥇', color: 'from-cyan-600 to-blue-700', rarity: 'rare' },
  { id: 'quiz_perfect_15', name: 'Academic Sniper', description: 'Score 100% on 15 quizzes', icon: '🏹', color: 'from-blue-700 to-indigo-800', rarity: 'epic' },
  { id: 'quiz_perfect_20', name: 'Genius Intellect', description: 'Score 100% on 20 quizzes', icon: '🧠', color: 'from-indigo-800 to-violet-900', rarity: 'epic' },
  { id: 'quiz_perfect_25', name: 'Quiz Divinity', description: 'Score 100% on 25 quizzes', icon: '💫', color: 'from-fuchsia-600 to-rose-700', rarity: 'legendary' },
  { id: 'quiz_perfect_50', name: 'Flawless Legend', description: 'Score 100% on 50 quizzes', icon: '👑', color: 'from-yellow-400 via-rose-500 to-indigo-900', rarity: 'legendary' },

  // Study Room Messages / Social Achievements
  { id: 'messages_sent_5', name: 'Chatterbox', description: 'Send 5 study room messages', icon: '💬', color: 'from-slate-200 to-slate-300', rarity: 'common' },
  { id: 'messages_sent_10', name: 'Discussion Partner', description: 'Send 10 study room messages', icon: '🗣️', color: 'from-yellow-250 to-amber-300', rarity: 'common' },
  { id: 'messages_sent_25', name: 'Active Contributor', description: 'Send 25 study room messages', icon: '🎙️', color: 'from-amber-300 to-orange-400', rarity: 'common' },
  { id: 'messages_sent_100', name: 'Group Voice', description: 'Send 100 study room messages', icon: '📢', color: 'from-orange-400 to-red-500', rarity: 'rare' },
  { id: 'messages_sent_150', name: 'Study Room regular', description: 'Send 150 study room messages', icon: '🤝', color: 'from-red-400 to-pink-500', rarity: 'rare' },
  { id: 'messages_sent_200', name: 'Orator of ReLearn', description: 'Send 200 study room messages', icon: '📜', color: 'from-pink-500 to-fuchsia-600', rarity: 'epic' },
  { id: 'messages_sent_300', name: 'Social Catalyst', description: 'Send 300 study room messages', icon: '🧪', color: 'from-fuchsia-600 to-violet-700', rarity: 'epic' },
  { id: 'messages_sent_500', name: 'Community Pillar', description: 'Send 500 study room messages', icon: '🏛️', color: 'from-indigo-600 to-purple-850', rarity: 'legendary' }, // Wait, let's make sure it's 'from-indigo-650 to-purple-850'
  { id: 'messages_sent_1000', name: 'Voice of Reason', description: 'Send 1000 study room messages', icon: '🎙️', color: 'from-yellow-400 via-rose-500 to-indigo-900', rarity: 'legendary' },

  // PDF Export Achievements
  { id: 'pdf_exports_1', name: 'Paper Trail', description: 'Export your first study plan as PDF', icon: '📄', color: 'from-slate-200 to-zinc-300', rarity: 'common' },
  { id: 'pdf_exports_2', name: 'Plan Archivist', description: 'Export 2 study plans as PDF', icon: '📁', color: 'from-yellow-200 to-orange-300', rarity: 'common' },
  { id: 'pdf_exports_10', name: 'Documentarian', description: 'Export 10 study plans as PDF', icon: '📚', color: 'from-orange-300 to-red-400', rarity: 'rare' },
  { id: 'pdf_exports_15', name: 'Paper Saver', description: 'Export 15 study plans as PDF', icon: '💾', color: 'from-emerald-400 to-teal-500', rarity: 'rare' },
  { id: 'pdf_exports_20', name: 'Library Architect', description: 'Export 20 study plans as PDF', icon: '🏛️', color: 'from-teal-500 to-cyan-600', rarity: 'epic' },
  { id: 'pdf_exports_30', name: 'Archivist Master', description: 'Export 30 study plans as PDF', icon: '🗄️', color: 'from-indigo-500 to-violet-600', rarity: 'epic' },
  { id: 'pdf_exports_50', name: 'Grand Scribe', description: 'Export 50 study plans as PDF', icon: '📜', color: 'from-rose-500 via-pink-650 to-purple-800', rarity: 'legendary' },

  // AI Plan Generation Achievements
  { id: 'ai_plans_1', name: 'Neural Spark', description: 'Generate 1 AI learning plan', icon: '🤖', color: 'from-blue-200 to-cyan-300', rarity: 'common' },
  { id: 'ai_plans_3', name: 'Prompt Student', description: 'Generate 3 AI learning plans', icon: '⚡', color: 'from-cyan-300 to-teal-400', rarity: 'common' },
  { id: 'ai_plans_5', name: 'Silicon Companion', description: 'Generate 5 AI learning plans', icon: '💾', color: 'from-teal-400 to-emerald-500', rarity: 'common' },
  { id: 'ai_plans_15', name: 'Cyber Scholar', description: 'Generate 15 AI learning plans', icon: '🧬', color: 'from-emerald-500 to-green-600', rarity: 'rare' },
  { id: 'ai_plans_20', name: 'Synthesized Mind', description: 'Generate 20 AI learning plans', icon: '🧠', color: 'from-indigo-500 to-purple-600', rarity: 'epic' },
  { id: 'ai_plans_30', name: 'AI Mastermind', description: 'Generate 30 AI learning plans', icon: '🔮', color: 'from-purple-600 to-pink-600', rarity: 'epic' },
  { id: 'ai_plans_50', name: 'Singularity Graduate', description: 'Generate 50 AI learning plans', icon: '🪐', color: 'from-yellow-400 via-rose-500 to-indigo-900', rarity: 'legendary' },
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

  // Track comeback status for badge awarding
  (updated as any)._daysAbsent = diffDays;

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
  userName?: string;
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

  // XP Achievements
  checkBadge('xp_250', updatedStats.totalXP >= 250);
  checkBadge('xp_500', updatedStats.totalXP >= 500);
  checkBadge('xp_2500', updatedStats.totalXP >= 2500);
  checkBadge('xp_7500', updatedStats.totalXP >= 7500);
  checkBadge('xp_15000', updatedStats.totalXP >= 15000);
  checkBadge('xp_20000', updatedStats.totalXP >= 20000);
  checkBadge('xp_25000', updatedStats.totalXP >= 25000);
  checkBadge('xp_50000', updatedStats.totalXP >= 50000);
  checkBadge('xp_100000', updatedStats.totalXP >= 100000);

  // Level Milestones
  checkBadge('level_2', updatedStats.level >= 2);
  checkBadge('level_3', updatedStats.level >= 3);
  checkBadge('level_4', updatedStats.level >= 4);
  checkBadge('level_10', updatedStats.level >= 10);
  checkBadge('level_15', updatedStats.level >= 15);
  checkBadge('level_20', updatedStats.level >= 20);
  checkBadge('level_25', updatedStats.level >= 25);
  checkBadge('level_30', updatedStats.level >= 30);
  checkBadge('level_40', updatedStats.level >= 40);
  checkBadge('level_55', updatedStats.level >= 55);

  // Streak Milestones
  checkBadge('streak_5', updatedStats.studyStreak >= 5);
  checkBadge('streak_10', updatedStats.studyStreak >= 10);
  checkBadge('streak_14', updatedStats.studyStreak >= 14);
  checkBadge('streak_21', updatedStats.studyStreak >= 21);
  checkBadge('streak_40', updatedStats.studyStreak >= 40);
  checkBadge('streak_60', updatedStats.studyStreak >= 60);
  checkBadge('streak_75', updatedStats.studyStreak >= 75);
  checkBadge('streak_120', updatedStats.studyStreak >= 120);
  checkBadge('streak_150', updatedStats.studyStreak >= 150);
  checkBadge('streak_200', updatedStats.studyStreak >= 200);
  checkBadge('streak_300', updatedStats.studyStreak >= 300);
  checkBadge('streak_365', updatedStats.studyStreak >= 365);

  // Study Hour Milestones
  checkBadge('hours_1', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 1);
  checkBadge('hours_5', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 5);
  checkBadge('hours_20', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 20);
  checkBadge('hours_30', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 30);
  checkBadge('hours_50', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 50);
  checkBadge('hours_75', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 75);
  checkBadge('hours_100', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 100);
  checkBadge('hours_150', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 150);
  checkBadge('hours_200', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 200);
  checkBadge('hours_300', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 300);
  checkBadge('hours_500', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 500);
  checkBadge('hours_1000', (context?.totalStudyHours || stats.totalStudyHours || 0) >= 1000);

  // Plan Creation Milestones
  checkBadge('plans_create_1', (stats.plansCreated || 0) >= 1);
  checkBadge('plans_create_3', (stats.plansCreated || 0) >= 3);
  checkBadge('plans_create_8', (stats.plansCreated || 0) >= 8);
  checkBadge('plans_create_10', (stats.plansCreated || 0) >= 10);
  checkBadge('plans_create_20', (stats.plansCreated || 0) >= 20);
  checkBadge('plans_create_30', (stats.plansCreated || 0) >= 30);
  checkBadge('plans_create_40', (stats.plansCreated || 0) >= 40);
  checkBadge('plans_create_50', (stats.plansCreated || 0) >= 50);
  checkBadge('plans_create_75', (stats.plansCreated || 0) >= 75);
  checkBadge('plans_create_100', (stats.plansCreated || 0) >= 100);

  // Plan Completion Milestones
  checkBadge('plans_complete_1', (context?.plansCompleted || stats.plansCompleted || 0) >= 1);
  checkBadge('plans_complete_5', (context?.plansCompleted || stats.plansCompleted || 0) >= 5);
  checkBadge('plans_complete_10', (context?.plansCompleted || stats.plansCompleted || 0) >= 10);
  checkBadge('plans_complete_15', (context?.plansCompleted || stats.plansCompleted || 0) >= 15);
  checkBadge('plans_complete_20', (context?.plansCompleted || stats.plansCompleted || 0) >= 20);
  checkBadge('plans_complete_25', (context?.plansCompleted || stats.plansCompleted || 0) >= 25);
  checkBadge('plans_complete_30', (context?.plansCompleted || stats.plansCompleted || 0) >= 30);
  checkBadge('plans_complete_45', (context?.plansCompleted || stats.plansCompleted || 0) >= 45);
  checkBadge('plans_complete_50', (context?.plansCompleted || stats.plansCompleted || 0) >= 50);

  // Task Completion Milestones
  checkBadge('tasks_complete_1', (stats.totalTasksCompleted || 0) >= 1);
  checkBadge('tasks_complete_5', (stats.totalTasksCompleted || 0) >= 5);
  checkBadge('tasks_complete_10', (stats.totalTasksCompleted || 0) >= 10);
  checkBadge('tasks_complete_20', (stats.totalTasksCompleted || 0) >= 20);
  checkBadge('tasks_complete_30', (stats.totalTasksCompleted || 0) >= 30);
  checkBadge('tasks_complete_75', (stats.totalTasksCompleted || 0) >= 75);
  checkBadge('tasks_complete_100', (stats.totalTasksCompleted || 0) >= 100);
  checkBadge('tasks_complete_150', (stats.totalTasksCompleted || 0) >= 150);
  checkBadge('tasks_complete_200', (stats.totalTasksCompleted || 0) >= 200);
  checkBadge('tasks_complete_300', (stats.totalTasksCompleted || 0) >= 300);
  checkBadge('tasks_complete_400', (stats.totalTasksCompleted || 0) >= 400);
  checkBadge('tasks_complete_500', (stats.totalTasksCompleted || 0) >= 500);
  checkBadge('tasks_complete_1000', (stats.totalTasksCompleted || 0) >= 1000);

  // Quiz Completion Milestones
  checkBadge('quiz_complete_3', (stats.totalQuizzesCompleted || 0) >= 3);
  checkBadge('quiz_complete_5', (stats.totalQuizzesCompleted || 0) >= 5);
  checkBadge('quiz_complete_10', (stats.totalQuizzesCompleted || 0) >= 10);
  checkBadge('quiz_complete_15', (stats.totalQuizzesCompleted || 0) >= 15);
  checkBadge('quiz_complete_20', (stats.totalQuizzesCompleted || 0) >= 20);
  checkBadge('quiz_complete_30', (stats.totalQuizzesCompleted || 0) >= 30);
  checkBadge('quiz_complete_50', (stats.totalQuizzesCompleted || 0) >= 50);
  checkBadge('quiz_complete_75', (stats.totalQuizzesCompleted || 0) >= 75);
  checkBadge('quiz_complete_100', (stats.totalQuizzesCompleted || 0) >= 100);

  // Quiz Perfect Score Milestones
  checkBadge('quiz_perfect_1', (stats.quizPerfectScores || 0) >= 1);
  checkBadge('quiz_perfect_3', (stats.quizPerfectScores || 0) >= 3);
  checkBadge('quiz_perfect_8', (stats.quizPerfectScores || 0) >= 8);
  checkBadge('quiz_perfect_10', (stats.quizPerfectScores || 0) >= 10);
  checkBadge('quiz_perfect_15', (stats.quizPerfectScores || 0) >= 15);
  checkBadge('quiz_perfect_20', (stats.quizPerfectScores || 0) >= 20);
  checkBadge('quiz_perfect_25', (stats.quizPerfectScores || 0) >= 25);
  checkBadge('quiz_perfect_50', (stats.quizPerfectScores || 0) >= 50);

  // Study Room Messages / Social Achievements
  checkBadge('messages_sent_5', (stats.totalMessagesSent || 0) >= 5);
  checkBadge('messages_sent_10', (stats.totalMessagesSent || 0) >= 10);
  checkBadge('messages_sent_25', (stats.totalMessagesSent || 0) >= 25);
  checkBadge('messages_sent_100', (stats.totalMessagesSent || 0) >= 100);
  checkBadge('messages_sent_150', (stats.totalMessagesSent || 0) >= 150);
  checkBadge('messages_sent_200', (stats.totalMessagesSent || 0) >= 200);
  checkBadge('messages_sent_300', (stats.totalMessagesSent || 0) >= 300);
  checkBadge('messages_sent_500', (stats.totalMessagesSent || 0) >= 500);
  checkBadge('messages_sent_1000', (stats.totalMessagesSent || 0) >= 1000);

  // PDF Export Achievements
  checkBadge('pdf_exports_1', (stats.totalPDFExports || 0) >= 1);
  checkBadge('pdf_exports_2', (stats.totalPDFExports || 0) >= 2);
  checkBadge('pdf_exports_10', (stats.totalPDFExports || 0) >= 10);
  checkBadge('pdf_exports_15', (stats.totalPDFExports || 0) >= 15);
  checkBadge('pdf_exports_20', (stats.totalPDFExports || 0) >= 20);
  checkBadge('pdf_exports_30', (stats.totalPDFExports || 0) >= 30);
  checkBadge('pdf_exports_50', (stats.totalPDFExports || 0) >= 50);

  // AI Plan Generation Achievements
  checkBadge('ai_plans_1', (stats.totalAIPlansGenerated || 0) >= 1);
  checkBadge('ai_plans_3', (stats.totalAIPlansGenerated || 0) >= 3);
  checkBadge('ai_plans_5', (stats.totalAIPlansGenerated || 0) >= 5);
  checkBadge('ai_plans_15', (stats.totalAIPlansGenerated || 0) >= 15);
  checkBadge('ai_plans_20', (stats.totalAIPlansGenerated || 0) >= 20);
  checkBadge('ai_plans_30', (stats.totalAIPlansGenerated || 0) >= 30);
  checkBadge('ai_plans_50', (stats.totalAIPlansGenerated || 0) >= 50);

  // Comeback logic
  const daysAbsent = (stats as any)._daysAbsent || 0;
  if (daysAbsent >= 7) {
    checkBadge('comeback_legend', true);
  }

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
    quizPerfectScores: stats?.quizPerfectScores || 0,
    subjectMastery: stats?.subjectMastery || {},
  };
}

/**
 * Updates subject mastery based on performance.
 */
export function updateSubjectMastery(
  stats: UserStats, 
  subject: string, 
  increment: number
): UserStats {
  const mastery = { ...(stats.subjectMastery || {}) };
  const current = mastery[subject] || 0;
  mastery[subject] = Math.min(100, Math.max(0, current + increment));
  
  return {
    ...stats,
    subjectMastery: mastery
  };
}
