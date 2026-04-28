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
    rating: 4.9,
    days: [
      { day: 1, topic: 'Introduction & Environment Setup', guidance: 'Install Python 3.x, VS Code, and learn about the Python REPL and pip.' },
      { day: 3, topic: 'Variables & Basic Data Types', guidance: 'Master integers, floats, strings, and booleans. Practice variable assignment.' },
      { day: 5, topic: 'Conditional Logic & Booleans', guidance: 'Master if, elif, and else statements to control program flow.' },
      { day: 8, topic: 'Loops & Iteration', guidance: 'Learn for and while loops. Practice iterating over lists and ranges.' },
      { day: 12, topic: 'Functions & Modules', guidance: 'Learn to write reusable code with functions and import external modules.' },
      { day: 15, topic: 'Lists, Tuples & Dictionaries', guidance: 'Deep dive into Python collections and how to manipulate them.' },
      { day: 20, topic: 'Object-Oriented Programming (OOP)', guidance: 'Learn about classes, objects, inheritance, and encapsulation.' },
      { day: 25, topic: 'File Handling & APIs', guidance: 'Learn to read/write files and make simple HTTP requests with "requests".' },
      { day: 30, topic: 'Final Project: Personal Assistant', guidance: 'Build a small CLI tool that integrates everything you have learned.' }
    ]
  },
  {
    id: 'fullstack-60-days',
    title: 'Full-Stack Web Dev Path',
    description: 'The complete roadmap from HTML/CSS to React, Node.js, and Database management. Build a real-world portfolio.',
    subject: 'Web Development',
    category: 'programming',
    difficulty: 'Advanced',
    totalDays: 60,
    dailyGoalMins: 90,
    coverGradient: 'from-orange-500 to-red-600',
    icon: 'web',
    rating: 4.8,
    days: [
      { day: 1, topic: 'HTML5 & Semantic Markup', guidance: 'Learn the structure of the web and best practices for accessibility.' },
      { day: 7, topic: 'CSS3 Foundations & Flexbox', guidance: 'Master styling, layouts, and responsive design principles.' },
      { day: 14, topic: 'Modern JavaScript (ES6+)', guidance: 'Master arrow functions, destructuring, promises, and async/await.' },
      { day: 21, topic: 'React.js Core Concepts', guidance: 'Build dynamic UIs using components, props, and state management.' },
      { day: 30, topic: 'State Management with Redux/Context', guidance: 'Learn how to manage global app state effectively.' },
      { day: 40, topic: 'Backend with Node.js & Express', guidance: 'Build your first server and learn about RESTful API design.' },
      { day: 50, topic: 'Database Design with PostgreSQL', guidance: 'Learn SQL, schemas, and how to connect your backend to a database.' },
      { day: 60, topic: 'Deployment & Portfolio Launch', guidance: 'Deploy your full-stack app to the cloud and showcase your work.' }
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
    rating: 4.7,
    days: [
      { day: 1, topic: 'JSX & Component Architecture', guidance: 'Understand how React renders UI and how to build functional components.' },
      { day: 3, topic: 'Props & Dynamic Rendering', guidance: 'Learn how to pass data between components and render lists.' },
      { day: 5, topic: 'State & Event Handling', guidance: 'Manage local component state and respond to user interactions.' },
      { day: 7, topic: 'The useEffect Hook', guidance: 'Handle side effects like API calls and data fetching.' },
      { day: 10, topic: 'Routing with React Router', guidance: 'Build multi-page applications with client-side navigation.' },
      { day: 14, topic: 'Building a Task Manager App', guidance: 'Apply everything to build a functional CRUD application.' }
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
    rating: 4.6,
    days: [
      { day: 1, topic: 'NumPy Foundations', guidance: 'Master multidimensional arrays and vectorization for speed.' },
      { day: 5, topic: 'Data Manipulation with Pandas', guidance: 'Learn to load, clean, and explore real-world datasets.' },
      { day: 10, topic: 'Exploratory Data Analysis', guidance: 'Use statistics to find patterns and outliers in your data.' },
      { day: 15, topic: 'Data Visualization Mastery', guidance: 'Create publication-quality charts using Matplotlib and Seaborn.' },
      { day: 22, topic: 'Intro to Machine Learning', guidance: 'Understand supervised vs unsupervised learning and Scikit-Learn.' },
      { day: 30, topic: 'Predictive Modeling Project', guidance: 'Build a model to predict house prices or stock trends.' }
    ]
  },
  {
    id: 'digital-marketing-30',
    title: 'Digital Marketing Mastery',
    description: 'Master SEO, Content Marketing, and Social Media strategies to grow any brand or business online.',
    subject: 'Marketing',
    category: 'business',
    difficulty: 'Beginner',
    totalDays: 30,
    dailyGoalMins: 45,
    coverGradient: 'from-yellow-400 to-orange-500',
    icon: 'trending_up',
    rating: 4.8,
    days: [
      { day: 1, topic: 'The Digital Marketing Funnel', guidance: 'Understand awareness, consideration, conversion, and loyalty.' },
      { day: 5, topic: 'Search Engine Optimization (SEO)', guidance: 'Learn keyword research, on-page SEO, and backlink strategies.' },
      { day: 12, topic: 'Content Strategy & Copywriting', guidance: 'Learn to write compelling copy that converts readers into customers.' },
      { day: 20, topic: 'Paid Advertising (Google & Meta)', guidance: 'Set up your first ad campaign and understand ROI/ROAS.' },
      { day: 30, topic: 'Analytics & Strategy Audit', guidance: 'Use Google Analytics to track success and iterate on your plan.' }
    ]
  },
  {
    id: 'spanish-for-travelers',
    title: 'Spanish for Travelers',
    description: 'Learn essential Spanish phrases and grammar for your next trip to Spain or Latin America.',
    subject: 'Spanish',
    category: 'language',
    difficulty: 'Beginner',
    totalDays: 21,
    dailyGoalMins: 30,
    coverGradient: 'from-red-500 to-yellow-500',
    icon: 'language',
    rating: 4.9,
    days: [
      { day: 1, topic: 'Pronunciation & Greetings', guidance: 'Master the Spanish alphabet and basic "Hola", "Buenos días".' },
      { day: 4, topic: 'Essential Travel Phrases', guidance: 'Learn how to ask for directions and order food in a restaurant.' },
      { day: 8, topic: 'Numbers, Time & Money', guidance: 'Master counting and handling transactions in Spanish-speaking countries.' },
      { day: 15, topic: 'Emergency & Health Phrases', guidance: 'Crucial vocabulary for navigating unexpected situations safely.' },
      { day: 21, topic: 'Cultural Etiquette & Fluency', guidance: 'Learn local customs and practice conversational basics.' }
    ]
  },
  {
    id: 'cybersecurity-basics',
    title: 'Cybersecurity Essentials',
    description: 'Learn how to protect systems and data from common cyber threats. Introduction to ethical hacking.',
    subject: 'Security',
    category: 'science',
    difficulty: 'Intermediate',
    totalDays: 30,
    dailyGoalMins: 60,
    coverGradient: 'from-slate-700 to-slate-900',
    icon: 'shield',
    rating: 4.7,
    days: [
      { day: 1, topic: 'Networking Foundations', guidance: 'Understand TCP/IP, DNS, and how the internet actually works.' },
      { day: 5, topic: 'Common Vulnerabilities (OWASP)', guidance: 'Learn about SQL injection, XSS, and broken authentication.' },
      { day: 12, topic: 'Cryptography & Encryption', guidance: 'Learn the difference between symmetric and asymmetric encryption.' },
      { day: 20, topic: 'Network Security & Firewalls', guidance: 'Learn to secure networks using firewalls and VPNs.' },
      { day: 30, topic: 'Incident Response & Ethical Hacking', guidance: 'Learn how to respond to breaches and basic penetration testing.' }
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
    rating: 4.5,
    days: [
      { day: 1, topic: 'Intro to Design Thinking', guidance: 'Learn the empathize, define, ideate, prototype, and test cycle.' },
      { day: 3, topic: 'Color Theory & Accessibility', guidance: 'Understand color harmony and how to create accessible palettes.' },
      { day: 5, topic: 'Typography & Visual Hierarchy', guidance: 'Learn how to pair fonts and guide user attention through layout.' },
      { day: 8, topic: 'Wireframing & Prototyping', guidance: 'Turn ideas into low-fidelity and high-fidelity prototypes in Figma.' },
      { day: 14, topic: 'Usability Testing & Feedback', guidance: 'Learn how to gather and implement user feedback effectively.' }
    ]
  }
];
