import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Plan, Task, Activity, Notification as AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { generatePlanImage } from '../services/geminiService';
import { sendBrowserNotification } from '../services/notificationService';
import { 
  getPlans, getTasks, getActivity, getNotifications, createNotification, 
  markAllNotificationsRead, clearAllNotifications as dsClearAllNotifications,
  createPlan, createTasksBatch, updatePlan as dsUpdatePlan, deletePlan as dsDeletePlan,
  createTask, updateTask as dsUpdateTask, deleteTask as dsDeleteTask
} from '../services/dataService';
import { supabase } from '../services/supabase';
import { VideoLanguageCode, setVideoLanguagePreference, getVideoLanguagePreference } from '../services/youtubeService';

interface DataContextType {
  plans: Plan[];
  tasks: Task[];
  recentActivity: Activity[];
  notifications: AppNotification[];
  videoLanguage: VideoLanguageCode;
  updateVideoLanguage: (code: VideoLanguageCode) => Promise<void>;
  addPlan: (plan: Plan) => Promise<void>;
  addPlanWithTasks: (plan: Plan, tasks: Task[]) => Promise<void>;
  updatePlan: (id: string, updates: Partial<Plan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addActivity: (activity: Activity) => void;
  clearAllActivity: () => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  addNotification: (notification: Omit<AppNotification, 'id'>) => Promise<void>;
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- localStorage helpers ---
const LS_PREFIX = 'relearn_';
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function lsSet(key: string, value: any) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch { }
}

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [videoLanguage, setVideoLanguageState] = useState<VideoLanguageCode>(getVideoLanguagePreference());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize initial video language from user profile if it changes
  useEffect(() => {
    if (user?.preferences?.videoLanguage) {
      setVideoLanguageState(user.preferences.videoLanguage as VideoLanguageCode);
      setVideoLanguagePreference(user.preferences.videoLanguage as VideoLanguageCode);
    }
  }, [user?.preferences?.videoLanguage]);

