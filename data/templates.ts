import { PlanTemplate } from '../types';

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'python-30-days',
    title: 'Python for Beginners',
    description: 'A comprehensive journey from zero to building your first Python applications. Covers variables, loops, functions, and OOP.',
    subject: 'Python Programming',
    category: 'programming',
    difficulty: 'Beginner',
    totalDays: 30,
    dailyGoalMins: 45,
    coverGradient: 'from-blue-500 to-green-400',
    icon: 'terminal',
    popularity: 95,
    days: [
      { day: 1, topic: 'Introduction & Setup', guidance: 'Install Python, VS Code, and run your first "Hello World" script.' },
      { day: 2, topic: 'Variables & Data Types', guidance: 'Learn about strings, integers, floats, and booleans.' },
      { day: 3, topic: 'Control Flow: If/Else', guidance: 'Master logical operators and conditional statements.' },
      // ... more days would be here in a real app, keeping it concise for now
    ]
  },
  {
    id: 'react-14-days',
    title: 'React Fundamentals',
    description: 'Master the core concepts of React: Components, Props, State, and Hooks. Build a modern web application.',
    subject: 'Web Development',
    category: 'programming',
    difficulty: 'Intermediate',
    totalDays: 14,
    dailyGoalMins: 60,
    coverGradient: 'from-cyan-500 to-blue-600',
    icon: 'data_object',
    popularity: 88,
    days: [
      { day: 1, topic: 'JSX & Components', guidance: 'Understand how React renders UI and how to build functional components.' },
      { day: 2, topic: 'Props & State', guidance: 'Learn how to pass data and manage local component state.' },
      { day: 3, topic: 'useEffect Hook', guidance: 'Handle side effects and component lifecycle.' },
    ]
  },
  {
    id: 'data-science-30',
    title: 'Data Science Kickstart',
    description: 'Learn the essentials of data analysis using NumPy, Pandas, and Matplotlib. Introduction to machine learning.',
    subject: 'Data Science',
    category: 'science',
    difficulty: 'Intermediate',
    totalDays: 30,
    dailyGoalMins: 90,
    coverGradient: 'from-purple-500 to-indigo-600',
    icon: 'query_stats',
    popularity: 82,
    days: [
      { day: 1, topic: 'NumPy Basics', guidance: 'Master arrays and mathematical operations in Python.' },
      { day: 2, topic: 'Pandas DataFrames', guidance: 'Learn to load, clean, and manipulate datasets.' },
      { day: 3, topic: 'Data Visualization', guidance: 'Create charts and graphs to tell stories with data.' },
    ]
  },
  {
    id: 'ui-ux-design-14',
    title: 'UI/UX Design Principles',
    description: 'Learn the core principles of design: Color theory, typography, layout, and user psychology.',
    subject: 'Design',
    category: 'creative',
    difficulty: 'Beginner',
    totalDays: 14,
    dailyGoalMins: 45,
    coverGradient: 'from-pink-500 to-rose-400',
    icon: 'palette',
    popularity: 75,
    days: [
      { day: 1, topic: 'Color Theory', guidance: 'Understand color harmony and how to create accessible palettes.' },
      { day: 2, topic: 'Typography', guidance: 'Learn how to choose and pair fonts for readability and style.' },
      { day: 3, topic: 'Visual Hierarchy', guidance: 'Master the art of guiding user attention through layout.' },
    ]
  }
];
