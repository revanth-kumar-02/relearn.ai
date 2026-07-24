/**
 * Centralized Application Constants & Configuration Values.
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  LEARNING_WORKSPACE: '/workspace',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;

export const STORAGE_KEYS = {
  THEME: 'relearn_theme',
  AUTH_TOKEN: 'relearn_auth_token',
  USER_PREFERENCES: 'relearn_user_preferences',
  SAVED_PLANS: 'relearn_saved_plans',
  STUDY_TIMER_STATE: 'relearn_timer_state',
} as const;

export const API_CONFIG = {
  DEFAULT_TIMEOUT_MS: 15000,
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
  MAX_PROMPT_LENGTH: 4000,
} as const;

export const XP_THRESHOLDS = {
  TASK_COMPLETION: 50,
  QUIZ_PERFECT_SCORE: 100,
  DAILY_STREAK_BONUS: 20,
  LEVEL_UP_BASE: 500,
} as const;