  const updateVideoLanguage = async (code: VideoLanguageCode) => {
    setVideoLanguageState(code);
    setVideoLanguagePreference(code);
    
    // Clear video caches immediately
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('relearn_videos_'));
      keys.forEach(k => localStorage.removeItem(k));
    } catch { /* noop */ }
    window.dispatchEvent(new Event('videoLanguageChanged'));

    if (user?.preferences) {
      await updateProfile({
        preferences: {
          ...user.preferences,
          videoLanguage: code
        }
      });
    }
  };

  // Phase 1 + 2: Dynamic fetching and Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Fast load from local storage
    setPlans(lsGet(`plans_${user.id}`, []));
    setTasks(lsGet(`tasks_${user.id}`, []));
    setRecentActivity(lsGet(`activity_${user.id}`, []));
    setNotifications(lsGet(`notifications_${user.id}`, []));

    // Dynamic Database Fetch
    Promise.all([
      getPlans(user.id),
      getTasks(user.id),
      getActivity(user.id),
      getNotifications(user.id)
    ]).then(([dbPlans, dbTasks, dbActivity, dbNotifs]) => {
      setPlans(dbPlans);
      setTasks(dbTasks);
      setRecentActivity(dbActivity);
      setNotifications(dbNotifs);
    }).catch(err => {
      console.error("Error fetching dynamic data:", err);
      // L1 Fix: Ensure loading ends even on failure
    })
      .finally(() => setIsLoading(false));

    // Notification real-time channel
    const channel = supabase.channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` }, () => {
        // Fetch latest notifications on any updates natively
        getNotifications(user.id).then(setNotifications);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    if (!user?.id) return;
    lsSet(`plans_${user.id}`, plans);
  }, [plans, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    lsSet(`tasks_${user.id}`, tasks);
  }, [tasks, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    lsSet(`activity_${user.id}`, recentActivity);
  }, [recentActivity, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    lsSet(`notifications_${user.id}`, notifications);
  }, [notifications, user?.id]);

  // Clear state when user logs out
  useEffect(() => {
    if (!user?.id) {
      setPlans([]);
      setTasks([]);
      setRecentActivity([]);
      setNotifications([]);
    }
  }, [user?.id]);

  const updateUserStats = useCallback(async (updates: Partial<{ studyStreak: number, totalStudyHours: number, plansCreated: number, plansCompleted: number }>) => {
    if (!user || !user.stats) return;
    const newStats = { ...user.stats, ...updates };
    await updateProfile({ stats: newStats });
  }, [user, updateProfile]);

  // =================== DATA OPERATIONS ===================
  const addPlan = async (plan: Plan) => {
    if (!user?.id) return;

    const newPlan = { ...plan, id: plan.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
    setPlans(prev => [newPlan, ...prev]);

    try { await createPlan(user.id, newPlan); } catch (e) { console.error(e); }

    addActivity({
      id: Date.now().toString(),
      title: `Started plan: ${plan.title}`,
      time: new Date().toISOString(),
      icon: 'flag',
      color: 'text-primary',
      bg: 'bg-primary/10'
    });
  };

  const addPlanWithTasks = async (plan: Plan, newTasks: Task[]) => {
    if (!user?.id) return;

    const total = newTasks.length;
    const completed = newTasks.filter(t => t.status === 'Completed').length;
    const progress = total === 0 ? 0 : (completed / total) * 100;

    const planId = plan.id || crypto.randomUUID();
    const savedPlan: Plan = {
      ...plan,
      id: planId,
      totalDays: total,
      completedDays: completed,
      progress,
      createdAt: new Date().toISOString()
    };
    setPlans(prev => [savedPlan, ...prev]);

    const savedTasks = newTasks.map(task => ({
      ...task,
      id: task.id || crypto.randomUUID(),
      planId: planId,
      createdAt: new Date().toISOString()
    }));
    setTasks(prev => [...prev, ...savedTasks]);

    addActivity({
      id: Date.now().toString(),
      title: `Generated AI plan: ${plan.title}`,
      time: new Date().toISOString(),
      icon: 'auto_awesome',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    });

    addNotification({
       type: 'plan',
       title: 'New Plan Ready',
       message: `Your personalized learning plan for "${plan.title}" has been generated successfully.`,
       time: new Date().toISOString(),
       read: false
    });

    // Persist to Database/Sync Queue
    try {
      await createPlan(user.id, savedPlan);
      await createTasksBatch(user.id, savedTasks);
    } catch (err) {
      console.error("[DataContext] Failed to persist generated plan/tasks:", err);
    }

    if (user?.stats) {
      updateUserStats({ plansCreated: (user.stats.plansCreated || 0) + 1 });
    }
  };

  const updatePlan = async (id: string, updates: Partial<Plan>) => {
    if (!user?.id) return;
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try { await dsUpdatePlan(user.id, id, updates); } catch (e) { console.error(e); }
  };

  const deletePlan = async (id: string) => {
    if (!user?.id) return;
    setPlans(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.planId !== id));
    try { await dsDeletePlan(user.id, id); } catch (e) { console.error(e); }
  };

  const addTask = async (task: Task) => {
    if (!user?.id) return;
    const newTask = { ...task, id: task.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
    setTasks(prev => [...prev, newTask]);
    try { await createTask(user.id, newTask); } catch (e) { console.error(e); }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user?.id) return;

    const task = tasks.find(t => t.id === id);
    const planId = task?.planId;
    // D1 Fix: Optimistic Update with Rollback
    const originalTasks = [...tasks];
    const originalPlans = [...plans];

    try {
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(t => t.id === id ? { ...t, ...updates } : t);
        
        if (planId) {
          const planTasks = updatedTasks.filter(t => t.planId === planId);
          const total = planTasks.length;
          const completed = planTasks.filter(t => t.status === 'Completed').length;
          const progress = total === 0 ? 0 : (completed / total) * 100;

          setPlans(prevPlans => prevPlans.map(p => 
            p.id === planId ? { ...p, completedDays: completed, progress } : p
          ));
        }
        
        return updatedTasks;
      });

      await dsUpdateTask(user.id, id, updates); 
    } catch (e) { 
      console.error("[DataContext] Task update sync failed, rolling back:", e);
      setTasks(originalTasks);
      setPlans(originalPlans);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user?.id) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await dsDeleteTask(user.id, id); } catch (e) { console.error(e); }
  };

  const addActivity = async (activity: Activity) => {
    if (!user?.id) return;
    setRecentActivity(prev => [activity, ...prev].slice(0, 50));
  };

  const clearAllActivity = async () => {
    if (!user?.id) return;
    setRecentActivity([]);
  };

  const markAllNotificationsAsRead = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllNotificationsRead(user.id);
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;
    setNotifications([]);
    dsClearAllNotifications(user.id);
  };

  const addNotification = async (notification: Omit<AppNotification, 'id'>) => {
    if (!user?.id) return;
    const newNotif = { ...notification, id: crypto.randomUUID() };
    setNotifications(prev => [newNotif, ...prev].slice(0, 100)); // L3 Fix: Cap notifications

    // Save to Database
    createNotification(user.id, newNotif);

    // Send an OS-level push notification if enabled
    if (user.preferences?.notifications?.newPlanSuggestions || 
        user.preferences?.notifications?.dailyReminder) { // Can be more specific per type
      sendBrowserNotification(notification.title, notification.message);
    }
  };

  const refreshData = async () => {
    if (user?.id) {
      setPlans(lsGet(`plans_${user.id}`, []));
      setTasks(lsGet(`tasks_${user.id}`, []));
      setRecentActivity(lsGet(`activity_${user.id}`, []));
      setNotifications(lsGet(`notifications_${user.id}`, []));

      // Phase 1: trigger full remote database re-fetch
      Promise.all([
        getPlans(user.id),
        getTasks(user.id),
        getActivity(user.id),
        getNotifications(user.id)
      ]).then(([dbPlans, dbTasks, dbActivity, dbNotifs]) => {
        setPlans(dbPlans);
        setTasks(dbTasks);
        setRecentActivity(dbActivity);
        setNotifications(dbNotifs);
      }).catch(err => console.error("Error refreshing dynamic data:", err));
    }
  };

  return (
    <DataContext.Provider value={{
      plans, tasks, recentActivity, notifications, videoLanguage, updateVideoLanguage,
      addPlan, addPlanWithTasks, updatePlan, deletePlan,
      addTask, updateTask, deleteTask,
      addActivity, clearAllActivity, markAllNotificationsAsRead, clearAllNotifications, addNotification,
      refreshData,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
