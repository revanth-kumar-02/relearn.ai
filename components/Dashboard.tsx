import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from './common/Icon';
import Skeleton, { PlanCardSkeleton } from './common/Skeleton';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { plans, tasks, recentActivity, notifications, clearAllActivity, isLoading } = useData();
    const { user } = useAuth();

    const today = useMemo(() => new Date(), []);
    const [currentViewDate, setCurrentViewDate] = useState(new Date());
    const [showWelcome, setShowWelcome] = useState(true);

    const marqueeRef = useRef<HTMLDivElement>(null);
    const [scrollDist, setScrollDist] = useState(0);

    const activePlans = useMemo(() => 
        (plans || []).filter(p => !p.isArchived && p.progress < 100),
    [plans]);

    useEffect(() => {
        const calculateScroll = () => {
            if (marqueeRef.current) {
                const containerWidth = marqueeRef.current.parentElement?.offsetWidth || 0;
                const contentWidth = marqueeRef.current.scrollWidth;
                if (contentWidth > containerWidth) {
                    setScrollDist(containerWidth - contentWidth);
                } else {
                    setScrollDist(0);
                }
            }
        };

        calculateScroll();
        window.addEventListener('resize', calculateScroll);
        return () => window.removeEventListener('resize', calculateScroll);
    }, [activePlans]);

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
        if (hour >= 5 && hour < 12) return 'Good morning';
        if (hour >= 12 && hour < 17) return 'Good afternoon';
        return 'Good evening';
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
            <div className="pb-24 md:pb-8 animate-fade-in p-4 space-y-10">
                <div className="flex justify-between items-center mb-8">
                   <div className="flex gap-3">
                       <Skeleton variant="circle" className="h-10 w-10" />
                       <div className="space-y-1">
                           <Skeleton variant="text" className="w-24" />
                           <Skeleton variant="text" className="w-32" />
                       </div>
                   </div>
                   <Skeleton variant="circle" className="h-10 w-10" />
                </div>
                <section>
                    <Skeleton variant="text" className="w-32 mb-4" />
                    <div className="flex gap-4 overflow-hidden">
                        <PlanCardSkeleton />
                        <PlanCardSkeleton />
                    </div>
                </section>
                <section>
                    <Skeleton variant="text" className="w-32 mb-4" />
                    <Skeleton className="h-[400px] w-full" />
                </section>
            </div>
        );
    }

    return (
        <div className="pb-24 md:pb-8 animate-fade-in">
            <div className="px-4 pt-6 pb-4 bg-background-light dark:bg-background-dark sticky top-0 z-10 md:relative border-b border-border-light/20 dark:border-border-dark/20 md:border-none">
                <div className="flex justify-between items-center mb-4">
                    <button 
                        onClick={() => navigate('/profile')} 
                        className="flex items-center gap-3 group text-left"
                        aria-label={`View your profile, ${firstName}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center border-2 border-white dark:border-surface-dark shadow-sm group-hover:border-primary transition-all">
                            <span className="font-bold text-lg" aria-hidden="true">{firstInitial}</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark leading-tight group-hover:text-primary transition-colors">{greeting}, {firstName}</h2>
                            <p className="text-xs text-text-secondary-light font-medium">Ready to learn something new today?</p>
                        </div>
                    </button>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => navigate('/notifications')} 
                            className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                            aria-label={`${notifications.length} notifications, ${hasUnreadNotifications ? 'new messages available' : 'no new messages'}`}
                        >
                            <Icon name="notifications" />
                            {hasUnreadNotifications && (
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-surface-dark"></span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 space-y-10">
                {isNewUser && showWelcome && (
                    <div className="mb-6">
                        <div className="bg-primary/10 rounded-2xl p-6 flex items-start gap-4 border border-primary/20 relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
                            <span className="mt-1"><Icon name="celebration" className="text-primary text-4xl" /></span>
                            <div className="relative z-10">
                                <h3 className="font-bold text-primary text-xl">Welcome to your Learning Hub!</h3>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2 leading-relaxed">
                                    ReLearn.ai helps you structure your learning with AI. Create your first personalized plan to get started on your journey.
                                </p>
                                <button
                                    onClick={() => navigate('/create-plan')}
                                    className="mt-4 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                                >
                                    Create Your First Plan
                                </button>
                            </div>
                            <button 
                                onClick={() => setShowWelcome(false)} 
                                className="absolute top-4 right-4 p-1 text-primary/50 hover:text-primary transition-colors"
                                aria-label="Close welcome message"
                            >
                                <Icon name="close" className="text-xl" />
                            </button>
                        </div>
                    </div>
                )}

                <section className="overflow-hidden" id="tutorial-active-plans" aria-labelledby="active-plans-heading">
                    <div className="flex items-center justify-between mb-4">
                        <h3 id="active-plans-heading" className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Active Plans</h3>
                        <button onClick={() => navigate('/diary')} className="text-sm font-bold text-primary hover:underline" aria-label="View all active and archived plans">View All</button>
                    </div>

                    {activePlans.length > 0 ? (
                        <div className="marquee-container w-full overflow-hidden">
                            <div
                                ref={marqueeRef}
                                className={`marquee-content py-4 flex gap-6 ${scrollDist < 0 ? 'animating' : 'justify-center mx-auto'}`}
                                style={{ '--scroll-dist': `${scrollDist}px` } as React.CSSProperties}
                            >
                                {activePlans.map((plan, index) => (
                                    <PlanCard key={plan.id} plan={plan} index={index} navigate={navigate} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => navigate('/create-plan')} 
                            className="w-full flex flex-col items-center justify-center p-12 bg-white dark:bg-stone-900 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-all group overflow-hidden relative" 
                            aria-label="Start a New Journey by creating a new plan"
                        >
                            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-sm border border-primary/5">
                                <Icon name="auto_awesome" className="text-3xl" />
                            </div>
                            <h4 className="font-bold text-text-primary-light dark:text-text-primary-dark text-xl">Start Your Journey</h4>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center mt-3 max-w-xs relative z-10 leading-relaxed">
                                You don't have any active learning plans. Create one now and let AI guide your success.
                            </p>
                            <div className="mt-8 px-10 py-3.5 bg-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/20 group-hover:shadow-primary/30 group-hover:-translate-y-1 transition-all">
                                Generate New Plan
                            </div>
                        </button>
                    )}
                </section>

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

                <ActivitySection
                    recentActivity={recentActivity}
                    clearAllActivity={clearAllActivity}
                />
            </div>
        </div>
    );
};

// --- MEMOIZED SUB-COMPONENTS ---

const PlanCard = React.memo(({ plan, index, navigate }: any) => (
    <button
        id={index === 0 ? "tutorial-plan-card" : undefined}
        onClick={() => navigate('/plan-details', { state: { planId: plan.id } })}
        className="w-[280px] md:w-[320px] h-32 text-left bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm cursor-pointer hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.02] hover:border-primary/30 transition-all duration-300 ease-in-out overflow-hidden flex shrink-0 group"
        aria-label={`Learning plan: ${plan.title}. ${Math.round(plan.progress)}% completed.`}
    >
        <div className="w-28 h-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden shrink-0">
            <img
                src={plan.coverImage || `https://image.pollinations.ai/prompt/${encodeURIComponent(plan.title + ' abstract digital art')}?width=640&height=640&nologo=true`}
                alt=""
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                referrerPolicy="no-referrer"
                aria-hidden="true"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${plan.id}/640/640`; }}
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
        </div>

        <div className="p-4 flex flex-col flex-1 min-w-0">
            <h4 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark truncate mb-1 group-hover:text-primary transition-colors duration-300">{plan.title}</h4>
            <div className="flex items-center gap-2 mb-auto">
                <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">{plan.completedDays} / {plan.totalDays} Tasks</p>
                {plan.difficulty && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${plan.difficulty === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        plan.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {plan.difficulty}
                    </span>
                )}
            </div>

            <div className="mt-2 space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">Progress</span>
                    <span className="text-primary">{Math.round(plan.progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-background-light dark:bg-background-dark rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                    <div
                        className="h-full bg-secondary rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                        style={{ width: `${plan.progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    </button>
));

const ScheduleSection = React.memo(({
    currentMonthName, currentYear, handlePrevMonth, handleNextMonth,
    firstDayOfMonth, daysInMonth, today, currentMonthIdx,
    selectedDay, setSelectedDay, dayHasEvents, currentEvents,
    navigate
}: any) => {
    const getPriorityColor = (priority?: 'Low' | 'Medium' | 'High') => {
        switch (priority) {
            case 'High': return 'bg-red-500';
            case 'Medium': return 'bg-amber-500';
            case 'Low': return 'bg-blue-500';
            default: return 'bg-gray-300';
        }
    };

    return (
        <section aria-labelledby="schedule-heading">
            <h3 id="schedule-heading" className="text-xl font-bold mb-4 text-text-primary-light dark:text-text-primary-dark">Schedule</h3>
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-2 sm:p-5 shadow-sm border border-border-light dark:border-border-dark w-full overflow-hidden">
                <div className="w-full md:max-w-[90%] mx-auto">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="font-bold text-text-primary-light dark:text-text-primary-dark" aria-live="polite">{currentMonthName} {currentYear}</span>
                        <div className="flex gap-2">
                            <button onClick={handlePrevMonth} className="text-text-secondary-light hover:text-primary p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Previous Month">
                                <Icon name="chevron_left" />
                            </button>
                            <button onClick={handleNextMonth} className="text-text-secondary-light hover:text-primary p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Next Month">
                                <Icon name="chevron_right" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4 w-full" role="grid" aria-label="Calendar">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d} className="text-text-secondary-light font-bold opacity-60 uppercase text-[10px] py-1" role="columnheader">{d}</span>)}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square w-full" role="gridcell"></div>
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isToday = day === today.getDate() && currentMonthIdx === today.getMonth() && currentYear === today.getFullYear();
                            const isSelected = day === selectedDay;
                            const hasEvent = dayHasEvents(day);

                            return (
                                <button
                                    key={i}
                                    role="gridcell"
                                    onClick={() => setSelectedDay(day)}
                                    className="aspect-square w-full flex items-center justify-center relative group"
                                    aria-label={`${day} ${currentMonthName} ${currentYear}${isToday ? ', Today' : ''}${hasEvent ? ', has tasks' : ''}`}
                                    aria-selected={isSelected}
                                >
                                    <div className={`
                                        w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-sm transition-all duration-200
                                        ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10 font-bold' : 
                                          isToday ? 'bg-primary/10 dark:bg-primary/20 text-primary font-bold ring-1 ring-primary/30 ring-inset' : 
                                          'text-text-primary-light dark:text-text-primary-dark hover:bg-black/5 dark:hover:bg-white/5'}
                                        ${!isSelected && hasEvent ? 'font-bold' : ''}
                                    `}>
                                        {day}
                                    </div>
                                    {hasEvent && !isSelected && (
                                        <div className="absolute bottom-1.5 w-1 h-1 bg-secondary rounded-full" aria-hidden="true"></div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="pt-4 border-t border-border-light dark:border-border-dark min-h-[100px] px-2" aria-live="polite">
                    <h4 className="text-xs font-bold text-text-secondary-light uppercase tracking-wider mb-3">Tasks for {currentMonthName.slice(0, 3)} {selectedDay}</h4>

                    {currentEvents.length > 0 ? (
                        <div className="space-y-3">
                            {currentEvents.map((event: any) => (
                                <button 
                                    key={event.id} 
                                    onClick={() => navigate('/edit-task', { state: { taskId: event.id } })} 
                                    className="w-full text-left flex gap-3 items-center group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-lg -mx-2 transition-colors relative"
                                    aria-label={`Task: ${event.title}. Status: ${event.status}. Click to edit.`}
                                >
                                    <div className={`absolute top-0 left-0 h-full w-1 ${getPriorityColor(event.priority)} rounded-l-lg`} aria-hidden="true"></div>
                                    <div className={`h-10 w-10 rounded-lg ${event.bgColor || 'bg-primary/10'} flex items-center justify-center overflow-hidden ${event.color || 'text-primary'} shrink-0 ml-2`}>
                                        <span className="mt-0.5"><Icon name={event.type || 'task'} /></span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-semibold text-text-primary-light dark:text-text-primary-dark text-sm truncate">{event.title}</h5>
                                        <p className="text-xs text-text-secondary-light truncate">{event.subtitle || event.description || 'No details'}</p>
                                    </div>
                                    <span className="text-xs font-bold text-text-secondary-light whitespace-nowrap group-hover:text-primary transition-colors">
                                        {event.status === 'Completed' ? 'Done' : 'Pending'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-text-secondary-light">
                            <Icon name="event_busy" className="text-4xl mb-2 opacity-20" />
                            <p className="text-sm">No tasks scheduled.</p>
                            <button className="mt-2 text-primary text-xs font-bold hover:underline" onClick={() => navigate('/add-task')}>+ Add Task</button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
});

const ActivitySection = React.memo(({ recentActivity, clearAllActivity }: any) => (
    <section aria-labelledby="activity-heading">
        <div className="flex items-center justify-between mb-4">
            <h3 id="activity-heading" className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Recent Activity</h3>
            {(recentActivity || []).length > 0 && (
                <button 
                    onClick={clearAllActivity} 
                    className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                    aria-label="Clear all activity history"
                >
                    Clear All
                </button>
            )}
        </div>
        <div className="max-h-[400px] overflow-y-auto no-scrollbar pr-2">
            {(recentActivity || []).length > 0 ? (
                <div className="space-y-3">
                    {recentActivity.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 items-center p-3 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:border-primary/20 transition-colors">
                            <div className={`h-10 w-10 rounded-full ${item.bg} flex items-center justify-center ${item.color} shrink-0 overflow-hidden`}>
                                <Icon name={item.icon} />
                            </div>
                            <div>
                                <h5 className="font-semibold text-text-primary-light dark:text-text-primary-dark text-sm">{item.title}</h5>
                                <p className="text-xs text-text-secondary-light">{item.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-surface-light/50 dark:bg-surface-dark/50 rounded-xl border border-border-light dark:border-border-dark">
                    <Icon name="history" className="text-3xl text-text-secondary-light mb-2 opacity-40" />
                    <p className="text-sm text-text-secondary-light">No recent activity.</p>
                </div>
            )}
        </div>
    </section>
));

export default Dashboard;