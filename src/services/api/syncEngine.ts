/**
 * ─────────────────────────────────────────────────────────────────
 *  ReLearn.ai — Sync Engine
 * ─────────────────────────────────────────────────────────────────
 * 
 * Manages the offline-to-online synchronization queue,
 * cross-tab notifications, and LWW merge logic.
 */

import { lsGet, lsSet } from '../storage/storageService';
import { SYNC_MAX_RETRIES } from '../../config/gemini.config';

export interface UnsyncedChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'plans' | 'tasks' | 'activity' | 'notifications' | 'users' | 'mistakes';
  data?: Record<string, unknown>;
  timestamp: string;
  userId: string;
  retryCount: number;
  permanentlyFailed: boolean;
  lastError?: string;
}

const syncChannel = typeof window !== 'undefined' ? new BroadcastChannel('relearn_sync') : null;

export function notifyOtherTabs(): void {
  syncChannel?.postMessage({ type: 'queue-updated', timestamp: Date.now() });
}

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.type === 'queue-updated') {
      window.dispatchEvent(new CustomEvent('relearn:sync-queue-changed'));
    }
  };
}

export function getUnsyncedChanges(): UnsyncedChange[] {
  return lsGet('unsynced_changes', []);
}

export function addUnsyncedChange(change: Omit<UnsyncedChange, 'timestamp' | 'retryCount' | 'permanentlyFailed'>): void {
  const changes = getUnsyncedChanges();
  const newTimestamp = new Date().toISOString();

  const existingIndex = changes.findIndex(
    (c) => c.id === change.id && c.collection === change.collection
  );

  if (existingIndex !== -1) {
    const existing = changes[existingIndex];
    if (new Date(existing.timestamp).getTime() > new Date(newTimestamp).getTime()) return;
    
    changes[existingIndex] = {
      ...change,
      timestamp: newTimestamp,
      retryCount: existing.retryCount || 0,
      permanentlyFailed: existing.permanentlyFailed || false,
    };
  } else {
    changes.push({
      ...change,
      timestamp: newTimestamp,
      retryCount: 0,
      permanentlyFailed: false,
    });
  }

  lsSet('unsynced_changes', changes);
  notifyOtherTabs();
}

/**
 * Last-Write-Wins (LWW) Merge Logic
 */
