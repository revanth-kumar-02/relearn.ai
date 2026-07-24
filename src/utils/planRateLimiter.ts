import { Plan } from '../types/index';

export interface PlanRateLimitStatus {
  allowed: boolean;
  remainingQuota: number;
  cooldownText: string | null;
  nextAvailableDate: Date | null;
}

/**
 * Validates if the user is allowed to create a new plan based on rate limits.
 * Layer 2 Constraint: A user can only create a maximum of 3 plans in a rolling 48-hour window.
 * Plan imports (where `isImported` is true) do not count towards this limit.
 */
export const checkPlanCreationLimit = (
  plans: Plan[],
  maxPlans: number = 3,
  windowHours: number = 48
): PlanRateLimitStatus => {
  const now = new Date();
  const windowMs = windowHours * 60 * 60 * 1000;

  // Filter plans created within the rolling window (excluding imported ones)
  const recentPlans = plans.filter(plan => {
    if (plan.isImported) return false;
    
    // Fallback to updatedAt if createdAt is missing, or skip
    const dateStr = plan.createdAt || plan.updatedAt;
    if (!dateStr) return false;

    const createdDate = new Date(dateStr);
    if (isNaN(createdDate.getTime())) return false;

    const ageMs = now.getTime() - createdDate.getTime();
    // Must be in the past (or now) and within the rolling window
    return ageMs >= 0 && ageMs < windowMs;
  });

  // Sort plans ascending (oldest first)
  recentPlans.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.updatedAt!).getTime();
    const dateB = new Date(b.createdAt || b.updatedAt!).getTime();
    return dateA - dateB;
  });

  const remainingQuota = Math.max(0, maxPlans - recentPlans.length);
  const allowed = remainingQuota > 0;

  let cooldownText: string | null = null;
  let nextAvailableDate: Date | null = null;

  if (!allowed && recentPlans.length > 0) {
    // Next slot becomes available when the oldest recent plan falls out of the window
    const oldestPlanDate = new Date(recentPlans[0].createdAt || recentPlans[0].updatedAt!);
    nextAvailableDate = new Date(oldestPlanDate.getTime() + windowMs);
    const msUntilAvailable = nextAvailableDate.getTime() - now.getTime();

    if (msUntilAvailable > 0) {
      cooldownText = formatMsToCooldown(msUntilAvailable);
    } else {
      cooldownText = "a few seconds";
    }
  }

  return {
    allowed,
    remainingQuota,
    cooldownText,
    nextAvailableDate
  };
};

const formatMsToCooldown = (ms: number): string => {
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  if (days > 0) {
    return `Resets in ${days}d ${remainingHours}h`;
  }
  if (remainingHours > 0) {
    return `Resets in ${remainingHours}h ${remainingMinutes}m`;
  }
  return `Resets in ${remainingMinutes}m`;
};
