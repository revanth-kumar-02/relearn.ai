/**
 * ─────────────────────────────────────────────────────────────────
 *  ReLearn.ai — Hybrid Data Service (Hardened)
 * ─────────────────────────────────────────────────────────────────
 *
 *  Supabase-first, localStorage-fallback data layer.
 *
 *  RULES:
 *    1. If Supabase works → use Supabase & cache to localStorage
 *    2. If Supabase fails → use localStorage seamlessly
 *    3. Unsynced changes are queued and pushed when online
 *    4. Failed sync items are tracked with retry counts
 *    5. The UI never breaks — all errors are logged, not thrown
 * ─────────────────────────────────────────────────────────────────
 */

import { supabase, supabaseAvailable } from './supabase';
import { Plan, Task, Activity, Notification as AppNotification, User } from '../types';
import { SYNC_MAX_RETRIES } from './gemini/config';

// ────────────────────────── localStorage helpers (Obfuscated) ──────────────────────────

const LS_PREFIX = 'relearn_';
const OBF_KEY = 'v1_rlrn_s3cr3t'; // Key for basic obfuscation

/**
 * Simple XOR obfuscation to prevent plain-text reading of sensitive data in DevTools.
 * This is NOT strong encryption, but a defense-in-depth layer for local storage.
 */
function obfuscate(str: string): string {
    try {
        const bytes = new TextEncoder().encode(str);
        const xored = bytes.map((byte, i) => 
            byte ^ OBF_KEY.charCodeAt(i % OBF_KEY.length)
        );
        const binString = Array.from(xored, (byte) => String.fromCharCode(byte)).join("");
        return btoa(binString);
    } catch (e) {
        console.error('[DataService] Obfuscation failed:', e);
        return btoa(unescape(encodeURIComponent(str))); // Fallback to basic btoa trick
    }
}

function deobfuscate(str: string): string {
    try {
        const binString = atob(str);
        const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
        const dexored = bytes.map((byte, i) => 
            byte ^ OBF_KEY.charCodeAt(i % OBF_KEY.length)
        );
        return new TextDecoder().decode(dexored);
    } catch {
        // Fallback for legacy plain-text or old obfuscation format
        try {
            return decodeURIComponent(escape(atob(str)));
        } catch {
            return str;
        }
    }
}

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = LS_PREFIX + 'test';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Strips large Base64 images from objects before they hit localStorage.
 * This saves ~90% of space for plans and diary entries.
 * Images are still available in memory and IndexedDB.
 */
function optimizeDataSize(value: any): any {
  if (!value || typeof value !== 'object') return value;
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => optimizeDataSize(item));
  }

  const optimized: any = { ...value };
  let modified = false;

  for (const key in optimized) {
    const val = optimized[key];
    if (typeof val === 'string' && val.length > 5000 && val.startsWith('data:image')) {
      optimized[key] = "[Stored in IndexedDB]"; // Placeholder
      modified = true;
    } else if (typeof val === 'object' && val !== null) {
      const nested = optimizeDataSize(val);
      if (nested !== val) {
        optimized[key] = nested;
        modified = true;
      }
    }
  }

  return modified ? optimized : value;
}

