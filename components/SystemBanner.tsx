import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './common/Icon';
import { adminService, Announcement } from '../services/adminService';

export const SystemBanner: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const activeAnnouncements = await adminService.getAnnouncements();
      setAnnouncements(activeAnnouncements.filter(a => a.active));
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.includes(a.id));

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none mt-2 px-4 gap-2">
      <AnimatePresence>
        {visibleAnnouncements.map((announcement) => (
          <motion.div
            key={announcement.id}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`pointer-events-auto flex items-center justify-between w-full max-w-4xl p-3 rounded-2xl shadow-xl border backdrop-blur-md ${
              announcement.type === 'emergency' 
                ? 'bg-red-500/90 border-red-400 text-white' 
                : announcement.type === 'warning'
                ? 'bg-amber-500/90 border-amber-400 text-white'
                : 'bg-indigo-600/90 border-indigo-400 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon 
                name={
                  announcement.type === 'emergency' ? 'warning' : 
                  announcement.type === 'warning' ? 'error_outline' : 'info'
                } 
                className="text-xl shrink-0"
              />
              <span className="text-sm font-bold tracking-tight">{announcement.content}</span>
            </div>
            <button 
              onClick={() => handleDismiss(announcement.id)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
