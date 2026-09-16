import { PLAN_TEMPLATES } from '../../../constants/templates';
import { buildTemplatePlanAndTasks } from '../utils/templatePlanBuilder';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

console.log('--- Running Template Curriculum Tests ---');

// 1. fullstack-90-days
const fullstackTemplate = PLAN_TEMPLATES.find((t) => t.id === 'fullstack-90-days');
assert(!!fullstackTemplate, 'fullstack-90-days must exist in PLAN_TEMPLATES');
if (fullstackTemplate) {
  assert(fullstackTemplate.totalDays === 90, 'fullstack-90-days totalDays must be 90');
  assert(fullstackTemplate.days.length === 90, 'fullstack-90-days days array must have 90 entries');

  const { plan, tasks } = buildTemplatePlanAndTasks(fullstackTemplate);

  assert(tasks.length === 90, `Tasks length must be 90, got ${tasks.length}`);
  assert(plan.totalDays === 90, `Plan totalDays must be 90, got ${plan.totalDays}`);

  assert(tasks[0].title === 'HTML5 Document Structure & Semantic Elements', `Day 1 unexpected: ${tasks[0].title}`);
  assert(tasks[1].title === 'Forms, Input Types & Native Validation', `Day 2 unexpected: ${tasks[1].title}`);
  assert(tasks[2].title === 'Web Accessibility (a11y) & ARIA Roles', `Day 3 unexpected: ${tasks[2].title}`);
  assert(tasks[89].title === 'Containerization, CI/CD & Production Portfolio', `Day 90 unexpected: ${tasks[89].title}`);

  // Check no consecutive duplicates
  for (let i = 1; i < tasks.length; i++) {
    assert(tasks[i].title !== tasks[i - 1].title, `Consecutive duplicate at Day ${i + 1}: "${tasks[i].title}"`);
  }
  console.log('✓ fullstack-90-days: All 90 unique days verified successfully.');
}

// 2. milestone templates (e.g. react-14-days)
const reactTemplate = PLAN_TEMPLATES.find((t) => t.id === 'react-14-days');
assert(!!reactTemplate, 'react-14-days must exist');
if (reactTemplate) {
  const { plan, tasks } = buildTemplatePlanAndTasks(reactTemplate);
  assert(tasks.length === 14, `Tasks length must be 14, got ${tasks.length}`);
  assert(plan.totalDays === 14, `Plan totalDays must be 14, got ${plan.totalDays}`);
  assert(tasks[0].title === 'JSX & Component Architecture', `Day 1 unexpected: ${tasks[0].title}`);

  for (let i = 1; i < tasks.length; i++) {
    assert(tasks[i].title !== tasks[i - 1].title, `Consecutive duplicate at Day ${i + 1} in react-14-days`);
  }
  console.log('✓ react-14-days: 14 days expanded without consecutive duplicates.');
}

// 3. All templates in PLAN_TEMPLATES
for (const template of PLAN_TEMPLATES) {
  const { plan, tasks } = buildTemplatePlanAndTasks(template);
  assert(tasks.length === template.totalDays, `Template ${template.id} generated ${tasks.length} tasks instead of ${template.totalDays}`);
  for (let i = 1; i < tasks.length; i++) {
    assert(tasks[i].title !== tasks[i - 1].title, `Consecutive duplicate in ${template.id} at Day ${i + 1}`);
  }
}
console.log(`✓ All ${PLAN_TEMPLATES.length} templates verified successfully.`);

// 4. Legitimate practice task preservation
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
assert(mockTasks[1].title === 'Practice: Build a Calculator', 'Legitimate practice day 2 preserved');
assert(mockTasks[3].title === 'Practice: Functions Challenge', 'Legitimate practice day 4 preserved');
console.log('✓ Legitimate practice/revision tasks preserved.');

console.log('--- ALL TEMPLATE CURRICULUM TESTS PASSED ---');
