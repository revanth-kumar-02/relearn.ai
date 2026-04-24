
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { syncOfflineData, getUnsyncedCount, getFailedSyncCount } from '../services/dataService';
import { supabaseAvailable } from '../services/supabase';

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface ConnectionContextType {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether Supabase is configured and available at all */
  isSupabaseConfigured: boolean;
  /** Number of pending unsynced changes */
  unsyncedCount: number;
  /** Number of permanently failed sync items */
  failedSyncCount: number;
  /** Detailed list of failed sync items */
  failedItems: Array<{ id: string; collection: string; lastError?: string; type: string }>;
  /** Manually trigger a sync */
  triggerSync: () => Promise<void>;
  /** Last sync timestamp */
  lastSynced: string | null;
  /** Dismiss a specific failed sync */
  dismissFailedSync: (id: string, collection: string) => void;
  /** Retry all failed syncs */
  retryFailedSyncs: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [failedItems, setFailedItems] = useState<Array<{ id: string; collection: string; lastError?: string; type: string }>>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Update unsynced count reactively via BroadcastChannel events (from dataService)
  // instead of polling every 5 seconds.
  const updateCounts = useCallback(() => {
    setUnsyncedCount(getUnsyncedCount());
    setFailedSyncCount(getFailedSyncCount());
    import('../services/dataService').then(ds => setFailedItems(ds.getFailedSyncItems()));
  }, []);

  useEffect(() => {
    updateCounts();

    // Listen for cross-tab sync queue changes
    const handleSyncQueueChanged = () => updateCounts();
    window.addEventListener('relearn:sync-queue-changed', handleSyncQueueChanged);

    // Safety-net fallback: poll every 30s to update counts and retry sync if needed
    const interval = setInterval(() => {
      updateCounts();
      if (navigator.onLine && getUnsyncedCount() > 0) {
        triggerSync();
      }
    }, 30000);

    return () => {
      window.removeEventListener('relearn:sync-queue-changed', handleSyncQueueChanged);
      clearInterval(interval);
    };
  }, [updateCounts]);

  // Trigger sync when coming back online
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || !supabaseAvailable) return;
    
    setStatus('syncing');
    try {
      const result = await syncOfflineData();
      updateCounts();
      if (result.synced > 0) {
        setLastSynced(new Date().toISOString());
      }
    } catch (err) {
      console.warn('[ConnectionProvider] Sync error:', err);
    }
    setStatus(navigator.onLine ? 'online' : 'offline');
  }, [updateCounts]);

  const dismissFailedSync = useCallback((id: string, collection: string) => {
    import('../services/dataService').then(ds => {
      ds.dismissFailedSync(id, collection);
      updateCounts();
    });
  }, [updateCounts]);

  const retryFailedSyncs = useCallback(() => {
    import('../services/dataService').then(ds => {
      ds.retryFailedSyncs();
      updateCounts();
      triggerSync();
    });
  }, [updateCounts, triggerSync]);


  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      // Auto-sync when coming back online
      triggerSync();
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  return (
    <ConnectionContext.Provider
      value={{
        status,
        isSupabaseConfigured: supabaseAvailable,
        unsyncedCount,
        failedSyncCount,
        failedItems,
        triggerSync,
        lastSynced,
        dismissFailedSync,
        retryFailedSyncs,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
