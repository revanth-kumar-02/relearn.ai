import React from 'react';
import { motion } from 'motion/react';
import Icon from '../common/Icon';
import KPICard from './KPICard';
import { GlobalStats, adminService } from '../../services/adminService';
import { marathonService } from '../../services/marathonService';
import { useToast } from '../../contexts/ToastContext';

const AdminCharts = React.lazy(() => import('./AdminCharts'));

interface OverviewPanelProps {
    stats: GlobalStats | null;
    growthData: any[];
    setActiveTab: (tab: any) => void;
    setVerificationFilter: (filter: any) => void;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({ stats, growthData, setActiveTab, setVerificationFilter }) => {
    const { showToast } = useToast();
    const [metrics, setMetrics] = React.useState({
        feedbackCount: 0,
        subscriberCount: 0,
        auditLogCount: 0,
        activeMarathonsCount: 0,
        isLoading: true
    });
    const [activity, setActivity] = React.useState<any[]>([]);

    React.useEffect(() => {
        let isMounted = true;
        const fetchMetrics = async () => {
            try {
                const [fb, subs, audit, marathons] = await Promise.all([
                    adminService.getFeedback(1, 1).catch(() => ({ count: 0 })),
                    adminService.getNewsletterSubscribers().catch(() => []),
                    adminService.getAuditLogs(1, 10).catch(() => ({ data: [], count: 0 })),
                    marathonService.getMarathons().catch(() => []),
                ]);
                
                if (isMounted) {
                    const realLogs = audit.data || [];
                    const combined = [...realLogs]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 5);

                    setActivity(combined);
                    setMetrics({
                        feedbackCount: fb.count || 0,
                        subscriberCount: subs.length || 0,
                        auditLogCount: audit.count || 0,
                        activeMarathonsCount: marathons.length || 0,
                        isLoading: false
                    });
                }
            } catch (err) {
                console.error("Failed to load modular metrics:", err);
                if (isMounted) {
                    setMetrics(prev => ({ ...prev, isLoading: false }));
                }
            }
        };
        fetchMetrics();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleExportUsers = async () => {
        try {
            const { data } = await adminService.getAllUsers(1, 100);
            if (!data || data.length === 0) {
                showToast("No users found to export.", "error");
                return;
            }
            
            const headers = ['ID', 'Email', 'Name', 'Role', 'Verified', 'Created At'];
            const rows = data.map(u => [
                u.id || '',
                u.email || '',
                u.name || 'N/A',
                u.role || 'user',
                u.is_verified || u.isVerified ? 'TRUE' : 'FALSE',
                u.createdAt || 'N/A'
            ]);
            
            const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `relearn_users_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Failed to export users:", err);
            showToast("Export failed. Please check console logs.", "error");
        }
    };

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
                            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                <span className="status-dot-outer" />
                                <span className="status-dot-inner w-2.5 h-2.5" />
                            </span>
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

            {/* Split layout: Recent Activity & Pending Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 glass-card noise-overlay rounded-[2.5rem] p-8 border border-white/40 dark:border-stone-850 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Live Command Stream</h3>
                            <h2 className="text-lg font-black tracking-tight mt-1">Recent Activity & Events</h2>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                            Live Feed
                        </span>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                        {activity.map((act, idx) => (
                            <div key={act.id || idx} className="flex items-start gap-4 p-4 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-850/50 transition-all hover:bg-slate-50 dark:hover:bg-stone-900/50">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                    act.action?.includes('delete') ? 'bg-red-500/10 text-red-650' :
                                    act.action?.includes('verify') ? 'bg-emerald-500/10 text-emerald-650' :
                                    act.action?.includes('announcement') || act.action?.includes('broadcast') ? 'bg-rose-500/10 text-rose-650' :
                                    'bg-indigo-500/10 text-indigo-650'
                                }`}>
                                    <Icon name={
                                        act.action?.includes('delete') ? 'delete' :
                                        act.action?.includes('verify') ? 'verified_user' :
                                        act.action?.includes('announcement') || act.action?.includes('broadcast') ? 'campaign' :
                                        'admin_panel_settings'
                                    } className="text-base" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black truncate max-w-[180px]">{act.user_email || 'System'}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-stone-400 mt-1">
                                        {act.description || act.action}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {activity.length === 0 && (
                            <div className="text-center py-8">
                                <Icon name="history" className="text-3xl text-slate-200 dark:text-stone-800 mb-2 mx-auto" />
                                <p className="text-xs font-black text-slate-455 uppercase tracking-widest">No recent administrative events</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Tasks Widget */}
                <div className="glass-card noise-overlay rounded-[2.5rem] p-8 border border-white/40 dark:border-stone-850 shadow-xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-6">Action Required</h3>
                    <h2 className="text-lg font-black tracking-tight mb-6">Pending Tasks</h2>
                    
                    <div className="space-y-4">
                        {/* Feedback Reviews */}
                        <div className="flex items-start justify-between p-4 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-850/50">
                            <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${metrics.feedbackCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-stone-800'}`} />
                                <div>
                                    <div className="text-xs font-black uppercase tracking-wider">Pending Feedback Reviews</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-1">
                                        {metrics.feedbackCount} report{metrics.feedbackCount !== 1 ? 's' : ''} awaiting moderation response.
                                    </div>
                                </div>
                            </div>
                            {metrics.feedbackCount > 0 && (
                                <button 
                                    onClick={() => setActiveTab('feedback')}
                                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest underline shrink-0"
                                >
                                    Resolve
                                </button>
                            )}
                        </div>

                        {/* API Token capacity */}
                        {(() => {
                            const apiUsagePercent = stats?.apiUsage ? (stats.apiUsage.used / stats.apiUsage.limit) * 100 : 0;
                            const isHighUsage = apiUsagePercent > 90;
                            return (
                                <div className="flex items-start justify-between p-4 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-850/50 w-full">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-2 h-2 rounded-full mt-2 ${isHighUsage ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-wider">
                                                {isHighUsage ? 'API Limit Warning' : 'System AI Threshold'}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-1">
                                                {stats?.apiUsage 
                                                    ? `Gemini API capacity is at ${apiUsagePercent.toFixed(1)}% (${stats.apiUsage.used.toLocaleString()} / ${stats.apiUsage.limit.toLocaleString()} tokens utilized).`
                                                    : 'API capacity status vitals loaded successfully.'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Events config */}
                        <div className="flex items-start justify-between p-4 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-850/50">
                            <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${metrics.activeMarathonsCount === 0 ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <div>
                                    <div className="text-xs font-black uppercase tracking-wider">Marathon Orchestrator</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-1">
                                        {metrics.activeMarathonsCount === 0 
                                            ? 'No active marathons. Schedule a community event.' 
                                            : `${metrics.activeMarathonsCount} live marathon(s) running right now.`}
                                    </div>
                                </div>
                            </div>
                            {metrics.activeMarathonsCount === 0 && (
                                <button 
                                    onClick={() => setActiveTab('marathons')}
                                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest underline shrink-0"
                                >
                                    Create
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Administration Modules Section */}
            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-stone-800/50">
                <div>
                    <h2 className="text-xl font-black tracking-tight">Administration Modules</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mt-1">Operational Control Center</p>
                </div>

                <div className="space-y-6">
                    {/* Operations Category */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-stone-550">Operations</span>
                            <div className="h-px bg-slate-100 dark:bg-stone-850/50 flex-1" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Feedback Card */}
                            <motion.div
                                whileHover={{ y: -4, scale: 1.015 }}
                                whileTap={{ scale: 0.985 }}
                                onClick={() => setActiveTab('feedback')}
                                className="glass-card noise-overlay rounded-[2rem] p-5 border border-white/40 dark:border-stone-850 shadow-md relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-all duration-300 w-full h-full min-h-[170px]"
                            >
                                <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity bg-amber-500/10" />

                                <div className="relative z-10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center glow-secondary transition-all group-hover:scale-105">
                                                <Icon name="rate_review" className="text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black tracking-tight group-hover:text-indigo-600 transition-colors">Feedback & Reviews</h3>
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-stone-400 leading-normal">
                                                    Manage user bug reports and suggestions.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20 text-[8px] font-black uppercase tracking-wider">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                            </span>
                                            <span>Active</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 flex items-end justify-between mt-4">
                                    <div className="flex flex-col">
                                        {metrics.isLoading ? (
                                            <div className="h-6 w-8 bg-slate-200 dark:bg-stone-855 animate-pulse rounded-md mt-1" />
                                        ) : (
                                            <span className="text-xl font-black tracking-tight tabular-nums">{metrics.feedbackCount}</span>
                                        )}
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Open Reports</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Broadcast Card */}
                            <motion.div
                                whileHover={{ y: -4, scale: 1.015 }}
                                whileTap={{ scale: 0.985 }}
                                onClick={() => setActiveTab('broadcast')}
                                className="glass-card noise-overlay rounded-[2rem] p-5 border border-white/40 dark:border-stone-850 shadow-md relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-all duration-300 w-full h-full min-h-[170px]"
                            >
                                <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity bg-rose-500/10" />

                                <div className="relative z-10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center glow-secondary transition-all group-hover:scale-105">
                                                <Icon name="campaign" className="text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black tracking-tight group-hover:text-indigo-600 transition-colors">Global Broadcasts</h3>
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-stone-400 leading-normal">
                                                    Send emergency banners or system notifications.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/10 text-rose-600 rounded-full border border-rose-500/20 text-[8px] font-black uppercase tracking-wider">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                                            </span>
                                            <span>Operational</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 flex items-end justify-between mt-4">
                                    <div className="flex flex-col">
                                        {metrics.isLoading ? (
                                            <div className="h-6 w-8 bg-slate-200 dark:bg-stone-855 animate-pulse rounded-md mt-1" />
                                        ) : (
                                            <span className="text-xl font-black tracking-tight tabular-nums">{metrics.subscriberCount}</span>
                                        )}
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Subscribers</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Security & Community Categories */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Security */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-stone-550">Security</span>
                                <div className="h-px bg-slate-100 dark:bg-stone-850/50 flex-1" />
                            </div>
                            <motion.div
                                whileHover={{ y: -4, scale: 1.015 }}
                                whileTap={{ scale: 0.985 }}
                                onClick={() => setActiveTab('audit')}
                                className="glass-card noise-overlay rounded-[2rem] p-5 border border-white/40 dark:border-stone-850 shadow-md relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-all duration-300 w-full h-full min-h-[170px]"
                            >
                                <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity bg-indigo-500/10" />

                                <div className="relative z-10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center glow-primary transition-all group-hover:scale-105">
                                                <Icon name="receipt_long" className="text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black tracking-tight group-hover:text-indigo-600 transition-colors">Security Audit Logs</h3>
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-stone-400 leading-normal">
                                                    Monitor system actions and modifications.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 rounded-full border border-indigo-500/20 text-[8px] font-black uppercase tracking-wider">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                                            </span>
                                            <span>Active Logging</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 flex items-end justify-between mt-4">
                                    <div className="flex flex-col">
                                        {metrics.isLoading ? (
                                            <div className="h-6 w-8 bg-slate-200 dark:bg-stone-855 animate-pulse rounded-md mt-1" />
                                        ) : (
                                            <span className="text-xl font-black tracking-tight tabular-nums">{metrics.auditLogCount}</span>
                                        )}
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Events Audited</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Community */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-stone-550">Community</span>
                                <div className="h-px bg-slate-100 dark:bg-stone-850/50 flex-1" />
                            </div>
                            <motion.div
                                whileHover={{ y: -4, scale: 1.015 }}
                                whileTap={{ scale: 0.985 }}
                                onClick={() => setActiveTab('marathons')}
                                className="glass-card noise-overlay rounded-[2rem] p-5 border border-white/40 dark:border-stone-850 shadow-md relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-all duration-300 w-full h-full min-h-[170px]"
                            >
                                <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity bg-purple-500/10" />

                                <div className="relative z-10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center glow-primary transition-all group-hover:scale-105">
                                                <Icon name="emoji_events" className="text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black tracking-tight group-hover:text-indigo-600 transition-colors">Community Marathons</h3>
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-stone-400 leading-normal">
                                                    Configure global event tracks and XP multipliers.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-500/10 text-purple-600 rounded-full border border-purple-500/20 text-[8px] font-black uppercase tracking-wider">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                                            </span>
                                            <span>Active Events</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 flex items-end justify-between mt-4">
                                    <div className="flex flex-col">
                                        {metrics.isLoading ? (
                                            <div className="h-6 w-8 bg-slate-200 dark:bg-stone-855 animate-pulse rounded-md mt-1" />
                                        ) : (
                                            <span className="text-xl font-black tracking-tight tabular-nums">{metrics.activeMarathonsCount}</span>
                                        )}
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Live Challenges</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewPanel;
