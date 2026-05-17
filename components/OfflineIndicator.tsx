import React, { useState } from 'react';
import { useConnection } from '../contexts/ConnectionContext';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineIndicatorProps {
    showMobileNav?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ showMobileNav }) => {
    const { status } = useConnection();
    const [isExpanded, setIsExpanded] = useState(false);

    // Only show when the device is entirely offline. Completely ignore background sync errors.
    const shouldShow = status === 'offline';
    
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
                        bg-surface-light/80 dark:bg-surface-dark/80 border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark
                        hover:scale-110 active:scale-95
                    `}
                >
                    <div className="relative flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">
                            cloud_off
                        </span>
                    </div>

                    {isExpanded && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 'auto', opacity: 1 }}
                            className="flex flex-col pr-4 pl-1 min-w-[150px] overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-[9px] uppercase tracking-wider">
                                    You are Offline
                                </span>
                                <span className="material-symbols-outlined text-xs opacity-50">close</span>
                            </div>

                            <p className="text-[9px] opacity-80 leading-tight">
                                Saved locally.
                            </p>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OfflineIndicator;
