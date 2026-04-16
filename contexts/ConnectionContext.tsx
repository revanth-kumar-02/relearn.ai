
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { syncOfflineData, getUnsyncedCount } from '../services/dataService';
import { supabaseAvailable } from '../services/supabase';

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface ConnectionContextType {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether Supabase is configured and available at all */
  isSupabaseConfigured: boolean;
  /** Number of pending unsynced changes */
  unsyncedCount: number;
  /** Manually trigger a sync */
  triggerSync: () => Promise<void>;
  /** Last sync timestamp */
  lastSynced: string | null;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Update unsynced count reactively via BroadcastChannel events (from dataService)
  // instead of polling every 5 seconds.
  useEffect(() => {
    const update = () => setUnsyncedCount(getUnsyncedCount());
    update();

    // Listen for cross-tab sync queue changes
    const handleSyncQueueChanged = () => update();
    window.addEventListener('relearn:sync-queue-changed', handleSyncQueueChanged);

    // Safety-net fallback: poll every 30s in case events are missed
    const interval = setInterval(update, 30000);

    return () => {
      window.removeEventListener('relearn:sync-queue-changed', handleSyncQueueChanged);
      clearInterval(interval);
    };
  }, []);

  // Trigger sync when coming back online
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || !supabaseAvailable) return;
    
    setStatus('syncing');
    try {
      const result = await syncOfflineData();
      setUnsyncedCount(getUnsyncedCount());
      if (result.synced > 0) {
        setLastSynced(new Date().toISOString());
      }
    } catch (err) {
      console.warn('[ConnectionProvider] Sync error:', err);
    }
    setStatus(navigator.onLine ? 'online' : 'offline');
  }, []);

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
        triggerSync,
        lastSynced,
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
