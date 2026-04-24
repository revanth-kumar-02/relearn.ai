import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useTutorial } from '../contexts/TutorialContext';
import { useToast } from '../contexts/ToastContext';
import StudyTimer from './StudyTimer';
import { generatePlanCoverImage } from '../services/gemini/imageService';
import { exportPlanAsPDF } from '../services/documentService';
import Icon from './common/Icon';
import Skeleton from './common/Skeleton';
import { triggerHaptic } from '../utils/haptics';
import SharePlanModal from './SharePlanModal';
import { useAuth } from '../contexts/AuthContext';

const PlanDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plans, tasks, updateTask, updateTasksBatch, updatePlan, deletePlan, addTask } = useData();
  const { isActive, currentStep } = useTutorial();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const planId = location.state?.planId;
  const currentPlan = useMemo(() => plans.find(p => p.id === planId), [plans, planId]);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDailyGoal, setEditDailyGoal] = useState(60);

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');

  // Modal State
  const [showMenu, setShowMenu] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Image preloading with fallback chain
  const [resolvedImage, setResolvedImage] = useState<string>('');

  const planTasks = useMemo(() => 
    tasks.filter(t => t.planId === planId).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  [tasks, planId]);

  const totalTasks = planTasks.length;
  const completedTasks = planTasks.filter(t => t.status === 'Completed').length;
  const progressPercentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (isActive && currentStep === 5 && planTasks.length > 0) {
        if (expandedTaskId !== planTasks[0].id) {
            setExpandedTaskId(planTasks[0].id);
        }
    }
  }, [isActive, currentStep, planTasks, expandedTaskId]);

  useEffect(() => {
    if (!currentPlan && !planId) {
       navigate('/dashboard', { replace: true });
    }
  }, [currentPlan, planId, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progressPercentage), 100);
    return () => clearTimeout(timer);
  }, [progressPercentage]);

  useEffect(() => {
      if (!currentPlan) return;
      
      const primarySrc = currentPlan.coverImage || '';
      const fallbackPrompt = `${currentPlan.subject ? currentPlan.subject + ' ' : ''}${currentPlan.title} abstract digital art high quality`;
      const pollinationsFallback = `https://picsum.photos/seed/${currentPlan.id}/1280/720`;

      if (!primarySrc || primarySrc.includes('pollinations.ai')) {
          setResolvedImage(pollinationsFallback);
          return;
      }

      if (primarySrc.startsWith('data:')) {
          setResolvedImage(primarySrc);
          return;
      }

      const img = new Image();
      img.onload = () => setResolvedImage(primarySrc);
      img.onerror = () => setResolvedImage(pollinationsFallback);
      img.src = primarySrc;
  }, [currentPlan?.coverImage, currentPlan?.id, currentPlan?.title, currentPlan?.subject]);

  const handleTaskCompletion = useCallback((taskId: string, currentStatus: string) => {
      const newStatus = currentStatus === 'Completed' ? 'Not Started' : 'Completed';
      updateTask(taskId, { status: newStatus as 'Not Started' | 'In Progress' | 'Completed' });
      if (newStatus === 'Completed') {
          showToast("Nicely done. Task completed.", "success");
          triggerHaptic('success'); // U3: Tactile feedback
      }
  }, [updateTask, showToast]);

  const handleSaveEdit = () => {
      if(currentPlan && editTitle.trim()) {
          updatePlan(currentPlan.id, { 
              title: editTitle,
              subject: editSubject,
              dailyGoalMins: editDailyGoal
          });

          // Propagate daily goal to all tasks in batch to avoid race conditions
          const batchUpdates = planTasks
            .filter(task => task.durationMinutes !== editDailyGoal)
            .map(task => ({ id: task.id, updates: { durationMinutes: editDailyGoal } }));
          
          if (batchUpdates.length > 0) {
            updateTasksBatch(currentPlan.id, batchUpdates);
          }

          setIsEditing(false);
          showToast("Your settings are saved and tasks updated.", "success");
          triggerHaptic('success');
      }
  };

  const handleDeletePlan = () => {
      if (currentPlan) {
          deletePlan(currentPlan.id);
          showToast("Plan safely removed.", "info");
          navigate('/dashboard', { replace: true });
      }
  };

  const handleRestartPlan = () => {
      planTasks.forEach(t => updateTask(t.id, { status: 'Not Started' }));
      setShowRestartConfirm(false);
      setShowMenu(false);
      showToast("Progress gracefully reset.", "info");
  };

  const handleRegenerateImage = async () => {
      if (!currentPlan) return;
      setIsRegeneratingImage(true);
      try {
          const newImage = await generatePlanCoverImage(currentPlan.title);
          if (newImage) {
            await updatePlan(currentPlan.id, { coverImage: newImage });
            showToast("New cover generated!", "success");
          }
      } catch (e) {
          showToast("Failed to regenerate image", "error");
      } finally {
          setIsRegeneratingImage(false);
          setShowMenu(false);
      }
  };

  const handleShare = async () => {
      setIsShareModalOpen(true);
      triggerHaptic('light');
  };

  const handleArchive = () => {
      if(currentPlan) {
          updatePlan(currentPlan.id, { isArchived: true });
          showToast("Plan moved to archives", "info");
          navigate('/dashboard');
      }
  };

  const handleExportPDF = async () => {
      if (!currentPlan) return;
      setIsExportingPDF(true);
      try {
          await exportPlanAsPDF(currentPlan, planTasks, (status) => {
              console.log(`[PDF Export] ${status}`);
          });
          showToast("PDF exported successfully!", "success");
          triggerHaptic('success');
      } catch (err) {
          console.error('[PDF Export] Failed:', err);
          showToast("Failed to export PDF", "error");
      } finally {
          setIsExportingPDF(false);
      }
  };

  if (!currentPlan) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark p-6 space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton variant="text" className="w-3/4 h-8" />
              <Skeleton variant="text" className="w-1/2" />
          </div>
      )
  }

  return (
    <div className="pb-24 md:pb-8 relative bg-background-light dark:bg-background-dark min-h-screen animate-fade-in">
      {/* Header */}
      <div className="p-4 flex items-center justify-between sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm z-10 md:relative md:bg-transparent border-b border-border-light/10 dark:border-border-dark/10 md:border-none">
        <button onClick={() => navigate('/dashboard')} className="text-text-primary-light dark:text-text-primary-dark hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-full transition-colors" aria-label="Go back to dashboard">
            <Icon name="arrow_back" />
        </button>
        <h2 className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">Plan Details</h2>
        
        <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-text-primary-light dark:text-text-primary-dark p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" aria-label="More options">
                <Icon name="more_vert" />
            </button>
            
            {showMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-surface-light dark:bg-surface-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark py-1 z-50 overflow-hidden animate-scale-in origin-top-right">
                        <button 
                            onClick={handleRegenerateImage}
                            disabled={isRegeneratingImage}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary-light dark:text-text-primary-dark transition-colors"
                        >
                            <Icon name={isRegeneratingImage ? 'refresh' : 'image'} className={isRegeneratingImage ? 'animate-spin' : ''} />
                            {isRegeneratingImage ? 'Regenerating...' : 'Regenerate Cover'}
                        </button>
                        <button 
                            onClick={() => setShowRestartConfirm(true)}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 text-text-primary-light dark:text-text-primary-dark transition-colors"
                        >
                            <Icon name="restart_alt" /> Restart Plan
                        </button>
                        <button onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400 transition-colors">
                            <Icon name="delete" /> Delete Plan
                        </button>
                    </div>
                </>
            )}
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        {/* 1. Plan Cover Banner */}
        <div className="h-[220px] w-full rounded-2xl bg-cover bg-center relative overflow-hidden shadow-lg group" style={{backgroundImage: resolvedImage ? `url('${resolvedImage}')` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}} aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-md mb-1">{currentPlan.title}</h1>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm border border-white/10">AI Generated</span>
                    {currentPlan.difficulty && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm border border-white/10 ${
                            currentPlan.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-100' :
                            currentPlan.difficulty === 'Intermediate' ? 'bg-amber-500/20 text-amber-100' :
                            'bg-red-500/20 text-red-100'
                        }`}>
                            {currentPlan.difficulty}
                        </span>
                    )}
                    <p className="text-sm text-white/90 font-medium">{currentPlan.subject}</p>
                </div>
            </div>
        </div>

        {/* 2. Overall Progress Card */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm" id="tutorial-plan-progress-card">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark text-lg">Overall Progress</h3>
                            <p className="text-sm text-text-secondary-light">{completedTasks} / {totalTasks} tasks complete</p>
                        </div>
                        <span className="text-3xl font-bold text-primary" aria-live="polite">{Math.round(progressPercentage)}%</span>
                    </div>
                    
                    <div className="h-4 w-full bg-background-light dark:bg-background-dark rounded-full overflow-hidden border border-border-light dark:border-border-dark">
                        <div className="h-full bg-secondary rounded-full transition-all duration-1000 ease-out relative overflow-hidden" style={{width: `${animatedProgress}%`}}>
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-text-secondary-light font-bold uppercase tracking-wider">
                        <Icon name="flag" className="text-sm" />
                        Daily Goal: {currentPlan.dailyGoalMins}m
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-border-light dark:border-border-dark pt-6 md:pt-0 md:pl-6" id="tutorial-plan-actions">
                    <button onClick={() => { setEditTitle(currentPlan.title); setEditSubject(currentPlan.subject); setEditDailyGoal(currentPlan.dailyGoalMins); setIsEditing(true); }} className="flex-1 md:w-24 flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 text-text-primary-light dark:text-text-primary-dark font-bold text-[10px] uppercase transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-primary/20 group" aria-label="Edit plan settings">
                        <Icon name="edit" className="text-2xl text-text-secondary-light group-hover:text-primary transition-colors" />
                        Edit
                    </button>
                    <button onClick={handleShare} className="flex-1 md:w-24 flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 text-text-primary-light dark:text-text-primary-dark font-bold text-[10px] uppercase transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-primary/20 group" aria-label="Share your learning progress">
                        <Icon name="share" className="text-2xl text-text-secondary-light group-hover:text-primary transition-colors" />
                        Share
                    </button>
                    <button 
                        onClick={handleExportPDF} 
                        disabled={isExportingPDF}
                        className="flex-1 md:w-24 flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 text-text-primary-light dark:text-text-primary-dark font-bold text-[10px] uppercase transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-primary/20 group disabled:opacity-50 disabled:cursor-not-allowed" 
                        aria-label="Export plan as PDF"
                    >
                        <Icon name={isExportingPDF ? 'hourglass_top' : 'picture_as_pdf'} className={`text-2xl text-text-secondary-light group-hover:text-primary transition-colors ${isExportingPDF ? 'animate-pulse' : ''}`} />
                        {isExportingPDF ? 'Exporting...' : 'Export'}
                    </button>
                    <button onClick={() => setShowArchiveConfirm(true)} className="flex-1 md:w-24 flex flex-col items-center justify-center gap-2 py-3 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/5 text-text-primary-light dark:text-text-primary-dark font-bold text-[10px] uppercase transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-primary/20 group" aria-label="Move plan to archives">
                        <Icon name="archive" className="text-2xl text-text-secondary-light group-hover:text-primary transition-colors" />
                        Archive
                    </button>
                </div>
            </div>
        </div>

        {/* 4. Learning Path List */}
        <section aria-labelledby="path-heading">
            <div className="flex items-center justify-between mb-4">
                <h3 id="path-heading" className="font-bold text-xl text-text-primary-light dark:text-text-primary-dark">Learning Path</h3>
                <span className="text-xs font-bold text-text-secondary-light bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{planTasks.length} Tasks</span>
            </div>

            <div className="space-y-4">
                {planTasks.map(task => (
                    <div key={task.id} className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden group hover:border-primary/30 transition-all">
                        <button 
                            className="w-full p-5 flex items-center gap-4 text-left" 
                            onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                            aria-expanded={expandedTaskId === task.id}
                            aria-label={`Task: ${task.title}. ${task.status}. Click to expand description.`}
                        >
                            <div 
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); handleTaskCompletion(task.id, task.status); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); handleTaskCompletion(task.id, task.status); } }}
                                className="active:scale-90 transition-transform duration-200 shrink-0 cursor-pointer"
                                aria-label={task.status === 'Completed' ? 'Mark incomplete' : 'Mark as completed'}
                            >
                                <Icon 
                                    name={task.status === 'Completed' ? 'check_circle' : 'radio_button_unchecked'} 
                                    className={`text-2xl transition-all duration-300 ${task.status === 'Completed' ? 'text-green-500 filled scale-110' : 'text-gray-300 group-hover:text-primary'}`} 
                                />
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                                <p className={`font-bold text-base transition-colors duration-300 break-words ${task.status === 'Completed' ? 'line-through text-text-secondary-light' : 'text-text-primary-light dark:text-text-primary-dark'}`}>{task.title}</p>
                                <div className="flex items-center gap-3 mt-1.5" aria-hidden="true">
                                    {task.priority && (
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${task.priority === 'High' ? 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/30' : task.priority === 'Medium' ? 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30' : 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30'}`}>
                                            {task.priority}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-text-secondary-light">
                                        <Icon name="calendar_today" className="text-xs" />
                                        {task.dueDate}
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-text-secondary-light">
                                        <Icon name="schedule" className="text-xs" />
                                        {task.durationMinutes}m
                                    </div>
                                </div>
                            </div>
                            <Icon name="expand_more" className={`text-text-secondary-light/40 transition-transform duration-300 ${expandedTaskId === task.id ? 'rotate-180' : ''}`} />
                        </button>

                        {expandedTaskId === task.id && (
                            <div className="px-5 pb-5 border-t border-border-light dark:border-border-dark animate-slide-up bg-gray-50/50 dark:bg-white/5">
                                <div className="pt-5 space-y-5">
                                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark">
                                        <h4 className="text-xs font-bold text-text-secondary-light uppercase tracking-widest mb-2">Description</h4>
                                        <p className="text-sm text-text-primary-light dark:text-text-primary-dark leading-relaxed">{task.description || 'No description provided for this task.'}</p>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {task.status !== 'Completed' && (
                                            <button 
                                                id={isActive && currentStep === 5 ? "tutorial-start-learning" : undefined}
                                                onClick={() => navigate('/learning-workspace', { state: { taskId: task.id } })} 
                                                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                                            >
                                                <Icon name="school" className="text-xl" /> Start Learning Session
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleTaskCompletion(task.id, task.status)}
                                            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${
                                                task.status === 'Completed' 
                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50' 
                                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                            }`}
                                        >
                                            <Icon name={task.status === 'Completed' ? 'undo' : 'check_circle'} className="text-xl" />
                                            {task.status === 'Completed' ? 'Mark Incomplete' : 'Mark Complete'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button onClick={() => setIsImporting(true)} className="mt-6 w-full py-4 border-2 border-dashed border-border-light dark:border-border-dark text-text-secondary-light hover:text-primary hover:border-primary/50 font-bold text-sm rounded-2xl hover:bg-primary/5 transition-all group" aria-label="Quick add multiple tasks to this plan">
                <span className="flex items-center justify-center gap-2">
                    <Icon name="add_task" />
                    Quick Add Tasks to Plan
                </span>
            </button>
        </section>
      </div>

      {/* Edit Modal */}
      {isEditing && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl w-full max-w-sm p-6 shadow-xl" role="dialog" aria-labelledby="edit-title">
                  <h3 id="edit-title" className="font-bold text-lg mb-4 text-text-primary-light dark:text-text-primary-dark">Edit Plan</h3>
                  <div className="space-y-4">
                      <div>
                          <label htmlFor="edit-title-input" className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Title</label>
                          <input id="edit-title-input" type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-3 mt-1 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                       <div>
                          <label htmlFor="edit-subject-input" className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Subject</label>
                          <input id="edit-subject-input" type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)} className="w-full p-3 mt-1 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                       <div>
                          <label htmlFor="edit-goal-input" className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">Daily Goal (mins)</label>
                          <input id="edit-goal-input" type="number" value={editDailyGoal} onChange={e => setEditDailyGoal(parseInt(e.target.value))} className="w-full p-3 mt-1 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                      <button onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold text-text-primary-light dark:text-text-primary-dark">Cancel</button>
                      <button onClick={handleSaveEdit} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Bulk Import Modal */}
      {isImporting && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl w-full max-w-sm p-6 shadow-xl" role="dialog" aria-labelledby="import-title">
                  <h3 id="import-title" className="font-bold text-lg mb-2 text-text-primary-light dark:text-text-primary-dark">Quick Add Tasks</h3>
                  <p className="text-sm text-text-secondary-light mb-4">Enter one task per line. We'll automatically schedule them.</p>
                  <textarea 
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    rows={8}
                    className="w-full p-3 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark resize-none outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Read Chapter 1&#10;Complete practice quiz&#10;Watch video on functions"
                  ></textarea>
                  <div className="flex gap-3 mt-4">
                      <button onClick={() => setIsImporting(false)} className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold text-text-primary-light dark:text-text-primary-dark">Cancel</button>
                      <button onClick={() => { 
                          const lines = importText.split('\n').filter(line => line.trim() !== '');
                          lines.forEach((line, index) => {
                              const date = new Date();
                              date.setDate(date.getDate() + (planTasks.length + index));
                              addTask({
                                  id: crypto.randomUUID(),
                                  planId: currentPlan.id,
                                  title: line.trim(),
                                  description: 'Quick added task',
                                  durationMinutes: currentPlan.dailyGoalMins,
                                  dueDate: date.toISOString().split('T')[0],
                                  status: 'Not Started',
                                  priority: 'Medium'
                              } as any);
                          });
                          setImportText('');
                          setIsImporting(false);
                          showToast(`Imported ${lines.length} tasks!`, "success");
                      }} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">Import</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Popups & Confirmations */}
      {showArchiveConfirm && (
        <ConfirmationModal 
          title="Archive Plan?"
          message={`This will move "${currentPlan.title}" to archives. It won't appear on your dashboard.`}
          actionLabel="Archive"
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
          icon="archive"
        />
      )}

      {showDeleteConfirm && (
        <ConfirmationModal 
          title="Delete Plan?"
          message={`Are you sure? This will permanently remove "${currentPlan.title}" and all its tasks.`}
          actionLabel="Delete"
          onConfirm={handleDeletePlan}
          onCancel={() => setShowDeleteConfirm(false)}
          icon="delete"
          isDanger
        />
      )}

      {showRestartConfirm && (
        <ConfirmationModal 
          title="Restart Plan?"
          message={`This will reset all tasks in "${currentPlan.title}" to "Not Started".`}
          actionLabel="Restart"
          onConfirm={handleRestartPlan}
          onCancel={() => setShowRestartConfirm(false)}
          icon="restart_alt"
        />
      )}

      <SharePlanModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        plan={currentPlan} 
        tasks={planTasks} 
      />

    </div>
  );
};

const ConfirmationModal: React.FC<{
  title: string;
  message: string;
  actionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon: string;
  isDanger?: boolean;
}> = ({ title, message, actionLabel, onConfirm, onCancel, icon, isDanger }) => (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl w-full max-w-[340px] p-8 shadow-2xl animate-scale-in border border-border-light dark:border-border-dark">
            <div className={`h-12 w-12 rounded-full ${isDanger ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'} flex items-center justify-center mb-4 mx-auto`}>
                <Icon name={icon} className="text-2xl" />
            </div>
            <h3 className="font-bold text-lg text-center mb-2 text-text-primary-light dark:text-text-primary-dark">{title}</h3>
            <p className="text-center text-sm text-text-secondary-light mb-6 px-2">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold text-text-primary-light dark:text-text-primary-dark">Cancel</button>
                <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl text-white font-bold ${isDanger ? 'bg-red-600' : 'bg-primary'}`}>{actionLabel}</button>
            </div>
        </div>
    </div>
);

export default PlanDetails;