export function mergeCollections<T extends { id: string; updatedAt?: string }>(
  local: T[],
  incoming: T[]
): T[] {
  const map = new Map<string, T>();
  local.forEach(item => map.set(item.id, item));
  
  incoming.forEach(incomingItem => {
    const existing = map.get(incomingItem.id);
    if (!existing || new Date(incomingItem.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime()) {
      map.set(incomingItem.id, incomingItem);
    }
  });
  
  return Array.from(map.values());
}

export function removeUnsyncedChange(id: string, col: string): void {
  const changes = getUnsyncedChanges();
  lsSet(
    'unsynced_changes',
    changes.filter((c) => !(c.id === id && c.collection === col))
  );
  notifyOtherTabs();
}

export function markUnsyncedFailed(id: string, col: string, errorMsg: string): void {
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

import { supabase } from '../../lib/supabase';

export interface SyncResult {
  synced: number;
  failed: number;
  permanentlyFailed: number;
  failedItems: Array<{ id: string; collection: string; error: string }>;
}

export async function syncOfflineData(): Promise<SyncResult> {
  const changes = getUnsyncedChanges();
  const retryable = changes.filter((c) => !c.permanentlyFailed);
  const alreadyFailed = changes.filter((c) => c.permanentlyFailed);

  if (retryable.length === 0 && alreadyFailed.length === 0) {
    return { synced: 0, failed: 0, permanentlyFailed: 0, failedItems: [] };
  }

  let synced = 0;
  let failed = 0;
  const failedItems: Array<{ id: string; collection: string; error: string }> = [];

  // Sort retryable to ensure parent records (plans) sync before child records (tasks)
  const collectionPriority: Record<string, number> = {
    'users': 1,
    'plans': 2,
    'tasks': 3,
    'activity': 4,
    'notifications': 5,
    'mistakes': 6
  };
  
  retryable.sort((a, b) => {
    return (collectionPriority[a.collection] || 99) - (collectionPriority[b.collection] || 99);
  });

  for (const change of retryable) {
    try {
      // Exponential backoff if we've failed before
      if (change.retryCount > 0) {
        await waitWithJitter(change.retryCount);
      }

      let error = null;
      
      // ── CONFLICT RESOLUTION (LWW) ──
      if (change.type !== 'delete' && change.data?.updatedAt) {
        try {
          const { data: remote } = await supabase
            .from(change.collection)
            .select('updatedAt')
            .eq('id', change.id)
            .single();

          if (remote?.updatedAt && new Date(remote.updatedAt as string) > new Date(change.data.updatedAt as string)) {
             removeUnsyncedChange(change.id, change.collection);
             synced++;
             continue;
          }
        } catch { /* proceed */ }
      }

      // ── DATA CLEANING ──
      let payload: Record<string, unknown> = {};
      if (change.data) {
        const { updatedAt, ...rawPayload } = change.data as Record<string, unknown>;
        payload = { ...rawPayload };

        if (typeof payload.progress === 'number') payload.progress = Math.round(payload.progress);
        if (change.collection === 'tasks' && !payload.type) payload.type = 'reading';
        if (change.collection === 'users') {
          delete payload.isVerified;
          delete payload.password;
        }
      }

      switch (change.type) {
        case 'create':
          const { error: insErr } = await supabase.from(change.collection).upsert(payload, { onConflict: 'id' });
          error = insErr;
          break;
        case 'update':
          const { error: updErr } = await supabase.from(change.collection).update(payload).eq('id', change.id);
          error = updErr;
          break;
        case 'delete':
          const { error: delErr } = await supabase.from(change.collection).delete().eq('id', change.id);
          error = delErr;
          break;
      }

      if (error) throw error;
      removeUnsyncedChange(change.id, change.collection);
      synced++;
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error';
      
      // Automatic FK constraint resolution: Re-queue missing parent plan
      if (errorMsg.includes('foreign key constraint') && change.collection === 'tasks' && change.data?.planId) {
        try {
           const localPlans = lsGet('plans', []) as Array<Record<string, unknown>>;
           const parentPlan = localPlans.find((p: any) => p.id === change.data!.planId);
           if (parentPlan) {
              // Re-queue the plan silently
              addUnsyncedChange({
                  id: parentPlan.id as string,
                  collection: 'plans',
                  type: 'update',
                  data: parentPlan,
                  userId: change.userId
              });
              
              // Reset the task's retry count so it silently waits for the plan without showing an error
              const currentChanges = getUnsyncedChanges();
              lsSet('unsynced_changes', currentChanges.map(c => 
                 c.id === change.id ? { ...c, retryCount: 0, permanentlyFailed: false } : c
              ));
              continue; // Skip markUnsyncedFailed to hide the error from the UI
           } else {
              // If the plan doesn't even exist locally, this task is permanently orphaned.
              // Silently delete the unsynced task to stop it from failing forever.
              removeUnsyncedChange(change.id, change.collection);
              continue; // Skip markUnsyncedFailed
           }
        } catch { /* ignore recovery errors */ }
      }

      markUnsyncedFailed(change.id, change.collection, errorMsg);
      failed++;
      failedItems.push({ id: change.id, collection: change.collection, error: errorMsg });
    }
  }

  const updatedChanges = getUnsyncedChanges();
  const permFailed = updatedChanges.filter((c) => c.permanentlyFailed);
  
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

/**
 * Exponential Backoff with Jitter
 */
export async function waitWithJitter(retryCount: number): Promise<void> {
  const base = 1000; // 1s
  const max = 30000; // 30s
  const delay = Math.min(max, base * Math.pow(2, retryCount));
  const jitter = delay * 0.1 * Math.random();
  return new Promise(resolve => setTimeout(resolve, delay + jitter));
}
