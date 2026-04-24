import React, { useState } from 'react';
import { useConnection } from '../contexts/ConnectionContext';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineIndicatorProps {
    showMobileNav?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ showMobileNav }) => {
    const { 
        status, 
        failedSyncCount, 
        clearAllFailedSyncs,
    } = useConnection();
    const [isExpanded, setIsExpanded] = useState(false);

    // Extremely subtle visibility: only show for actual failures or offline status
    // Syncing and pending changes are now hidden as they are "background" tasks.
    const shouldShow = status === 'offline' || failedSyncCount > 0;
    
    if (!shouldShow) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                    y: showMobileNav ? -80 : 0, 
                    opacity: 1 
                }}
                exit={{ y: 20, opacity: 0 }}
                className="fixed bottom-4 left-4 z-[9999] print:hidden"
            >
                <div 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`
                        flex items-center gap-2 p-2 rounded-full cursor-pointer shadow-lg border backdrop-blur-md transition-all
                        ${failedSyncCount > 0 
                            ? 'bg-red-500/90 border-red-400 text-white' 
                            : 'bg-surface-light/80 dark:bg-surface-dark/80 border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark'
                        }
                        hover:scale-110 active:scale-95
                    `}
                >
                    <div className="relative flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">
                            {failedSyncCount > 0 ? 'report' : 'cloud_off'}
                        </span>
                        {failedSyncCount > 0 && !isExpanded && (
                            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-red-500 shadow-sm">
                                {failedSyncCount}
                            </span>
                        )}
                    </div>

                    {isExpanded && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 'auto', opacity: 1 }}
                            className="flex flex-col pr-4 pl-1 min-w-[150px] overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-[9px] uppercase tracking-wider">
                                    {failedSyncCount > 0 ? 'Sync Errors' : 'You are Offline'}
                                </span>
                                <span className="material-symbols-outlined text-xs opacity-50">close</span>
                            </div>

                            {failedSyncCount > 0 ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearAllFailedSyncs();
                                        setIsExpanded(false);
                                    }}
                                    className="mt-1 py-1 px-3 bg-white text-red-600 hover:bg-stone-100 rounded-lg text-[9px] font-black uppercase transition-colors"
                                >
                                    Clear Errors
                                </button>
                            ) : (
                                <p className="text-[9px] opacity-80 leading-tight">
                                    Saved locally.
                                </p>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OfflineIndicator;
