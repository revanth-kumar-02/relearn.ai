import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from './common/Icon';
import Skeleton, { PlanCardSkeleton } from './common/Skeleton';
import { generateStudyNudges, sendSmartReminder, type StudyNudge } from '../services/smartReminderService';
import { useConnection } from '../contexts/ConnectionContext';
import ConceptCollisionWidget from './ConceptCollisionWidget';
import { getWarmUpQuestions } from '../services/mistakeMuseumService';
import { discoverMentors } from '../services/dataService';
import { User } from '../types';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { plans, tasks, recentActivity, notifications, addNotification, clearAllActivity, isLoading } = useData();
    const { user } = useAuth();

    const today = useMemo(() => new Date(), []);
    const [currentViewDate, setCurrentViewDate] = useState(new Date());
    const [showWelcome, setShowWelcome] = useState(true);
    const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());

    const activePlans = useMemo(() => 
        (plans || []).filter(p => p.status === 'active'),
    [plans]);

    // Smart Study Reminders
    const studyNudges = useMemo(() => {
        if (isLoading || plans.length === 0) return [];
        return generateStudyNudges(plans, tasks, user?.preferences, user?.stats);
    }, [plans, tasks, isLoading, user?.preferences, user?.stats]);

    useEffect(() => {
        if (studyNudges.length > 0) {
            sendSmartReminder(studyNudges);
        }
    }, [studyNudges]);

    const visibleNudges = useMemo(() =>
        studyNudges.filter(n => !dismissedNudges.has(n.id)),
    [studyNudges, dismissedNudges]);

    const [warmUpQuestions, setWarmUpQuestions] = useState<any[]>([]);
    const [mentors, setMentors] = useState<User[]>([]);

    useEffect(() => {
        if (user?.id) {
            setWarmUpQuestions(getWarmUpQuestions(3));
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id && user?.weakSubjects && user.weakSubjects.length > 0) {
            discoverMentors(user.id, user.weakSubjects).then(setMentors);
        }
    }, [user?.id, user?.weakSubjects]);

    const activeLearningNudges = useMemo(() => 
        visibleNudges.filter(n => n.type === 'no_progress_today' || n.type === 'streak_at_risk'),
    [visibleNudges]);

    const currentYear = currentViewDate.getFullYear();
    const currentMonthIdx = currentViewDate.getMonth();
    const currentMonthName = currentViewDate.toLocaleString('default', { month: 'long' });

    const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1).getDay();

    const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

    const hasUnreadNotifications = useMemo(() => 
        (notifications || []).some(n => !n.read),
    [notifications]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    const handlePrevMonth = useCallback(() => {
        setCurrentViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        setSelectedDay(1);
    }, []);

    const handleNextMonth = useCallback(() => {
        setCurrentViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        setSelectedDay(1);
    }, []);

    const currentEvents = useMemo(() => {
        const targetDatePrefix = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
        const targetDayStr = String(selectedDay).padStart(2, '0');
        const targetDate = `${targetDatePrefix}-${targetDayStr}`;
        return (tasks || []).filter(t => t.dueDate === targetDate);
    }, [tasks, currentYear, currentMonthIdx, selectedDay]);

    const isNewUser = plans.length === 0 && !isLoading;

    const dayHasEvents = useCallback((day: number) => {
        const targetDatePrefix = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
        const targetDayStr = String(day).padStart(2, '0');
        const targetDate = `${targetDatePrefix}-${targetDayStr}`;
        return (tasks || []).some(t => t.dueDate === targetDate);
    }, [tasks, currentYear, currentMonthIdx]);

    const firstName = (user && user.name) ? user.name.split(' ')[0] : 'Learner';
    const firstInitial = (user && user.email) ? user.email.charAt(0).toUpperCase() : ((user && user.name) ? user.name.charAt(0).toUpperCase() : 'L');

    if (isLoading) {
        return (
            <div className="p-8 space-y-10">
                <div className="flex justify-between items-center">
                   <div className="flex gap-4">
                       <Skeleton variant="circle" className="h-14 w-14" />
                       <div className="space-y-2">
                           <Skeleton variant="text" className="w-32 h-6" />
                           <Skeleton variant="text" className="w-48 h-4" />
                       </div>
                   </div>
                   <Skeleton variant="circle" className="h-12 w-12" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-64 w-full rounded-2xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="pb-24 pt-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                {/* Quantum Header */}
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse glow-secondary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">Live Consciousness</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-stone-900 dark:text-white">
                            {greeting}, <span className="text-primary">{firstName}</span>.
                        </h1>
                        <p className="text-sm font-bold text-stone-400 max-w-sm leading-relaxed">
                            Your Knowledge Matrix is ready. Explore {activePlans.length} active learning paths today.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/notifications')}
                            className="w-14 h-14 rounded-2xl glass-card noise-overlay flex items-center justify-center text-stone-600 dark:text-stone-300 relative shadow-xl"
                        >
                            <Icon name="notifications" className="text-2xl" />
                            {hasUnreadNotifications && (
                                <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-stone-900 shadow-glow-red" />
                            )}
                        </motion.button>
                        
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/profile')}
                            className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20 overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-white/10 noise-overlay" />
                            <span className="text-xl font-black relative z-10">{firstInitial}</span>
                        </motion.button>
                    </div>
                </motion.header>

                {/* Main Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Primary Focus Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Active Plans Spatial Carousel */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Learning Pathways</h2>
                                <button onClick={() => navigate('/diary')} className="text-[10px] font-black uppercase text-primary hover:tracking-widest transition-all">Expand View</button>
                            </div>
                            
                            {activePlans.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {activePlans.slice(0, 4).map((plan, index) => (
                                        <PlanCard key={plan.id} plan={plan} index={index} navigate={navigate} />
                                    ))}
                                </div>
                            ) : (
                                <motion.div 
                                    whileHover={{ y: -4 }}
                                    onClick={() => navigate('/create-plan')}
                                    className="glass-card noise-overlay rounded-2xl p-12 border-dashed border-2 border-stone-200 dark:border-stone-800 flex flex-col items-center text-center cursor-pointer group"
                                >
                                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
                                        <Icon name="auto_awesome" className="text-3xl text-primary" />
                                    </div>
                                    <h3 className="text-xl font-black tracking-tight mb-2">Initiate First Plan</h3>
                                    <p className="text-sm text-stone-400 font-bold max-w-xs mb-8">Let the AI engine construct a personalized learning trajectory for your goals.</p>
                                    <div className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">Generate Plan</div>
                                </motion.div>
                            )}
                        </section>

                        <ConceptCollisionWidget />
                    </div>

                    {/* Secondary Context Area */}
                    <div className="space-y-8">
                        {/* Mistake Museum Warmup */}
                        {warmUpQuestions.length > 0 && (
                            <motion.section 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card noise-overlay rounded-2xl p-8 border border-red-500/10 relative overflow-hidden group"
                            >
                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-red-500/5 rounded-full blur-3xl" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-4 flex items-center gap-2">
                                    <Icon name="history_edu" className="text-sm" />
                                    Cognitive Recalibration
                                </h3>
                                <p className="text-sm font-bold text-stone-600 dark:text-stone-300 mb-6 leading-relaxed">
                                    Your AI Engine detected <span className="text-red-500">{warmUpQuestions.length} anomalies</span> in past sessions. Resolve them now?
                                </p>
                                <button 
                                    onClick={() => navigate('/learning-workspace', { state: { warmUpMode: true } })}
                                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Initiate Warmup
                                </button>
                            </motion.section>
                        )}

                        {/* Calendar / Schedule Module */}
                        <ScheduleSection
                            currentMonthName={currentMonthName}
                            currentYear={currentYear}
                            handlePrevMonth={handlePrevMonth}
                            handleNextMonth={handleNextMonth}
                            firstDayOfMonth={firstDayOfMonth}
                            daysInMonth={daysInMonth}
                            today={today}
                            currentMonthIdx={currentMonthIdx}
                            selectedDay={selectedDay}
                            setSelectedDay={setSelectedDay}
                            dayHasEvents={dayHasEvents}
                            currentEvents={currentEvents}
                            navigate={navigate}
                        />

                        {/* Activity Pulse */}
                        <ActivitySection
                            recentActivity={recentActivity}
                            clearAllActivity={clearAllActivity}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- PREMIUM SUB-COMPONENTS ---

const PlanCard = React.memo(({ plan, index, navigate }: any) => (
    <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        onClick={() => navigate('/plan-details', { state: { planId: plan.id } })}
        className="glass-card noise-overlay rounded-2xl p-6 text-left border border-white/40 shadow-xl group relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1"
    >
        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
            <Icon name="rocket_launch" className="text-6xl" />
        </div>
        
        <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-inner">
                <img
                    src={plan.coverImage || `https://pollinations.ai/p/${encodeURIComponent(plan.title + ' abstract neural art')}?width=400&height=400&nologo=true`}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${plan.id}/400/400`; }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-lg font-black tracking-tight truncate group-hover:text-primary transition-colors">{plan.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">{plan.difficulty || 'Cognitive'}</span>
                    <div className="w-1 h-1 rounded-full bg-stone-300" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">{plan.totalDays} Stages</span>
                </div>
            </div>
        </div>

        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Resonance Level</span>
                <span className="text-xl font-black tracking-tighter tabular-nums">{Math.round(plan.progress)}%</span>
            </div>
            <div className="h-3 w-full bg-stone-100 dark:bg-stone-800/50 rounded-full p-0.5 border border-stone-200/50 dark:border-stone-700/50 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${plan.progress}%` }}
                    className="h-full bg-primary rounded-full relative shadow-glow-primary"
                    transition={{ duration: 1.5, ease: "circOut" }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-shimmer" />
                </motion.div>
            </div>
        </div>
    </motion.button>
));

const ScheduleSection = React.memo(({
    currentMonthName, currentYear, handlePrevMonth, handleNextMonth,
    firstDayOfMonth, daysInMonth, today, currentMonthIdx,
    selectedDay, setSelectedDay, dayHasEvents, currentEvents,
    navigate
}: any) => {
    return (
        <section className="glass-card noise-overlay rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Timeline</h3>
                <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors">
                        <Icon name="chevron_left" className="text-sm" />
                    </button>
                    <button onClick={handleNextMonth} className="w-8 h-8 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors">
                        <Icon name="chevron_right" className="text-sm" />
                    </button>
                </div>
            </div>

            <div className="text-center mb-6">
                <p className="text-sm font-black uppercase tracking-widest">{currentMonthName} {currentYear}</p>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-8">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={`${d}-${i}`} className="text-[9px] font-black text-stone-400 text-center py-2">{d}</span>
                ))}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = day === today.getDate() && currentMonthIdx === today.getMonth() && currentYear === today.getFullYear();
                    const isSelected = day === selectedDay;
                    const hasEvent = dayHasEvents(day);

                    return (
                        <button
                            key={i}
                            onClick={() => setSelectedDay(day)}
                            className="aspect-square flex items-center justify-center relative group"
                        >
                            <div className={`
                                w-8 h-8 flex items-center justify-center rounded-xl text-xs transition-all duration-300
                                ${isSelected ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-110 font-black' : 
                                  isToday ? 'bg-primary/10 text-primary font-black ring-1 ring-primary/30' : 
                                  'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}
                            `}>
                                {day}
                            </div>
                            {hasEvent && !isSelected && (
                                <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full glow-primary" />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="wait">
                    {currentEvents.length > 0 ? (
                        <motion.div 
                            key={`events-${selectedDay}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {currentEvents.map((event: any) => (
                                <button 
                                    key={event.id} 
                                    onClick={() => navigate('/edit-task', { state: { taskId: event.id } })} 
                                    className="w-full text-left p-4 bg-stone-50 dark:bg-stone-800/50 rounded-[1.5rem] flex items-center gap-4 group hover:bg-white dark:hover:bg-stone-800 transition-all border border-transparent hover:border-stone-200 dark:hover:border-stone-700"
                                >
                                    <div className={`w-2 h-8 rounded-full ${event.priority === 'High' ? 'bg-red-500 shadow-glow-red' : 'bg-primary shadow-glow-primary'}`} />
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-black tracking-tight truncate">{event.title}</h5>
                                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{event.status}</p>
                                    </div>
                                    <Icon name="chevron_right" className="text-stone-300 group-hover:text-primary transition-colors" />
                                </button>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="no-events"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-6"
                        >
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Clear Horizon</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
});

const ActivitySection = React.memo(({ recentActivity, clearAllActivity }: any) => (
    <section className="glass-card noise-overlay rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Neural Log</h3>
            {(recentActivity || []).length > 0 && (
                <button onClick={clearAllActivity} className="text-[9px] font-black uppercase tracking-widest text-primary opacity-60 hover:opacity-100 transition-opacity">Purge Log</button>
            )}
        </div>
        
        <div className="space-y-6">
            {(recentActivity || []).length > 0 ? (
                recentActivity.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-start">
                        <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} shadow-lg shrink-0`}>
                            <Icon name={item.icon} className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-black tracking-tight text-stone-800 dark:text-stone-200">{item.title}</h5>
                            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">{item.time}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 opacity-40">Stasis State</p>
                </div>
            )}
        </div>
    </section>
));

export default Dashboard;