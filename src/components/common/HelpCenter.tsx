import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Keyboard,
  BookOpen,
  Code2,
  Video,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  MessageSquare,
  FileText,
  HelpCircle,
  Zap,
  Flame,
  Clock,
  Laptop,
  Compass,
  Layers,
  RotateCcw
} from 'lucide-react';

interface GuideCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const CATEGORIES: GuideCategory[] = [
  { id: 'all', label: 'All Topics', icon: HelpCircle },
  { id: 'plans', label: 'Study Plans & AI', icon: Sparkles },
  { id: 'workspace', label: 'Workspace & Code', icon: Code2 },
  { id: 'videos', label: 'Video Mentorship', icon: Video },
  { id: 'shortcuts', label: 'Shortcuts & Navigation', icon: Keyboard },
  { id: 'community', label: 'Study Rooms', icon: Users },
  { id: 'analytics', label: 'Progress & Data', icon: BarChart3 },
];

interface GuideItem {
  id: string;
  category: 'plans' | 'workspace' | 'videos' | 'shortcuts' | 'community' | 'analytics';
  title: string;
  summary: string;
  badge: string;
  actionLabel?: string;
  actionRoute?: string;
  steps: string[];
  tips?: string;
}

const GUIDES: GuideItem[] = [
  // ── Category: plans ──
  {
    id: 'plan-generation',
    category: 'plans',
    title: 'Generating an AI Study Roadmap',
    summary: 'Turn any subject, framework, or exam goal into a structured day-by-day learning roadmap.',
    badge: 'Core Workflow',
    actionLabel: 'Create New Plan',
    actionRoute: '/dashboard',
    steps: [
      'Click "New Plan" in the sidebar or press "N" on your keyboard.',
      'Specify your target subject (e.g., "Dart & Flutter", "C Programming", "Distributed Systems").',
      'Select your target timeline, daily commitment, and experience level.',
      'Optionally attach a textbook or syllabus PDF to anchor the roadmap directly to your curriculum.',
      'Review the generated modules, learning objectives, and click "Start Learning" to enter Day 1.'
    ],
    tips: 'The AI builds day-by-day progressive milestones with built-in active recall checkpoints.'
  },
  {
    id: 'pdf-learning',
    category: 'plans',
    title: 'Extracting Roadmaps from PDF Textbooks',
    summary: 'Upload lecture slides, course syllabi, or textbook chapters to build customized study sessions.',
    badge: 'Document Parsing',
    actionLabel: 'Open Dashboard',
    actionRoute: '/dashboard',
    steps: [
      'When creating a plan or starting a workspace session, drag and drop your PDF file.',
      'Relearn extracts headers, code snippets, and core conceptual definitions automatically.',
      'The learning space parses the extracted text and formats custom practice exercises directly referencing source pages.',
      'PDF contents stay securely processed within your active learning session.'
    ],
    tips: 'PDFs under 25MB with clear OCR or digital text yield the highest quality conceptual extraction.'
  },
  {
    id: 'socratic-mode',
    category: 'plans',
    title: 'Cognitive Modes: Socratic Dialogue & Story Scenarios',
    summary: 'Switch explanation paradigms from direct instruction to guided progressive inquiry or narrative problem-solving.',
    badge: 'Cognitive Modes',
    actionLabel: 'Active Tasks',
    actionRoute: '/dashboard',
    steps: [
      'Open any daily lesson in the Learning Workspace.',
      'In the Concept Explanation card header, choose between Standard, Socratic, or Story modes.',
      'Standard Mode: Delivers direct, structured technical breakdowns and code fences.',
      'Socratic Mode: Formulates guided progressive questions to help you deduce language design decisions independently.',
      'Story Mode: Encloses the lesson inside an engineering scenario (e.g., debugging a space rover telemetry system).'
    ],
    tips: 'Socratic mode is ideal for complex architectural concepts like pointers, memory lifecycles, and concurrency.'
  },

  // ── Category: workspace ──
  {
    id: 'workspace-practice',
    category: 'workspace',
    title: 'Using the Interactive Learning Workspace',
    summary: 'Master daily lessons through structured concept breakdowns, practice tasks, and reflection prompts.',
    badge: 'Daily Study',
    actionLabel: 'Active Tasks',
    actionRoute: '/dashboard',
    steps: [
      'Each lesson includes a single clear Learning Objective and a concise, scannable breakdown.',
      'Switch explanation modes dynamically: "Standard" (direct), "Socratic" (guided questions), or "Story" (narrative context).',
      'Study the formatted code blocks and copy snippets with 1-click clipboard integration.',
      'Complete the step-by-step practice tasks and verify your understanding with the practice question.',
      'Click "Complete Session" to log XP, update your streak, and unlock the next topic.'
    ],
    tips: 'Use the built-in Study Timer in the top right to enforce focused 25-minute Pomodoro cycles.'
  },
  {
    id: 'code-execution',
    category: 'workspace',
    title: 'Running Code in the Playground & Exercises',
    summary: 'Execute scripts directly inside the browser using our containerized Piston execution engine.',
    badge: 'Code Engine',
    actionLabel: 'Open Playground',
    actionRoute: '/playground',
    steps: [
      'Navigate to the Playground from the sidebar for instant multi-language experimentation.',
      'Choose from supported runtimes: Python, JavaScript, TypeScript, C, C++, C#, Go, Rust, and Dart.',
      'Write or paste code in the Monaco editor and press "Run Code" (or Ctrl+Enter).',
      'Output and runtime stdout/stderr stream directly to the terminal panel below.',
      'Save reusable code snippets or templates to your personal repository for future reference.'
    ],
    tips: 'Code execution runs in sandboxed Docker micro-containers with memory and timeout guardrails.'
  },

  // ── Category: videos ──
  {
    id: 'video-curation',
    category: 'videos',
    title: 'Precision Video Mentorship & Language Filtering',
    summary: 'Access strictly verified YouTube educational videos filtered by topic and preferred audio language.',
    badge: 'Quality Engine',
    actionLabel: 'Configure Language',
    actionRoute: '/settings',
    steps: [
      'Every learning lesson retrieves precision-filtered video tutorials matched to the exact technology.',
      'Strict multi-stage filters eliminate unrelated tools (e.g. Cursor or Kiro for pure C/C# plans).',
      'Language verification strictly isolates English, Tamil, Hindi, Malayalam, Telugu, and Bengali.',
      'Popularity and educational verification ensure reputable creators with reliable explanations.',
      'Change your preferred video language at any time in Settings -> Video Language.'
    ],
    tips: 'If you want native language explanations, switch your preference in Settings to receive localized tutorials.'
  },
  {
    id: 'video-routing',
    category: 'videos',
    title: 'Regional Audio Routing & Creator Whitelisting',
    summary: 'How Relearn verifies native scripts, channel authority, and video view counts before presenting tutorials.',
    badge: 'Regional Routing',
    actionLabel: 'Open Settings',
    actionRoute: '/settings',
    steps: [
      'Our video verification pipeline evaluates titles against Unicode language blocks and regional keywords.',
      'For example, Tamil mode strictly verifies Tamil script (தமிழ்) or verified creator tags like "Tamil Hacks" or "Bro Code Tamil".',
      'Videos below 5,000 views or with high clickbait ratios are automatically rejected.',
      'When reputable regional tutorials are unavailable for a niche topic, authentic English tutorials are served with clear labeling.'
    ],
    tips: 'You can change language preferences independently for written text and video tutorials in Settings.'
  },

  // ── Category: shortcuts ──
  {
    id: 'global-shortcuts',
    category: 'shortcuts',
    title: 'Global Single-Key Navigation & Command Palette',
    summary: 'Navigate between the Dashboard, Progress, Plans, and Settings instantly without touching your mouse.',
    badge: 'Power-User Keys',
    actionLabel: 'Open Dashboard',
    actionRoute: '/dashboard',
    steps: [
      'Press "D" anywhere in the app to return to your main Dashboard.',
      'Press "P" to jump straight into Progress Analytics and study hours.',
      'Press "N" to immediately launch the New Plan roadmap modal.',
      'Press "L" to open your historical Learning Diary & completed journeys.',
      'Press "S" to open Settings (audio language, theme, and profile preferences).',
      'Press "Ctrl + K" (or ⌘K on macOS) to invoke the Global Search & Command Palette.'
    ],
    tips: 'Single-key shortcuts automatically pause when typing inside text inputs, forms, or code editors.'
  },
  {
    id: 'editor-shortcuts',
    category: 'shortcuts',
    title: 'Monaco Code Editor & Terminal Hotkeys',
    summary: 'Speed up script execution, multi-cursor editing, and auto-formatting in the Code Playground.',
    badge: 'Editor Hotkeys',
    actionLabel: 'Open Playground',
    actionRoute: '/playground',
    steps: [
      'Press "Ctrl + Enter" (or ⌘ + Enter) inside the Monaco editor to compile and execute code instantly.',
      'Press "Shift + Alt + F" to auto-format and clean up indentation according to language conventions.',
      'Hold "Alt" (Option on macOS) and click to place multiple simultaneous editing cursors.',
      'Press "Ctrl + /" to toggle line comments on the current selection.',
      'Press "Ctrl + F" to search and replace tokens across your active script.'
    ],
    tips: 'Terminal compiler errors include line-number citations that highlight failing syntax automatically.'
  },
  {
    id: 'study-session-keys',
    category: 'shortcuts',
    title: 'Workspace Study Flow & Modal Hotkeys',
    summary: 'Control study timers, dismiss overlays, and review cheat sheets using quick key combinations.',
    badge: 'Workflow Hotkeys',
    actionLabel: 'Dashboard',
    actionRoute: '/dashboard',
    steps: [
      'Press "Esc" to instantly dismiss any open modal, dropdown, or search palette.',
      'Press "?" anywhere to summon the floating keyboard cheatsheet summary.',
      'Use Arrow keys (↑ / ↓) inside the Search Palette to traverse results, and "Enter" to navigate.',
      'Use Tab and Shift+Tab for full keyboard accessibility across all buttons and inputs.'
    ],
    tips: 'All modal dialogs comply with WCAG 2.1 accessibility guidelines and trap focus safely.'
  },

  // ── Category: community ──
  {
    id: 'study-rooms',
    category: 'community',
    title: 'Collaborative Study Rooms & Focus Sync',
    summary: 'Join synchronized focus sessions with fellow students featuring shared Pomodoros and markdown chat.',
    badge: 'Peer Focus',
    actionLabel: 'Join Study Room',
    actionRoute: '/rooms',
    steps: [
      'Browse public rooms or create a private room with a custom room code.',
      'Timers synchronize automatically across all room participants for unified work/break intervals.',
      'Share code snippets and markdown formatted notes in the real-time chat room.',
      'View participant study streaks, current active subjects, and active presence.'
    ],
    tips: 'Studying in rooms boosts streak bonuses and rewards collective focus milestones.'
  },
  {
    id: 'silent-coworking',
    category: 'community',
    title: 'Silent Co-Working & Accountability Protocol',
    summary: 'Distraction-free group study principles designed for deep coding and reading sessions.',
    badge: 'Focus Etiquette',
    actionLabel: 'Explore Rooms',
    actionRoute: '/rooms',
    steps: [
      'Relearn rooms prioritize silent co-working—no video camera or audio microphone friction.',
      'Presence dots announce when members join, start focus sessions, or enter short break intervals.',
      'Use markdown code blocks (```lang) to share debug challenges without leaving the room.',
      'Room statistics update your daily study diary automatically upon completion.'
    ],
    tips: 'Create private rooms for university study groups or interview prep pairs.'
  },

  // ── Category: analytics ──
  {
    id: 'progress-analytics',
    category: 'analytics',
    title: 'Tracking Learning Velocity, XP & Streaks',
    summary: 'Measure your study hours, recall completion, and subject mastery with interactive charts.',
    badge: 'Metrics',
    actionLabel: 'View Analytics',
    actionRoute: '/progress',
    steps: [
      'Access the Progress screen to inspect weekly study distributions and completed milestones.',
      'Monitor your current Study Streak; completing at least one task daily maintains momentum.',
      'Earn XP for each lesson completed, code execution run, and review quiz passed.',
      'Track subject balance across plans to avoid cognitive burnout in a single topic.'
    ],
    tips: 'Check the Mistakes Review section on the Dashboard to reinforce previously missed quiz concepts.'
  },
  {
    id: 'offline-export',
    category: 'analytics',
    title: 'Exporting Notes & Offline Backups',
    summary: 'Download study guides, notes, and plan outlines as clean PDFs for offline review.',
    badge: 'Portability',
    actionLabel: 'Learning Diary',
    actionRoute: '/diary',
    steps: [
      'Open any completed lesson in the Learning Workspace and click the Download icon in the header.',
      'Select PDF Export to generate a beautifully styled reference sheet with code blocks and notes.',
      'Access your Learning Diary to view completed journeys and review historical notes.',
      'Data is mirrored locally in your browser cache and synchronized to Supabase cloud storage.'
    ],
    tips: 'Use the print-friendly mode in the workspace for crisp black-and-white physical printing.'
  }
];

