import { useEffect, useRef } from 'react';
import { adminService } from '../services/adminService';

/**
 * Hook to automatically update the user's presence (last_seen) in the database.
 * Only updates when the app is in focus to save DB calls, and throttles requests.
 */
export const usePresence = (userId?: string) => {
  const presenceInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const updatePresence = () => {
      // Only update if document is visible
      if (document.visibilityState === 'visible') {
        adminService.updatePresence(userId);
      }
    };

    // Initial update
    updatePresence();

    // Update every 60 seconds
    presenceInterval.current = setInterval(updatePresence, 60 * 1000);

    // Also update when user comes back to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (presenceInterval.current) clearInterval(presenceInterval.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);
};
