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
    id: 'fullstack-90-days',
    title: 'Ultimate Full-Stack Mastery',
    description: 'The definitive 90-day roadmap from zero to professional full-stack developer. Master the complete MERN/PERN stack and build a massive portfolio.',
    subject: 'Full-Stack Web Development',
    category: 'programming',
    difficulty: 'Advanced',
    totalDays: 90,
    dailyGoalMins: 90,
    coverGradient: 'from-orange-500 to-red-600',
    icon: 'web',
    rating: 4.8,
    days: [
      { day: 1, topic: 'HTML5 & Semantic Markup', guidance: 'Master the building blocks of the web and accessibility standards.' },
      { day: 10, topic: 'CSS3 Foundations & Layouts', guidance: 'Deep dive into Flexbox, Grid, and advanced styling techniques.' },
      { day: 20, topic: 'JavaScript Essentials (ES6+)', guidance: 'Master variables, data types, logic, and modern JS syntax.' },
      { day: 30, topic: 'Asynchronous JS & APIs', guidance: 'Learn promises, async/await, and how to fetch data from the web.' },
      { day: 45, topic: 'React.js Frontend Framework', guidance: 'Build complex interactive UIs with components and hooks.' },
      { day: 60, topic: 'Backend with Node.js & Express', guidance: 'Create robust server-side logic and RESTful architectures.' },
      { day: 75, topic: 'Databases & SQL with PostgreSQL', guidance: 'Design relational schemas and manage persistent data storage.' },
      { day: 90, topic: 'Deployment, Auth & Portfolio', guidance: 'Implement JWT authentication and deploy your full-stack projects.' }
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
  },
  {
    id: 'prompt-engineering-7',
    title: 'Prompt Engineering Mastery',
    description: 'Master the art of communicating with LLMs. Learn few-shot, chain-of-thought, and system prompting patterns.',
    subject: 'Artificial Intelligence',
    category: 'programming',
    difficulty: 'Intermediate',
    totalDays: 7,
    dailyGoalMins: 45,
    coverGradient: 'from-purple-600 to-blue-500',
    icon: 'auto_fix_high',
    rating: 4.9,
    days: [
      { day: 1, topic: 'Foundations of Prompting', guidance: 'Learn the anatomy of a prompt: Instruction, Context, Input Data, and Output Indicator.' },
      { day: 2, topic: 'Few-Shot & Zero-Shot Learning', guidance: 'Practice providing examples to guide LLM behavior and output formats.' },
      { day: 4, topic: 'Chain-of-Thought (CoT)', guidance: 'Guide models to reason through complex problems step-by-step for better accuracy.' },
      { day: 7, topic: 'System Prompts & Safety', guidance: 'Learn to define "persona" and "guardrails" for AI agents.' }
    ]
  },
  {
    id: 'gen-ai-foundations-14',
    title: 'Generative AI Foundations',
    description: 'Understand the architecture behind GPT, Stable Diffusion, and Midjourney. Learn the mechanics of latent space.',
    subject: 'AI Science',
    category: 'science',
    difficulty: 'Advanced',
    totalDays: 14,
    dailyGoalMins: 60,
    coverGradient: 'from-indigo-500 to-purple-800',
    icon: 'neurology',
    rating: 4.8,
    days: [
      { day: 1, topic: 'Intro to Transformers', guidance: 'Understand the self-attention mechanism and the "Attention is All You Need" paper.' },
      { day: 5, topic: 'Diffusion Models Explained', guidance: 'Learn how noise is reversed to create high-fidelity images.' },
      { day: 10, topic: 'Large Language Model Lifecycle', guidance: 'From pre-training to SFT (Supervised Fine-Tuning) and RLHF.' },
      { day: 14, topic: 'Future of Agentic AI', guidance: 'Explore Tool-use, RAG (Retrieval Augmented Generation), and multi-agent systems.' }
    ]
  },
  {
    id: 'rust-fundamentals-30',
    title: 'Rust Systems Programming',
    description: 'Learn the fastest-growing systems language. Master ownership, borrowing, and memory safety without a garbage collector.',
    subject: 'Computer Science',
    category: 'programming',
    difficulty: 'Advanced',
    totalDays: 30,
    dailyGoalMins: 90,
    coverGradient: 'from-orange-700 to-amber-900',
    icon: 'settings_input_component',
    rating: 4.9,
    days: [
      { day: 1, topic: 'Rust Toolchain & Cargo', guidance: 'Set up rustup, cargo, and understand the basic project structure.' },
      { day: 5, topic: 'The Ownership System', guidance: 'Master the core concept of Rust: Ownership, Borrowing, and Lifetimes.' },
      { day: 12, topic: 'Enums & Pattern Matching', guidance: 'Learn about Option and Result types for robust error handling.' },
      { day: 20, topic: 'Traits & Generics', guidance: 'Implement shared behavior and write flexible, reusable code.' },
      { day: 30, topic: 'Fearless Concurrency', guidance: 'Write multi-threaded code that is guaranteed memory-safe at compile time.' }
    ]
  },
  {
    id: 'aws-cloud-30',
    title: 'AWS Cloud Practitioner',
    description: 'Complete roadmap to AWS certification. Covers EC2, S3, Lambda, RDS, and CloudFront.',
    subject: 'Cloud Computing',
    category: 'programming',
    difficulty: 'Intermediate',
    totalDays: 30,
    dailyGoalMins: 60,
    coverGradient: 'from-orange-400 to-yellow-600',
    icon: 'cloud',
    rating: 4.7,
    days: [
      { day: 1, topic: 'Cloud Concepts & AWS Global Infrastructure', guidance: 'Understand Regions, Availability Zones, and Edge Locations.' },
      { day: 5, topic: 'IAM & Security Foundations', guidance: 'Configure users, groups, and roles for secure resource access.' },
      { day: 12, topic: 'Compute Services (EC2 & Lambda)', guidance: 'Deploy virtual servers and serverless functions.' },
      { day: 20, topic: 'Storage & Databases (S3, RDS, DynamoDB)', guidance: 'Master object storage and relational vs NoSQL databases.' },
      { day: 30, topic: 'Pricing, Support & Final Exam Prep', guidance: 'Understand the Well-Architected Framework and cost optimization.' }
    ]
  },
  {
    id: 'devops-essentials-30',
    title: 'DevOps & CI/CD Mastery',
    description: 'The bridge between Dev and Ops. Master Docker, Kubernetes, GitHub Actions, and Terraform.',
    subject: 'Software Engineering',
    category: 'programming',
    difficulty: 'Advanced',
    totalDays: 30,
    dailyGoalMins: 90,
    coverGradient: 'from-slate-600 to-blue-900',
    icon: 'sync_alt',
    rating: 4.8,
    days: [
      { day: 1, topic: 'Linux Foundations & CLI', guidance: 'Master the terminal, shell scripting, and user permissions.' },
      { day: 7, topic: 'Docker & Containerization', guidance: 'Build, ship, and run applications in isolated environments.' },
      { day: 15, topic: 'Kubernetes Orchestration', guidance: 'Manage clusters, pods, services, and deployments at scale.' },
      { day: 22, topic: 'Infrastructure as Code (Terraform)', guidance: 'Provision cloud resources using declarative configuration files.' },
      { day: 30, topic: 'CI/CD Pipelines (GitHub Actions)', guidance: 'Automate testing and deployment for professional workflows.' }
    ]
  },
  {
    id: 'unity-game-dev-45',
    title: 'Unity 3D Game Development',
    description: 'Build your first 3D game from scratch. Covers C# scripting, physics, lighting, and UI.',
    subject: 'Game Design',
    category: 'programming',
    difficulty: 'Intermediate',
    totalDays: 45,
    dailyGoalMins: 90,
    coverGradient: 'from-gray-800 to-black',
    icon: 'sports_esports',
    rating: 4.6,
    days: [
      { day: 1, topic: 'Unity Editor & Game Objects', guidance: 'Navigate the interface and understand the Scene vs Game view.' },
      { day: 10, topic: 'C# Scripting for Games', guidance: 'Learn variables, methods, and how to manipulate transforms via code.' },
      { day: 20, topic: 'Physics & Collision Detection', guidance: 'Use Rigidbodies and Colliders to create realistic interactions.' },
      { day: 35, topic: 'Materials, Lighting & Particle Effects', guidance: 'Make your game visually stunning with Shaders and VFX.' },
      { day: 45, topic: 'UI Design & Game Loop Publishing', guidance: 'Build menus, HUDs, and export your game for WebGL or Desktop.' }
    ]
  },
  {
    id: 'advanced-figma-14',
    title: 'Advanced Figma Mastery',
    description: 'Build professional design systems. Master Auto-layout, Variables, and Prototyping.',
    subject: 'UI/UX Design',
    category: 'creative',
    difficulty: 'Advanced',
    totalDays: 14,
    dailyGoalMins: 60,
    coverGradient: 'from-purple-500 to-pink-500',
    icon: 'grid_view',
    rating: 4.9,
    days: [
      { day: 1, topic: 'Auto Layout 5.0 Depth', guidance: 'Master complex nesting and absolute positioning within layouts.' },
      { day: 5, topic: 'Variables & Multi-mode Design', guidance: 'Build light/dark modes and multi-device designs using variables.' },
      { day: 9, topic: 'Advanced Prototyping', guidance: 'Learn smart-animate, conditional logic, and state management in prototypes.' },
      { day: 14, topic: 'Design Systems & Handoff', guidance: 'Organize components, libraries, and prepare files for developers.' }
    ]
  },
  {
    id: 'personal-finance-30',
    title: 'Personal Finance & Wealth',
    description: 'Take control of your financial future. Learn budgeting, tax optimization, and long-term investing.',
    subject: 'Finance',
    category: 'business',
    difficulty: 'Beginner',
    totalDays: 30,
    dailyGoalMins: 45,
    coverGradient: 'from-green-400 to-blue-600',
    icon: 'payments',
    rating: 4.8,
    days: [
      { day: 1, topic: 'The Wealth Mindset & Budgeting', guidance: 'Track your net worth and create a sustainable spending plan.' },
      { day: 7, topic: 'Debt Management & Credit Scores', guidance: 'Strategies for paying off high-interest debt and building credit.' },
      { day: 15, topic: 'Stock Market & Index Funds', guidance: 'Learn about compounding and the power of diversified ETFs.' },
      { day: 22, topic: 'Real Estate & Alternative Assets', guidance: 'Introduction to property investing and diversification.' },
      { day: 30, topic: 'Tax Optimization & Retirement', guidance: 'Master 401k, IRA, and long-term tax-efficient withdrawal strategies.' }
    ]
  },
  {
    id: 'cryptoeconomics-14',
    title: 'Cryptoeconomics & Web3',
    description: 'Beyond the hype. Understand blockchain mechanics, smart contracts, and decentralized finance (DeFi).',
    subject: 'Economics',
    category: 'business',
    difficulty: 'Intermediate',
    totalDays: 14,
    dailyGoalMins: 60,
    coverGradient: 'from-blue-700 to-indigo-900',
    icon: 'currency_bitcoin',
    rating: 4.5,
    days: [
      { day: 1, topic: 'How Blockchain Works', guidance: 'Understand hashing, consensus (PoW vs PoS), and immutability.' },
      { day: 4, topic: 'Smart Contracts (Ethereum)', guidance: 'Learn how programmable money works and the role of the EVM.' },
      { day: 8, topic: 'DeFi & Liquidity Protocols', guidance: 'Understand AMMs, yield farming, and decentralized lending.' },
      { day: 14, topic: 'The Future of Web3 Governance', guidance: 'Explore DAOs, NFTs, and the decentralized identity layer.' }
    ]
  },
  {
    id: 'public-speaking-7',
    title: 'Public Speaking & Storytelling',
    description: 'Conquer your fear and captivate your audience. Learn to craft and deliver powerful presentations.',
    subject: 'Communication',
    category: 'business',
    difficulty: 'Beginner',
    totalDays: 7,
    dailyGoalMins: 60,
    coverGradient: 'from-red-400 to-pink-600',
    icon: 'record_voice_over',
    rating: 4.9,
    days: [
      { day: 1, topic: 'Overcoming Stage Fright', guidance: 'Practical techniques for managing anxiety and breathing.' },
      { day: 3, topic: 'The Art of Storytelling', guidance: 'Structure your speech using the "Hero\'s Journey" framework.' },
      { day: 5, topic: 'Body Language & Vocal Variety', guidance: 'Master non-verbal communication and tonality for impact.' },
      { day: 7, topic: 'Final Presentation & Feedback', guidance: 'Record yourself, analyze, and implement iterative improvements.' }
    ]
  },
  {
    id: 'neuroscience-basics-21',
    title: 'Neuroscience of Learning',
    description: 'Use brain science to learn faster. Understand dopamine, habit loops, and neuroplasticity.',
    subject: 'Biology',
    category: 'science',
    difficulty: 'Intermediate',
    totalDays: 21,
    dailyGoalMins: 45,
    coverGradient: 'from-purple-400 to-indigo-500',
    icon: 'psychology',
    rating: 4.8,
    days: [
      { day: 1, topic: 'Neuroplasticity Foundations', guidance: 'How the brain rewires itself during deep focused study.' },
      { day: 7, topic: 'Dopamine & Motivation Systems', guidance: 'Manage your focus and avoid the trap of instant gratification.' },
      { day: 14, topic: 'The Science of Memory', guidance: 'Master Spaced Repetition and Active Recall for long-term retention.' },
      { day: 21, topic: 'Optimizing Sleep & Nutrition', guidance: 'The biological requirements for high-performance cognition.' }
    ]
  },
  {
    id: 'nutrition-science-30',
    title: 'Nutrition & Metabolic Health',
    description: 'The biochemistry of food. Understand macronutrients, micronutrients, and hormonal responses to diet.',
    subject: 'Health Science',
    category: 'science',
    difficulty: 'Intermediate',
    totalDays: 30,
    dailyGoalMins: 45,
    coverGradient: 'from-green-400 to-yellow-500',
    icon: 'nutrition',
    rating: 4.7,
    days: [
      { day: 1, topic: 'Macronutrients & Bioenergetics', guidance: 'How the body processes proteins, fats, and carbohydrates.' },
      { day: 10, topic: 'Insulin Sensitivity & Metabolism', guidance: 'Understand blood sugar regulation and metabolic flexibility.' },
      { day: 18, topic: 'Micronutrients & Gut Microbiome', guidance: 'The role of vitamins, minerals, and bacteria in total wellness.' },
      { day: 30, topic: 'Designing a Bio-individual Diet', guidance: 'Learn to read clinical studies and ignore nutritional dogma.' }
    ]
  },
  {
    id: 'sustainable-living-14',
    title: 'Sustainable Living Guide',
    description: 'Reduce your impact. Practical steps for zero-waste, energy efficiency, and conscious consumption.',
    subject: 'Ecology',
    category: 'science',
    difficulty: 'Beginner',
    totalDays: 14,
    dailyGoalMins: 30,
    coverGradient: 'from-emerald-400 to-teal-600',
    icon: 'eco',
    rating: 4.6,
    days: [
      { day: 1, topic: 'Personal Carbon Audit', guidance: 'Calculate your footprint and identify the biggest areas for improvement.' },
      { day: 5, topic: 'Zero Waste Foundations', guidance: 'Implementing the 5 Rs: Refuse, Reduce, Reuse, Recycle, Rot.' },
      { day: 9, topic: 'Energy & Water Conservation', guidance: 'Practical home hacks to save resources and lower utility bills.' },
      { day: 14, topic: 'Conscious Consumerism', guidance: 'How to support ethical brands and avoid greenwashing.' }
    ]
  }
];