interface ShortcutCard {
  key: string;
  displayKey: string;
  label: string;
  description: string;
  route: string;
}

const SHORTCUT_LIST: ShortcutCard[] = [
  { key: 'd', displayKey: 'D', label: 'Dashboard', description: 'Jump to main student dashboard', route: '/dashboard' },
  { key: 'p', displayKey: 'P', label: 'Progress', description: 'View analytics, hours & XP', route: '/progress' },
  { key: 'n', displayKey: 'N', label: 'New Plan', description: 'Launch roadmap generator', route: '/dashboard' },
  { key: 'l', displayKey: 'L', label: 'Diary', description: 'Access learning diary & archive', route: '/diary' },
  { key: 's', displayKey: 'S', label: 'Settings', description: 'Preferences & language options', route: '/settings' },
  { key: 'k', displayKey: 'Ctrl + K', label: 'Palette', description: 'Open global search palette', route: '' },
  { key: '?', displayKey: '?', label: 'Cheatsheet', description: 'Display shortcuts modal', route: '' },
  { key: 'Escape', displayKey: 'Esc', label: 'Back / Close', description: 'Dismiss active view or modal', route: '' }
];

interface TroubleshootingItem {
  q: string;
  category: 'plans' | 'workspace' | 'videos' | 'shortcuts' | 'community' | 'analytics';
  answer: string;
  checklist: string[];
  actionText?: string;
  actionRoute?: string;
}

