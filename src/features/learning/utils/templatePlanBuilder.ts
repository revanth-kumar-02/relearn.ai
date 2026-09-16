import { PlanTemplate, Plan, Task } from '../../../types/index';

export interface BuiltPlanResult {
  plan: Plan;
  tasks: Task[];
}

/**
 * Builds a complete Plan and Task array from a PlanTemplate.
 * For complete templates (days.length >= totalDays), it preserves every curated day 1:1.
 * For milestone templates (days.length < totalDays), it expands milestone gaps with progressive, non-duplicate modalities.
 */
export function buildTemplatePlanAndTasks(
  template: PlanTemplate,
  planId: string = crypto.randomUUID()
): BuiltPlanResult {
  const plan: Plan = {
    id: planId,
    title: template.title,
    description: template.description,
    subject: template.subject,
    totalDays: template.totalDays,
    completedDays: 0,
    progress: 0,
    dailyGoalMins: template.dailyGoalMins,
    difficulty: template.difficulty,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Case 1: Complete template where all days are pre-authored (e.g., fullstack-90-days)
  if (template.days && template.days.length >= template.totalDays) {
    const sortedDays = [...template.days]
      .sort((a, b) => a.day - b.day)
      .slice(0, template.totalDays);

    const tasks: Task[] = sortedDays.map((dayItem) => {
      const topicLower = dayItem.topic.toLowerCase();
      const taskType: Task['type'] = 
        (topicLower.includes('quiz') || topicLower.includes('test') || topicLower.includes('assessment')) ? 'quiz' :
        (topicLower.includes('code') || topicLower.includes('build') || topicLower.includes('project') || topicLower.includes('lab')) ? 'coding' : 'reading';

      return {
        id: crypto.randomUUID(),
        planId: plan.id,
        title: dayItem.topic,
        description: dayItem.guidance,
        durationMinutes: template.dailyGoalMins,
        status: 'Not Started',
        dueDate: new Date(Date.now() + (dayItem.day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tags: [template.subject, template.category],
        type: taskType,
        createdAt: new Date().toISOString(),
      };
    });

    return { plan, tasks };
  }

  // Case 2: Milestone-based template (e.g. python-30-days, react-14-days)
  const tasks: Task[] = [];
  const milestoneMap = new Map<number, { day: number; topic: string; guidance: string }>(
    template.days.map((d) => [d.day, d])
  );
  const sortedMilestones = [...template.days].sort((a, b) => a.day - b.day);

  const modalities = [
    { prefix: 'Hands-on Implementation', desc: 'Build a targeted project module and test core logic for', type: 'coding' as const },
    { prefix: 'Deep Dive & Architecture', desc: 'Explore advanced patterns, optimization, and edge cases in', type: 'reading' as const },
    { prefix: 'Practical Lab & Mini-Project', desc: 'Integrate and apply a complete practical workflow for', type: 'coding' as const },
    { prefix: 'Assessment & Problem Solving', desc: 'Complete conceptual review and solve challenges on', type: 'quiz' as const },
    { prefix: 'Best Practices & Standards', desc: 'Audit code structure, security guidelines, and production standards for', type: 'reading' as const },
  ];

  for (let i = 1; i <= template.totalDays; i++) {
    const milestone = milestoneMap.get(i);
    if (milestone) {
      const topicLower = milestone.topic.toLowerCase();
      const taskType: Task['type'] =
        (topicLower.includes('quiz') || topicLower.includes('test') || topicLower.includes('assessment')) ? 'quiz' :
        (topicLower.includes('code') || topicLower.includes('build') || topicLower.includes('project') || topicLower.includes('lab')) ? 'coding' : 'reading';

      tasks.push({
        id: crypto.randomUUID(),
        planId: plan.id,
        title: milestone.topic,
        description: milestone.guidance,
        durationMinutes: template.dailyGoalMins,
        status: 'Not Started',
        dueDate: new Date(Date.now() + (i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tags: [template.subject, template.category],
        type: taskType,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Progressive filler for milestone gap days
      const prevMilestone = [...sortedMilestones].reverse().find((d) => d.day < i);
      const gapOffset = prevMilestone ? i - prevMilestone.day : i;
      const baseTopic = prevMilestone?.topic || template.title;
      const modality = modalities[(gapOffset - 1) % modalities.length];

      tasks.push({
        id: crypto.randomUUID(),
        planId: plan.id,
        title: `${modality.prefix}: ${baseTopic}`,
        description: `${modality.desc} ${baseTopic.toLowerCase()}.`,
        durationMinutes: template.dailyGoalMins,
        status: 'Not Started',
        dueDate: new Date(Date.now() + (i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tags: [template.subject, template.category],
        type: modality.type,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { plan, tasks };
}
