
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useConnection } from '../contexts/ConnectionContext';

/**
 * Floating connection status indicator.
 * Shows:
 *  - 🟢 Online (auto-hides after 3s)
 *  - 🟡 Syncing (with spinner)
 *  - 🔴 Offline (persistent) with pending changes count
 */
const OfflineIndicator: React.FC = () => {
  const { status, unsyncedCount, isSupabaseConfigured, triggerSync } = useConnection();
  const [visible, setVisible] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const [lastDismissedCount, setLastDismissedCount] = useState<number>(0);

  useEffect(() => {
    // 1. Offline or Syncing: Always visible, no timeout
    if (status === 'offline' || status === 'syncing') {
      setVisible(true);
      setShowOnline(false);
      setLastDismissedCount(0); // Reset when status changes significantly
      return;
    }

    // 2. Online + Unsynced: Show "Sync Now" for 10 seconds IF count changed
    if (status === 'online' && unsyncedCount > 0) {
      if (unsyncedCount <= lastDismissedCount) {
        // We already timed out for this amount of changes (or fewer)
        // Don't show again unless the count INCREASES (new work)
        return;
      }

      setVisible(true);
      setShowOnline(false);
      
      const timer = setTimeout(() => {
        setVisible(false);
        setLastDismissedCount(unsyncedCount);
      }, 10000);
      return () => clearTimeout(timer);
    }

    // 3. Just changed from offline/syncing to online (and synced): Show success for 3s
    if (status === 'online' && unsyncedCount === 0) {
      setShowOnline(true);
      setVisible(true);
      setLastDismissedCount(0); // Reset
      
      const timer = setTimeout(() => {
        setShowOnline(false);
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Default: Hidden
    setVisible(false);
  }, [status, unsyncedCount, lastDismissedCount]);

  if (!visible && !showOnline) return null;

  // Don't show anything if Firebase is not configured and we're online
  if (!isSupabaseConfigured && status === 'online') return null;

  const getConfig = () => {
    if (status === 'offline') {
      return {
        bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
        icon: 'cloud_off',
        text: unsyncedCount > 0
          ? `Offline — ${unsyncedCount} change${unsyncedCount > 1 ? 's' : ''} pending`
          : 'You are offline',
        showRetry: false,
        animate: 'animate-pulse',
      };
    }

    if (status === 'syncing') {
      return {
        bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
        icon: 'sync',
        text: 'Syncing changes...',
        showRetry: false,
        animate: 'animate-spin',
      };
    }

    if (showOnline) {
      return {
        bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
        icon: 'cloud_done',
        text: 'Back online — all synced ✓',
        showRetry: false,
        animate: '',
      };
    }

    if (unsyncedCount > 0) {
      return {
        bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
        icon: 'cloud_upload',
        text: `${unsyncedCount} unsynced change${unsyncedCount > 1 ? 's' : ''}`,
        showRetry: true,
        animate: '',
      };
    }

    return null;
  };

  const config = getConfig();
  if (!config) return null;

  return (
    <AnimatePresence>
      {(visible || showOnline) && config && (
        <motion.div 
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          className="fixed top-4 left-1/2 z-[9999] pointer-events-none"
        >
          <div
            className={`${config.bg} text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-sm font-medium pointer-events-auto backdrop-blur-sm transition-colors duration-500`}
          >
            <span className={`material-symbols-outlined text-lg ${config.animate}`}>
              {config.icon}
            </span>
            <span>{config.text}</span>
            {config.showRetry && (
              <button
                onClick={(e) => { e.stopPropagation(); triggerSync(); }}
                className="ml-1 bg-white/20 hover:bg-white/30 rounded-full px-3 py-0.5 text-xs font-bold transition-colors active:scale-95"
              >
                Sync Now
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