function lsGet<T>(key: string, fallback: T): T {
  if (!isLocalStorageAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return fallback;
    
    // Attempt deobfuscation
    const deobfuscated = deobfuscate(raw);
    try {
        return JSON.parse(deobfuscated);
    } catch {
        // Fallback for legacy plain-text data
        return JSON.parse(raw);
    }
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  if (!isLocalStorageAvailable()) {
    console.error('[DataService] Local storage is not available (Private mode?)');
    return;
  }

  try {
    // Optimize data before saving (strip large images from cache)
    // BUT: Keep them in unsynced_changes so they reach the server
    const dataToSave = key === 'unsynced_changes' ? value : optimizeDataSize(value);
    
    const serialized = JSON.stringify(dataToSave);
    const obfuscated = obfuscate(serialized);
    localStorage.setItem(LS_PREFIX + key, obfuscated);
  } catch (err: any) {
    // If we hit a QuotaExceededError, try to self-heal by pruning non-critical data
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      console.warn('[DataService] Local storage full. Attempting to prune non-critical data...');
      
      try {
        // Prune logic: 
        // 1. Clear non-essential collections
        const keysToRemove = Object.keys(localStorage).filter(k => 
          k.startsWith(LS_PREFIX + 'activity_') || 
          k.startsWith(LS_PREFIX + 'notifications_') || 
          k.startsWith(LS_PREFIX + 'analytics_') ||
          k.startsWith(LS_PREFIX + 'session_')
        );
        
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // 2. If it's the sync queue, we might need to prune very old failed items
        if (key === 'unsynced_changes' && Array.isArray(value)) {
           // Keep only the last 100 changes if storage is critical
           const prunedValue = value.slice(-100);
           const serialized = JSON.stringify(prunedValue);
           localStorage.setItem(LS_PREFIX + key, obfuscate(serialized));
        } else {
           // Try setting the original item again (now optimized)
           const serialized = JSON.stringify(optimizeDataSize(value));
           localStorage.setItem(LS_PREFIX + key, obfuscate(serialized));
        }
        
        console.log(`[DataService] Successfully saved ${key} after pruning.`);
        return;
      } catch (retryErr) {
        console.error('[DataService] Pruning failed to free enough space:', retryErr);
      }
    }

    console.error('[DataService] localStorage write failed:', err);
    window.dispatchEvent(
      new CustomEvent('relearn:storage-error', {
        detail: {
          key,
          message: 'Storage is full or restricted. Your changes may not be saved offline.',
        },
      })
    );
  }
}

// ────────────────────────── Cross-tab sync via BroadcastChannel ─────────────

let syncChannel: BroadcastChannel | null = null;
try {
  syncChannel = new BroadcastChannel('relearn_sync');
} catch {
  // BroadcastChannel not supported (e.g., older Safari) — single-tab only
}

/** Notify other tabs that the unsynced queue has changed */
function notifyOtherTabs(): void {
  try {
    syncChannel?.postMessage({ type: 'queue-updated', timestamp: Date.now() });
  } catch { /* noop */ }
}

// Listen for queue updates from other tabs and reconcile
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.type === 'queue-updated') {
      // Force any component listening to the queue to re-read from localStorage
      window.dispatchEvent(new CustomEvent('relearn:sync-queue-changed'));
    }
  };
}

// ────────────────────────── Unsynced change queue ──────────────────────────

interface UnsyncedChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'plans' | 'tasks' | 'activity' | 'notifications' | 'users';
  data?: Record<string, unknown>;
  timestamp: string;
  userId: string;
  /** Number of times this item has failed to sync */
  retryCount: number;
  /** If true, this item has exceeded max retries and needs manual resolution */
  permanentlyFailed: boolean;
  /** Last error message from the sync attempt */
  lastError?: string;
}

function getUnsyncedChanges(): UnsyncedChange[] {
  return lsGet('unsynced_changes', []);
}

function addUnsyncedChange(change: Omit<UnsyncedChange, 'timestamp' | 'retryCount' | 'permanentlyFailed'>): void {
  const changes = getUnsyncedChanges();

  // Deduplicate: if same id+collection exists, replace with latest (preserve retry count)
  const existing = changes.find(
    (c) => c.id === change.id && c.collection === change.collection
  );
  const filtered = changes.filter(
    (c) => !(c.id === change.id && c.collection === change.collection)
  );

  filtered.push({
    ...change,
    timestamp: new Date().toISOString(),
    retryCount: existing?.retryCount || 0,
    permanentlyFailed: existing?.permanentlyFailed || false,
  });
  lsSet('unsynced_changes', filtered);
  notifyOtherTabs();
}

function removeUnsyncedChange(id: string, col: string): void {
  const changes = getUnsyncedChanges();
  lsSet(
    'unsynced_changes',
    changes.filter((c) => !(c.id === id && c.collection === col))
  );
  notifyOtherTabs();
}

