import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './common/Icon';
import { systemService, SystemStatus } from '../services/systemService';
import { useAuth } from '../contexts/AuthContext';
import { triggerHaptic } from '../utils/haptics';

const MaintenanceOverlay: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const { user } = useAuth();
  
  // Don't lock out the admin
  const isAdmin = user?.role === 'admin' || user?.email === 'admin@relearn.ai' || user?.email === 'imposterz.rev02@gmail.com'; 

  useEffect(() => {
    // Initial fetch
    systemService.getSystemStatus().then(setStatus);

    // Subscribe to changes
    const subscription = systemService.subscribeToStatus((newStatus) => {
      setStatus(newStatus);
      if (newStatus.maintenance_mode) {
        triggerHaptic('heavy');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!status?.maintenance_mode || isAdmin) return null;

  const handleRefresh = () => {
    triggerHaptic('medium');
    window.location.reload();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <div className="max-w-md w-full flex flex-col items-center gap-8">
          
          {/* Main Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-indigo-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-surface-dark shadow-lg flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                <Icon name="file_download" className="text-3xl text-slate-800 dark:text-slate-200" />
            </div>
          </motion.div>

          {/* Text Content */}
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {status.status === 'completed' ? 'Update Available!' : 'System Update...'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[320px] mx-auto">
              {status.status === 'completed' 
                ? "We've released a new version of ReLearn.ai. A quick refresh is needed to load the latest features."
                : "We're currently deploying a new version of ReLearn.ai. The application will be back online shortly."
              }
            </p>
          </div>

          {/* Action Button (Only visible when status is 'completed') */}
          <div className="h-20 flex items-center justify-center w-full">
            <AnimatePresence>
                {status.status === 'completed' && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleRefresh}
                        className="flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-2xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 group"
                    >
                        <Icon name="refresh" className="text-xl animate-spin-slow group-hover:rotate-180 transition-transform duration-500" />
                        <span>Refresh Now</span>
                    </motion.button>
                )}
            </AnimatePresence>
            
            {status.status !== 'completed' && (
                <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1.5">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-2 h-2 rounded-full bg-indigo-600" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 rounded-full bg-indigo-600" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 rounded-full bg-indigo-600" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60">Deploying Improvements</span>
                </div>
            )}
          </div>

          {/* Footer Branding */}
          <div className="mt-12 space-y-2 opacity-60">
            <div className="flex items-center justify-center gap-2">
                <Icon name="verified_user" className="text-slate-400 text-sm" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">ReLearn.ai Secure Recovery</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 italic">
                Reference: System Version Mismatch Detected
            </p>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MaintenanceOverlay;
