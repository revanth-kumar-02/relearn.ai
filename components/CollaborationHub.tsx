import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from './common/Icon';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { studyPactService } from '../services/studyPactService';
import { challengeService } from '../services/challengeService';
import { StudyPact, PublicChallenge } from '../types';
import { triggerHaptic } from '../utils/haptics';

type HubTab = 'pacts' | 'challenges' | 'teams';

const CollaborationHub: React.FC = () => {
    const { user } = useAuth();
    const { plans } = useData();
    const [activeTab, setActiveTab] = useState<HubTab>('pacts');
    const [pacts, setPacts] = useState<StudyPact[]>([]);
    const [challenges, setChallenges] = useState<PublicChallenge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pact Creation State
    const [showNewPact, setShowNewPact] = useState(false);
    const [newPact, setNewPact] = useState({
        target_name: '',
        goal_description: '',
        stakes: '',
        deadline: ''
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            if (activeTab === 'pacts') {
                const data = await studyPactService.getUserPacts(user.id!);
                setPacts(data);
            } else if (activeTab === 'challenges') {
                const data = await challengeService.getChallenges();
                setChallenges(data);
            }
        } catch (error) {
            console.error('Failed to load hub data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            await studyPactService.createPact({
                creator_id: user.id!,
                creator_name: user.name,
                target_id: 'pending_invite', // Simplified for demo, would normally search for a user
                target_name: newPact.target_name,
                goal_description: newPact.goal_description,
                stakes: newPact.stakes,
                deadline: newPact.deadline
            });
            setShowNewPact(false);
            loadData();
            triggerHaptic('success');
        } catch (error) {
            console.error('Failed to create pact:', error);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/20">
                        <Icon name="groups" className="text-3xl" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Collaboration Hub</h1>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">Connect. Commit. Conquer.</p>
                    </div>
                </div>

                <nav className="flex bg-white dark:bg-stone-900 p-1.5 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                    {(['pacts', 'challenges', 'teams'] as HubTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); triggerHaptic('light'); }}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                : 'text-slate-400 hover:text-indigo-600'
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
                    className="min-h-[60vh]"
                >
                    {activeTab === 'pacts' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black tracking-tight">Active Pacts</h2>
                                <button 
                                    onClick={() => setShowNewPact(true)}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <Icon name="handshake" /> Propose New Pact
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pacts.map(pact => (
                                    <div key={pact.id} className="bg-white dark:bg-stone-900 rounded-[2rem] p-8 border border-border-light dark:border-border-dark shadow-xl group hover:border-indigo-500/50 transition-all">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg">
                                                    {pact.target_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-lg">Pact with {pact.target_name}</h3>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ends {new Date(pact.deadline).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                pact.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                            }`}>
                                                {pact.status}
                                            </span>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <div className="p-4 bg-gray-50 dark:bg-stone-800/50 rounded-2xl border border-border-light/50 dark:border-border-dark/50">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">The Goal</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-stone-300">"{pact.goal_description}"</p>
                                            </div>
                                            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">The Stakes</p>
                                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">"{pact.stakes}"</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">Update Progress</button>
                                            <button className="px-4 py-3 bg-slate-100 dark:bg-stone-800 text-slate-400 rounded-xl hover:text-red-500 transition-colors">
                                                <Icon name="cancel" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {pacts.length === 0 && !isLoading && (
                                    <div className="md:col-span-2 py-20 text-center bg-white dark:bg-stone-900 rounded-[2.5rem] border border-dashed border-border-light dark:border-border-dark">
                                        <Icon name="waving_hand" className="text-5xl text-slate-200 mb-4 mx-auto" />
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white">No Active Pacts</h3>
                                        <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto mt-2">Study with a friend to stay accountable. Propose your first pact above!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'challenges' && (
                        <div className="space-y-8">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
                                <div className="relative z-10">
                                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Featured Event</span>
                                    <h2 className="text-4xl font-black tracking-tighter mb-4">Mastery Marathon 2026</h2>
                                    <p className="text-lg font-medium text-white/80 max-w-xl mb-8 leading-relaxed">Complete 10 tasks in any subject this week to earn the exclusive "Marathon Finisher" badge and 5,000 XP.</p>
                                    <div className="flex items-center gap-8">
                                        <div>
                                            <p className="text-3xl font-black">2.4k+</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Participants</p>
                                        </div>
                                        <div className="h-10 w-px bg-white/20" />
                                        <div>
                                            <p className="text-3xl font-black">4 Days</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Remaining</p>
                                        </div>
                                        <button className="ml-auto px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-105 transition-all">Join Marathon</button>
                                    </div>
                                </div>
                                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                                <Icon name="auto_awesome" className="absolute right-12 top-12 text-8xl text-white/10" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {challenges.map(challenge => (
                                    <div key={challenge.id} className="bg-white dark:bg-stone-900 rounded-[2rem] p-6 border border-border-light dark:border-border-dark shadow-xl flex flex-col">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center mb-6">
                                            <Icon name="emoji_events" />
                                        </div>
                                        <h3 className="font-black text-lg mb-2">{challenge.title}</h3>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 flex-1 line-clamp-2">{challenge.description}</p>
                                        <div className="flex items-center justify-between pt-6 border-t border-border-light dark:border-border-dark mt-auto">
                                            <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
                                                <Icon name="stars" className="text-sm" />
                                                {challenge.xp_reward} XP
                                            </div>
                                            <button 
                                                onClick={() => { triggerHaptic('medium'); challengeService.joinChallenge(challenge.id, user?.id!) }}
                                                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline"
                                            >
                                                Join Now
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'teams' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 border border-border-light dark:border-border-dark shadow-xl">
                                    <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                                        <Icon name="diversity_3" className="text-purple-600" />
                                        Team Learning Plans
                                    </h2>
                                    <div className="space-y-4">
                                        {plans.filter(p => p.isTeamPlan).map(plan => (
                                            <div key={plan.id} className="p-5 bg-purple-50/30 dark:bg-purple-900/10 rounded-[1.5rem] border border-purple-100 dark:border-purple-900/30">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-black text-sm">{plan.title}</h3>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">{plan.teamMembers?.length || 0} Members</span>
                                                </div>
                                                <div className="flex -space-x-3 mb-4">
                                                    {[1,2,3].map(i => (
                                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-900 bg-slate-200" />
                                                    ))}
                                                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-900 bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-black">+{plan.teamMembers?.length ? plan.teamMembers.length - 3 : 0}</div>
                                                </div>
                                                <div className="h-2 w-full bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${plan.progress}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                        {plans.filter(p => p.isTeamPlan).length === 0 && (
                                            <div className="py-12 text-center">
                                                <Icon name="add_to_photos" className="text-3xl text-slate-200 mb-3 mx-auto" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active team plans</p>
                                                <button className="mt-4 text-xs font-black text-indigo-600 uppercase">Create Team Plan</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 border border-border-light dark:border-border-dark shadow-xl">
                                    <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                                        <Icon name="forum" className="text-indigo-600" />
                                        Community Feed
                                    </h2>
                                    <div className="space-y-6">
                                        {[
                                            { user: 'Sarah L.', action: 'shared a new Cheat Sheet', subject: 'Organic Chemistry', time: '12m ago' },
                                            { user: 'James W.', action: 'completed the Global Marathon', subject: 'Python Data Science', time: '1h ago' },
                                            { user: 'Elena R.', action: 'unlocked "Master Architect"', subject: 'System Design', time: '3h ago' }
                                        ].map((post, i) => (
                                            <div key={i} className="flex gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-stone-800 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-stone-300">
                                                        <span className="font-black text-slate-900 dark:text-white">{post.user}</span> {post.action}
                                                    </p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{post.subject} · {post.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* New Pact Modal */}
            <AnimatePresence>
                {showNewPact && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-stone-900 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-2">Propose Study Pact</h3>
                                <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest">Select a friend and set the stakes.</p>

                                <form onSubmit={handleCreatePact} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Study Partner Name</label>
                                        <input 
                                            required
                                            value={newPact.target_name}
                                            onChange={e => setNewPact({...newPact, target_name: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-stone-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 ring-indigo-500/10"
                                            placeholder="Who are you challenging?"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">The Goal</label>
                                        <input 
                                            required
                                            value={newPact.goal_description}
                                            onChange={e => setNewPact({...newPact, goal_description: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-stone-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 ring-indigo-500/10"
                                            placeholder="e.g. Complete 5 Practice Quizzes"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">The Stakes</label>
                                            <input 
                                                required
                                                value={newPact.stakes}
                                                onChange={e => setNewPact({...newPact, stakes: e.target.value})}
                                                className="w-full bg-gray-50 dark:bg-stone-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 ring-indigo-500/10"
                                                placeholder="What's on the line?"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Deadline</label>
                                            <input 
                                                required
                                                type="date"
                                                value={newPact.deadline}
                                                onChange={e => setNewPact({...newPact, deadline: e.target.value})}
                                                className="w-full bg-gray-50 dark:bg-stone-800/50 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 ring-indigo-500/10"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowNewPact(false)}
                                            className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-stone-800 text-[10px] font-black uppercase tracking-widest text-slate-500"
                                        >
                                            Dismiss
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20"
                                        >
                                            Send Proposal
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CollaborationHub;
