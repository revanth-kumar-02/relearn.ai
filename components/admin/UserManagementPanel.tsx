import React from 'react';
import Icon from '../common/Icon';
import { UserAdminData } from '../../services/adminService';

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
    return (
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
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary-light">Total: {totalItems}</span>
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
                        {users.map((u, idx) => (
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
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-red-500/10 text-red-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {u.role || 'user'}
                                        </span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${u.is_verified ? 'text-green-500' : 'text-orange-500'
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
                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
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
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div className="py-20 text-center">
                        <Icon name="person_off" className="text-4xl text-slate-200 mb-4 mx-auto" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No users found matching your filter</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagementPanel;