function markUnsyncedFailed(id: string, col: string, errorMsg: string): void {
  const changes = getUnsyncedChanges();
  lsSet(
    'unsynced_changes',
    changes.map((c) => {
      if (c.id === id && c.collection === col) {
        const newRetry = (c.retryCount || 0) + 1;
        return {
          ...c,
          retryCount: newRetry,
          permanentlyFailed: newRetry >= SYNC_MAX_RETRIES,
          lastError: errorMsg,
        };
      }
      return c;
    })
  );
}

// ────────────────────────── Supabase availability check ──────────────────────────

function canUseSupabase(): boolean {
  return supabaseAvailable && navigator.onLine;
}

// ────────────────────────── PLANS ──────────────────────────

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
        lsSet(`plans_${userId}`, plans);
        return plans;
      }
    } catch (err) {
      console.warn('[DataService] Supabase getPlans failed, using cache:', err);
    }
  }

  return lsGet(`plans_${userId}`, []);
}

export async function createPlan(userId: string, plan: Plan): Promise<void> {
  const planWithMeta = {
    ...plan,
    userId,
    createdAt: plan.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const cached = lsGet<Plan[]>(`plans_${userId}`, []);
  lsSet(`plans_${userId}`, [planWithMeta, ...cached.filter((p) => p.id !== plan.id)]);

  if (canUseSupabase()) {
    try {
      const { updatedAt, ...payload } = planWithMeta as any;
      if (typeof payload.progress === 'number') {
        payload.progress = Math.round(payload.progress);
      }
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
    data: planWithMeta as unknown as Record<string, unknown>,
    userId,
  });
}

export async function updatePlan(
  userId: string,
  planId: string,
  updates: Partial<Plan>
): Promise<void> {
  const updatesWithMeta = { ...updates, updatedAt: new Date().toISOString() };
  const cached = lsGet<Plan[]>(`plans_${userId}`, []);
  lsSet(
    `plans_${userId}`,
    cached.map((p) => (p.id === planId ? { ...p, ...updatesWithMeta } : p))
  );

  if (canUseSupabase()) {
    try {
      const { updatedAt, ...payload } = updatesWithMeta;
      if (typeof payload.progress === 'number') {
        payload.progress = Math.round(payload.progress);
      }
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
    data: updatesWithMeta as Record<string, unknown>,
    userId,
  });
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
  const cached = lsGet<Plan[]>(`plans_${userId}`, []);
  lsSet(
    `plans_${userId}`,
    cached.filter((p) => p.id !== planId)
  );

  const cachedTasks = lsGet<Task[]>(`tasks_${userId}`, []);
  lsSet(
    `tasks_${userId}`,
    cachedTasks.filter((t) => t.planId !== planId)
  );

  if (canUseSupabase()) {
    try {
      const { error } = await supabase.from('plans').delete().eq('id', planId);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase deletePlan failed:', err);
    }
  }

  addUnsyncedChange({
    id: planId,
    type: 'delete',
    collection: 'plans',
    userId,
  });
}

// ────────────────────────── TASKS ──────────────────────────

export async function getTasks(userId: string): Promise<Task[]> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('userId', userId);
        
      if (error) throw error;
      
      if (data) {
        const tasks = data as Task[];
        lsSet(`tasks_${userId}`, tasks);
        return tasks;
      }
    } catch (err) {
      console.warn('[DataService] Supabase getTasks failed, using cache:', err);
    }
  }

  return lsGet(`tasks_${userId}`, []);
}

