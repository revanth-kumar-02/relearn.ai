import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Code2, 
  ArrowRight, 
  Award, 
  Layers, 
  Terminal, 
  ShieldAlert, 
  Zap, 
  RefreshCw,
  Clock,
  ChevronRight,
  Send,
  Loader2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ProjectLab, 
  ProjectMilestone, 
  CodeReviewResult, 
  generateProjectLab, 
  reviewProjectCode 
} from '../../services/ai/projectLabService';
import { useAuth } from '../../contexts/AuthContext';
import { addActivity } from '../../services/api/dataService';

interface ProjectLabModuleProps {
  topic: string;
  lessonContent?: string;
  difficulty?: string;
  onOpenPlaygroundWithCode?: (code: string, language: string, milestoneTitle: string) => void;
}

export const ProjectLabModule: React.FC<ProjectLabModuleProps> = ({
  topic,
  lessonContent,
  difficulty = 'Intermediate',
  onOpenPlaygroundWithCode
}) => {
  const { user, updateProfile } = useAuth();
  const [lab, setLab] = useState<ProjectLab | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
  const [completedCriteria, setCompletedCriteria] = useState<Record<string, boolean>>({});

  // Code Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submissionCode, setSubmissionCode] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [milestonesCompleted, setMilestonesCompleted] = useState<Record<string, boolean>>({});

  // Load project lab on mount or topic change
  useEffect(() => {
    let isMounted = true;
    const fetchLab = async () => {
      setIsLoading(true);
      try {
        const generated = await generateProjectLab(topic, lessonContent, difficulty);
        if (isMounted) {
          setLab(generated);
          // Set initial submission code to active milestone starter code
          if (generated.milestones[0]) {
            setSubmissionCode(generated.milestones[0].starterCode.code);
          }
        }
      } catch (err) {
        console.error('Failed to load project lab:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLab();
    return () => { isMounted = false; };
  }, [topic, lessonContent, difficulty]);

  const activeMilestone = lab?.milestones[activeMilestoneIndex];

  const toggleCriterion = (criterionKey: string) => {
    setCompletedCriteria(prev => ({
      ...prev,
      [criterionKey]: !prev[criterionKey]
    }));
  };

  const handleOpenInPlayground = (milestone: ProjectMilestone) => {
    if (onOpenPlaygroundWithCode) {
      onOpenPlaygroundWithCode(
        milestone.starterCode.code,
        milestone.starterCode.language,
        milestone.title
      );
    }
  };

  const handleStartReview = () => {
    if (activeMilestone) {
      setSubmissionCode(activeMilestone.starterCode.code);
    }
    setReviewResult(null);
    setShowReviewModal(true);
  };

  const handleSubmitCodeReview = async () => {
    if (!lab || !activeMilestone || !submissionCode.trim()) return;

    setIsReviewing(true);
    try {
      const result = await reviewProjectCode({
        projectTitle: lab.title,
        milestoneTitle: activeMilestone.title,
        code: submissionCode,
        criteria: activeMilestone.criteria,
        language: activeMilestone.starterCode.language
      });

      setReviewResult(result);

      if (result.verdict === 'Pass' || result.verdict === 'Outstanding') {
        setMilestonesCompleted(prev => ({
          ...prev,
          [activeMilestone.id]: true
        }));

        // Award XP and log activity
        if (user) {
          const currentXP = user.stats?.totalXP || 0;
          const newXP = currentXP + result.xpEarned;
          await updateProfile({
            stats: {
              ...(user.stats || {}),
              totalXP: newXP
            } as any
          });

          addActivity(user.id, {
            id: crypto.randomUUID(),
            title: `Completed Project Milestone: ${activeMilestone.title} (+${result.xpEarned} XP)`,
            time: new Date().toISOString(),
            icon: 'award',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
          });
        }
      }
    } catch (err) {
      console.error('Failed to review code:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[320px] text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Loader2 size={24} className="animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-100">
            Synthesizing Hands-On Micro-Project...
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Transforming {topic} into real-world engineering milestones with starter code.
          </p>
        </div>
      </div>
    );
  }

  if (!lab) {
    return null;
  }

  const completedMilestoneCount = Object.values(milestonesCompleted).filter(Boolean).length;
  const progressPercent = Math.round((completedMilestoneCount / (lab.milestones.length || 1)) * 100);

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Hands-On Project Lab
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {lab.difficulty} • ~{lab.estimatedMinutes} mins
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            {lab.title}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            {lab.tagline}
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-4 bg-stone-50 dark:bg-stone-950 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 flex-shrink-0">
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Milestone Progress
            </span>
            <span className="text-sm font-black text-stone-800 dark:text-stone-100">
              {completedMilestoneCount} / {lab.milestones.length} Completed
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-500">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* Production Context Card */}
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/20 text-primary flex-shrink-0 mt-0.5">
          <Briefcase size={18} />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            Production & Industry Context
          </h4>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            {lab.realWorldScenario}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {lab.techStack.map((tech, i) => (
              <span
                key={i}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Milestones Navigation Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {lab.milestones.map((m, idx) => {
          const isDone = !!milestonesCompleted[m.id];
          const isActive = idx === activeMilestoneIndex;

          return (
            <button
              key={m.id}
              onClick={() => setActiveMilestoneIndex(idx)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 relative ${
                isActive
                  ? 'bg-stone-100 dark:bg-stone-800 border-primary shadow-sm'
                  : 'bg-stone-50 dark:bg-stone-950/50 border-stone-200 dark:border-stone-800 hover:border-stone-400'
              }`}
            >
              <div className="mt-0.5">
                {isDone ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <Circle size={18} className={isActive ? 'text-primary' : 'text-stone-400'} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Step {idx + 1}
                </span>
                <p className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-stone-800 dark:text-stone-200'}`}>
                  {m.title.replace(/^Milestone \d+:\s*/, '')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Milestone Card */}
      {activeMilestone && (
        <div className="bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800/80 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                Active Milestone {activeMilestoneIndex + 1} of {lab.milestones.length}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                {activeMilestone.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenInPlayground(activeMilestone)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 rounded-xl text-xs font-bold transition-colors"
              >
                <Code2 size={14} />
                <span>Open in Playground</span>
              </button>

              <button
                onClick={handleStartReview}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 active:scale-95"
              >
                <Sparkles size={14} />
                <span>AI Code Review</span>
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            {activeMilestone.objective}
          </p>

          {/* Hint / Strategy */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Zap size={15} className="mt-0.5 flex-shrink-0" />
            <span><strong>Engineering Hint:</strong> {activeMilestone.starterHint}</span>
          </div>

          {/* Acceptance Criteria Checklist */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Milestone Acceptance Criteria:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeMilestone.criteria.map((criterion, cIdx) => {
                const key = `${activeMilestone.id}-${cIdx}`;
                const checked = !!completedCriteria[key];

                return (
                  <div
                    key={cIdx}
                    onClick={() => toggleCriterion(key)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      checked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 line-through'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-primary/50'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {checked ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <Circle size={14} className="text-stone-400" />
                      )}
                    </div>
                    <span className="leading-tight">{criterion}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Starter Code Blueprint Sneak Peek */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-bold flex items-center gap-1.5">
                <Terminal size={14} /> Starter Template: {activeMilestone.starterCode.filename}
              </span>
              <span className="text-[10px] uppercase font-mono">{activeMilestone.starterCode.language}</span>
            </div>
            <pre className="p-3 bg-stone-900 text-stone-200 rounded-xl font-mono text-xs overflow-x-auto max-h-36 border border-stone-800">
              {activeMilestone.starterCode.code}
            </pre>
          </div>
        </div>
      )}

      {/* Code Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                      Submit for AI Code Review
                    </h3>
                    <p className="text-xs text-stone-500">
                      {activeMilestone?.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-stone-400 hover:text-stone-200 text-sm p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  ✕
                </button>
              </div>

              {!reviewResult ? (
                <div className="space-y-4">
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Paste your milestone solution or edits below. The AI reviewer will evaluate your code against the acceptance criteria and award XP.
                  </p>
                  <textarea
                    value={submissionCode}
                    onChange={e => setSubmissionCode(e.target.value)}
                    rows={12}
                    className="w-full p-3 font-mono text-xs bg-stone-950 text-stone-200 rounded-xl border border-stone-800 focus:outline-none focus:border-primary"
                    placeholder="// Paste your milestone code here..."
                  />

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitCodeReview}
                      disabled={isReviewing || !submissionCode.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                    >
                      {isReviewing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Reviewing Implementation...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Submit Review</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Review Result Display */
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-stone-100 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-primary tabular-nums">
                        {reviewResult.score}/100
                      </div>
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          reviewResult.verdict === 'Outstanding'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : reviewResult.verdict === 'Pass'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {reviewResult.verdict}
                        </span>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          Awarded +{reviewResult.xpEarned} XP
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                      <Award size={16} />
                      <span>+{reviewResult.xpEarned} XP</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                    {reviewResult.summary}
                  </p>

                  {/* Strengths */}
                  {reviewResult.strengths?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                        <Check size={14} /> Key Strengths
                      </h4>
                      <ul className="text-xs text-stone-600 dark:text-stone-300 space-y-1 list-disc pl-5">
                        {reviewResult.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {reviewResult.suggestions?.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <Zap size={14} /> Areas for Improvement
                      </h4>
                      <ul className="text-xs text-stone-600 dark:text-stone-300 space-y-1 list-disc pl-5">
                        {reviewResult.suggestions.map((sug, i) => (
                          <li key={i}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                    <button
                      onClick={() => {
                        setShowReviewModal(false);
                        setReviewResult(null);
                      }}
                      className="px-5 py-2 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 rounded-xl text-xs font-bold"
                    >
                      Done & Return to Lab
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectLabModule;
