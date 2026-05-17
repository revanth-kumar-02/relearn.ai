/**
 * ─────────────────────────────────────────────────────────────────
 *  ReLearn.ai — Data Service (Facade)
 * ─────────────────────────────────────────────────────────────────
 *
 *  Supabase-first, localStorage-fallback data layer.
 *  This file acts as a clean facade, delegating to:
 *    - storageService.ts (Persistence & Obfuscation)
 *    - syncEngine.ts (Offline queue & LWW Merge)
 */

import { supabase, supabaseAvailable } from './supabase';
import { Plan, Task, Activity, Notification as AppNotification, User } from '../types';
import { lsGet, lsSet } from './storageService';
import { encryptField, decryptField } from './encryptionService';
import { 
  addUnsyncedChange, 
  getUnsyncedChanges, 
  removeUnsyncedChange, 
  mergeCollections,
  syncOfflineData,
  SyncResult,
  notifyOtherTabs,
  UnsyncedChange
} from './syncEngine';

function canUseSupabase(): boolean {
  return supabaseAvailable && navigator.onLine;
}

// ────────────────────────── PLANS ──────────────────────────

export async function getActivePlan(userId: string): Promise<Plan | null> {
  if (canUseSupabase()) {
    try {
      const { data: plan } = await supabase
        .from('plans')
        .select('*')
        .eq('userId', userId)
        .eq('status', 'active')
        .maybeSingle();
      
      if (plan) {
        if (plan.journal) plan.journal = await decryptField(plan.journal, userId);
        return plan;
      }
    } catch (err) {
      console.warn('[DataService] getActivePlan failed, checking cache:', err);
    }
  }

  const cached = lsGet<Plan[]>(`plans_${userId}`, []);
  const plan = cached.find(p => p.status === 'active') || null;
  if (plan && plan.journal) plan.journal = await decryptField(plan.journal, userId);
  return plan;
}

export async function getPlans(userId: string): Promise<Plan[]> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
        
      if (error) throw error;

      if (data) {
        const plans = data as Plan[];
        const local = lsGet<Plan[]>(`plans_${userId}`, []);
        const merged = mergeCollections(local, plans);
        lsSet(`plans_${userId}`, merged);
        
        for (const p of merged) {
          if (p.journal) p.journal = await decryptField(p.journal, userId);
        }
        return merged;
      }
    } catch (err) {
      console.warn('[DataService] Supabase getPlans failed, using cache:', err);
    }
  }

  const cached = lsGet<Plan[]>(`plans_${userId}`, []);
  for (const p of cached) {
    if (p.journal) p.journal = await decryptField(p.journal, userId);
  }
  return cached;
}

export async function createPlan(userId: string, plan: Plan): Promise<void> {
  const planWithMeta = {
    ...plan,
    userId,
    status: plan.status || 'active',
    createdAt: plan.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Encrypt sensitive fields for storage
  const storagePlan = { ...planWithMeta };
  if (storagePlan.journal) storagePlan.journal = await encryptField(storagePlan.journal, userId);

  const cached = lsGet<Plan[]>(`plans_${userId}`, []);
  lsSet(`plans_${userId}`, [storagePlan, ...cached.filter((p) => p.id !== plan.id)]);

  if (canUseSupabase()) {
    try {
      const { updatedAt, ...payload } = storagePlan as any;
      if (typeof payload.progress === 'number') payload.progress = Math.round(payload.progress);
      const { error } = await supabase.from('plans').insert(payload);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase createPlan failed:', err);
    }
  }

  addUnsyncedChange({
    id: plan.id,
    type: 'create',
    collection: 'plans',
    data: storagePlan as unknown as Record<string, unknown>,
    userId,
  });
}

export async function updatePlan(userId: string, planId: string, updates: Partial<Plan>): Promise<void> {
  const updatesWithMeta = { ...updates, updatedAt: new Date().toISOString() };
  
  const storageUpdates = { ...updatesWithMeta };
  if (storageUpdates.journal) storageUpdates.journal = await encryptField(storageUpdates.journal, userId);

  const cached = lsGet<Plan[]>(`plans_${userId}`, []);
  lsSet(`plans_${userId}`, cached.map((p) => (p.id === planId ? { ...p, ...storageUpdates } : p)));

  if (canUseSupabase()) {
    try {
      const { updatedAt, ...payload } = storageUpdates;
      if (typeof payload.progress === 'number') payload.progress = Math.round(payload.progress);
      const { error } = await supabase.from('plans').update(payload).eq('id', planId);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase updatePlan failed:', err);
    }
  }

  addUnsyncedChange({
    id: planId,
    type: 'update',
    collection: 'plans',
    data: storageUpdates as Record<string, unknown>,
    userId,
  });
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
  const cached = lsGet<Plan[]>(`plans_${userId}`, []);
  lsSet(`plans_${userId}`, cached.filter((p) => p.id !== planId));

  const cachedTasks = lsGet<Task[]>(`tasks_${userId}`, []);
  lsSet(`tasks_${userId}`, cachedTasks.filter((t) => t.planId !== planId));

  if (canUseSupabase()) {
    try {
      const { error } = await supabase.from('plans').delete().eq('id', planId);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase deletePlan failed:', err);
    }
  }

  addUnsyncedChange({ id: planId, type: 'delete', collection: 'plans', userId });
}

// ────────────────────────── TASKS ──────────────────────────

export async function getTasks(userId: string): Promise<Task[]> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('userId', userId);
      if (error) throw error;
      
      if (data) {
        const tasks = data as Task[];
        const local = lsGet<Task[]>(`tasks_${userId}`, []);
        const merged = mergeCollections(local, tasks);
        lsSet(`tasks_${userId}`, merged);
        
        for (const t of merged) {
          if (t.notes) t.notes = await decryptField(t.notes, userId);
        }
        return merged;
      }
    } catch (err) {
      console.warn('[DataService] Supabase getTasks failed, using cache:', err);
    }
  }
  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  for (const t of cached) {
    if (t.notes) t.notes = await decryptField(t.notes, userId);
  }
  return cached;
}