export async function createTask(userId: string, task: Task): Promise<void> {
  const taskWithMeta = {
    ...task,
    userId,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  lsSet(`tasks_${userId}`, [...cached.filter((t) => t.id !== task.id), taskWithMeta]);

  if (canUseSupabase()) {
    try {
      const { updatedAt, ...payload } = taskWithMeta as any;
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
    data: taskWithMeta as unknown as Record<string, unknown>,
    userId,
  });
}

export async function createTasksBatch(userId: string, tasks: Task[]): Promise<void> {
  const tasksWithMeta = tasks.map((task) => ({
    ...task,
    userId,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  const existingIds = new Set(tasksWithMeta.map((t) => t.id));
  lsSet(`tasks_${userId}`, [
    ...cached.filter((t) => !existingIds.has(t.id)),
    ...tasksWithMeta,
  ]);

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

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  const updatesWithMeta = { ...updates, updatedAt: new Date().toISOString() };
  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  lsSet(
    `tasks_${userId}`,
    cached.map((t) => (t.id === taskId ? { ...t, ...updatesWithMeta } : t))
  );

  if (canUseSupabase()) {
    try {
      const { updatedAt, ...payload } = updatesWithMeta as any;
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
    data: updatesWithMeta as Record<string, unknown>,
    userId,
  });
}

export async function updateTasksBatch(
  userId: string,
  taskIdUpdates: { id: string; updates: Partial<Task> }[]
): Promise<void> {
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
      const payload = taskIdUpdates.map(u => ({
        ...u.updates,
        id: u.id,
        userId,
        updatedAt
      }));
      
      const { error } = await supabase.from('tasks').upsert(payload);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase updateTasksBatch failed:', err);
    }
  }

  taskIdUpdates.forEach(({ id, updates }) => {
    addUnsyncedChange({
      id,
      type: 'update',
      collection: 'tasks',
      data: { ...updates, updatedAt },
      userId,
    });
  });
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const cached = lsGet<Task[]>(`tasks_${userId}`, []);
  lsSet(
    `tasks_${userId}`,
    cached.filter((t) => t.id !== taskId)
  );

  if (canUseSupabase()) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase deleteTask failed:', err);
    }
  }

  addUnsyncedChange({
    id: taskId,
    type: 'delete',
    collection: 'tasks',
    userId,
  });
}

// ────────────────────────── ACTIVITY ──────────────────────────

export async function getActivity(userId: string): Promise<Activity[]> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('userId', userId)
        .order('time', { ascending: false })
        .limit(50);
        
      if (error) throw error;

      if (data) {
        const activities = data as Activity[];
        lsSet(`activity_${userId}`, activities);
        return activities;
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

  // Queue for sync — activity is now preserved offline
  addUnsyncedChange({
    id: activity.id,
    type: 'create',
    collection: 'activity',
    data: activityWithMeta as unknown as Record<string, unknown>,
    userId,
  });
}

export async function clearAllActivity(userId: string): Promise<void> {
  lsSet(`activity_${userId}`, []);

  if (canUseSupabase()) {
    try {
      const { error } = await supabase.from('activity').delete().eq('userId', userId);
      if (error) throw error;
    } catch {
      // Silent fail
    }
  }
}

// ────────────────────────── NOTIFICATIONS ──────────────────────────

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('userId', userId)
        .order('time', { ascending: false });
        
      if (error) throw error;

      if (data) {
        const notifs = data as AppNotification[];
        lsSet(`notifications_${userId}`, notifs);
        return notifs;
      }
    } catch (err) {
      console.warn('[DataService] Supabase getNotifications failed:', err);
    }
  }

  return lsGet(`notifications_${userId}`, []);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const cached = lsGet<AppNotification[]>(`notifications_${userId}`, []);
  lsSet(
    `notifications_${userId}`,
    cached.map((n) => ({ ...n, read: true }))
  );

  if (canUseSupabase()) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('userId', userId)
        .eq('read', false);
      if (error) throw error;
    } catch {
      // Silent fail
    }
  }
}

export async function clearAllNotifications(userId: string): Promise<void> {
  lsSet(`notifications_${userId}`, []);

  if (canUseSupabase()) {
    try {
      const { error } = await supabase.from('notifications').delete().eq('userId', userId);
      if (error) throw error;
    } catch {
      // Silent fail
    }
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
  
  // Queue for sync — notification is now preserved offline
  addUnsyncedChange({
    id: newNotif.id,
    type: 'create',
    collection: 'notifications',
    data: newNotif as unknown as Record<string, unknown>,
    userId,
  });
  
  return newNotif;
}

// ────────────────────────── USER PROFILE ──────────────────────────

export async function getUserProfile(userId: string): Promise<User | null> {
  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, preferences, stats, profileSettings, academicLevel, learningGoals, preferredStudyTime, weakSubjects, strongSubjects, createdAt')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) throw error; 

      if (data) {
        const userData = data as User;
        lsSet(`user_${userId}`, userData);
        return userData;
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
      const { updatedAt, ...payload } = { id: userId, ...dataWithMeta } as any;
      const { error } = await supabase
        .from('users')
        .upsert(payload);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('[DataService] Supabase saveUserProfile failed:', err);
    }
  }

  addUnsyncedChange({
    id: userId,
    type: 'update',
    collection: 'users',
    data: dataWithMeta as Record<string, unknown>,
    userId,
  });
}

