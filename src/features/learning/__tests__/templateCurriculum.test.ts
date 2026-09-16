import { PLAN_TEMPLATES } from '../../../constants/templates';
import { buildTemplatePlanAndTasks } from '../utils/templatePlanBuilder';

export function runTemplateCurriculumTests(): void {
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${msg}`);
    }
  }

  // 1. fullstack-90-days test
  const fullstackTemplate = PLAN_TEMPLATES.find((t) => t.id === 'fullstack-90-days');
  assert(!!fullstackTemplate, 'fullstack-90-days must exist');
  if (fullstackTemplate) {
    assert(fullstackTemplate.totalDays === 90, 'totalDays must be 90');
    assert(fullstackTemplate.days.length === 90, 'days length must be 90');

    const { plan, tasks } = buildTemplatePlanAndTasks(fullstackTemplate);
    assert(tasks.length === 90, `Expected 90 tasks, got ${tasks.length}`);
    assert(plan.totalDays === 90, `Expected 90 totalDays in plan, got ${plan.totalDays}`);

    assert(tasks[0].title === 'HTML5 Document Structure & Semantic Elements', 'Day 1 title mismatch');
    assert(tasks[1].title === 'Forms, Input Types & Native Validation', 'Day 2 title mismatch');
    assert(tasks[2].title === 'Web Accessibility (a11y) & ARIA Roles', 'Day 3 title mismatch');
    assert(tasks[89].title === 'Containerization, CI/CD & Production Portfolio', 'Day 90 title mismatch');

    // Verify no consecutive duplicate titles
    for (let i = 1; i < tasks.length; i++) {
      assert(tasks[i].title !== tasks[i - 1].title, `Consecutive duplicate at Day ${i + 1}: ${tasks[i].title}`);
    }
  }

  // 2. Milestone expansion test (e.g. react-14-days)
  const reactTemplate = PLAN_TEMPLATES.find((t) => t.id === 'react-14-days');
  assert(!!reactTemplate, 'react-14-days must exist');
  if (reactTemplate) {
    const { plan, tasks } = buildTemplatePlanAndTasks(reactTemplate);
    assert(tasks.length === 14, `Expected 14 tasks, got ${tasks.length}`);
    assert(plan.totalDays === 14, `Expected 14 totalDays, got ${plan.totalDays}`);
    assert(tasks[0].title === 'JSX & Component Architecture', 'Day 1 milestone mismatch');

    for (let i = 1; i < tasks.length; i++) {
      assert(tasks[i].title !== tasks[i - 1].title, `Consecutive duplicate in react-14-days at Day ${i + 1}`);
    }
  }

  // 3. All templates in PLAN_TEMPLATES
  for (const template of PLAN_TEMPLATES) {
    const { plan, tasks } = buildTemplatePlanAndTasks(template);
    assert(tasks.length === template.totalDays, `Template ${template.id} generated ${tasks.length} tasks instead of ${template.totalDays}`);
    for (let i = 1; i < tasks.length; i++) {
      assert(tasks[i].title !== tasks[i - 1].title, `Consecutive duplicate in ${template.id} at Day ${i + 1}`);
    }
  }

  // 4. Legitimate practice preservation
  const mockTemplate = {
    id: 'test-with-practice',
    title: 'Practice Test Template',
    description: 'Template with legitimate practice days',
    subject: 'Testing',
    category: 'programming' as const,
    difficulty: 'Beginner' as const,
    totalDays: 4,
    dailyGoalMins: 30,
    coverGradient: 'from-blue-500 to-indigo-500',
    icon: 'code',
    rating: 5.0,
    days: [
      { day: 1, topic: 'Core Syntax', guidance: 'Learn variables and loops.' },
      { day: 2, topic: 'Practice: Build a Calculator', guidance: 'Build a calculator to practice syntax.' },
      { day: 3, topic: 'Functions & Scope', guidance: 'Master function definitions.' },
      { day: 4, topic: 'Practice: Functions Challenge', guidance: 'Solve function challenges.' },
    ],
  };
  const { tasks: mockTasks } = buildTemplatePlanAndTasks(mockTemplate);
  assert(mockTasks.length === 4, 'Mock tasks length must be 4');
  assert(mockTasks[1].title === 'Practice: Build a Calculator', 'Legitimate practice day 2 must be preserved');
  assert(mockTasks[3].title === 'Practice: Functions Challenge', 'Legitimate practice day 4 must be preserved');
}

if (import.meta.url.endsWith('templateCurriculum.test.ts')) {
  runTemplateCurriculumTests();
  console.log('Template Curriculum Tests Passed!');
}