export async function createTask(userId: string, task: Task): Promise<void> {
  const taskWithMeta = { ...task, userId, updatedAt: new Date().toISOString() };
  
  const storageTask = { ...taskWithMeta };
  if (storageTask.notes) storageTask.notes = await encryptField(storageTask.notes, userId);

  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  lsSet(`tasks_${userId}`, [...cached.filter((t) => t.id !== task.id), storageTask]);

  if (canUseSupabase()) {
    try {
      const { updatedAt, ...payload } = storageTask as any;
      const { error } = await supabase.from('tasks').insert(payload);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase createTask failed:', err);
    }
  }

  addUnsyncedChange({
    id: task.id,
    type: 'create',
    collection: 'tasks',
    data: storageTask as unknown as Record<string, unknown>,
    userId,
  });
}

export async function createTasksBatch(userId: string, tasks: Task[]): Promise<void> {
  const tasksWithMeta = tasks.map((task) => ({
    ...task,
    userId,
    updatedAt: new Date().toISOString(),
  }));

  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  const existingIds = new Set(tasksWithMeta.map((t) => t.id));
  lsSet(`tasks_${userId}`, [...cached.filter((t) => !existingIds.has(t.id)), ...tasksWithMeta]);

  if (canUseSupabase()) {
    try {
      const payload = tasksWithMeta.map((t: any) => { const { updatedAt, ...rest } = t; return rest; });
      const { error } = await supabase.from('tasks').insert(payload);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase createTasksBatch failed:', err);
    }
  }

  tasksWithMeta.forEach((task) => {
    addUnsyncedChange({
      id: task.id,
      type: 'create',
      collection: 'tasks',
      data: task as unknown as Record<string, unknown>,
      userId,
    });
  });
}

export async function updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<void> {
  const updatesWithMeta = { ...updates, updatedAt: new Date().toISOString() };
  
  const storageUpdates = { ...updatesWithMeta };
  if (storageUpdates.notes) storageUpdates.notes = await encryptField(storageUpdates.notes, userId);

  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  lsSet(`tasks_${userId}`, cached.map((t) => (t.id === taskId ? { ...t, ...storageUpdates } : t)));

  if (canUseSupabase()) {
    try {
      const { updatedAt, ...payload } = storageUpdates as any;
      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase updateTask failed:', err);
    }
  }

  addUnsyncedChange({
    id: taskId,
    type: 'update',
    collection: 'tasks',
    data: storageUpdates as Record<string, unknown>,
    userId,
  });
}

