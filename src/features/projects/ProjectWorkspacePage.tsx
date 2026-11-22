import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Copy, 
  Check, 
  Play, 
  Cpu, 
  Layers, 
  Clock, 
  Award, 
  AlertCircle, 
  BookOpen, 
  ChevronRight, 
  Code2, 
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  FileCode,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { 
  getProjectById, 
  saveProject, 
  updateMilestoneProgress 
} from '../../services/api/projectService';
import { 
  ProjectLab, 
  ProjectMilestone, 
  reviewProjectCode, 
  CodeReviewResult 
} from '../../services/ai/projectLabService';
import { triggerHaptic } from '../../utils/haptics';

export const ProjectWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { triggerXP } = useData();

  const [project, setProject] = useState<ProjectLab | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
  const [userCode, setUserCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSetup, setCopiedSetup] = useState(false);

  // AI Review state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Load project by ID
  useEffect(() => {
    let isMounted = true;
    async function loadProject() {
      if (!user?.id || !id) return;
      setIsLoading(true);
      try {
        const loaded = await getProjectById(user.id, id);
        if (isMounted) {
          setProject(loaded);
          if (loaded?.milestones?.[0]?.starterCode?.code) {
            setUserCode(loaded.milestones[0].starterCode.code);
          }
        }
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProject();
    return () => {
      isMounted = false;
    };
  }, [user?.id, id]);

  const activeMilestone: ProjectMilestone | undefined = useMemo(() => {
    if (!project?.milestones) return undefined;
    return project.milestones[activeMilestoneIndex] || project.milestones[0];
  }, [project, activeMilestoneIndex]);

  // When active milestone changes, populate starter code if user hasn't typed custom code
  useEffect(() => {
    if (activeMilestone?.starterCode?.code) {
      setUserCode(activeMilestone.starterCode.code);
      setReviewResult(null);
    }
  }, [activeMilestoneIndex]);

  // Toggle criteria checklist item
  const handleToggleCriterion = async (criterion: string) => {
    if (!user?.id || !project || !activeMilestone) return;
    triggerHaptic('light');

    const currentCompleted = activeMilestone.completedCriteria || {};
    const updatedCompleted = {
      ...currentCompleted,
      [criterion]: !currentCompleted[criterion],
    };

    // Check if all criteria are now met
    const allMet = activeMilestone.criteria.length > 0 &&
      activeMilestone.criteria.every(c => updatedCompleted[c]);

    const updatedProject = await updateMilestoneProgress(
      user.id,
      project.id,
      activeMilestone.id,
      allMet,
      updatedCompleted
    );

    if (updatedProject) {
      setProject({ ...updatedProject });
    }
  };

  // Submit code for AI review
  const handleReviewCode = async () => {
    if (!project || !activeMilestone) return;
    triggerHaptic('medium');
    setIsReviewing(true);
    setShowReviewModal(true);
    setReviewResult(null);

    try {
      const result = await reviewProjectCode({
        projectTitle: project.title,
        milestoneTitle: activeMilestone.title,
        code: userCode,
        criteria: activeMilestone.criteria,
        language: activeMilestone.starterCode.language,
      });
      setReviewResult(result);

      // If passing or outstanding, award XP and mark milestone as verified
      if (result.verdict === 'Pass' || result.verdict === 'Outstanding') {
        if (user?.id) {
          // Mark all criteria as completed
          const allCriteriaMap: Record<string, boolean> = {};
          activeMilestone.criteria.forEach(c => {
            allCriteriaMap[c] = true;
          });

          const updated = await updateMilestoneProgress(
            user.id,
            project.id,
            activeMilestone.id,
            true,
            allCriteriaMap
          );
          if (updated) {
            setProject({ ...updated });
          }
          if (result.xpEarned) {
            triggerXP(result.xpEarned);
          }
        }
      }
    } catch (err) {
      console.error('AI code review failed:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const copyToClipboard = (text: string, setFn: (val: boolean) => void) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12 px-4 max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4">
        <RefreshCw size={28} className="animate-spin text-primary" />
        <p className="text-sm text-stone-500 font-medium">Loading Project Workspace...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen py-12 px-4 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle size={40} className="text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Project Not Found</h2>
        <p className="text-sm text-stone-500">
          The requested engineering project could not be found or has not been initialized.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to Projects</span>
        </button>
      </div>
    );
  }

  const completedMilestones = project.milestones.filter(m => m.completed).length;
  const totalMilestones = project.milestones.length;
  const progressPercent = project.progress ?? (totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0);

  // Generate language-specific terminal setup commands
  const getToolchainSetup = () => {
    const tech = (project.technology || '').toLowerCase();
    if (tech.includes('rust')) {
      return {
        title: 'Rust Toolchain & Cargo Setup',
        command: `cargo new ${project.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_lab --bin\ncd ${project.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_lab\ncargo check\ncargo run`,
        note: 'Make sure you have Rust & Cargo installed (curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh).',
      };
    }
    if (tech.includes('flutter') || tech.includes('dart')) {
      return {
        title: 'Flutter SDK & Emulation Setup',
        command: `flutter create ${project.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_app\ncd ${project.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_app\nflutter pub get\nflutter run`,
        note: 'Requires Flutter 3.x+ and Android Studio/VS Code with Dart & Flutter extensions.',
      };
    }
    if (tech.includes('python')) {
      return {
        title: 'Python Virtual Environment Setup',
        command: `python -m venv venv\nsource venv/bin/activate  # On Windows: venv\\Scripts\\activate\npip install -r requirements.txt\npython main.py`,
        note: 'Python 3.10+ recommended.',
      };
    }
    return {
      title: 'Node.js & Local Environment Setup',
      command: `npm init -y\nnpm install\nnode solution.js`,
      note: 'Node.js 18+ recommended.',
    };
  };

  const toolchain = getToolchainSetup();

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation & Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate('/projects');
            }}
            className="p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors shadow-sm"
            title="Return to Projects List"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {project.technology || 'Engineering Lab'}
              </span>
              <span className="text-xs text-stone-500 font-medium">
                {project.difficulty} • ~{project.estimatedMinutes} mins
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight mt-0.5">
              {project.title}
            </h1>
          </div>
        </div>

        {/* Overall Progress Widget */}
        <div className="flex items-center gap-4 bg-white dark:bg-stone-900 px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Project Progress
            </div>
            <div className="text-sm font-black text-stone-900 dark:text-stone-100">
              {completedMilestones} of {totalMilestones} Milestones ({progressPercent}%)
            </div>
          </div>
          <div className="w-20 bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Real-world Scenario & System Architecture Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Terminal size={15} />
            <span>Real-World Scenario & Purpose</span>
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
            {project.realWorldScenario || project.tagline}
          </p>
          {project.techStack && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="text-[11px] font-semibold text-stone-400 mr-1 self-center">Stack:</span>
              {project.techStack.map((tech, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Toolchain / Terminal Instructions */}
        <div className="p-5 rounded-3xl bg-stone-950 text-stone-200 border border-stone-800 shadow-sm space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Cpu size={14} />
                <span>{toolchain.title}</span>
              </div>
              <button
                onClick={() => copyToClipboard(toolchain.command, setCopiedSetup)}
                className="text-stone-400 hover:text-stone-200 transition-colors"
                title="Copy terminal commands"
              >
                {copiedSetup ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <pre className="font-mono text-[11px] text-stone-300 bg-black/40 p-2.5 rounded-xl mt-2 overflow-x-auto border border-stone-800">
              <code>{toolchain.command}</code>
            </pre>
          </div>
          <p className="text-[10px] text-stone-400 leading-tight">
            {toolchain.note}
          </p>
        </div>
      </div>

      {/* Milestones Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {project.milestones.map((m, idx) => {
          const isActive = idx === activeMilestoneIndex;
          const isDone = !!m.completed;
          return (
            <button
              key={m.id || idx}
              onClick={() => {
                triggerHaptic('light');
                setActiveMilestoneIndex(idx);
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : isDone
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
              }`}
            >
              {isDone ? (
                <CheckCircle2 size={16} className={isActive ? 'text-white' : 'text-emerald-500'} />
              ) : (
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                }`}>
                  {idx + 1}
                </span>
              )}
              <span>{m.title.split(':')[0] || `Milestone ${idx + 1}`}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Split: Left (Milestone Details & Checklist) | Right (Code & Review) */}
      {activeMilestone && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Milestone Specification & Acceptance Checklist */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-sm space-y-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-primary">
                  Milestone {activeMilestoneIndex + 1} of {totalMilestones}
                </div>
                <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mt-1">
                  {activeMilestone.title}
                </h2>
              </div>

              {/* Objective */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                <span className="font-bold text-stone-900 dark:text-stone-100 block mb-1">
                  🎯 Objective:
                </span>
                {activeMilestone.objective}
              </div>

              {/* Starter Hint */}
              {activeMilestone.starterHint && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <span className="font-bold block mb-0.5">💡 Engineering Hint:</span>
                  {activeMilestone.starterHint}
                </div>
              )}

              {/* Acceptance Criteria Checklist */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                  <span>Acceptance Verification Checklist</span>
                  <span className="text-[11px] text-stone-400 font-normal">
                    {activeMilestone.criteria.filter(c => activeMilestone.completedCriteria?.[c]).length} / {activeMilestone.criteria.length} Met
                  </span>
                </div>

                <div className="space-y-2">
                  {activeMilestone.criteria.map((criterion, idx) => {
                    const isChecked = !!activeMilestone.completedCriteria?.[criterion];
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleCriterion(criterion)}
                        className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                          isChecked
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-stone-800 dark:text-stone-200'
                            : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-stone-300 dark:border-stone-700'
                        }`}>
                          {isChecked && <Check size={12} />}
                        </div>
                        <span className={`text-xs leading-relaxed ${
                          isChecked ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-700 dark:text-stone-300'
                        }`}>
                          {criterion}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Badge */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100 dark:border-stone-800/80">
                <span className="text-xs text-stone-500 font-semibold">
                  Milestone Status:
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  activeMilestone.completed ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  {activeMilestone.completed ? '✓ Completed & Verified' : '○ In Progress'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Code Editor & AI Review */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-stone-950 rounded-3xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col">
              {/* Code Editor Header */}
              <div className="px-5 py-3.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode size={16} className="text-primary" />
                  <span className="font-mono text-xs font-bold text-stone-200">
                    {activeMilestone.starterCode.filename || 'solution'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400 uppercase">
                    {activeMilestone.starterCode.language}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(userCode, setCopiedCode)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>

                  <button
                    onClick={handleReviewCode}
                    disabled={isReviewing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-primary/20 transition-all"
                  >
                    {isReviewing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>AI Code Review</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Textarea / Editor */}
              <div className="relative">
                <textarea
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="// Implement your solution here..."
                  rows={20}
                  className="w-full bg-stone-950 text-stone-200 font-mono text-xs sm:text-sm p-5 focus:outline-none resize-none leading-relaxed selection:bg-primary/30"
                  spellCheck={false}
                />
              </div>

              {/* Bottom status bar */}
              <div className="px-5 py-2.5 bg-stone-900/80 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                <span>Lines: {userCode.split('\n').length} | Chars: {userCode.length}</span>
                <span>Language: {activeMilestone.starterCode.language}</span>
              </div>
            </div>

            {/* AI Review Result Callout if available */}
            {reviewResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-3xl border shadow-lg space-y-3 ${
                  reviewResult.verdict === 'Outstanding'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : reviewResult.verdict === 'Pass'
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award size={18} className={
                      reviewResult.verdict === 'Outstanding' ? 'text-emerald-500' : 'text-primary'
                    } />
                    <span className="text-sm font-black text-stone-900 dark:text-stone-100">
                      AI Code Review Verdict: {reviewResult.verdict} ({reviewResult.score}/100)
                    </span>
                  </div>
                  {reviewResult.xpEarned > 0 && (
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-white">
                      +{reviewResult.xpEarned} XP Awarded
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {reviewResult.summary}
                </p>

                {reviewResult.strengths?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Strengths:
                    </span>
                    <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-0.5 list-disc pl-4">
                      {reviewResult.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {reviewResult.suggestions?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                      Refinements:
                    </span>
                    <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-0.5 list-disc pl-4">
                      {reviewResult.suggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspacePage;
