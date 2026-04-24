import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSharedPlanBySlug, incrementImportCount } from '../services/shareService';
import { SharedPlan, Plan, Task } from '../types';
import Icon from './common/Icon';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import Skeleton from './common/Skeleton';

const SharedPlanView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addPlanWithTasks } = useData();
  const { showToast } = useToast();
  const [sharedPlan, setSharedPlan] = useState<SharedPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!slug) return;
      const plan = await getSharedPlanBySlug(slug);
      setSharedPlan(plan);
      setIsLoading(false);
    };
    fetchPlan();
  }, [slug]);

  const handleImport = async () => {
    if (!sharedPlan) return;
    setIsImporting(true);
    try {
      const planId = crypto.randomUUID();
      const newPlan: Plan = {
        id: planId,
        title: sharedPlan.title,
        description: sharedPlan.description,
        subject: sharedPlan.subject,
        totalDays: sharedPlan.tasks.length,
        completedDays: 0,
        progress: 0,
        dailyGoalMins: 45, // Default
        difficulty: 'Intermediate',
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      const newTasks: Task[] = sharedPlan.tasks.map((t, idx) => ({
        id: crypto.randomUUID(),
        planId: planId,
        title: t.title,
        description: t.description,
        durationMinutes: 45,
        dueDate: new Date(Date.now() + idx * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Not Started',
        tags: [sharedPlan.subject, 'Imported'],
        type: 'reading',
        createdAt: new Date().toISOString()
      }));

      await addPlanWithTasks(newPlan, newTasks);
      await incrementImportCount(sharedPlan.id);
      
      showToast("Plan imported successfully!", "success");
      navigate('/dashboard');
    } catch (err) {
      showToast("Failed to import plan", "error");
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!sharedPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">error</span>
        </div>
        <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Plan Not Found</h2>
        <p className="text-text-secondary-light">This link may have expired or the plan is no longer public.</p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-primary text-white font-bold rounded-xl">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-fade-in">
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-border-light dark:border-border-dark flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">Shared Learning Plan</h1>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-8 mt-4">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary to-secondary p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <span className="material-symbols-outlined text-[200px]">auto_stories</span>
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/20">
                {sharedPlan.subject}
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold opacity-80">
                <span className="material-symbols-outlined text-xs">visibility</span>
                {sharedPlan.views} views
              </div>
            </div>
            <h2 className="text-3xl font-bold leading-tight">{sharedPlan.title}</h2>
            <p className="text-white/80 text-sm leading-relaxed max-w-xl">
              {sharedPlan.description}
            </p>
            
            <div className="flex items-center gap-6 pt-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase opacity-60">Tasks</span>
                <span className="text-xl font-bold">{sharedPlan.tasks.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase opacity-60">Estimated Time</span>
                <span className="text-xl font-bold">{Math.round((sharedPlan.tasks.length * 45) / 60)}h</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase opacity-60">Imports</span>
                <span className="text-xl font-bold">{sharedPlan.imports}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Preview */}
        <div className="space-y-4">
          <h3 className="font-bold text-xl text-text-primary-light dark:text-text-primary-dark flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-primary">list_alt</span>
            Learning Path Preview
          </h3>
          <div className="space-y-3">
            {sharedPlan.tasks.map((task, idx) => (
              <div key={idx} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-border-light dark:border-border-dark flex gap-4 group hover:border-primary/30 transition-all">
                <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 font-bold text-text-secondary-light">
                  {idx + 1}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-text-primary-light dark:text-text-primary-dark">{task.title}</h4>
                  <p className="text-xs text-text-secondary-light leading-relaxed">
                    {task.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-border-light dark:border-border-dark flex justify-center z-20">
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="w-full max-w-md py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Importing to Dashboard...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">download</span>
                Import this Plan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharedPlanView;
