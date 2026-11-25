import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  Code2,
  Cpu,
  FolderGit2,
  Layers,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export type ComingSoonFeature = 'projects' | 'playground';

interface CapabilityItem {
  id: string;
  label: string;
  title: string;
  description: string;
  spec: string;
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
}

interface FeatureConfig {
  badge: string;
  routeTag: string;
  title: string;
  subtitle: string;
  storageKey: string;
  headerIcon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
  capabilities: CapabilityItem[];
}

const COMING_SOON_CONFIG: Record<ComingSoonFeature, FeatureConfig> = {
  projects: {
    badge: 'Coming Soon · Engineering Labs',
    routeTag: '/projects',
    title: 'Projects & Engineering Labs',
    subtitle:
      'Guided multi-file builds, automated milestone checks, and isolated project workspaces are currently in active development.',
    storageKey: 'relearn_notify_projects',
    headerIcon: FolderGit2,
    capabilities: [
      {
        id: 'blueprints',
        label: 'Blueprints',
        title: 'Curriculum-Linked Project Specs',
        description:
          'Generate structured engineering briefs tailored to your active learning plan, current skill tier, and target tech stack.',
        spec: 'Spec Engine · Plan-Aware Scaffolding',
        icon: Layers,
      },
      {
        id: 'workspace',
        label: 'Workspace',
        title: 'Multi-File Project Environment',
        description:
          'Navigate real folder hierarchies, edit starter templates, and persist your project state across study sessions.',
        spec: 'File Tree · Persistent State',
        icon: Code2,
      },
      {
        id: 'verification',
        label: 'Checks',
        title: 'Automated Milestone Verification',
        description:
          'Run milestone-by-milestone static validation and receive targeted architectural feedback before marking tasks complete.',
        spec: 'Validation · Stepwise Feedback',
        icon: ShieldCheck,
      },
    ],
  },
  playground: {
    badge: 'Coming Soon · Execution Sandbox',
    routeTag: '/playground',
    title: 'Interactive Code Playground',
    subtitle:
      'Multi-language container execution, real-time standard input streaming, and shareable scratchpads are being finalized.',
    storageKey: 'relearn_notify_playground',
    headerIcon: Terminal,
    capabilities: [
      {
        id: 'runtimes',
        label: 'Runtimes',
        title: 'Isolated Multi-Language Containers',
        description:
          'Compile and execute code across Python, C, C++, C#, Java, JavaScript, TypeScript, and Go in sandboxed containers.',
        spec: 'Runtime · Containerized Execution',
        icon: Cpu,
      },
      {
        id: 'io',
        label: 'I/O Stream',
        title: 'Interactive Stdin & Diagnostics',
        description:
          'Pipe custom standard input, inspect exit codes, and review structured compiler diagnostics with execution timing.',
        spec: 'Console · Stdin / Stdout Piping',
        icon: Terminal,
      },
      {
        id: 'sync',
        label: 'Snapshots',
        title: 'Diary & Notes Integration',
        description:
          'Capture working snippets from your scratchpad directly into your Learning Diary or active topic notes.',
        spec: 'Sync · Learning Diary Export',
        icon: Layers,
      },
    ],
  },
};

interface ComingSoonOverlayProps {
  feature: ComingSoonFeature;
}

