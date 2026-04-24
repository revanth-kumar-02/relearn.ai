import React, { useState, useEffect } from 'react';
import { useConnection } from '../contexts/ConnectionContext';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineIndicatorProps {
    showMobileNav?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ showMobileNav }) => {
    const { 
        status, 
        unsyncedCount, 
        failedSyncCount, 
        triggerSync, 
        retryFailedSyncs,
        clearAllFailedSyncs,
        failedItems 
    } = useConnection();
    const [isExpanded, setIsExpanded] = useState(false);

    // Only show if we're actually offline, currently syncing, have pending changes, or failed syncs
    const shouldShow = status === 'offline' || status === 'syncing' || unsyncedCount > 0 || failedSyncCount > 0;

    if (!shouldShow) return null;

    const getStatusConfig = () => {
        if (status === 'offline') {
            return {
                icon: 'cloud_off',
                bg: 'bg-red-500',
                text: 'You are offline',
                subtext: `${unsyncedCount} changes waiting to sync`,
                action: 'Sync Now',
                actionIcon: 'sync',
                onAction: triggerSync
            };
        }
        if (status === 'syncing') {
            return {
                icon: 'sync',
                bg: 'bg-primary',
                text: 'Syncing your progress...',
                subtext: 'Uploading changes to cloud',
                isSyncing: true
            };
        }
        if (failedSyncCount > 0) {
            return {
                icon: 'report_problem',
                bg: 'bg-red-600',
                text: 'Sync Failure',
                subtext: `${failedSyncCount} items failed to upload after retries`,
                action: 'Retry All',
                actionIcon: 'restart_alt',
                onAction: retryFailedSyncs
            };
        }
        if (unsyncedCount > 0) {
            return {
                icon: 'cloud_upload',
                bg: 'bg-amber-500',
                text: 'Unsynced changes',
                subtext: `${unsyncedCount} items saved locally`,
                action: 'Push Changes',
                actionIcon: 'upload',
                onAction: triggerSync
            };
        }
        return null;
    };

    const config = getStatusConfig();
    if (!config) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={status + unsyncedCount + failedSyncCount}
                initial={{ y: 100, opacity: 0, scale: 0.9 }}
                animate={{ 
                    y: showMobileNav ? -80 : 0, 
                    opacity: 1, 
                    scale: 1 
                }}
                exit={{ y: 100, opacity: 0, scale: 0.9 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] print:hidden w-full max-w-xs sm:max-w-md px-4"
            >
                <div className={`
                    ${config.bg} text-white px-4 py-2.5 rounded-full shadow-2xl 
                    flex items-center gap-3 min-w-[200px] border border-white/20
                    backdrop-blur-md transition-all duration-500
                    ${isExpanded ? 'rounded-2xl py-4' : 'rounded-full'}
                `}>
                    <div className={`
                        w-8 h-8 min-w-[32px] rounded-full bg-white/20 flex items-center justify-center
                        ${config.isSyncing ? 'animate-spin' : ''}
                    `}>
                        <span className="material-symbols-outlined text-lg">{config.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-wider leading-none truncate">
                                    {config.text}
                                </p>
                                {isExpanded && (
                                    <p className="text-[10px] text-white/80 mt-1 font-medium italic">
                                        {config.subtext}
                                    </p>
                                )}
                            </div>

                            {config.action && (
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            config.onAction?.();
                                        }}
                                        className="bg-white text-stone-900 text-[10px] font-black uppercase tracking-tight px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined text-xs">{config.actionIcon}</span>
                                        {config.action}
                                    </button>
                                    
                                    {failedSyncCount > 0 && isExpanded && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearAllFailedSyncs();
                                            }}
                                            className="bg-red-800/50 text-white text-[10px] font-black uppercase tracking-tight px-3 py-1.5 rounded-lg hover:bg-red-900/50 transition-colors flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                                        >
                                            <span className="material-symbols-outlined text-xs">delete_sweep</span>
                                            Clear All
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {isExpanded && failedSyncCount > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10 space-y-2 max-h-[150px] overflow-y-auto no-scrollbar">
                                {failedItems.map((item) => (
                                    <div key={item.id + item.collection} className="flex items-center justify-between gap-3 bg-black/10 p-2 rounded-lg">
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold uppercase opacity-70 leading-none">
                                                {item.collection} • {item.type}
                                            </p>
                                            <p className="text-[10px] truncate">
                                                {item.lastError || 'Unknown error'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => useConnection().dismissFailedSync(item.id, item.collection)}
                                            className="text-white/60 hover:text-white"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
                    >
                        <span className={`material-symbols-outlined text-base transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};


export default OfflineIndicator;