// ────────────────────────── SYNC ENGINE (Hardened) ──────────────────────────

export interface SyncResult {
  synced: number;
  failed: number;
  permanentlyFailed: number;
  failedItems: Array<{ id: string; collection: string; error: string }>;
}

export async function syncOfflineData(): Promise<SyncResult> {
  if (!canUseSupabase()) {
    return { synced: 0, failed: 0, permanentlyFailed: 0, failedItems: [] };
  }

  const changes = getUnsyncedChanges();
  // Only attempt items that haven't permanently failed
  const retryable = changes.filter((c) => !c.permanentlyFailed);
  const alreadyFailed = changes.filter((c) => c.permanentlyFailed);

  if (retryable.length === 0 && alreadyFailed.length === 0) {
    return { synced: 0, failed: 0, permanentlyFailed: 0, failedItems: [] };
  }

  console.log(`[DataService] 🔄 Syncing ${retryable.length} offline changes (${alreadyFailed.length} permanently failed)...`);

  let synced = 0;
  let failed = 0;
  const failedItems: Array<{ id: string; collection: string; error: string }> = [];

  for (const change of retryable) {
    try {
      let error = null;
      
      // ── CONFLICT RESOLUTION (Last-Updated-Wins) ──
      if (change.type !== 'delete' && change.data?.updatedAt) {
        try {
          const { data: remote } = await supabase
            .from(change.collection)
            .select('updatedAt')
            .eq('id', change.id)
            .single();

          if (remote?.updatedAt && new Date(remote.updatedAt as string) > new Date(change.data.updatedAt as string)) {
             console.log(`[DataService] Skipping sync for ${change.collection}/${change.id} - Remote is newer.`);
             removeUnsyncedChange(change.id, change.collection);
             synced++;
             continue;
          }
        } catch { /* Item might not exist yet, proceed with sync */ }
      }

      // ── DATA CLEANING (Schema Hardening) ──
      let payload: Record<string, unknown> = {};
      if (change.data) {
        const { updatedAt, ...rawPayload } = change.data as Record<string, unknown>;
        payload = { ...rawPayload };

        // 1. Fix Plan/Task progress rounding (must be integer for DB)
        if (typeof payload.progress === 'number') {
          payload.progress = Math.round(payload.progress);
        }

        // 2. Fix Task-specific issues
        if (change.collection === 'tasks') {
          // Ensure 'type' exists (NOT NULL constraint in DB)
          if (!payload.type) payload.type = 'reading';
          // Fix nested objects that might be stringified in some contexts
          if (typeof payload.tags === 'string') {
            try { payload.tags = JSON.parse(payload.tags); } catch { payload.tags = []; }
          }
        }

        // 3. Fix User-specific issues (Remove columns that don't exist in DB)
        if (change.collection === 'users') {
          delete payload.isVerified;
          delete payload.password; // Security: never push password even if it exists
        }
      }

      switch (change.type) {
        case 'create':
          if (change.data) {
            const { error: insErr } = await supabase.from(change.collection).upsert(payload);
            error = insErr;
          }
          break;
        case 'update':
          if (change.data) {
            const { error: updErr } = await supabase.from(change.collection).update(payload).eq('id', change.id);
            error = updErr;
          }
          break;
        case 'delete': {
          const { error: delErr } = await supabase.from(change.collection).delete().eq('id', change.id);
          error = delErr;
          break;
        }
      }

      if (error) throw error;

      removeUnsyncedChange(change.id, change.collection);
      synced++;
    } catch (err: any) {
      const errorMsg = err?.message || err?.details || 'Unknown error';
      console.warn(`[DataService] Sync failed for ${change.collection}/${change.id} (attempt ${(change.retryCount || 0) + 1}/${SYNC_MAX_RETRIES}):`, errorMsg);
      
      markUnsyncedFailed(change.id, change.collection, errorMsg);
      failed++;
      failedItems.push({
        id: change.id,
        collection: change.collection,
        error: errorMsg,
      });
    }
  }

  // Collect permanently failed items for the UI
  const updatedChanges = getUnsyncedChanges();
  const permFailed = updatedChanges.filter((c) => c.permanentlyFailed);

  console.log(`[DataService] ✅ Sync complete: ${synced} synced, ${failed} failed, ${permFailed.length} permanently failed.`);
  
  return {
    synced,
    failed,
    permanentlyFailed: permFailed.length,
    failedItems: [
      ...failedItems,
      ...permFailed.map((c) => ({
        id: c.id,
        collection: c.collection,
        error: c.lastError || 'Max retries exceeded',
      })),
    ],
  };
}

