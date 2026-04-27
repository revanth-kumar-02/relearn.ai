import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar
} from 'recharts';
import Icon from './common/Icon';
import { adminService, GlobalStats, UserAdminData } from '../services/adminService';
import { systemService, SystemStatus } from '../services/systemService';
import { StudyRoom } from '../types';
import { triggerHaptic } from '../utils/haptics';

type AdminTab = 'overview' | 'users' | 'plans' | 'rooms' | 'feedback' | 'system';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [users, setUsers] = useState<UserAdminData[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [rooms, setRooms] = useState<StudyRoom[]>([]);
    const [feedback, setFeedback] = useState<any[]>([]);
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // User Filter State
    const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified' | 'online'>('all');
    
    // Delete Modal State
    const [deleteModalUser, setDeleteModalUser] = useState<UserAdminData | null>(null);
    const [deleteReason, setDeleteReason] = useState('');

    useEffect(() => {
        loadAllData();

        const handleApiLimit = (e: any) => {
            alert(`🚨 URGENT: ${e.detail?.message || 'Gemini API limit reached or quota exhausted!'}\nPlease check API usage and consider upgrading or changing the key.`);
        };
        window.addEventListener('gemini-api-limit', handleApiLimit);
        return () => window.removeEventListener('gemini-api-limit', handleApiLimit);
    }, []);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [s, u, p, r, sys, growth, f] = await Promise.all([
                adminService.getGlobalStats(),
                adminService.getAllUsers(),
                adminService.getAllPlans(),
                adminService.getAllRooms(),
                systemService.getSystemStatus(),
                adminService.getGrowthData(),
                adminService.getFeedback()
            ]);
            setStats(s);
            setUsers(u);
            setPlans(p);
            setRooms(r);
            setSystemStatus(sys);
            setGrowthData(growth);
            setFeedback(f);
        } catch (error) {
            console.error('Admin data load failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSystemUpdate = async (updates: Partial<SystemStatus>) => {
        try {
            await systemService.updateSystemStatus(updates);
            setSystemStatus(prev => prev ? { ...prev, ...updates } : null);
            triggerHaptic('medium');
        } catch (error) {
            console.error('System update failed:', error);
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteModalUser || !deleteReason.trim()) return;
        try {
            await adminService.deleteUser(deleteModalUser.id);
            setUsers(users.filter(u => u.id !== deleteModalUser.id));
            
            // Trigger Mailto
            const subject = encodeURIComponent('Notice regarding your ReLearn.ai account');
            const body = encodeURIComponent(`Hello,\n\nYour account has been deleted for the following reason:\n\n${deleteReason}\n\nRegards,\nThe ReLearn.ai Admin Team`);
            window.location.href = `mailto:${deleteModalUser.email}?subject=${subject}&body=${body}`;
            
            setDeleteModalUser(null);
            setDeleteReason('');
            triggerHaptic('success');
        } catch (err) {
            console.error('Delete failed', err);
            alert('Failed to delete user');
        }
    };

    const handleResendConfirmation = async (email: string) => {
        try {
            await adminService.resendConfirmationEmail(email);
            triggerHaptic('success');
            alert(`Confirmation email resent to ${email}`);
        } catch (error: any) {
            console.error('Failed to resend confirmation:', error);
            alert(`Failed to resend confirmation: ${error.message}`);
        }
    };

    const filteredUsers = users.filter(u => {
        if (verificationFilter === 'verified') return u.is_verified;
        if (verificationFilter === 'unverified') return !u.is_verified;
        if (verificationFilter === 'online') {
            // Mocking online filter: assume recently created users are online for this demo, 
            // or simply just return a subset. In real-world, we'd check last_login or presence.
            return Math.random() > 0.7; // Temporary mock filter
        }
        return true;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Command Center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/20">
                        <Icon name="admin_panel_settings" className="text-3xl" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">System Console</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-xs font-black uppercase tracking-widest text-text-secondary-light">Real-time Node Active</p>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <nav className="flex bg-white dark:bg-surface-dark p-1 rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-x-auto no-scrollbar">
                    {(['overview', 'users', 'plans', 'rooms', 'feedback', 'system'] as AdminTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); triggerHaptic('light'); }}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                : 'text-text-secondary-light hover:text-indigo-600'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </header>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                                <KPICard label="Total Users" value={stats?.totalUsers || 0} icon="group" color="indigo" onClick={() => setActiveTab('users')} />
                                <KPICard label="Online Users" value={stats?.onlineUsers || 0} icon="person_pin_circle" color="emerald" onClick={() => { setActiveTab('users'); setVerificationFilter('online'); }} />
                                <KPICard label="AI Plans" value={stats?.totalPlans || 0} icon="auto_awesome" color="purple" onClick={() => setActiveTab('plans')} />
                                <KPICard label="Study Rooms" value={stats?.totalRooms || 0} icon="hub" color="amber" onClick={() => setActiveTab('rooms')} />
                                <KPICard label="Messages" value={stats?.totalMessages || 0} icon="chat" color="emerald" />
                            </div>

                            {/* Gemini API Usage Card */}
                            {stats?.apiUsage && (
                                <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                            <Icon name="memory" className="text-indigo-600" />
                                            Gemini API Token Usage
                                        </h3>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                                            {stats.apiUsage.used.toLocaleString()} / {stats.apiUsage.limit.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (stats.apiUsage.used / stats.apiUsage.limit) * 100)}%` }}
                                            className={`h-full ${stats.apiUsage.used / stats.apiUsage.limit > 0.9 ? 'bg-red-500' : 'bg-indigo-600'}`}
                                            transition={{ duration: 1, delay: 0.2 }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 text-right">
                                        {((stats.apiUsage.used / stats.apiUsage.limit) * 100).toFixed(2)}% used
                                    </p>
                                </div>
                            )}

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02]">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                                        <Icon name="show_chart" className="text-indigo-600" />
                                        Platform Growth
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={growthData}>
                                                <defs>
                                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide />
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                                />
                                                <Area type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                                <Area type="monotone" dataKey="plans" stroke="#9333ea" strokeWidth={3} fillOpacity={0} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02]">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                                        <Icon name="bar_chart" className="text-amber-600" />
                                        Activity Distribution
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={growthData.slice(-5)}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide />
                                                <Tooltip 
                                                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                                />
                                                <Bar dataKey="plans" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02] overflow-hidden">
                            <div className="p-8 border-b border-border-light dark:border-border-dark flex justify-between items-center flex-wrap gap-4">
                                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Icon name="people" className="text-indigo-600" />
                                    User Management
                                </h3>
                                
                                <div className="flex items-center gap-4">
                                    <div className="flex bg-gray-100 dark:bg-stone-800 rounded-xl p-1">
                                        <button onClick={() => setVerificationFilter('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${verificationFilter === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>All</button>
                                        <button onClick={() => setVerificationFilter('online')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${verificationFilter === 'online' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Online</button>
                                        <button onClick={() => setVerificationFilter('verified')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${verificationFilter === 'verified' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500'}`}>Verified</button>
                                        <button onClick={() => setVerificationFilter('unverified')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${verificationFilter === 'unverified' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}>Unverified</button>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary-light">Total: {filteredUsers.length}</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-stone-900/50">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Stats</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-gray-50/30 dark:hover:bg-stone-900/30 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-sm font-black">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black tracking-tight">{u.name}</div>
                                                            <div className="text-[10px] font-bold text-text-secondary-light">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                            u.role === 'admin' ? 'bg-red-500/10 text-red-600' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {u.role || 'user'}
                                                        </span>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                                                            u.is_verified ? 'text-green-500' : 'text-orange-500'
                                                        }`}>
                                                            <Icon name={u.is_verified ? 'verified' : 'pending'} className="text-[10px]" />
                                                            {u.is_verified ? 'Verified' : 'Unverified'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex gap-4">
                                                        <div className="text-center">
                                                            <div className="text-xs font-black">{u.stats?.totalXP || 0}</div>
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">XP</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-xs font-black">{u.stats?.level || 1}</div>
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">LVL</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-slate-500">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        {!u.is_verified && (
                                                            <button 
                                                                onClick={() => handleResendConfirmation(u.email)}
                                                                className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg text-orange-400 hover:text-orange-600 transition-colors"
                                                                title="Resend Confirmation Email"
                                                            >
                                                                <Icon name="mark_email_read" />
                                                            </button>
                                                        )}
                                                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                                            <Icon name="more_vert" />
                                                        </button>
                                                        {u.role !== 'admin' && (
                                                            <button 
                                                                onClick={() => setDeleteModalUser(u)}
                                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                                title="Delete User"
                                                            >
                                                                <Icon name="delete" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'plans' && (
                        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02] overflow-hidden">
                            <div className="p-8 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Icon name="auto_awesome" className="text-purple-600" />
                                    AI Plans Overview
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary-light">Total: {plans.length}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-stone-900/50">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Title</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Creator</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Created At</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                        {plans.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50/30 dark:hover:bg-stone-900/30 transition-colors">
                                                <td className="px-8 py-5 font-bold text-sm text-slate-800 dark:text-white">
                                                    {p.title}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black">{p.users?.name || 'Unknown'}</span>
                                                        <span className="text-[10px] font-bold text-text-secondary-light">{p.users?.email || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-slate-500">
                                                    {p.createdAt ? new Intl.DateTimeFormat('en-US', {
                                                        year: 'numeric', month: 'short', day: 'numeric',
                                                        hour: 'numeric', minute: 'numeric', hour12: true
                                                    }).format(new Date(p.createdAt)) : 'N/A'}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                                        <Icon name="visibility" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {plans.length === 0 && (
                                    <div className="py-20 text-center">
                                        <Icon name="auto_awesome" className="text-4xl text-slate-200 mb-4 mx-auto" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No plans generated yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'rooms' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rooms.map(room => (
                                <div key={room.id} className="bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark p-6 shadow-xl shadow-black/[0.02] flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                            <Icon name="hub" className="text-2xl" />
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            room.is_active ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                            {room.is_active ? 'Live' : 'Inactive'}
                                        </div>
                                    </div>
                                    <h4 className="font-black tracking-tight text-lg mb-1">{room.name}</h4>
                                    <p className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest mb-6">CODE: {room.room_code}</p>
                                    
                                    <div className="mt-auto pt-6 border-t border-border-light dark:border-border-dark flex items-center justify-between">
                                        <button 
                                            onClick={() => { adminService.deleteRoom(room.id); setRooms(r => r.filter(x => x.id !== room.id)); }}
                                            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            Force Close
                                        </button>
                                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                                            <Icon name="person" className="text-xs" />
                                            {room.max_members} Limit
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {rooms.length === 0 && (
                                <div className="col-span-full py-20 text-center">
                                    <Icon name="leak_remove" className="text-4xl text-slate-200 mb-4 mx-auto" />
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No active study rooms found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'feedback' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {feedback.map(item => (
                                <div key={item.id} className="bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark p-6 shadow-xl shadow-black/[0.02] flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                            item.type === 'bug' ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white'
                                        }`}>
                                            {item.type || 'feedback'}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed mb-4">
                                        "{item.content}"
                                    </p>
                                    <div className="mt-auto pt-4 border-t border-border-light dark:border-border-dark flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black">
                                            U
                                        </div>
                                        <span className="text-[10px] font-bold text-text-secondary-light">Anonymous User</span>
                                    </div>
                                </div>
                            ))}
                            {feedback.length === 0 && (
                                <div className="col-span-full py-20 text-center">
                                    <Icon name="inbox" className="text-4xl text-slate-200 mb-4 mx-auto" />
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No feedback received yet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Maintenance Control */}
                            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-8 shadow-xl shadow-black/[0.02]">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                                            <Icon name="construction" />
                                        </div>
                                        <h2 className="font-black uppercase tracking-widest text-xs">Maintenance</h2>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        systemStatus?.maintenance_mode ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                                    }`}>
                                        {systemStatus?.maintenance_mode ? 'Active' : 'Offline'}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={() => handleSystemUpdate({ maintenance_mode: !systemStatus?.maintenance_mode, status: 'active' })}
                                        className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 ${
                                            systemStatus?.maintenance_mode 
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                                            : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        }`}
                                    >
                                        <Icon name={systemStatus?.maintenance_mode ? 'power_settings_new' : 'bolt'} />
                                        <span>{systemStatus?.maintenance_mode ? 'End Maintenance' : 'Start Global Maintenance'}</span>
                                    </button>

                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        <button
                                            disabled={!systemStatus?.maintenance_mode || systemStatus.status === 'completed'}
                                            onClick={() => handleSystemUpdate({ status: 'completed' })}
                                            className="py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                                        >
                                            Set Work Done
                                        </button>
                                        <button
                                            disabled={!systemStatus?.maintenance_mode}
                                            onClick={() => handleSystemUpdate({ maintenance_mode: false, status: 'none' })}
                                            className="py-4 rounded-2xl bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95"
                                        >
                                            Release App
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Node Info */}
                            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-8 shadow-xl shadow-black/[0.02]">
                                <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                                    <Icon name="dns" className="text-emerald-600" />
                                    Server Health
                                </h3>
                                <div className="space-y-6">
                                    <HealthRow label="Vite Dev Server" status="optimal" />
                                    <HealthRow label="Supabase Postgres" status="optimal" />
                                    <HealthRow label="Edge Functions" status="stable" />
                                    <HealthRow label="Vector DB Index" status="optimal" />
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Delete User Modal */}
            <AnimatePresence>
                {deleteModalUser && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-6">
                                <Icon name="warning" className="text-3xl" />
                            </div>
                            <h3 className="text-xl font-black text-center mb-2">Delete User Account</h3>
                            <p className="text-sm font-bold text-slate-500 text-center mb-6">
                                You are about to permanently delete <span className="text-slate-800 dark:text-white">{deleteModalUser.email}</span>. This action cannot be undone.
                            </p>

                            <div className="mb-8">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Reason for Deletion</label>
                                <textarea 
                                    value={deleteReason}
                                    onChange={e => setDeleteReason(e.target.value)}
                                    placeholder="Provide a reason (this will be emailed to the user)..."
                                    className="w-full bg-gray-50 dark:bg-stone-900 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-4 ring-red-500/20 outline-none resize-none h-24"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => { setDeleteModalUser(null); setDeleteReason(''); }}
                                    className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-stone-800 font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-stone-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={!deleteReason.trim()}
                                    onClick={handleDeleteUser}
                                    className="flex-1 py-4 rounded-2xl bg-red-600 font-black text-xs uppercase tracking-widest text-white disabled:opacity-50 hover:bg-red-700 transition-colors"
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const KPICard: React.FC<{ label: string; value: number | string; icon: string; color: 'indigo' | 'purple' | 'amber' | 'emerald'; onClick?: () => void }> = ({ label, value, icon, color, onClick }) => {
    const colorMap = {
        indigo: 'bg-indigo-500/10 text-indigo-600',
        purple: 'bg-purple-500/10 text-purple-600',
        amber: 'bg-amber-500/10 text-amber-600',
        emerald: 'bg-emerald-500/10 text-emerald-600'
    };

    return (
        <div 
            onClick={onClick}
            className={`bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.01] flex flex-col gap-4 transition-all ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/[0.05]' : ''}`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
                <Icon name={icon} className="text-xl" />
            </div>
            <div>
                <div className="text-2xl font-black tracking-tight">{value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{label}</div>
            </div>
        </div>
    );
};

const HealthRow: React.FC<{ label: string; status: 'optimal' | 'stable' | 'degraded' }> = ({ label, status }) => (
    <div className="flex items-center justify-between py-3 border-b border-border-light/50 dark:border-border-dark/50 last:border-0">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
                status === 'optimal' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                status === 'stable' ? 'bg-indigo-500' : 'bg-amber-500'
            }`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{status}</span>
        </div>
    </div>
);

export default AdminDashboard;