export async function updateTasksBatch(userId: string, taskIdUpdates: { id: string; updates: Partial<Task> }[]): Promise<void> {
  const updatedAt = new Date().toISOString();
  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  const idToUpdates = new Map(taskIdUpdates.map(u => [u.id, u.updates]));
  const updatedCache = cached.map(t => {
    const updates = idToUpdates.get(t.id);
    if (updates) return { ...t, ...updates, updatedAt };
    return t;
  });
  lsSet(`tasks_${userId}`, updatedCache);

  if (canUseSupabase()) {
    try {
      const payload = taskIdUpdates.map(u => ({ ...u.updates, id: u.id, userId, updatedAt }));
      const { error } = await supabase.from('tasks').upsert(payload);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase updateTasksBatch failed:', err);
    }
  }

  taskIdUpdates.forEach(({ id, updates }) => {
    addUnsyncedChange({ id, type: 'update', collection: 'tasks', data: { ...updates, updatedAt }, userId });
  });
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  lsSet(`tasks_${userId}`, cached.filter((t) => t.id !== taskId));

  if (canUseSupabase()) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase deleteTask failed:', err);
    }
  }

  addUnsyncedChange({ id: taskId, type: 'delete', collection: 'tasks', userId });
}

// ────────────────────────── ACTIVITY ──────────────────────────

export async function getActivity(userId: string): Promise<Activity[]> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase.from('activity').select('*').eq('userId', userId).order('time', { ascending: false }).limit(50);
      if (error) throw error;
      if (data) {
        lsSet(`activity_${userId}`, data as Activity[]);
        return data as Activity[];
      }
    } catch (err) {
      console.warn('[DataService] Supabase getActivity failed:', err);
    }
  }
  return lsGet(`activity_${userId}`, []);
}

export async function addActivity(userId: string, activity: Activity): Promise<void> {
  const activityWithMeta = { ...activity, userId };
  const cached = lsGet<Activity[]>(`activity_${userId}`, []);
  lsSet(`activity_${userId}`, [activityWithMeta, ...cached].slice(0, 50));

  if (canUseSupabase()) {
    try {
      const { error } = await supabase.from('activity').insert(activityWithMeta);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase addActivity failed, queuing:', err);
    }
  }

  addUnsyncedChange({ id: activity.id, type: 'create', collection: 'activity', data: activityWithMeta as any, userId });
}

export async function clearAllActivity(userId: string): Promise<void> {
  lsSet(`activity_${userId}`, []);
  if (canUseSupabase()) {
    try { await supabase.from('activity').delete().eq('userId', userId); } catch {}
  }
}

// ────────────────────────── NOTIFICATIONS ──────────────────────────

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase.from('notifications').select('*').eq('userId', userId).order('time', { ascending: false });
      if (error) throw error;
      if (data) {
        lsSet(`notifications_${userId}`, data as AppNotification[]);
        return data as AppNotification[];
      }
    } catch (err) {
      console.warn('[DataService] Supabase getNotifications failed:', err);
    }
  }
  return lsGet(`notifications_${userId}`, []);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const cached = lsGet<AppNotification[]>(`notifications_${userId}`, []);
  lsSet(`notifications_${userId}`, cached.map((n) => ({ ...n, read: true })));
  if (canUseSupabase()) {
    try { await supabase.from('notifications').update({ read: true }).eq('userId', userId).eq('read', false); } catch {}
  }
}

export async function clearAllNotifications(userId: string): Promise<void> {
  lsSet(`notifications_${userId}`, []);
  if (canUseSupabase()) {
    try { await supabase.from('notifications').delete().eq('userId', userId); } catch {}
  }
}

export async function createNotification(userId: string, notification: Omit<AppNotification, 'id'>): Promise<AppNotification> {
  const newNotif = { ...notification, id: crypto.randomUUID(), userId };
  const cached = lsGet<AppNotification[]>(`notifications_${userId}`, []);
  lsSet(`notifications_${userId}`, [newNotif, ...cached]);

  if (canUseSupabase()) {
    try {
      const { error } = await supabase.from('notifications').insert(newNotif);
      if (error) throw error;
      return newNotif;
    } catch (err) {
      console.warn('[DataService] Supabase createNotification failed, queuing:', err);
    }
  }
  
  addUnsyncedChange({ id: newNotif.id, type: 'create', collection: 'notifications', data: newNotif as any, userId });
  return newNotif;
}

// ────────────────────────── USER PROFILE ──────────────────────────

export async function getUserProfile(userId: string): Promise<User | null> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, email, role, preferences, stats, profileSettings, academicLevel, learningGoals, preferredStudyTime, weakSubjects, strongSubjects, createdAt')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error; 
      if (data) {
        lsSet(`user_${userId}`, data as User);
        return data as User;
      }
    } catch (err) {
      console.warn('[DataService] Supabase getUserProfile failed:', err);
    }
  }
  return lsGet<User | null>(`user_${userId}`, null);
}

