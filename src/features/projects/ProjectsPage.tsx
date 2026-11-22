import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderGit2, 
  Terminal, 
  Sparkles, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Plus, 
  RefreshCw, 
  Code2, 
  BookOpen,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { 
  getUserProjects, 
  calculateProjectStats, 
  seedInitialProjectsIfEmpty, 
  generateProjectFromPlan,
  ProjectOverviewStats 
} from '../../services/api/projectService';
import { ProjectLab } from '../../services/ai/projectLabService';
import { triggerHaptic } from '../../utils/haptics';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans } = useData();

  const [projects, setProjects] = useState<ProjectLab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Load user projects and seed from active plans if needed
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        let loaded = await getUserProjects(user.id);
        if (loaded.length === 0) {
          loaded = await seedInitialProjectsIfEmpty(user.id, plans);
        }
        if (isMounted) {
          setProjects(loaded);
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
  }, [user?.id, plans]);

  // Real live statistics derived from projects array
  const stats: ProjectOverviewStats = useMemo(() => {
    return calculateProjectStats(projects);
  }, [projects]);

  // Extract unique technologies for filter
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

  // Filtered projects
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
        const matchTagline = project.tagline.toLowerCase().includes(q);
        const matchTopic = project.topic.toLowerCase().includes(q);
        const matchPlan = (project.planTitle || '').toLowerCase().includes(q);
        if (!matchTitle && !matchTagline && !matchTopic && !matchPlan) return false;
      }

      return true;
    });
  }, [projects, statusFilter, selectedTech, searchQuery]);

  // Handler to generate a new project from a selected plan
  const handleGenerateProject = async () => {
    if (!user?.id || !selectedPlanId) return;
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setIsGenerating(true);
    setGenerationError(null);
    try {
      triggerHaptic('medium');
      const newProject = await generateProjectFromPlan(user.id, plan);
      setProjects(prev => [newProject, ...prev]);
      setShowPlanPicker(false);
      setSelectedPlanId('');
      navigate(`/projects/${newProject.id}`);
    } catch (err: any) {
      console.error('Failed to generate project:', err);
      setGenerationError(err?.message || 'Could not generate project lab. Please try again.');
    } finally {
      setIsGenerating(false);
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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
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
            Translate conceptual learning into production-grade systems. Complete milestones, implement technology-specific toolchains, and receive rigorous AI code reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowPlanPicker(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>New Project from Plan</span>
          </button>
        </div>
      </div>

      {/* Real Statistics Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
            <span>Total Projects</span>
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

        {/* Technology dropdown if techs available */}
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

      {/* Projects Collection Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 animate-pulse space-y-4">
              <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded" />
              <div className="h-6 w-3/4 bg-stone-200 dark:bg-stone-800 rounded" />
              <div className="h-16 w-full bg-stone-200 dark:bg-stone-800 rounded" />
              <div className="h-8 w-full bg-stone-200 dark:bg-stone-800 rounded" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FolderGit2 size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              No projects found
            </h3>
            <p className="text-sm text-stone-500 max-w-md mx-auto mt-1">
              {searchQuery || statusFilter !== 'all' || selectedTech !== 'all'
                ? 'Try clearing your filters or search query to find your project.'
                : 'Create your first hands-on engineering lab from one of your active learning plans.'}
            </p>
          </div>
          {plans.length > 0 && (
            <button
              onClick={() => setShowPlanPicker(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow hover:bg-primary-dark transition-all"
            >
              <Plus size={16} />
              <span>Generate Project from Plan</span>
            </button>
          )}
        </div>
      ) : (
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
                onClick={() => {
                  triggerHaptic('light');
                  navigate(`/projects/${project.id}`);
                }}
                className="cursor-pointer group flex flex-col justify-between bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${getTechBadgeColor(project.technology)}`}>
                      {project.technology || 'General'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDifficultyBadge(project.difficulty)}`}>
                      {project.difficulty}
                    </span>
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
                    <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 group-hover:text-primary transition-colors line-clamp-1">
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

                {/* Bottom Progress & Action */}
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

                    <span className="flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                      Open Workspace
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Plan Picker Modal to Generate New Project */}
      <AnimatePresence>
        {showPlanPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
                    Generate Project from Learning Plan
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Select one of your active learning plans to synthesize a production-grade project with language-specific toolchains and milestones.
                  </p>
                </div>
                <button
                  onClick={() => setShowPlanPicker(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {generationError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {plans.length === 0 ? (
                  <div className="text-center py-6 text-xs text-stone-500">
                    No active learning plans found. Create a plan first to generate corresponding projects.
                  </div>
                ) : (
                  plans.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        selectedPlanId === plan.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                          {plan.subject}
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                          <span>{plan.difficulty || 'Intermediate'}</span>
                          <span>•</span>
                          <span>{plan.totalDays} Days</span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedPlanId === plan.id
                          ? 'border-primary bg-primary text-white'
                          : 'border-stone-300 dark:border-stone-700'
                      }`}>
                        {selectedPlanId === plan.id && <CheckCircle2 size={12} />}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowPlanPicker(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateProject}
                  disabled={!selectedPlanId || isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Synthesizing Project...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Generate Project</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectsPage;
