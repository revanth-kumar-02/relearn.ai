import React, { useState, useEffect } from 'react';
import { useConnection } from '../contexts/ConnectionContext';
import { motion, AnimatePresence } from 'motion/react';

const OfflineIndicator: React.FC = () => {
    const { status, unsyncedCount, triggerSync } = useConnection();
    const [isExpanded, setIsExpanded] = useState(false);

    // Only show if we're actually offline, currently syncing, or have pending changes
    const shouldShow = status === 'offline' || status === 'syncing' || unsyncedCount > 0;

    if (!shouldShow) return null;

    const getStatusConfig = () => {
        if (status === 'offline') {
            return {
                icon: 'cloud_off',
                bg: 'bg-red-500',
                text: 'You are offline',
                subtext: `${unsyncedCount} changes waiting to sync`,
                action: 'Sync Now',
                actionIcon: 'sync'
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
        if (unsyncedCount > 0) {
            return {
                icon: 'cloud_upload',
                bg: 'bg-amber-500',
                text: 'Unsynced changes',
                subtext: `${unsyncedCount} items saved locally`,
                action: 'Push Changes',
                actionIcon: 'upload'
            };
        }
        return null;
    };

    const config = getStatusConfig();
    if (!config) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={status + unsyncedCount}
                initial={{ y: 100, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.9 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] print:hidden"
            >
                <div className={`
                    ${config.bg} text-white px-4 py-2.5 rounded-full shadow-2xl 
                    flex items-center gap-3 min-w-[200px] border border-white/20
                    backdrop-blur-md transition-all duration-500
                    ${isExpanded ? 'rounded-2xl py-4' : 'rounded-full'}
                `}>
                    <div className={`
                        w-8 h-8 rounded-full bg-white/20 flex items-center justify-center
                        ${config.isSyncing ? 'animate-spin' : ''}
                    `}>
                        <span className="material-symbols-outlined text-lg">{config.icon}</span>
                    </div>

                    <div className="flex-1 pr-2">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-wider leading-none">
                                    {config.text}
                                </p>
                                {isExpanded && (
                                    <p className="text-[10px] text-white/80 mt-1 font-medium italic">
                                        {config.subtext}
                                    </p>
                                )}
                            </div>

                            {config.action && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerSync();
                                    }}
                                    className="bg-white text-stone-900 text-[10px] font-black uppercase tracking-tight px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                                >
                                    <span className="material-symbols-outlined text-xs">{config.actionIcon}</span>
                                    {config.action}
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
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
