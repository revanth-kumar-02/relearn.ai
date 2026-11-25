import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderGit2, 
  Terminal, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Plus, 
  RefreshCw, 
  Code2, 
  BookOpen,
  ChevronRight, 
  TrendingUp,
  AlertCircle,
  Trash2,
  Cpu,
  X,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { 
  getUserProjects, 
  calculateProjectStats, 
  purgeLegacyMockProjects, 
  launchProjectFromBlueprint,
  deleteProject,
  ProjectOverviewStats 
} from '../../services/api/projectService';
import { 
  ProjectBlueprint, 
  ProjectDifficultyTier,
  getTierBlueprintsForPlan,
  getAllTiersBlueprintsForPlan
} from '../../services/ai/projectBlueprintService';
import { ProjectLab } from '../../services/ai/projectLabService';
import { triggerHaptic } from '../../utils/haptics';
import { Plan } from '../../types';
import ComingSoonOverlay from '../../components/common/ComingSoonOverlay';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans } = useData();

  const [projects, setProjects] = useState<ProjectLab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');
  const [selectedTech, setSelectedTech] = useState<string>('all');

  // Blueprint Catalog State
  const [activePlanId, setActivePlanId] = useState<string>('');
  const [blueprints, setBlueprints] = useState<ProjectBlueprint[]>([]);
  const [isLoadingBlueprints, setIsLoadingBlueprints] = useState(false);
  const [blueprintDifficulty, setBlueprintDifficulty] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [tierCache, setTierCache] = useState<Record<string, Partial<Record<'Beginner' | 'Intermediate' | 'Advanced', ProjectBlueprint[]>>>>({});
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [isLaunchingId, setIsLaunchingId] = useState<string | null>(null);

  // Project Deletion State
  const [projectToDelete, setProjectToDelete] = useState<ProjectLab | null>(null);

  // Initialize and load user projects with automatic mock purge
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        // Purge any legacy mock records from localStorage
        const cleaned = await purgeLegacyMockProjects(user.id);
        if (isMounted) {
          setProjects(cleaned);
        }
      } catch (err) {
        console.error('Failed to load user projects:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Set default active plan for blueprint catalog
  useEffect(() => {
    if (plans.length > 0 && !activePlanId) {
      setActivePlanId(plans[0].id);
    }
  }, [plans, activePlanId]);

  // Selected plan object
  const activePlan: Plan | undefined = useMemo(() => {
    return plans.find(p => p.id === activePlanId) || plans[0];
  }, [plans, activePlanId]);

  // Fetch blueprints for the active plan and difficulty tier
  useEffect(() => {
    let isMounted = true;

    async function loadBlueprintsForSelection() {
      if (!activePlan?.id) return;

      const planCache = tierCache[activePlan.id] || {};

      if (blueprintDifficulty === 'All') {
        // If all 3 tiers already exist in cache, combine them with 0 latency
        if (planCache.Beginner && planCache.Intermediate && planCache.Advanced) {
          setBlueprints([...planCache.Beginner, ...planCache.Intermediate, ...planCache.Advanced]);
          return;
        }

        setIsLoadingBlueprints(true);
        try {
          const { beginner, intermediate, advanced, all } = await getAllTiersBlueprintsForPlan(activePlan);
          if (isMounted) {
            setTierCache(prev => ({
              ...prev,
              [activePlan.id]: {
                ...prev[activePlan.id],
                Beginner: beginner,
                Intermediate: intermediate,
                Advanced: advanced,
              }
            }));
            setBlueprints(all);
          }
        } catch (err) {
          console.error('Failed to load all 30 tier blueprints:', err);
        } finally {
          if (isMounted) setIsLoadingBlueprints(false);
        }
      } else {
        // Single tier selected ('Beginner' | 'Intermediate' | 'Advanced')
        const cachedTier = planCache[blueprintDifficulty];
        if (cachedTier && cachedTier.length > 0) {
          setBlueprints(cachedTier);
          return;
        }

        setIsLoadingBlueprints(true);
        try {
          const freshTier = await getTierBlueprintsForPlan(activePlan, blueprintDifficulty);
          if (isMounted) {
            setTierCache(prev => ({
              ...prev,
              [activePlan.id]: {
                ...prev[activePlan.id],
                [blueprintDifficulty]: freshTier,
              }
            }));
            setBlueprints(freshTier);
          }
        } catch (err) {
          console.error(`Failed to load ${blueprintDifficulty} blueprints:`, err);
        } finally {
          if (isMounted) setIsLoadingBlueprints(false);
        }
      }
    }

    loadBlueprintsForSelection();

    return () => {
      isMounted = false;
    };
  }, [activePlan?.id, blueprintDifficulty]);

  // Derived real live statistics from genuine projects array
  const stats: ProjectOverviewStats = useMemo(() => {
    return calculateProjectStats(projects);
  }, [projects]);

  // Extract unique technologies for filter dropdown
  const allTechs = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => {
      if (p.technology) set.add(p.technology);
      p.techStack?.forEach(t => {
        const clean = t.split(' ')[0].replace(/[^a-zA-Z]/g, '');
        if (clean) set.add(clean);
      });
    });
    return Array.from(set);
  }, [projects]);

  // Filtered active projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Status filter
      if (statusFilter !== 'all') {
        const status = project.status || 'not_started';
        if (statusFilter === 'in_progress' && status !== 'in_progress') return false;
        if (statusFilter === 'completed' && status !== 'completed') return false;
        if (statusFilter === 'not_started' && status !== 'not_started') return false;
      }

      // Tech filter
      if (selectedTech !== 'all') {
        const matchTech = (project.technology || '').toLowerCase().includes(selectedTech.toLowerCase());
        const matchStack = project.techStack?.some(t => t.toLowerCase().includes(selectedTech.toLowerCase()));
        if (!matchTech && !matchStack) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = project.title.toLowerCase().includes(q);
        const matchTagline = project.tagline?.toLowerCase().includes(q);
        const matchTopic = project.topic.toLowerCase().includes(q);
        const matchPlan = (project.planTitle || '').toLowerCase().includes(q);
        if (!matchTitle && !matchTagline && !matchTopic && !matchPlan) return false;
      }

      return true;
    });
  }, [projects, statusFilter, selectedTech, searchQuery]);

  // Filtered 10-Project Blueprints
  const filteredBlueprints = useMemo(() => {
    return blueprints.filter(bp => {
      if (blueprintDifficulty !== 'All' && bp.difficulty !== blueprintDifficulty) {
        return false;
      }
      return true;
    });
  }, [blueprints, blueprintDifficulty]);

  // Handler: Launch Lab from Blueprint
  const handleLaunchBlueprint = async (blueprint: ProjectBlueprint) => {
    if (!user?.id || !activePlan) return;
    triggerHaptic('medium');
    setIsLaunchingId(blueprint.id);
    try {
      const newLab = await launchProjectFromBlueprint(user.id, blueprint, activePlan);
      setProjects(prev => [newLab, ...prev]);
      setShowCatalogModal(false);
      navigate(`/projects/${newLab.id}`);
    } catch (err) {
      console.error('Failed to launch project blueprint:', err);
    } finally {
      setIsLaunchingId(null);
    }
  };

  // Handler: Regenerate fresh blueprints with the LLM for current tier or all tiers
  const handleRegenerateBlueprints = async () => {
    if (!activePlan) return;
    triggerHaptic('medium');
    setIsLoadingBlueprints(true);
    try {
      if (blueprintDifficulty === 'All') {
        const { beginner, intermediate, advanced, all } = await getAllTiersBlueprintsForPlan(activePlan, true);
        setTierCache(prev => ({
          ...prev,
          [activePlan.id]: {
            Beginner: beginner,
            Intermediate: intermediate,
            Advanced: advanced,
          }
        }));
        setBlueprints(all);
      } else {
        const fresh = await getTierBlueprintsForPlan(activePlan, blueprintDifficulty, true);
        setTierCache(prev => ({
          ...prev,
          [activePlan.id]: {
            ...prev[activePlan.id],
            [blueprintDifficulty]: fresh,
          }
        }));
        setBlueprints(fresh);
      }
    } catch (err) {
      console.error('Failed to regenerate project blueprints:', err);
    } finally {
      setIsLoadingBlueprints(false);
    }
  };

  // Handler: Delete Project
  const handleConfirmDelete = async () => {
    if (!user?.id || !projectToDelete) return;
    triggerHaptic('light');
    try {
      await deleteProject(user.id, projectToDelete.id);
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const getTechBadgeColor = (tech?: string) => {
    const t = (tech || '').toLowerCase();
    if (t.includes('rust')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    if (t.includes('flutter') || t.includes('dart')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
    if (t.includes('python')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (t.includes('react') || t.includes('typescript') || t.includes('javascript')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    return 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20';
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Beginner':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Advanced':
        return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
  };

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none select-none min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Practical Engineering
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              Autonomous Project Labs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Projects & Engineering Labs
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-2xl">
            Choose a production-grade project blueprint from your learning paths. Scaffold multi-file architectures, complete milestones, and receive rigorous AI code reviews.
          </p>
        </div>

        {/* Header Action Button (when projects already exist) */}
        {projects.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowCatalogModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Browse 30-Project Catalog</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACTIVE PROJECTS VIEW (When user has 1+ projects)
      ───────────────────────────────────────────────────────────── */}
      {projects.length > 0 && (
        <>
          {/* Live Statistics Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
                <span>Active Projects</span>
                <FolderGit2 size={16} className="text-primary" />
              </div>
              <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-2">
                {stats.total}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Persisted in workspace</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
                <span>In Progress</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {stats.active}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Active milestones</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
                <span>Completed</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {stats.completed}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Verified implementations</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
                <span>Pending</span>
                <Layers size={16} className="text-stone-400" />
              </div>
              <div className="text-2xl font-black text-stone-700 dark:text-stone-300 mt-2">
                {stats.notStarted}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Ready to begin</div>
            </div>

            <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
                <span>Average Progress</span>
                <TrendingUp size={16} className="text-primary" />
              </div>
              <div className="text-2xl font-black text-primary mt-2">
                {stats.averageProgress}%
              </div>
              <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.averageProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search projects, technologies, or learning plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-primary text-stone-900 dark:text-stone-100"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(['all', 'in_progress', 'completed', 'not_started'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    triggerHaptic('light');
                    setStatusFilter(tab);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {tab === 'all' && 'All Projects'}
                  {tab === 'in_progress' && 'In Progress'}
                  {tab === 'completed' && 'Completed'}
                  {tab === 'not_started' && 'Not Started'}
                </button>
              ))}
            </div>

            {/* Technology dropdown */}
            {allTechs.length > 0 && (
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="text-xs font-semibold bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-stone-700 dark:text-stone-300 focus:outline-none focus:border-primary"
              >
                <option value="all">All Techs</option>
                {allTechs.map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
              </select>
            )}
          </div>

          {/* Active Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const completedMilestones = project.milestones.filter(m => m.completed).length;
              const totalMilestones = project.milestones.length;
              const progress = project.progress ?? (totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0);
              const status = project.status || (progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started');

              return (
                <motion.div
                  key={project.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="group flex flex-col justify-between bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all relative"
                >
                  <div className="space-y-3">
                    {/* Top Badges & Delete Action */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${getTechBadgeColor(project.technology)}`}>
                          {project.technology || 'General'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDifficultyBadge(project.difficulty)}`}>
                          {project.difficulty}
                        </span>
                      </div>

                      {/* Discrete Delete Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setProjectToDelete(project);
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100"
                        title="Delete Project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Plan Origin */}
                    {project.planTitle && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                        <BookOpen size={13} className="text-stone-400 shrink-0" />
                        <span className="truncate">{project.planTitle}</span>
                      </div>
                    )}

                    {/* Title & Tagline */}
                    <div>
                      <h3 
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                      >
                        {project.title}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                        {project.tagline || project.realWorldScenario}
                      </p>
                    </div>

                    {/* Tech stack tags */}
                    {project.techStack && project.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {project.techStack.slice(0, 3).map((tech, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {tech}
                          </span>
                        ))}
                        {project.techStack.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md text-stone-400">
                            +{project.techStack.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Progress & Open Workspace Link */}
                  <div className="pt-6 border-t border-stone-100 dark:border-stone-800/80 mt-6 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-500">
                        {completedMilestones} / {totalMilestones} Milestones
                      </span>
                      <span className="font-black text-stone-900 dark:text-stone-100">
                        {progress}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Action Link */}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${
                        status === 'completed'
                          ? 'text-emerald-500'
                          : status === 'in_progress'
                          ? 'text-amber-500'
                          : 'text-stone-400'
                      }`}>
                        {status === 'completed' && '● Completed'}
                        {status === 'in_progress' && '● In Progress'}
                        {status === 'not_started' && '○ Not Started'}
                      </span>

                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          navigate(`/projects/${project.id}`);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform"
                      >
                        Open IDE Studio
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          30-PROJECT SELECTION MATRIX (Empty State / Primary Catalog)
          Shown directly on the page when user has 0 active projects!
      ───────────────────────────────────────────────────────────── */}
      {projects.length === 0 && !isLoading && (
        <div className="space-y-6">
          {/* High-Craft Header & Plan Selector Pills */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Select Your Project Lab
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight mt-1">
                30 Real-World Engineering Blueprints
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
                10 Beginner · 10 Intermediate · 10 Hard — dynamically architected by AI for your curriculum with runnable files, milestones, and rigorous verification.
              </p>
            </div>

            {/* Active Plan Selector Ribbon (Clean row, no overlap) */}
            {plans.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800/80">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Active Learning Path:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {plans.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setActivePlanId(p.id);
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        activePlanId === p.id
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      <BookOpen size={14} className="shrink-0" />
                      <span className="max-w-[240px] truncate">{p.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono shrink-0">
                        30
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty Filter Chips & Live AI Regenerate Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-800 pt-4">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {[
                  { key: 'Beginner', label: 'Beginner (10)' },
                  { key: 'Intermediate', label: 'Intermediate (10)' },
                  { key: 'Advanced', label: 'Hard (10)' },
                  { key: 'All', label: 'All (30)' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => {
                      triggerHaptic('light');
                      setBlueprintDifficulty(item.key as any);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      blueprintDifficulty === item.key
                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* ✨ LIVE AI GENERATE FRESH PROJECTS BUTTON */}
              <button
                onClick={handleRegenerateBlueprints}
                disabled={isLoadingBlueprints}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
                title="Ask the AI to generate a brand new set of unique engineering projects"
              >
                <Sparkles size={14} className={isLoadingBlueprints ? 'animate-spin' : ''} />
                <span>
                  {isLoadingBlueprints
                    ? 'AI is Architecting...'
                    : blueprintDifficulty === 'Beginner'
                    ? 'Generate 10 Fresh Beginner Projects with AI'
                    : blueprintDifficulty === 'Intermediate'
                    ? 'Generate 10 Fresh Intermediate Projects with AI'
                    : blueprintDifficulty === 'Advanced'
                    ? 'Generate 10 Fresh Hard Projects with AI'
                    : 'Generate 30 Fresh Projects with AI'}
                </span>
              </button>
            </div>
          </div>

          {/* Subtext info bar */}
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
            <span>
              {blueprintDifficulty === 'Beginner' && 'Showing 10 Beginner engineering blueprints'}
              {blueprintDifficulty === 'Intermediate' && 'Showing 10 Intermediate engineering blueprints'}
              {blueprintDifficulty === 'Advanced' && 'Showing 10 Hard / Advanced engineering blueprints'}
              {blueprintDifficulty === 'All' && 'Showing all 30 engineering blueprints across 3 difficulty tiers'}
            </span>
            <span className="font-mono text-[11px] text-stone-400">
              {filteredBlueprints.length} blueprints
            </span>
          </div>

          {/* 10-Project Grid */}
          {isLoadingBlueprints ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-primary text-xs font-bold animate-pulse">
                <Sparkles size={16} className="animate-spin" />
                <span>AI Architect is synthesizing 10 unique engineering projects for "{activePlan?.title || 'your plan'}"...</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-64 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 animate-pulse space-y-4">
                    <div className="h-4 w-28 bg-stone-200 dark:bg-stone-800 rounded" />
                    <div className="h-6 w-3/4 bg-stone-200 dark:bg-stone-800 rounded" />
                    <div className="h-16 w-full bg-stone-200 dark:bg-stone-800 rounded" />
                    <div className="h-8 w-full bg-stone-200 dark:bg-stone-800 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBlueprints.map((blueprint, idx) => {
                const isLaunching = isLaunchingId === blueprint.id;

                return (
                  <motion.div
                    key={blueprint.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col justify-between bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all space-y-5"
                  >
                    <div className="space-y-3">
                      {/* Top Meta Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                            {blueprint.domain}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDifficultyBadge(blueprint.difficulty)}`}>
                            {blueprint.difficulty}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-stone-400">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight leading-snug">
                          {blueprint.title}
                        </h3>
                        <p className="text-xs text-stone-600 dark:text-stone-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {blueprint.realWorldScenario}
                        </p>
                      </div>

                      {/* Tech Stack Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {blueprint.techStack.slice(0, 3).map((tech, tIdx) => (
                          <span key={tIdx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                            {tech}
                          </span>
                        ))}
                        {blueprint.techStack.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md text-stone-400">
                            +{blueprint.techStack.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action: Physical Launch Button */}
                    <div className="pt-4 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold">
                        <Clock size={13} className="text-stone-400" />
                        <span>~{blueprint.estimatedHours} hrs</span>
                      </div>

                      <button
                        onClick={() => handleLaunchBlueprint(blueprint)}
                        disabled={isLaunching}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isLaunching ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Synthesizing...</span>
                          </>
                        ) : (
                          <>
                            <Play size={13} />
                            <span>Select & Launch Lab</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          30-PROJECT CATALOG MODAL (When opened from "+ Browse Catalog")
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCatalogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-5xl w-full max-h-[88vh] overflow-y-auto shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-stone-900 dark:text-stone-100">
                    30-Project Blueprint Catalog
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    10 Beginner · 10 Intermediate · 10 Hard — select any project blueprint to scaffold its multi-file architecture and launch the in-browser IDE.
                  </p>
                </div>
                <button
                  onClick={() => setShowCatalogModal(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Plan Tabs inside modal */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {plans.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setActivePlanId(p.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      activePlanId === p.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span>{p.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">
                      30
                    </span>
                  </button>
                ))}
              </div>

              {/* Difficulty Tabs inside modal */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-stone-100 dark:border-stone-800">
                {[
                  { key: 'Beginner', label: 'Beginner (10)' },
                  { key: 'Intermediate', label: 'Intermediate (10)' },
                  { key: 'Advanced', label: 'Hard (10)' },
                  { key: 'All', label: 'All (30)' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => {
                      triggerHaptic('light');
                      setBlueprintDifficulty(item.key as any);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      blueprintDifficulty === item.key
                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Blueprint Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBlueprints.map(blueprint => (
                  <div
                    key={blueprint.id}
                    className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {blueprint.domain}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getDifficultyBadge(blueprint.difficulty)}`}>
                          {blueprint.difficulty}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-stone-900 dark:text-stone-100">
                        {blueprint.title}
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                        {blueprint.realWorldScenario}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
                      <span className="text-xs text-stone-500 font-semibold">
                        ~{blueprint.estimatedHours} hrs
                      </span>
                      <button
                        onClick={() => handleLaunchBlueprint(blueprint)}
                        disabled={isLaunchingId === blueprint.id}
                        className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                      >
                        {isLaunchingId === blueprint.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Play size={12} />
                        )}
                        <span>Launch Lab</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          CONFIRMATION MODAL: DELETE PROJECT
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                    Delete Project Lab?
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    This will remove the lab from your active workspace.
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-950 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800">
                Are you sure you want to delete <span className="font-bold text-stone-900 dark:text-stone-100">"{projectToDelete.title}"</span>? You can launch a fresh copy anytime from the 10-project catalog.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setProjectToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all"
                >
                  Delete Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
      <ComingSoonOverlay feature="projects" />
    </>
  );
};
export default ProjectsPage;
