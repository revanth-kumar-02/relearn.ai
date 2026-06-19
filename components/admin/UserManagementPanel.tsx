import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { UserAdminData, adminService } from '../../services/adminService';

interface UserManagementPanelProps {
    users: UserAdminData[];
    totalItems: number;
    verificationFilter: string;
    setVerificationFilter: (filter: any) => void;
    activeActionMenu: string | null;
    setActiveActionMenu: (id: string | null) => void;
    handleForceVerify: (id: string, email: string) => void;
    handleResendConfirmation: (email: string) => void;
    handlePasswordReset: (email: string) => void;
    handleRoleChange: (id: string, role: 'user' | 'admin') => void;
    setDeleteModalUser: (user: UserAdminData) => void;
}

const formatActiveTimestamp = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = String(hours).padStart(2, '0');

    return `${day}/${month}/${year} • ${hoursStr}:${minutes} ${ampm}`;
};

const formatShortDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

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
    return formatShortDate(timeIso);
};

const getStatusInfo = (lastSeenIso?: string) => {
    if (!lastSeenIso) {
        return {
            text: 'Offline',
            dotColor: 'bg-slate-400 dark:bg-stone-600',
            textColor: 'text-slate-500 dark:text-stone-400',
            bgColor: 'bg-slate-100 dark:bg-stone-900/50',
            icon: '⚫'
        };
    }
    const lastSeen = new Date(lastSeenIso).getTime();
    const diffMinutes = (Date.now() - lastSeen) / 1000 / 60;
    if (diffMinutes <= 5) {
        return {
            text: 'Online',
            dotColor: 'bg-emerald-500',
            textColor: 'text-emerald-600 dark:text-emerald-450',
            bgColor: 'bg-emerald-500/10',
            icon: '🟢'
        };
    }
    if (diffMinutes <= 30) {
        return {
            text: 'Away',
            dotColor: 'bg-blue-500',
            textColor: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-500/10',
            icon: '🔵'
        };
    }
    return {
        text: 'Offline',
        dotColor: 'bg-slate-400 dark:bg-stone-600',
        textColor: 'text-slate-500 dark:text-stone-400',
        bgColor: 'bg-slate-100 dark:bg-stone-900/50',
        icon: '⚫'
    };
};

