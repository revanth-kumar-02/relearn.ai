import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Icon from './common/Icon';
import { systemService, SystemStatus } from '../services/systemService';
import { triggerHaptic } from '../utils/haptics';

const AdminDashboard: React.FC = () => {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        systemService.getSystemStatus().then(setStatus);
    }, []);

    const updateStatus = async (updates: Partial<SystemStatus>) => {
        setIsLoading(true);
        try {
            await systemService.updateSystemStatus(updates);
            setStatus(prev => prev ? { ...prev, ...updates } : null);
            triggerHaptic('medium');
        } catch (error) {
            console.error('Failed to update system status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-8">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Icon name="admin_panel_settings" className="text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Admin Console</h1>
                        <p className="text-sm font-bold text-text-secondary-light">Manage global system settings and maintenance.</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Maintenance Control Center */}
                <div className="bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark p-8 shadow-xl shadow-black/[0.02]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                                <Icon name="construction" />
                            </div>
                            <h2 className="font-black uppercase tracking-widest text-xs">Maintenance Mode</h2>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            status?.maintenance_mode ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                        }`}>
                            {status?.maintenance_mode ? 'Active' : 'Offline'}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            disabled={isLoading}
                            onClick={() => updateStatus({ maintenance_mode: !status?.maintenance_mode, status: 'active' })}
                            className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 ${
                                status?.maintenance_mode 
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                                : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            }`}
                        >
                            <Icon name={status?.maintenance_mode ? 'power_settings_new' : 'bolt'} />
                            <span>{status?.maintenance_mode ? 'End Maintenance' : 'Start Global Maintenance'}</span>
                        </button>

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <button
                                disabled={isLoading || !status?.maintenance_mode || status.status === 'completed'}
                                onClick={() => updateStatus({ status: 'completed' })}
                                className="py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                            >
                                Set Work Done
                            </button>
                            <button
                                disabled={isLoading || !status?.maintenance_mode}
                                onClick={() => updateStatus({ maintenance_mode: false, status: 'none' })}
                                className="py-4 rounded-2xl bg-slate-800 text-white font-black text-xs uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95"
                            >
                                Release App
                            </button>
                        </div>
                    </div>

                    <p className="mt-8 text-[11px] font-bold text-text-secondary-light leading-relaxed bg-gray-50 dark:bg-stone-900 p-4 rounded-xl border border-border-light dark:border-border-dark italic">
                        Tip: "Set Work Done" will show the Refresh button to users. "Release App" will turn off the maintenance mode entirely.
                    </p>
                </div>

                {/* System Stats (Placeholder) */}
                <div className="bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark p-8 shadow-xl shadow-black/[0.02] flex flex-col justify-center items-center text-center">
                    <Icon name="monitoring" className="text-4xl text-slate-300 mb-4" />
                    <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs">Analytics Coming Soon</h3>
                    <p className="text-xs font-bold text-text-secondary-light/40 mt-2">We are integrating real-time system monitoring.</p>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