const FAQ_ITEMS: TroubleshootingItem[] = [
  {
    q: 'How do I change my video tutorial language preference?',
    category: 'videos',
    answer: 'Relearn.ai allows independent preferences for explanation text and video audio. If you want tutorials in Tamil, Hindi, or English:',
    checklist: [
      'Go to Settings > Preferences (press "S" on your keyboard).',
      'Under "Preferred Video Language", select your desired language (e.g. English, Tamil, Hindi, Malayalam, Telugu, Bengali).',
      'Return to your Workspace; video mentorship cards immediately refresh with precision-matched tutorials.'
    ],
    actionText: 'Go to Settings',
    actionRoute: '/settings'
  },
  {
    q: 'Why didn\'t my keyboard shortcut trigger when typing?',
    category: 'shortcuts',
    answer: 'To prevent accidental navigation while writing notes or code, all single-key navigation shortcuts are automatically suppressed inside inputs.',
    checklist: [
      'Check if your cursor is focused inside an input field, search box, or Monaco code editor.',
      'Press "Esc" to unfocus the active input field before pressing navigation keys like "D" or "P".',
      'Global combination shortcuts like "Ctrl + K" (⌘K) continue working regardless of where your focus is.'
    ],
    actionText: 'Test in Console',
    actionRoute: '/help-center'
  },
  {
    q: 'Do keyboard shortcuts work on macOS and Linux?',
    category: 'shortcuts',
    answer: 'Yes! Relearn.ai automatically adapts keyboard modifiers according to your operating system.',
    checklist: [
      'On macOS: use the Command key (⌘ + K) to open the search palette.',
      'On Windows and Linux: use the Control key (Ctrl + K).',
      'Single-key hotkeys ("D", "P", "N", "L", "S", "?") are 100% identical across all operating systems.'
    ],
    actionText: 'View Shortcuts',
    actionRoute: '/help-center'
  },
  {
    q: 'Why does my code output show compilation errors?',
    category: 'workspace',
    answer: 'The workspace code runner compiles using standard language specifications (e.g. GCC 13 for C, .NET 8 for C#, Dart 3 SDK).',
    checklist: [
      'Ensure standard entry points are defined (e.g. main() function in C/Dart).',
      'Check that external network calls or GUI libraries are not invoked (sandboxed execution).',
      'Inspect stderr line numbers directly printed in the terminal panel for precise syntax diagnostics.'
    ],
    actionText: 'Open Playground',
    actionRoute: '/playground'
  },
  {
    q: 'How do I recover or review completed learning plans?',
    category: 'plans',
    answer: 'All created plans and historical study sessions are permanently archived in your personal Learning Diary.',
    checklist: [
      'Press "L" or click "Learning Diary" in the sidebar.',
      'Toggle between "In Progress" and "Completed" tabs.',
      'Click any journey card to re-open previous lessons, review personal notes, or export PDF summaries.'
    ],
    actionText: 'View Learning Diary',
    actionRoute: '/diary'
  },
  {
    q: 'Can I study together in rooms without voice or video?',
    category: 'community',
    answer: 'Yes! Relearn study rooms are engineered specifically for silent co-working and focus synchronization without video or voice fatigue.',
    checklist: [
      'Timers sync automatically across all browsers in the room for unified Pomodoro intervals.',
      'Code and questions are shared using the low-friction markdown chat with code snippet highlighting.',
      'Presence indicators show when peers are actively studying or on a break.'
    ],
    actionText: 'Explore Study Rooms',
    actionRoute: '/rooms'
  },
  {
    q: 'How does daily study streak calculation work?',
    category: 'analytics',
    answer: 'Your streak increments when you complete at least one study session or practice activity within a calendar day.',
    checklist: [
      'A study day resets at midnight according to your local device timezone.',
      'Completing a task in any active plan updates the daily streak beacon on your dashboard.',
      'Missing a day resets the active streak counter, but historical longest streaks remain recorded in your profile.'
    ],
    actionText: 'View Dashboard',
    actionRoute: '/dashboard'
  }
];

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // Live keyboard listener for the interactive shortcut console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in the search box
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const keyLower = e.key.toLowerCase();
      const matched = SHORTCUT_LIST.find(s => s.key.toLowerCase() === keyLower || (e.key === 'Escape' && s.key === 'Escape') || ((e.ctrlKey || e.metaKey) && keyLower === 'k' && s.key === 'k'));
      if (matched) {
        setPressedKey(matched.key);
        setTimeout(() => setPressedKey(null), 350);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered guides based on query & category
  const filteredGuides = useMemo(() => {
    return GUIDES.filter(guide => {
      const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        guide.title.toLowerCase().includes(q) ||
        guide.summary.toLowerCase().includes(q) ||
        guide.steps.some(step => step.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  // Filtered FAQs: category filter or query filter
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!searchQuery.trim()) return matchesCategory;

      const q = searchQuery.toLowerCase();
      const matchesQuery = item.q.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.checklist.some(c => c.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const selectedCategoryLabel = useMemo(() => {
    return CATEGORIES.find(c => c.id === selectedCategory)?.label || 'All Topics';
  }, [selectedCategory]);

  const handleShortcutClick = (shortcut: ShortcutCard) => {
    setPressedKey(shortcut.key);
    setTimeout(() => {
      setPressedKey(null);
      if (shortcut.route) {
        navigate(shortcut.route);
      }
    }, 200);
  };

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark transition-colors duration-150">
      {/* ── Subdued Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 border-b border-border-light dark:border-border-dark bg-surface-light/90 dark:bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-stone-100 dark:hover:bg-[#18181c] transition-all active:scale-95"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-stone-200/60 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 rounded border border-stone-300 dark:border-zinc-700">D</kbd>
            </button>
            <div className="h-4 w-px bg-border-light dark:bg-border-dark" />
            <div className="flex items-center gap-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
              <span>Docs</span>
              <span>/</span>
              <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">Help & Workflows</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/feedback')}
              className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Send Feedback</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* ── Hero & Search Console (Double-Bezel Architecture) ── */}
        <section>
          <div className="rounded-[2rem] p-1.5 border border-border-light dark:border-border-dark bg-stone-100/80 dark:bg-[#121214] shadow-sm">
            <div className="rounded-[calc(2rem-0.375rem)] p-8 sm:p-12 bg-white dark:bg-[#09090b] border border-stone-200/50 dark:border-[#27272a]/60">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700/60 text-[11px] font-bold tracking-wider uppercase text-stone-600 dark:text-zinc-300 mb-4">
                  <BookOpen size={12} className="text-primary" />
                  <span>Relearn.ai Manual & Workflows</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary-light dark:text-text-primary-dark mb-3">
                  How can we help you learn?
                </h1>
                <p className="text-sm sm:text-base text-text-secondary-light dark:text-text-secondary-dark leading-relaxed mb-8">
                  Actionable guides, sandboxed code execution instructions, language curation details, and keyboard navigation.
                </p>

                {/* Instant Search Bar */}
                <div className="relative group max-w-2xl">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search guides, errors, shortcuts, or workflows..."
                    className="w-full pl-11 pr-24 py-3.5 rounded-xl bg-stone-50 dark:bg-[#121214] border border-stone-200 dark:border-[#27272a] text-text-primary-light dark:text-text-primary-dark placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                    <kbd className="px-2 py-1 text-[10px] font-mono font-bold bg-white dark:bg-zinc-800 text-stone-500 dark:text-zinc-400 rounded border border-stone-200 dark:border-zinc-700 shadow-sm">Ctrl+K</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ONE LIVE THING: Interactive Shortcut Terminal ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard size={18} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary-light dark:text-text-primary-dark">
                Live Keyboard Command Console
              </h2>
            </div>
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark hidden sm:inline">
              Press any highlighted key on your physical keyboard to test
            </span>
          </div>

          <div className="rounded-[1.75rem] p-1.5 border border-border-light dark:border-border-dark bg-stone-100/70 dark:bg-[#121214]">
            <div className="rounded-[calc(1.75rem-0.375rem)] p-6 bg-white dark:bg-[#09090b] border border-stone-200/50 dark:border-[#27272a]/60">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {SHORTCUT_LIST.map((shortcut) => {
                  const isCurrentlyActive = pressedKey?.toLowerCase() === shortcut.key.toLowerCase();

                  return (
                    <button
                      key={shortcut.key}
                      onClick={() => handleShortcutClick(shortcut)}
                      className={`group p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between h-28 relative select-none ${
                        isCurrentlyActive
                          ? 'bg-primary/10 border-primary shadow-md scale-95 ring-2 ring-primary/40'
                          : 'bg-stone-50/80 dark:bg-[#121214] border-stone-200 dark:border-[#27272a] hover:border-primary/50 hover:bg-stone-100/80 dark:hover:bg-[#18181c]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <kbd
                          className={`px-2 py-1 rounded text-xs font-mono font-bold border transition-colors shadow-sm ${
                            isCurrentlyActive
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 border-stone-300 dark:border-zinc-700 group-hover:border-primary/50'
                          }`}
                        >
                          {shortcut.displayKey}
                        </kbd>
                        {shortcut.route && (
                          <ExternalLink size={12} className="text-stone-400 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark leading-tight">
                          {shortcut.label}
                        </p>
                        <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark line-clamp-1 mt-0.5">
                          {shortcut.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 dark:border-[#27272a] flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                <div className="flex items-center gap-2">
                  <Laptop size={14} className="text-stone-400" />
                  <span>Universal shortcut handling: active globally across all views unless typing in an editor or input.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-primary">Mac: ⌘ key</span>
                  <span className="font-mono text-[11px] text-primary">Windows/Linux: Ctrl key</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Category Filter Pills ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
              {CATEGORIES.map((cat) => {
                const IconComp = cat.icon;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all active:scale-95 border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface-light dark:bg-[#121214] text-text-secondary-light dark:text-text-secondary-dark border-border-light dark:border-border-dark hover:bg-stone-100 dark:hover:bg-[#18181c] hover:text-text-primary-light dark:hover:text-text-primary-dark'
                    }`}
                  >
                    <IconComp size={14} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {(selectedCategory !== 'all' || searchQuery.trim()) && (
              <button
                onClick={handleClearFilters}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark text-xs text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-stone-100 dark:hover:bg-[#18181c] shrink-0"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* ── Actionable Technical Guides (Double-Bezel Bento Grid) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGuides.map((guide) => {
              const isExpanded = expandedGuideId === guide.id;

              return (
                <div
                  key={guide.id}
                  className={`rounded-[1.75rem] p-1.5 border transition-all duration-200 ${
                    isExpanded
                      ? 'border-primary/40 bg-primary/5 dark:bg-primary/[0.03] shadow-md md:col-span-2'
                      : 'border-border-light dark:border-border-dark bg-stone-100/50 dark:bg-[#121214]'
                  }`}
                >
                  <div className="rounded-[calc(1.75rem-0.375rem)] p-6 bg-white dark:bg-[#09090b] border border-stone-200/50 dark:border-[#27272a]/60 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
                          {guide.badge}
                        </span>
                        {guide.actionRoute && (
                          <button
                            onClick={() => navigate(guide.actionRoute!)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <span>{guide.actionLabel}</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed mb-4">
                        {guide.summary}
                      </p>

                      {/* Expandable Step-by-Step Resolution */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 border-t border-stone-100 dark:border-[#27272a] space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                                Step-by-Step Procedure:
                              </h4>
                              <ol className="space-y-2">
                                {guide.steps.map((step, idx) => (
                                  <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                                    <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-zinc-800 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 border border-stone-200 dark:border-zinc-700 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <span className="text-text-secondary-light dark:text-text-secondary-dark">
                                      {step}
                                    </span>
                                  </li>
                                ))}
                              </ol>

                              {guide.tips && (
                                <div className="mt-4 p-3 rounded-xl bg-stone-50 dark:bg-[#121214] border border-stone-200/80 dark:border-[#27272a] text-xs text-text-secondary-light dark:text-text-secondary-dark flex items-start gap-2.5">
                                  <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                  <span><strong className="text-text-primary-light dark:text-text-primary-dark">Pro Tip:</strong> {guide.tips}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="pt-4 mt-2 border-t border-stone-100 dark:border-[#27272a] flex items-center justify-between">
                      <button
                        onClick={() => setExpandedGuideId(isExpanded ? null : guide.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
                      >
                        <span>{isExpanded ? 'Hide Steps' : 'View Detailed Guide'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <span className="text-[11px] text-stone-400 dark:text-zinc-600 font-mono">
                        {guide.steps.length} steps
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredGuides.length === 0 && (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border-light dark:border-border-dark bg-surface-light dark:bg-[#121214]">
              <Search size={28} className="mx-auto text-stone-400 mb-3" />
              <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
                No matching guides found for "{searchQuery || selectedCategoryLabel}"
              </p>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-4">
                Try searching for "code", "language", "PDF", "shortcuts", or "study rooms".
              </p>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                Clear Filters & Show All
              </button>
            </div>
          )}
        </section>

        {/* ── Frequently Addressed Troubleshooting (Spacious Double-Bezel Card) ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle size={18} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary-light dark:text-text-primary-dark">
                Common Questions & Quick Troubleshooting
              </h2>
            </div>
            {selectedCategory !== 'all' && (
              <span className="text-xs text-primary font-medium">
                Filtered: {selectedCategoryLabel}
              </span>
            )}
          </div>

          <div className="rounded-[1.75rem] p-1.5 border border-border-light dark:border-border-dark bg-stone-100/70 dark:bg-[#121214]">
            <div className="rounded-[calc(1.75rem-0.375rem)] divide-y divide-stone-100 dark:divide-[#27272a] bg-white dark:bg-[#09090b] border border-stone-200/50 dark:border-[#27272a]/60 overflow-hidden">
              {filteredFaqs.map((faq, index) => {
                const isOpen = expandedFaqIndex === index;

                return (
                  <div key={index} className="transition-colors">
                    {/* Generous row padding (py-5 px-6) for clean scannability */}
                    <button
                      onClick={() => setExpandedFaqIndex(isOpen ? null : index)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 hover:bg-stone-50/80 dark:hover:bg-white/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <div className="flex items-center gap-3.5 flex-1 pr-2">
                        <span className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-stone-200 dark:border-zinc-700">
                          Q{index + 1}
                        </span>
                        <span className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark leading-snug">
                          {faq.q}
                        </span>
                      </div>
                      <div className="shrink-0 p-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark space-y-4">
                            <p className="leading-relaxed text-sm text-text-secondary-light dark:text-text-secondary-dark">
                              {faq.answer}
                            </p>

                            <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#121214] border border-stone-200/70 dark:border-[#27272a] space-y-2.5">
                              {faq.checklist.map((item, cIdx) => (
                                <div key={cIdx} className="flex items-start gap-2.5">
                                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="leading-relaxed text-xs text-text-secondary-light dark:text-text-secondary-dark">{item}</span>
                                </div>
                              ))}
                            </div>

                            {faq.actionRoute && (
                              <div className="pt-1">
                                <button
                                  onClick={() => navigate(faq.actionRoute!)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                                >
                                  <span>{faq.actionText}</span>
                                  <ExternalLink size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {filteredFaqs.length === 0 && (
                <div className="p-8 text-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  <span>No specific questions matched this filter. </span>
                  <button onClick={handleClearFilters} className="text-primary font-bold hover:underline ml-1">
                    Show all questions
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── High-Agency Support & Resolution Footer ── */}
        <section>
          <div className="rounded-[2rem] p-1.5 border border-border-light dark:border-border-dark bg-stone-100/80 dark:bg-[#121214]">
            <div className="rounded-[calc(2rem-0.375rem)] p-8 sm:p-10 bg-white dark:bg-[#09090b] border border-stone-200/50 dark:border-[#27272a]/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-lg">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <MessageSquare size={13} />
                  <span>Student Support & Community</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                  Need direct assistance with your study plan?
                </h3>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                  Submit feedback, report broken video tutorials, or join live student study rooms for real-time collaboration.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => navigate('/feedback')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all text-center"
                >
                  Submit Feedback
                </button>
                <button
                  onClick={() => navigate('/rooms')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-[#121214] text-text-primary-light dark:text-text-primary-dark font-semibold text-xs hover:bg-stone-100 dark:hover:bg-[#18181c] active:scale-95 transition-all text-center"
                >
                  Join Study Rooms
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HelpCenter;