const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
    users,
    totalItems,
    verificationFilter,
    setVerificationFilter,
    activeActionMenu,
    setActiveActionMenu,
    handleForceVerify,
    handleResendConfirmation,
    handlePasswordReset,
    handleRoleChange,
    setDeleteModalUser
}) => {
    const [selectedUser, setSelectedUser] = useState<UserAdminData | null>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    useEffect(() => {
        if (selectedUser) {
            setLoadingActivities(true);
            adminService.getUserActivities(selectedUser.id)
                .then(data => {
                    setActivities(data);
                })
                .catch(err => {
                    console.error("Failed to load user activities:", err);
                    setActivities([]);
                })
                .finally(() => {
                    setLoadingActivities(false);
                });
        } else {
            setActivities([]);
        }
    }, [selectedUser]);

    const handleOpenDetails = (user: UserAdminData) => {
        setSelectedUser(user);
    };

    return (
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02] overflow-hidden relative">
            <div className="p-8 border-b border-border-light dark:border-border-dark flex justify-between items-center flex-wrap gap-4">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Icon name="people" className="text-indigo-600" />
                    User Management
                </h3>

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex bg-gray-100 dark:bg-stone-800 rounded-xl p-1 overflow-x-auto no-scrollbar max-w-full">
                        <button onClick={() => setVerificationFilter('all')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${verificationFilter === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>All</button>
                        <button onClick={() => setVerificationFilter('online')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${verificationFilter === 'online' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Online</button>
                        <button onClick={() => setVerificationFilter('away')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${verificationFilter === 'away' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Away</button>
                        <button onClick={() => setVerificationFilter('offline')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${verificationFilter === 'offline' ? 'bg-white shadow-sm text-slate-650 dark:text-stone-300' : 'text-slate-500'}`}>Offline</button>
                        <button onClick={() => setVerificationFilter('recent')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${verificationFilter === 'recent' ? 'bg-white shadow-sm text-purple-650' : 'text-slate-500'}`}>Recently Joined</button>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary-light">Total: {totalItems}</span>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-stone-900/50">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Last Active</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Last Login</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                        {users.map((u, idx) => {
                            const status = getStatusInfo(u.last_seen);
                            return (
                                <tr key={u.id} className="hover:bg-gray-50/30 dark:hover:bg-stone-900/30 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-sm font-black">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div onClick={() => handleOpenDetails(u)} className="cursor-pointer group">
                                                <div className="text-sm font-black tracking-tight group-hover:text-indigo-600 transition-colors">{u.name}</div>
                                                <div className="text-[10px] font-bold text-text-secondary-light">@{u.username || u.email.split('@')[0]}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-2.5 h-2.5 rounded-full ${status.dotColor} ${status.text === 'Online' ? 'animate-pulse' : ''}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${status.textColor}`}>{status.text}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-slate-700 dark:text-stone-300">
                                        {formatActiveTimestamp(u.last_seen)}
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-slate-700 dark:text-stone-300">
                                        {formatActiveTimestamp(u.last_login)}
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-slate-500">
                                        {formatShortDate(u.createdAt)}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenDetails(u)}
                                                className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-indigo-500 hover:text-indigo-600 transition-colors"
                                                title="View Details"
                                            >
                                                <Icon name="visibility" />
                                            </button>
                                            
                                            {!u.is_verified && (
                                                <>
                                                    <button
                                                        onClick={() => handleForceVerify(u.id, u.email)}
                                                        className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-green-500 hover:text-green-600 transition-colors"
                                                        title="Force Verify User"
                                                    >
                                                        <Icon name="verified_user" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleResendConfirmation(u.email)}
                                                        className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg text-orange-400 hover:text-orange-600 transition-colors"
                                                        title="Resend Confirmation Email"
                                                    >
                                                        <Icon name="mark_email_read" />
                                                    </button>
                                                </>
                                            )}
                                            
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setActiveActionMenu(activeActionMenu === u.id ? null : u.id)}
                                                    className={`p-2 rounded-lg transition-colors ${activeActionMenu === u.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600'}`}
                                                >
                                                    <Icon name="more_vert" />
                                                </button>
                                                {activeActionMenu === u.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setActiveActionMenu(null)} />
                                                        <div className={`absolute right-0 w-48 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-border-light dark:border-border-dark py-2 z-20 overflow-hidden animate-in fade-in zoom-in duration-200 ${
                                                            idx > users.length - 3 ? 'bottom-full mb-2' : 'top-full mt-2'
                                                        }`}>
                                                            <button onClick={() => { handleOpenDetails(u); setActiveActionMenu(null); }} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2">
                                                                <Icon name="info" className="text-sm text-blue-500" />
                                                                View Details
                                                            </button>
                                                            <button onClick={() => { handlePasswordReset(u.email); setActiveActionMenu(null); }} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2">
                                                                <Icon name="lock_reset" className="text-sm text-indigo-500" />
                                                                Reset Password
                                                            </button>
                                                            <button onClick={() => { handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin'); setActiveActionMenu(null); }} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2">
                                                                <Icon name="shield" className="text-sm text-purple-500" />
                                                                {u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                                                            </button>
                                                            <button onClick={() => { window.location.href = `mailto:${u.email}`; setActiveActionMenu(null); }} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2">
                                                                <Icon name="mail" className="text-sm text-emerald-500" />
                                                                Contact User
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

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
                            );
                        })}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div className="py-20 text-center">
                        <Icon name="person_off" className="text-4xl text-slate-200 mb-4 mx-auto" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No users found matching your filter</p>
                    </div>
                )}
            </div>

            {/* Slide-out User Detail Drawer */}
            <div className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
                selectedUser ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setSelectedUser(null)} 
                />
                
                {/* Drawer Panel */}
                <div className={`absolute top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-stone-900 border-l border-border-light dark:border-border-dark shadow-2xl flex flex-col transform transition-transform duration-500 ease-out ${
                    selectedUser ? 'translate-x-0' : 'translate-x-full'
                }`}>
                    {/* Header */}
                    <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                            <Icon name="badge" />
                            User Profile Details
                        </h3>
                        <button 
                            onClick={() => setSelectedUser(null)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <Icon name="close" />
                        </button>
                    </div>
                    
                    {/* Body */}
                    {selectedUser && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                            {/* User Hero */}
                            <div className="text-center space-y-3">
                                <div className="w-20 h-20 rounded-[2rem] bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-3xl font-black mx-auto shadow-inner">
                                    {selectedUser.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-lg font-black tracking-tight">{selectedUser.name}</h4>
                                    <p className="text-xs font-bold text-slate-400">@{selectedUser.username || selectedUser.email.split('@')[0]}</p>
                                    <p className="text-[10px] font-semibold text-slate-400 mt-1">{selectedUser.email}</p>
                                </div>
                                
                                {/* Status Badge */}
                                {(() => {
                                    const status = getStatusInfo(selectedUser.last_seen);
                                    return (
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${status.bgColor} border ${status.dotColor.replace('bg-', 'border-')}/20 text-xs font-black uppercase tracking-wider`}>
                                            <span className={`w-2 h-2 rounded-full ${status.dotColor} ${status.text === 'Online' ? 'animate-pulse' : ''}`} />
                                            <span className={status.textColor}>{status.text}</span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Vitals Grid */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-stone-900/50 p-4 rounded-2xl border border-border-light dark:border-border-dark">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Seen</span>
                                    <p className="text-xs font-bold text-slate-700 dark:text-stone-200">{formatActiveTimestamp(selectedUser.last_seen)}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Login</span>
                                    <p className="text-xs font-bold text-slate-700 dark:text-stone-200">{formatActiveTimestamp(selectedUser.last_login)}</p>
                                </div>
                                <div className="space-y-1 col-span-2 border-t border-border-light dark:border-border-dark pt-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Account Created</span>
                                    <p className="text-xs font-bold text-slate-700 dark:text-stone-200">{selectedUser.createdAt ? formatActiveTimestamp(selectedUser.createdAt) : 'N/A'}</p>
                                </div>
                            </div>

                            {/* User Stats Summary */}
                            <div className="space-y-3">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Performance Metrics</h5>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-gray-50/50 dark:bg-stone-900/30 p-3 rounded-xl border border-border-light dark:border-border-dark">
                                        <div className="text-sm font-black text-indigo-600">{selectedUser.stats?.totalXP || 0}</div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total XP</div>
                                    </div>
                                    <div className="bg-gray-50/50 dark:bg-stone-900/30 p-3 rounded-xl border border-border-light dark:border-border-dark">
                                        <div className="text-sm font-black text-purple-600">{selectedUser.stats?.level || 1}</div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Level</div>
                                    </div>
                                    <div className="bg-gray-50/50 dark:bg-stone-900/30 p-3 rounded-xl border border-border-light dark:border-border-dark">
                                        <div className="text-sm font-black text-emerald-600">{selectedUser.stats?.studyStreak || 0}d</div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Streak</div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Timeline */}
                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Activity Timeline</h5>
                                
                                {loadingActivities ? (
                                    <div className="flex flex-col items-center py-8 gap-2">
                                        <div className="w-6 h-6 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retrieving timeline...</span>
                                    </div>
                                ) : activities.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50/30 dark:bg-stone-900/20 rounded-2xl border border-dashed border-border-light dark:border-border-dark">
                                        <Icon name="history" className="text-2xl text-slate-200 dark:text-stone-800 mb-1" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No activity recorded</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-6 border-l border-slate-200 dark:border-stone-800 space-y-6 ml-2">
                                        {activities.map((act, index) => (
                                            <div key={act.id || index} className="relative">
                                                {/* Timeline node */}
                                                <div className="absolute -left-[37px] top-0.5 w-6 h-6 rounded-lg bg-white dark:bg-stone-950 border border-border-light dark:border-border-dark flex items-center justify-center shadow-sm">
                                                    <Icon name={act.icon || 'star'} className={`text-xs ${act.color || 'text-indigo-600'}`} />
                                                </div>
                                                <div className="pl-1">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-stone-200">{act.title}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{formatRelativeTime(act.time)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagementPanel;
