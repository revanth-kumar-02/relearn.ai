import React from 'react';
import { useConnection } from '../../contexts/ConnectionContext';

export const SyncIndicator: React.FC = () => {
    const { status, unsyncedCount } = useConnection();
    
    if (status === 'offline') {
        return (
            <div className="flex flex-col items-center justify-center opacity-50" title="Working Offline">
                <span className="material-symbols-outlined text-xl text-text-secondary-light">cloud_off</span>
                <span className="text-[8px] font-black uppercase tracking-tighter text-text-secondary-light">Offline</span>
            </div>
        );
    }

    if (unsyncedCount > 0 || status === 'syncing') {
        return (
            <div className="flex flex-col items-center justify-center" title={`${unsyncedCount} changes pending sync`}>
                <span className="material-symbols-outlined text-xl text-primary animate-pulse">cloud_sync</span>
                <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Syncing</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center opacity-40 group" title="All changes saved to cloud">
            <span className="material-symbols-outlined text-xl text-green-500 group-hover:opacity-100 transition-opacity">cloud_done</span>
            <span className="text-[8px] font-black text-green-500 uppercase tracking-tighter group-hover:opacity-100 transition-opacity whitespace-nowrap">Cloud Saved</span>
        </div>
    );
};
