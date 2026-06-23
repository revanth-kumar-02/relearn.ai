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
    analytics: any | null;
    setActiveTab: (tab: any) => void;
    setVerificationFilter: (filter: any) => void;
}

const formatRelativeTime = (timeIso?: string): string => {
    if (!timeIso) return 'N/A';
    const date = new Date(timeIso);
    if (isNaN(date.getTime())) return timeIso;

    const diffMs = Date.now() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const OverviewPanel: React.FC<OverviewPanelProps> = ({ stats, growthData, analytics, setActiveTab, setVerificationFilter }) => {
    const { showToast } = useToast();
    const [metrics, setMetrics] = React.useState({
        feedbackCount: 0,
        subscriberCount: 0,
        auditLogCount: 0,
        activeMarathonsCount: 0,
        isLoading: true
    });

    React.useEffect(() => {
        let isMounted = true;
        const fetchMetrics = async () => {
            try {
                const [fb, subs, audit, marathons] = await Promise.all([
                    adminService.getFeedback(1, 1).catch(() => ({ count: 0 })),
                    adminService.getNewsletterSubscribers().catch(() => []),
                    adminService.getAuditLogs(1, 1).catch(() => ({ count: 0 })),
                    marathonService.getMarathons().catch(() => []),
                ]);
                
                if (isMounted) {
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
            {/* KPI Cards Row 1: Core Platform Vitals */}
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-4">Core Platform Vitals</h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                    <KPICard label="Total Users" value={stats?.totalUsers || 0} icon="group" color="indigo" onClick={() => setActiveTab('users')} />
                    <KPICard label="Online Users" value={stats?.onlineUsers || 0} icon="person_pin_circle" color="emerald" onClick={() => { setActiveTab('users'); setVerificationFilter('online'); }} />
                    <KPICard label="AI Plans" value={stats?.totalPlans || 0} icon="auto_awesome" color="purple" onClick={() => setActiveTab('plans')} />
                    <KPICard label="Study Rooms" value={stats?.totalRooms || 0} icon="hub" color="amber" onClick={() => setActiveTab('rooms')} />
                    <KPICard label="Messages" value={stats?.totalMessages || 0} icon="chat" color="emerald" className="col-span-2 lg:col-span-1" />
                </div>
            </div>

            {/* KPI Cards Row 2: User Engagement & Retention KPIs */}
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-4">User Engagement & Retention</h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                    <KPICard label="Active Today (DAU)" value={analytics?.dau || 0} icon="today" color="indigo" />
                    <KPICard label="Active Weekly (WAU)" value={analytics?.wau || 0} icon="date_range" color="purple" />
                    <KPICard label="Active Monthly (MAU)" value={analytics?.mau || 0} icon="calendar_month" color="emerald" />
                    <KPICard label="Returning Users" value={analytics?.returningUsers || 0} icon="restart_alt" color="amber" />
                    <KPICard 
                        label="Retention Rate (D1)" 
                        value={analytics?.retentionDay1 !== undefined ? `${Math.round(analytics.retentionDay1)}%` : '0%'} 
                        icon="hourglass_empty" 
                        color="indigo" 
                        className="col-span-2 lg:col-span-1"
                    />
                </div>
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

                {/* New Registrations summary */}
                <div className="glass-card noise-overlay rounded-[2.5rem] p-8 border border-white/40 dark:border-stone-850 shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">New Registrations</h3>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl">
                            <div className="text-xl font-black text-indigo-600">{analytics?.newToday ?? 0}</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-450 mt-1">Today</div>
                        </div>
                        <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/30 rounded-2xl">
                            <div className="text-xl font-black text-purple-600">{analytics?.newThisWeek ?? 0}</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-450 mt-1">This Week</div>
                        </div>
                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl">
                            <div className="text-xl font-black text-emerald-600">{analytics?.newThisMonth ?? 0}</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-450 mt-1">This Month</div>
                        </div>
                    </div>
                    <button 
                        onClick={handleExportUsers}
                        className="w-full mt-4 py-2.5 bg-slate-100 dark:bg-stone-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Icon name="download" className="text-sm" /> Export User Directory
                    </button>
                </div>
            </div>

            {/* Charts Row */}
            <React.Suspense fallback={
                <div className="h-64 flex items-center justify-center glass-card noise-overlay rounded-[2.5rem]">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            }>
                <AdminCharts growthData={growthData} analytics={analytics} />
            </React.Suspense>

            {/* Split layout: Recent Activity & Feature Rankings & Inactive Users */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Activity Feed */}
                <div className="lg:col-span-2 glass-card noise-overlay rounded-[2.5rem] p-8 border border-white/40 dark:border-stone-850 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Live Activity Stream</h3>
                            <h2 className="text-lg font-black tracking-tight mt-1">Recent User Actions & Events</h2>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 --ping animate-pulse" />
                            Live Feed
                        </span>
                    </div>

                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 no-scrollbar">
                        {analytics?.liveFeed && analytics.liveFeed.length > 0 ? (
                            analytics.liveFeed.map((act: any, idx: number) => (
                                <div key={act.id || idx} className="flex items-start gap-4 p-4 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-850/50 transition-all hover:bg-slate-50 dark:hover:bg-stone-900/50">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${act.bg || 'bg-indigo-500/10'} ${act.color || 'text-indigo-650'}`}>
                                        <Icon name={act.icon || 'visibility'} className="text-base" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black truncate max-w-[180px]">
                                                {act.user_name || act.user_handle || act.user_email || 'User'}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {formatRelativeTime(act.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-500 dark:text-stone-400 mt-1">
                                            {act.description || 'Opened page'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <Icon name="history" className="text-4xl text-slate-200 dark:text-stone-800 mb-2 mx-auto" />
                                <p className="text-xs font-black text-slate-455 uppercase tracking-widest">No activities logged yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Feature Usage rankings & Inactive Users list */}
                <div className="space-y-8">
                    {/* Feature Rankings */}
                    <div className="glass-card noise-overlay rounded-[2.5rem] p-8 border border-white/40 dark:border-stone-850 shadow-xl">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-6">User Engagement</h3>
                        <h2 className="text-lg font-black tracking-tight mb-6">Feature Rankings</h2>
                        <div className="space-y-4">
                            {analytics?.featureUsage && analytics.featureUsage.length > 0 ? (
                                analytics.featureUsage.slice(0, 5).map((feat: any, idx: number) => {
                                    const maxCount = analytics.featureUsage[0].count || 1;
                                    const percentage = (feat.count / maxCount) * 100;
                                    return (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="capitalize tracking-tight text-slate-700 dark:text-stone-300">
                                                    {feat.feature.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-slate-400 tabular-nums">{feat.count} actions</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-stone-800/50 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="h-full bg-indigo-500 rounded-full"
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-xs font-medium text-slate-400 italic">No usage rankings calculated.</div>
                            )}
                        </div>
                    </div>

                    {/* Inactive Users */}
                    <div className="glass-card noise-overlay rounded-[2.5rem] p-8 border border-white/40 dark:border-stone-850 shadow-xl">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-6">Inactive User Detection</h3>
                        <h2 className="text-lg font-black tracking-tight mb-6">Inactive Users</h2>
                        
                        <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 no-scrollbar">
                            {analytics?.inactiveUsers && analytics.inactiveUsers.length > 0 ? (
                                analytics.inactiveUsers.map((u: any, idx: number) => (
                                    <div key={u.id || idx} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-855/50">
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="text-xs font-black truncate">{u.name}</div>
                                            <div className="text-[9px] font-bold text-slate-400 truncate">@{u.username || u.email.split('@')[0]}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[9px] font-black text-red-500 uppercase tracking-widest">{u.days_inactive}+ days idle</div>
                                            <div className="text-[8px] font-medium text-slate-400">Seen: {new Date(u.last_active).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6">
                                    <Icon name="task_alt" className="text-2xl text-emerald-500 mb-1 mx-auto" />
                                    <p className="text-[10px] font-black text-slate-455 uppercase tracking-widest">No inactive users detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Tasks */}
            <div className="glass-card noise-overlay rounded-[2.5rem] p-8 border border-white/40 dark:border-stone-850 shadow-xl mt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-6">Action Required</h3>
                <h2 className="text-lg font-black tracking-tight mb-6">System Console Alerts</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3 p-4 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-850/50">
                        <div className={`w-2 h-2 rounded-full mt-2 ${metrics.feedbackCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-350'}`} />
                        <div>
                            <div className="text-xs font-black uppercase tracking-wider">Feedback & Reviews</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-1">
                                {metrics.feedbackCount} pending reviews.
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-850/50">
                        <div className="w-2 h-2 rounded-full mt-2 bg-emerald-500" />
                        <div>
                            <div className="text-xs font-black uppercase tracking-wider">AI API Utilization</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-1">
                                Gemini tokens operating at normal levels.
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-50/50 dark:bg-stone-900/30 rounded-2xl border border-slate-100/60 dark:border-stone-850/50">
                        <div className={`w-2 h-2 rounded-full mt-2 ${metrics.activeMarathonsCount === 0 ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <div>
                            <div className="text-xs font-black uppercase tracking-wider">Marathons Orchestrator</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-1">
                                {metrics.activeMarathonsCount === 0 ? 'No active events.' : `${metrics.activeMarathonsCount} events running.`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewPanel;
