import React, { useState, useEffect, useCallback } from 'react';
import { getSyncHealth, retryFailedSyncs, syncOfflineData, SyncHealth } from '../../services/dataService';
import Icon from './Icon';
import { motion, AnimatePresence } from 'motion/react';

const SyncStatus: React.FC = () => {
    const [health, setHealth] = useState<SyncHealth>(getSyncHealth());
    const [showDetails, setShowDetails] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    const updateHealth = useCallback(() => {
        setHealth(getSyncHealth());
    }, []);

    useEffect(() => {
        // Poll every 5 seconds for background changes
        const interval = setInterval(updateHealth, 5000);
        
        // Listen for immediate changes from other tabs or manual triggers
        window.addEventListener('relearn:sync-queue-changed', updateHealth);
        window.addEventListener('online', updateHealth);

        return () => {
            clearInterval(interval);
            window.removeEventListener('relearn:sync-queue-changed', updateHealth);
            window.removeEventListener('online', updateHealth);
        };
    }, [updateHealth]);

    const handleRetry = async () => {
        setIsRetrying(true);
        retryFailedSyncs();
        await syncOfflineData();
        updateHealth();
        setIsRetrying(false);
    };

    if (health.pendingCount === 0 && health.failedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-6 z-[60] print:hidden">
            <AnimatePresence>
                {!showDetails ? (
                    <motion.button
                        layoutId="sync-pill"
                        onClick={() => setShowDetails(true)}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-all ${
                            health.failedCount > 0 
                                ? 'bg-red-500/90 border-red-400 text-white animate-pulse' 
                                : 'bg-stone-900/90 border-stone-700 text-stone-300'
                        }`}
                    >
                        {health.failedCount > 0 ? (
                            <>
                                <Icon name="report" className="text-sm" />
                                <span className="text-xs font-bold">{health.failedCount} Errors</span>
                            </>
                        ) : (
                            <>
                                <Icon name="sync" className="text-sm animate-spin" />
                                <span className="text-xs font-medium">Syncing {health.pendingCount}...</span>
                            </>
                        )}
                    </motion.button>
                ) : (
                    <motion.div
                        layoutId="sync-pill"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl w-80 overflow-hidden"
                    >
                        <div className={`p-4 flex items-center justify-between ${health.failedCount > 0 ? 'bg-red-500 text-white' : 'bg-stone-100 dark:bg-stone-800'}`}>
                            <div className="flex items-center gap-2">
                                <Icon name={health.failedCount > 0 ? "error_meditation" : "sync"} className={health.failedCount > 0 ? "" : "animate-spin"} />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Synchronization</h3>
                            </div>
                            <button onClick={() => setShowDetails(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors flex items-center justify-center">
                                <Icon name="close" className="text-lg" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 text-stone-900 dark:text-stone-100">
                            {health.failedCount > 0 ? (
                                <div className="space-y-3">
                                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50">
                                        <p className="text-xs font-medium text-red-800 dark:text-red-200">
                                            {health.failedCount} change{health.failedCount > 1 ? 's' : ''} couldn't be saved to the server after multiple attempts.
                                        </p>
                                        {health.lastError && (
                                            <p className="text-[10px] mt-1 text-red-600 dark:text-red-400 font-mono line-clamp-2">
                                                Last error: {health.lastError}
                                            </p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={handleRetry}
                                        disabled={isRetrying}
                                        className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        <Icon name={isRetrying ? "progress_activity" : "sync"} className={isRetrying ? "animate-spin text-sm" : "text-sm"} />
                                        Retry Saving All
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                                    <Icon name="progress_activity" className="animate-spin text-primary" />
                                    <p className="text-xs text-stone-600 dark:text-stone-400">
                                        Pushing <span className="font-bold text-stone-900 dark:text-stone-100">{health.pendingCount}</span> local update{health.pendingCount > 1 ? 's' : ''} to cloud storage...
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-[10px] text-stone-400 uppercase font-bold tracking-widest px-1">
                                <Icon name="wifi_off" className="text-xs" />
                                <span>Offline-first mode active</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SyncStatus;