/** Get count of items still waiting to sync (excludes permanently failed) */
export function getUnsyncedCount(): number {
  return getUnsyncedChanges().filter((c) => !c.permanentlyFailed).length;
}

/** Get count of permanently failed sync items that need user attention */
export function getFailedSyncCount(): number {
  return getUnsyncedChanges().filter((c) => c.permanentlyFailed).length;
}

/** Get the detailed list of failed sync items */
export function getFailedSyncItems(): Array<{ id: string; collection: string; lastError?: string; type: string }> {
  return getUnsyncedChanges()
    .filter((c) => c.permanentlyFailed)
    .map(c => ({
      id: c.id,
      collection: c.collection,
      lastError: c.lastError,
      type: c.type
    }));
}

/** Clear a permanently failed item (user acknowledges the data loss) */
export function dismissFailedSync(id: string, collection: string): void {
  removeUnsyncedChange(id, collection);
}

/** Clear all permanently failed items */
export function clearAllFailedSyncs(): void {
  const changes = getUnsyncedChanges();
  lsSet(
    'unsynced_changes',
    changes.filter((c) => !c.permanentlyFailed)
  );
  notifyOtherTabs();
}

/** Retry all permanently failed items (resets their retry count) */
export function retryFailedSyncs(): void {
  const changes = getUnsyncedChanges();
  lsSet(
    'unsynced_changes',
    changes.map((c) =>
      c.permanentlyFailed ? { ...c, retryCount: 0, permanentlyFailed: false } : c
    )
  );
  notifyOtherTabs();
}

// ────────────────────────── ANALYTICS ──────────────────────────

const ANALYTICS_STORAGE_KEY = 'relearn_analytics_v1';

export type AnalyticsEventType = 
  | 'app_launch' 
  | 'plan_created' 
  | 'session_started' 
  | 'session_completed' 
  | 'task_updated' 
  | 'preferences_changed'
  | 'manual_generation_skipped_pdf';

interface AnalyticsPayload {
  timestamp: string;
  eventType: AnalyticsEventType;
  metadata?: Record<string, any>;
  sessionDuration?: number;
}

function getAnalyticsEvents(): AnalyticsPayload[] {
  return lsGet(ANALYTICS_STORAGE_KEY, []);
}

function saveAnalyticsEvents(events: AnalyticsPayload[]) {
  // Keep only last 200 events
  const trimmed = events.length > 200 ? events.slice(-200) : events;
  lsSet(ANALYTICS_STORAGE_KEY, trimmed);
}

export function trackAnalyticsEvent(eventType: AnalyticsEventType, metadata?: Record<string, any>) {
  const payload: AnalyticsPayload = {
    timestamp: new Date().toISOString(),
    eventType,
    metadata
  };

  const events = getAnalyticsEvents();
  events.push(payload);
  saveAnalyticsEvents(events);
  
  if (import.meta.env.DEV) {
    console.log(`[Analytics] 📊 EVENT: ${eventType}`, metadata);
  }
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
