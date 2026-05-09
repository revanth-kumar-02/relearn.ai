import React from 'react';
import { motion } from 'motion/react';
import Icon from '../common/Icon';
import KPICard from './KPICard';
import { GlobalStats } from '../../services/adminService';

const AdminCharts = React.lazy(() => import('./AdminCharts'));

interface OverviewPanelProps {
    stats: GlobalStats | null;
    growthData: any[];
    setActiveTab: (tab: any) => void;
    setVerificationFilter: (filter: any) => void;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({ stats, growthData, setActiveTab, setVerificationFilter }) => {
    return (
        <div className="space-y-8 pb-12">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                <KPICard label="Total Users" value={stats?.totalUsers || 0} icon="group" color="indigo" onClick={() => setActiveTab('users')} />
                <KPICard label="Online Users" value={stats?.onlineUsers || 0} icon="person_pin_circle" color="emerald" onClick={() => { setActiveTab('users'); setVerificationFilter('online'); }} />
                <KPICard label="AI Plans" value={stats?.totalPlans || 0} icon="auto_awesome" color="purple" onClick={() => setActiveTab('plans')} />
                <KPICard label="Study Rooms" value={stats?.totalRooms || 0} icon="hub" color="amber" onClick={() => setActiveTab('rooms')} />
                <KPICard label="Messages" value={stats?.totalMessages || 0} icon="chat" color="emerald" className="col-span-2 lg:col-span-1" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gemini API Usage Card */}
                <div className="lg:col-span-2 glass-card noise-overlay rounded-[2.5rem] p-8 border border-white/40 shadow-xl overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-stone-500">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center glow-primary">
                                <Icon name="memory" className="text-indigo-600" />
                            </div>
                            Quantum Model Infrastructure
                        </h3>
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-black tracking-tight tabular-nums">
                                {stats?.apiUsage ? ((stats.apiUsage.used / stats.apiUsage.limit) * 100).toFixed(1) : 0}%
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Capacity Utilized
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="h-6 w-full bg-stone-100 dark:bg-stone-800/50 rounded-full overflow-hidden p-1 border border-stone-200/50 dark:border-stone-700/50">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: stats?.apiUsage ? `${Math.min(100, (stats.apiUsage.used / stats.apiUsage.limit) * 100)}%` : '0%' }}
                                className={`h-full rounded-full relative ${stats?.apiUsage && stats.apiUsage.used / stats.apiUsage.limit > 0.9 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                                transition={{ duration: 1.5, ease: "circOut" }}
                            >
                                <div className="absolute inset-0 bg-[length:20px_20px] bg-gradient-to-r from-white/10 to-transparent animate-[shimmer_2s_linear_infinite]" />
                            </motion.div>
                        </div>
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <span>{stats?.apiUsage?.used.toLocaleString()} Tokens Used</span>
                            <span>Limit: {stats?.apiUsage?.limit.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* System Heartbeat Visualization */}
                <div className="glass-card noise-overlay rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 opacity-50" />
                    
                    <div className="relative z-10 space-y-6 w-full">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">System Heartbeat</h3>
                        
                        <div className="h-24 w-full flex items-center justify-center gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ 
                                        height: [20, Math.random() * 60 + 20, 20],
                                        opacity: [0.3, 1, 0.3]
                                    }}
                                    transition={{ 
                                        duration: 0.8, 
                                        repeat: Infinity, 
                                        delay: i * 0.1,
                                        ease: "easeInOut"
                                    }}
                                    className="w-1.5 bg-indigo-500 rounded-full glow-primary"
                                />
                            ))}
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Core Synchronized</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <React.Suspense fallback={
                <div className="h-64 flex items-center justify-center glass-card noise-overlay rounded-[2.5rem]">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                <AdminCharts growthData={growthData} />
            </React.Suspense>
        </div>
    );
};

export default OverviewPanel;