export const ComingSoonOverlay: React.FC<ComingSoonOverlayProps> = ({ feature }) => {
  const navigate = useNavigate();
  const config = COMING_SOON_CONFIG[feature];
  const HeaderIcon = config.headerIcon;

  const [activeTabId, setActiveTabId] = useState<string>(config.capabilities[0].id);
  const [isNotified, setIsNotified] = useState<boolean>(() => {
    try {
      return localStorage.getItem(config.storageKey) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setActiveTabId(config.capabilities[0].id);
    try {
      setIsNotified(localStorage.getItem(config.storageKey) === 'true');
    } catch {
      setIsNotified(false);
    }
  }, [feature, config.capabilities, config.storageKey]);

  const activeCapability =
    config.capabilities.find((item) => item.id === activeTabId) ?? config.capabilities[0];
  const CapabilityIcon = activeCapability.icon;

  const handleToggleNotify = () => {
    triggerHaptic(isNotified ? 'light' : 'medium');
    const next = !isNotified;
    setIsNotified(next);
    try {
      localStorage.setItem(config.storageKey, String(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleReturnDashboard = () => {
    triggerHaptic('light');
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    triggerHaptic('light');
    navigate(-1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`coming-soon-title-${feature}`}
      className="fixed inset-x-0 top-0 bottom-20 md:bottom-0 md:left-[var(--sidebar-width,0px)] z-40 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-[#f8f9fa]/80 dark:bg-[#09090b]/85 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-2xl my-auto"
      >
        {/* Double-Bezel Outer Shell */}
        <div className="rounded-[2rem] p-1.5 bg-zinc-200/80 dark:bg-white/[0.04] ring-1 ring-black/5 dark:ring-white/10 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.16)] dark:shadow-[0_24px_80px_-16px_rgba(0,0,0,0.85)]">
          {/* Double-Bezel Inner Core */}
          <div className="rounded-[calc(2rem-0.375rem)] bg-white dark:bg-[#121214] border border-zinc-200/80 dark:border-[#27272a] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] p-6 sm:p-8 md:p-10">
            {/* Top Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-[#27272a]">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] font-semibold text-zinc-700 dark:text-zinc-300">
                  {config.badge}
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all duration-150 active:scale-[0.98]"
              >
                <ArrowLeft size={14} strokeWidth={1.75} />
                <span>Go Back</span>
              </button>
            </div>

            {/* Hero Header */}
            <div className="flex items-start gap-4 mb-7">
              <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-[#27272a] items-center justify-center text-zinc-900 dark:text-zinc-100">
                <HeaderIcon size={22} strokeWidth={1.6} />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                  {config.routeTag}
                </div>
                <h1
                  id={`coming-soon-title-${feature}`}
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.15]"
                >
                  {config.title}
                </h1>
                <p className="text-sm sm:text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-xl">
                  {config.subtitle}
                </p>
              </div>
            </div>

            {/* Interactive Capability Preview (One Live Thing) */}
            <div className="rounded-2xl bg-zinc-50 dark:bg-[#09090b] border border-zinc-200/90 dark:border-[#27272a] p-4 sm:p-5 mb-7">
              <div
                role="tablist"
                aria-label="Upcoming module capabilities"
                className="flex flex-wrap items-center gap-1.5 mb-4"
              >
                {config.capabilities.map((cap) => {
                  const isActive = cap.id === activeCapability.id;
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveTabId(cap.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                        isActive
                          ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70'
                      }`}
                    >
                      {cap.label}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCapability.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  className="flex items-start gap-3.5"
                >
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-white dark:bg-[#121214] border border-zinc-200 dark:border-[#27272a] flex items-center justify-center text-zinc-700 dark:text-zinc-300 mt-0.5">
                    <CapabilityIcon size={17} strokeWidth={1.6} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {activeCapability.title}
                    </h2>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {activeCapability.description}
                    </p>
                    <div className="pt-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-500">
                      {activeCapability.spec}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Tactile Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReturnDashboard}
                className="group inline-flex items-center justify-between sm:justify-center gap-3 pl-5 pr-2 py-2 rounded-full bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-sm font-semibold transition-all duration-150 hover:bg-zinc-800 dark:hover:bg-white active:scale-[0.98]"
              >
                <span>Return to Dashboard</span>
                <span className="w-8 h-8 rounded-full bg-white/15 dark:bg-black/10 flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight size={15} strokeWidth={2} />
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleNotify}
                aria-pressed={isNotified}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold border transition-all duration-150 active:scale-[0.98] ${
                  isNotified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-[#27272a] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800'
                }`}
              >
                {isNotified ? (
                  <>
                    <Check size={15} strokeWidth={2.2} />
                    <span>Launch Alert Saved</span>
                  </>
                ) : (
                  <>
                    <Bell size={15} strokeWidth={1.75} />
                    <span>Notify Me When Live</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ComingSoonOverlay;
