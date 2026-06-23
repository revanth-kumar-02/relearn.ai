import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import Icon from './common/Icon';
import { adminService, GlobalStats, UserAdminData } from '../services/adminService';
import { systemService, SystemStatus } from '../services/systemService';
import { logAdminAction, migrateLocalAuditLogs } from '../services/auditLogService';
import { StudyRoom } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { scorePlanQuality, QualityScore } from '../services/gemini/qualityScoringService';

// Modular Sub-panels
import OverviewPanel from './admin/OverviewPanel';
import UserManagementPanel from './admin/UserManagementPanel';
import PlanModerationPanel from './admin/PlanModerationPanel';
import StudyRoomPanel from './admin/StudyRoomPanel';
import FeedbackPanel from './admin/FeedbackPanel';
import SystemStatusPanel from './admin/SystemStatusPanel';
import AuditLogPanel from './admin/AuditLogPanel';
import MarathonManager from './admin/MarathonManager';
import BroadcastPanel from './admin/BroadcastPanel';

type AdminTab = 'overview' | 'users' | 'plans' | 'rooms' | 'feedback' | 'system' | 'broadcast' | 'audit' | 'marathons' | 'health' | 'errors' | 'quality';

const AdminDashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as AdminTab) || 'overview';
    const setActiveTab = (tab: AdminTab) => setSearchParams({ tab });
    const { user } = useAuth();

    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [users, setUsers] = useState<UserAdminData[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [rooms, setRooms] = useState<StudyRoom[]>([]);
    const [feedback, setFeedback] = useState<any[]>([]);
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any | null>(null);
    const [planScores, setPlanScores] = useState<Record<string, QualityScore>>({});
    const [isLoading, setIsLoading] = useState(true);

    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'emergency'>('info');

    const [verificationFilter, setVerificationFilter] = useState<string>('all');
    const [deleteModalUser, setDeleteModalUser] = useState<UserAdminData | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        migrateLocalAuditLogs().catch(console.error);
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        loadAllData();
        const handleApiLimit = (e: any) => {
            setToast({
                message: `🚨 API Limit: ${e.detail?.message || 'Quota exhausted!'}`,
                type: 'error'
            });
        };
        window.addEventListener('gemini-api-limit', handleApiLimit);
        return () => window.removeEventListener('gemini-api-limit', handleApiLimit);
    }, []);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [s, sys, growth, analyticData] = await Promise.all([
                adminService.getGlobalStats(),
                systemService.getSystemStatus(),
                adminService.getGrowthData(),
                adminService.getAnalyticsDashboard().catch(err => {
                    console.error("Failed to load analytics dashboard data:", err);
                    return null;
                })
            ]);
            setStats(s);
            setSystemStatus(sys);
            setGrowthData(growth);
            setAnalytics(analyticData);
            await loadTabData(activeTab, 1, verificationFilter);
        } catch (error) {
            console.error('Admin data load failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTabData = async (tab: AdminTab, page: number, filter?: string) => {
        try {
            if (tab === 'users') {
                const { data, count } = await adminService.getAllUsers(page, ITEMS_PER_PAGE, filter);
                setUsers(data);
                setTotalItems(count);
            } else if (tab === 'plans') {
                const { data, count } = await adminService.getAllPlans(page, ITEMS_PER_PAGE);
                setPlans(data);
                setTotalItems(count);
            } else if (tab === 'rooms') {
                const { data, count } = await adminService.getAllRooms(page, ITEMS_PER_PAGE);
                setRooms(data);
                setTotalItems(count);
            } else if (tab === 'feedback') {
                const { data, count } = await adminService.getFeedback(page, ITEMS_PER_PAGE);
                setFeedback(data);
                setTotalItems(count);
            } else if (tab === 'system') {
                const { data, count } = await adminService.getAnnouncements(page, ITEMS_PER_PAGE);
                setAnnouncements(data);
                setTotalItems(count);
            } else if (tab === 'audit') {
                const { data, count } = await adminService.getAuditLogs(page, ITEMS_PER_PAGE);
                setAuditLogs(data);
                setTotalItems(count);
            }
        } catch (err) {
            console.error(`Failed to load ${tab} data:`, err);
        }
    };

    useEffect(() => {
        if (!isLoading) loadTabData(activeTab, currentPage, verificationFilter);
    }, [activeTab, currentPage, verificationFilter]);

    useEffect(() => { setCurrentPage(1); }, [activeTab, verificationFilter]);

    const handleSystemUpdate = async (updates: Partial<SystemStatus>) => {
        try {
            await systemService.updateSystemStatus(updates);
            setSystemStatus(prev => prev ? { ...prev, ...updates } : null);
            if (user) logAdminAction(user.id!, user.email!, 'system.status_update', 'system', 'global', 'System Status Update', updates);
            triggerHaptic('medium');
            setToast({ message: 'System status updated', type: 'success' });
        } catch (error) {
            setToast({ message: 'Update failed', type: 'error' });
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteModalUser || !deleteReason.trim()) return;
        try {
            await adminService.deleteUser(deleteModalUser.id);
            if (user) logAdminAction(user.id!, user.email!, 'user.delete', 'user', deleteModalUser.id, deleteModalUser.email, { reason: deleteReason });
            setUsers(users.filter(u => u.id !== deleteModalUser.id));
            setDeleteModalUser(null);
            setDeleteReason('');
            triggerHaptic('success');
            setToast({ message: 'User deleted successfully', type: 'success' });
        } catch (err) {
            setToast({ message: 'Delete failed', type: 'error' });
        }
    };

    const handlePostAnnouncement = async () => {
        if (!newAnnouncement.trim()) return;
        try {
            await adminService.createAnnouncement(newAnnouncement, announcementType);
            if (user) logAdminAction(user.id!, user.email!, 'announcement.create', 'announcement', 'global', 'New Global Broadcast', { message: newAnnouncement, type: announcementType });
            setNewAnnouncement('');
            loadTabData('system', 1);
            triggerHaptic('success');
            setToast({ message: 'Announcement posted', type: 'success' });
        } catch (error) {
            setToast({ message: 'Post failed', type: 'error' });
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        try {
            await adminService.deleteAnnouncement(id);
            if (user) logAdminAction(user.id!, user.email!, 'announcement.delete', 'announcement', id, 'Deleted Broadcast');
            setAnnouncements(announcements.filter(a => a.id !== id));
            triggerHaptic('success');
            setToast({ message: 'Announcement deleted', type: 'success' });
        } catch (error) {
            setToast({ message: 'Delete failed', type: 'error' });
        }
    };

    const handleScorePlan = async (plan: any) => {
        try {
            const score = await scorePlanQuality(plan);
            setPlanScores(prev => ({ ...prev, [plan.id]: score }));
            triggerHaptic('success');
        } catch (err) {
            setToast({ message: 'Scoring failed', type: 'error' });
        }
    };

    const totalPages = Math.ceil((totalItems || 0) / ITEMS_PER_PAGE);

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
                        <p className="text-xs font-black uppercase tracking-widest text-text-secondary-light">Real-time Node Active</p>
                    </div>
                </div>

                <nav className="flex items-center bg-white dark:bg-surface-dark p-2 rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 px-1">
                        {(['overview', 'users', 'plans', 'rooms', 'system'] as AdminTab[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); triggerHaptic('light'); }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    activeTab === tab 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                    : 'text-text-secondary-light hover:text-indigo-600'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </nav>
            </header>

            {!['overview', 'users', 'plans', 'rooms', 'system'].includes(activeTab) && (
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-450 dark:text-stone-400">
                    <button 
                        onClick={() => { setActiveTab('overview'); triggerHaptic('light'); }}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-750 transition-colors"
                    >
                        <Icon name="arrow_back" className="text-sm" />
                        <span>Back to Overview</span>
                    </button>
                    <span className="text-slate-300 dark:text-stone-600">/</span>
                    <span className="text-slate-650 dark:text-stone-300">
                        {activeTab === 'marathons' 
                            ? 'Community Marathons' 
                            : activeTab === 'audit' 
                            ? 'Security Audit Logs' 
                            : activeTab}
                    </span>
                </div>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && (
                        <OverviewPanel stats={stats} growthData={growthData} analytics={analytics} setActiveTab={setActiveTab} setVerificationFilter={setVerificationFilter} />
                    )}

                    {activeTab === 'users' && (
                        <UserManagementPanel 
                            users={users} 
                            totalItems={totalItems}
                            verificationFilter={verificationFilter}
                            setVerificationFilter={setVerificationFilter}
                            activeActionMenu={activeActionMenu}
                            setActiveActionMenu={setActiveActionMenu}
                            handleForceVerify={async (id, email) => {
                                await adminService.forceVerifyUser(id);
                                setUsers(users.map(u => u.id === id ? { ...u, is_verified: true } : u));
                                setToast({ message: 'User verified', type: 'success' });
                            }}
                            handleResendConfirmation={async (email) => {
                                await adminService.resendConfirmationEmail(email);
                                setToast({ message: 'Email sent', type: 'success' });
                            }}
                            handlePasswordReset={async (email) => {
                                await adminService.sendPasswordResetEmail(email);
                                setToast({ message: 'Reset link sent', type: 'success' });
                            }}
                            handleRoleChange={async (id, role) => {
                                await adminService.updateUserRole(id, role);
                                setUsers(users.map(u => u.id === id ? { ...u, role } : u));
                                setToast({ message: 'Role updated', type: 'success' });
                            }}
                            setDeleteModalUser={setDeleteModalUser}
                        />
                    )}

                    {activeTab === 'plans' && (
                        <PlanModerationPanel 
                            plans={plans} 
                            planScores={planScores} 
                            handleScorePlan={handleScorePlan} 
                            triggerHaptic={triggerHaptic} 
                        />
                    )}

                    {activeTab === 'rooms' && (
                        <StudyRoomPanel rooms={rooms} totalItems={totalItems} setRooms={setRooms} />
                    )}

                    {activeTab === 'feedback' && (
                        <FeedbackPanel feedback={feedback} />
                    )}

                    {activeTab === 'system' && (
                        <SystemStatusPanel 
                            systemStatus={systemStatus} 
                            handleSystemUpdate={handleSystemUpdate}
                            announcements={announcements}
                            newAnnouncement={newAnnouncement}
                            setNewAnnouncement={setNewAnnouncement}
                            announcementType={announcementType}
                            setAnnouncementType={setAnnouncementType}
                            handlePostAnnouncement={handlePostAnnouncement}
                            handleDeleteAnnouncement={handleDeleteAnnouncement}
                        />
                    )}

                    {activeTab === 'broadcast' && (
                        <BroadcastPanel setToast={setToast} />
                    )}

                    {activeTab === 'audit' && (
                        <AuditLogPanel auditLogs={auditLogs} />
                    )}

                    {activeTab === 'marathons' && (
                        <MarathonManager />
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-between bg-white dark:bg-surface-dark p-6 rounded-[2rem] border border-border-light dark:border-border-dark shadow-sm">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-stone-800 text-xs font-black uppercase tracking-widest disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                Previous
                            </button>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-stone-800 text-xs font-black uppercase tracking-widest disabled:opacity-30 hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* User Delete Modal */}
            <AnimatePresence>
                {deleteModalUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-border-light dark:border-border-dark"
                        >
                            <h2 className="text-2xl font-black tracking-tight mb-2">Delete Account?</h2>
                            <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest">Target: {deleteModalUser.email}</p>
                            
                            <textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Reason for deletion (sent to user)..."
                                className="w-full bg-slate-50 dark:bg-stone-900/50 border border-border-light dark:border-border-dark rounded-2xl p-4 text-sm font-bold mb-8 min-h-[100px] outline-none"
                            />

                            <div className="flex gap-4">
                                <button onClick={() => setDeleteModalUser(null)} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-stone-800 font-black text-xs uppercase tracking-widest">Cancel</button>
                                <button onClick={handleDeleteUser} disabled={!deleteReason.trim()} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest">Confirm</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-center gap-3 ${
                            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                            <Icon name={toast.type === 'success' ? 'check_circle' : 'error'} />
                            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