export async function saveUserProfile(userId: string, userData: Record<string, unknown>): Promise<void> {
  const dataWithMeta = { ...userData, updatedAt: new Date().toISOString() };
  lsSet(`user_${userId}`, dataWithMeta);

  if (canUseSupabase()) {
    try {
      const { updatedAt, isVerified, ...payload } = { id: userId, ...dataWithMeta } as any;
      const { error } = await supabase.from('users').upsert(payload);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase saveUserProfile failed:', err);
    }
  }

  addUnsyncedChange({ id: userId, type: 'update', collection: 'users', data: dataWithMeta as any, userId });
}

// ────────────────────────── ANALYTICS ──────────────────────────

const ANALYTICS_STORAGE_KEY = 'analytics_v1';

export type AnalyticsEventType = 'app_launch' | 'plan_created' | 'session_started' | 'session_completed' | 'task_updated' | 'preferences_changed' | 'manual_generation_skipped_pdf';

interface AnalyticsPayload {
  timestamp: string;
  eventType: AnalyticsEventType;
  metadata?: Record<string, any>;
  sessionDuration?: number;
}

export function trackAnalyticsEvent(eventType: AnalyticsEventType, metadata?: Record<string, any>) {
  const events = lsGet<AnalyticsPayload[]>(ANALYTICS_STORAGE_KEY, []);
  events.push({ timestamp: new Date().toISOString(), eventType, metadata });
  lsSet(ANALYTICS_STORAGE_KEY, events.slice(-200));
}

export function startAnalyticsSession(taskId: string): number {
  const startTime = Date.now();
  trackAnalyticsEvent('session_started', { taskId, startTime });
  return startTime;
}

export function endAnalyticsSession(taskId: string, startTime: number) {
  const sessionDuration = Math.round((Date.now() - startTime) / 1000);
  trackAnalyticsEvent('session_completed', { taskId, sessionDuration });
}

// ────────────────────────── SYNC HELPERS ──────────────────────────

export function getUnsyncedCount(): number {
  return getUnsyncedChanges().filter((c) => !c.permanentlyFailed).length;
}

export function getFailedSyncCount(): number {
  return getUnsyncedChanges().filter((c) => c.permanentlyFailed).length;
}

export function getFailedSyncItems(): Array<{ id: string; collection: string; lastError?: string; type: string }> {
  return getUnsyncedChanges().filter((c) => c.permanentlyFailed).map(c => ({ id: c.id, collection: c.collection, lastError: c.lastError, type: c.type }));
}

export function dismissFailedSync(id: string, collection: string): void {
  removeUnsyncedChange(id, collection);
}

export function clearAllFailedSyncs(): void {
  lsSet('unsynced_changes', getUnsyncedChanges().filter((c) => !c.permanentlyFailed));
  notifyOtherTabs();
}

export function retryFailedSyncs(): void {
  lsSet('unsynced_changes', getUnsyncedChanges().map((c) => c.permanentlyFailed ? { ...c, retryCount: 0, permanentlyFailed: false } : c));
  notifyOtherTabs();
}

export async function syncOfflineDataResult(): Promise<SyncResult> {
  return syncOfflineData();
}

export function getSyncHealth() {
  const changes = getUnsyncedChanges();
  const failed = changes.filter(c => c.permanentlyFailed);
  return {
    pendingCount: changes.length - failed.length,
    failedCount: failed.length,
    lastError: failed[failed.length - 1]?.lastError
  };
}

export async function discoverMentors(userId: string, weakSubjects: string[]): Promise<User[]> {
  if (!canUseSupabase() || !weakSubjects.length) return [];
  try {
    const { data, error } = await supabase.from('users').select('id, name, email, strongSubjects, stats, academicLevel').neq('id', userId).overlaps('strongSubjects', weakSubjects).limit(5);
    if (error) throw error;
    return data as User[];
  } catch { return []; }
}

export async function searchUsers(query: string): Promise<User[]> {
  if (!query) return [];
  
  const results: User[] = [];
  const lowerQuery = query.toLowerCase();

  // 1. Search local storage first
  try {
    const raw = localStorage.getItem('relearn_users');
    if (raw) {
      const localUsers = JSON.parse(raw);
      Object.values(localUsers).forEach((u: any) => {
        if (u.name?.toLowerCase().includes(lowerQuery) || u.email?.toLowerCase().includes(lowerQuery)) {
          results.push(u as User);
        }
      });
    }
  } catch (e) {}

  // 2. Search Supabase
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, profileSettings')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
        
      if (!error && data) {
        data.forEach(su => {
          if (!results.find(ru => ru.id === su.id)) {
            results.push(su as User);
          }
        });
      }
    } catch (err) {
      console.warn('[DataService] Supabase searchUsers failed:', err);
    }
  }

  return results.slice(0, 10);
}

export type { UnsyncedChange, SyncResult };
export { syncOfflineData };
