import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Plan } from '../types';

const DiaryCard: React.FC<{ plan: Plan }> = ({ plan }) => {
    const navigate = useNavigate();
    const { tasks } = useData();
    const [animatedProgress, setAnimatedProgress] = useState(0);

    // Animate progress bar on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedProgress(plan.progress);
        }, 100);
        return () => clearTimeout(timer);
    }, [plan.progress]);

    // Calculate Last Engagement accurately based on completed tasks
    const lastEngagementText = useMemo(() => {
        // Filter for completed tasks belonging to this plan
        const planTasks = tasks.filter(t => t.planId === plan.id && t.status === 'Completed' && t.completedAt);

        if (planTasks.length === 0) {
            // Fallback: if progress is > 0 but no tasks (e.g. manual progress update legacy?), handle gracefully
            if (plan.progress > 0) return "Recently";
            return "Start your journey";
        }

        // Sort by completion date descending
        const sorted = planTasks.sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
        const lastDate = new Date(sorted[0].completedAt!);
        const now = new Date();

        // Calculate difference in milliseconds
        const diffInMs = now.getTime() - lastDate.getTime();
        const diffInSeconds = Math.floor(diffInMs / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInSeconds < 60) return "Just now";
        if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        if (diffInDays === 1) return "Yesterday";
        if (diffInDays < 7) return `${diffInDays} days ago`;

        return `on ${lastDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }, [tasks, plan.id, plan.progress]);

    // Use stored description or generic fallback logic
    const description = plan.description || `A comprehensive ${plan.totalDays}-day guide to mastering ${plan.subject}. Follow this structured path to build your skills and achieve your goals.`;

    const getButtonText = () => {
        if (plan.progress === 100) return 'Review';
        if (plan.progress > 0) return 'Continue';
        return 'Start';
    }

    // Generate fallback URL synchronously for render
    const fallbackPrompt = `Super-premium 3D digital art for "${plan.subject || plan.title}" in Nano Banana design system. Bold chunky silhouette, glossy injection-molded plastic finish, soft-radius corners, volumetric isometric view, wax-plastic SSS textures, neon gradients on dark obsidian, studio lighting, Octane render finish, 8k, nologo`;
    const fallbackImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(fallbackPrompt)}?width=800&height=400&nologo=true`;

    return (
        <div
            onClick={() => navigate('/plan-details', { state: { planId: plan.id } })}
            className="bg-white dark:bg-dark-cream/60 rounded-xl shadow-lg shadow-stone-300/40 dark:shadow-black/20 overflow-hidden border border-black/5 dark:border-cream/10 cursor-pointer hover:shadow-xl transition-shadow animate-fade-in group"
        >
            <div className="relative h-24 md:h-28 w-full overflow-hidden">
                <img
                    src={plan.coverImage || fallbackImage}
                    alt={plan.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${plan.id}/800/400`; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

                {/* AI Generated Badge */}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-sm">
                    AI Generated
                </div>
            </div>

            <div className="p-2.5">
                <h2 className="font-serif text-base font-bold text-stone-800 dark:text-cream mb-0.5 leading-tight line-clamp-1">
                    {plan.title}
                </h2>
                <p className="text-[10px] text-stone-600 dark:text-stone-300 mb-1.5 leading-tight line-clamp-1">
                    {description}
                </p>

                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Progress</span>
                    <span className="text-[9px] font-bold text-stone-700 dark:text-stone-200">{Math.round(plan.progress)}%</span>
                </div>

                <div className="w-full bg-stone-200/80 dark:bg-stone-700/50 rounded-full h-1 mb-2 overflow-hidden">
                    <div
                        className="bg-terracotta h-1 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${animatedProgress}%` }}
                    ></div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800/50">
                    <p className="text-[8px] text-stone-500 dark:text-stone-400 font-medium leading-none">Last: {lastEngagementText}</p>
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate('/plan-details', { state: { planId: plan.id } }) }}
                        className="bg-terracotta text-white font-bold text-[9px] px-2.5 py-1 rounded-md flex items-center gap-1 hover:opacity-90 transition-opacity shadow-sm shadow-terracotta/20"
                    >
                        <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
};


const LearningDiary: React.FC = () => {
    const navigate = useNavigate();
    const { plans } = useData();
    const [activeTab, setActiveTab] = useState<'current' | 'explored' | 'archived'>('current');

    const displayPlans = plans.filter(plan => {
        if (activeTab === 'current') return !plan.isArchived && plan.progress < 100;
        if (activeTab === 'explored') return !plan.isArchived && plan.progress === 100;
        if (activeTab === 'archived') return plan.isArchived;
        return false;
    });

    return (
        <div className="min-h-screen bg-cream dark:bg-dark-cream text-stone-800 dark:text-cream pb-28 animate-fade-in">
            {/* Header */}
            <header className="sticky top-0 bg-cream/90 dark:bg-dark-cream/90 backdrop-blur-md z-10 border-b border-black/5 dark:border-cream/10">
                <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl text-terracotta">menu_book</span>
                        <h1 className="font-serif text-xl font-bold">Your Learning Journal</h1>
                    </div>
                    <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                        <span className="material-symbols-outlined">search</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4">
                {/* Tabs */}
                <div className="mb-6 bg-stone-200/50 dark:bg-stone-800/50 p-1 rounded-lg flex items-center">
                    {(['current', 'explored', 'archived'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-sm font-bold capitalize transition-all duration-300 rounded ${activeTab === tab
                                    ? 'bg-white dark:bg-stone-900 shadow-md text-terracotta'
                                    : 'text-stone-600 dark:text-stone-400'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {displayPlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayPlans.map(plan => <DiaryCard key={plan.id} plan={plan} />)}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-70">
                        <span className="material-symbols-outlined text-6xl text-stone-400 dark:text-stone-600">upcoming</span>
                        <h3 className="mt-4 font-bold text-lg">It's quiet here. Ready to start a new learning journey?</h3>
                        <p className="text-sm text-stone-500">Your learning plans will appear here.</p>
                    </div>
                )}
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => navigate('/create-plan')}
                className="fixed bottom-[6.5rem] left-6 md:bottom-6 md:left-72 h-14 w-14 bg-terracotta text-white rounded-full shadow-lg shadow-terracotta/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
                aria-label="Create New Learning Plan"
            >
                <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform duration-300">add</span>
            </button>
        </div>
    );
};

export default LearningDiary;