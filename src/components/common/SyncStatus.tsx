import React, { useState, useEffect, useCallback } from 'react';
import { getSyncHealth, retryFailedSyncs, syncOfflineData } from '../../services/api/dataService';
import Icon from '../ui/Icon';
import { motion, AnimatePresence } from 'motion/react';

type SyncHealth = ReturnType<typeof getSyncHealth>;

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

    // Suppress visual popup UI as per user requirement, while preserving background sync listeners and health status updates
    return null;
};

export default SyncStatus;
