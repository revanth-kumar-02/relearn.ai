import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '../../components/ui/Icon';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { studyPactService } from '../../services/api/studyPactService';
import { marathonService } from '../../services/api/marathonService';
import { friendService } from '../../services/api/friendService';
import { xpService } from '../../services/api/xpService';
import { StudyPact, Marathon, MarathonParticipant } from '../../types/index';
import { triggerHaptic } from '../../utils/haptics';
import { useToast } from '../../contexts/ToastContext';

type HubTab = 'pacts' | 'marathons' | 'teams';

const CollaborationHub: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { plans } = useData();
    const [activeTab, setActiveTab] = useState<HubTab>('pacts');
    const [pacts, setPacts] = useState<StudyPact[]>([]);
    const [marathons, setMarathons] = useState<Marathon[]>([]);
    const [participations, setParticipations] = useState<any[]>([]);
    const [friendActivities, setFriendActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Pact Creation State
    const [showNewPact, setShowNewPact] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [newPact, setNewPact] = useState({
        goal_description: '',
        stakes: '',
        deadline: ''
    });

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTabRef = useRef<HubTab | null>(null);

    useEffect(() => {
        loadData();
        
        // Setup subscriptions
        if (user) {
            const pactSub = studyPactService.subscribeToPacts(user.id, loadData);
            const marathonSub = marathonService.subscribeToMarathons(loadData);
            
            return () => {
                pactSub.unsubscribe();
                marathonSub.unsubscribe();
            };
        }
    }, [activeTab, user]);

    const loadData = async () => {
        if (!user) return;
        const isTabSwitch = lastTabRef.current !== activeTab;
        setIsLoading(isTabSwitch);
        lastTabRef.current = activeTab;
        try {
            if (activeTab === 'pacts') {
                const data = await studyPactService.getUserPacts(user.id!);
                setPacts(data);
            } else if (activeTab === 'marathons') {
                const [mData, pData] = await Promise.all([
                    marathonService.getMarathons(),
                    marathonService.getParticipation(user.id!)
                ]);
                setMarathons(mData);
                setParticipations(pData);
            } else if (activeTab === 'teams') {
                const friends = await friendService.getFriends(user.id!);
                const friendIds = friends.map(f => f.id);
                if (friendIds.length > 0) {
                    const { data: actData, error } = await supabase
                        .from('activity')
                        .select('userId, title, time')
                        .in('userId', friendIds)
                        .order('time', { ascending: false })
                        .limit(20);
                    
                    if (!error && actData) {
                        const friendsMap: Record<string, string> = {};
                        friends.forEach(f => { friendsMap[f.id] = f.name; });
                        const formattedActs = actData.map((act: any) => ({
                            userName: friendsMap[act.userId] || 'Friend',
                            title: act.title,
                            time: act.time
                        }));
                        setFriendActivities(formattedActs);
                    }
                } else {
                    setFriendActivities([]);
                }
            }
        } catch (error) {
            console.error('Failed to load hub data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchUsers = (val: string) => {
        setSearchQuery(val);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        
        if (!val || val.length < 1) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const results = await friendService.searchUsers(val, user!.id);
                setSearchResults(results);
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 400);
    };

    const handleCreatePact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedUser) {
            showToast("Please select a study partner", "error");
            return;
        }
        
        try {
            await studyPactService.createPact({
                creator_id: user.id!,
                creator_name: user.name,
                target_id: selectedUser.id,
                target_name: selectedUser.name,
                goal_description: newPact.goal_description,
                stakes: newPact.stakes,
                deadline: newPact.deadline
            });
            setShowNewPact(false);
            setSelectedUser(null);
            setSearchQuery('');
            setNewPact({ goal_description: '', stakes: '', deadline: '' });
            showToast("Pact proposal sent!", "success");
            triggerHaptic('success');
            loadData();
        } catch (error: any) {
            showToast(error.message || "Failed to create pact", "error");
        }
    };

    const handleJoinMarathon = async (marathonId: string) => {
        if (!user) return;
        try {
            await marathonService.joinMarathon(marathonId, user.id);
            showToast("Joined marathon successfully!", "success");
            triggerHaptic('success');
            loadData();
        } catch (error: any) {
            showToast(error.message || "Already joined or failed to join", "error");
        }
    };

    const handlePactAction = async (pactId: string, status: StudyPact['status']) => {
        try {
            await studyPactService.updatePactStatus(pactId, status);
            if (status === 'completed') {
                await xpService.logXP(user!.id, 500, 'pact', pactId);
                showToast("Pact completed! +500 XP rewarded", "success");
            } else {
                showToast(`Pact ${status}`, "success");
            }
            triggerHaptic('medium');
            loadData();
        } catch (err) {
            showToast("Action failed", "error");
        }
    };

    const getMarathonProgress = (marathonId: string) => {
        return participations.find(p => p.marathon_id === marathonId);
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
                    {(['pacts', 'marathons', 'teams'] as HubTab[]).map(tab => (
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
                                <h2 className="text-xl font-black tracking-tight">Study Pacts</h2>
                                <button 
                                    onClick={() => setShowNewPact(true)}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <Icon name="handshake" /> Propose New Pact
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[1, 2].map(i => (
                                        <div key={i} className="h-64 bg-gray-100 dark:bg-stone-800 animate-pulse rounded-[2rem]" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {pacts.map(pact => (
                                        <div key={pact.id} className="bg-white dark:bg-stone-900 rounded-[2rem] p-8 border border-border-light dark:border-border-dark shadow-xl group hover:border-indigo-500/50 transition-all relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg">
                                                        {(pact.creator_id === user?.id ? pact.target_name : pact.creator_name).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-lg">
                                                            {pact.creator_id === user?.id ? `With ${pact.target_name}` : `From ${pact.creator_name}`}
                                                        </h3>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ends {new Date(pact.deadline).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    pact.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' : 
                                                    pact.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-600'
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
                                                {pact.status === 'pending' && pact.target_id === user?.id && (
                                                    <>
                                                        <button 
                                                            onClick={() => handlePactAction(pact.id, 'accepted')}
                                                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            Accept Pact
                                                        </button>
                                                        <button 
                                                            onClick={() => handlePactAction(pact.id, 'rejected')}
                                                            className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                                        >
                                                            <Icon name="close" />
                                                        </button>
                                                    </>
                                                )}
                                                {pact.status === 'accepted' && (
                                                    <button 
                                                        onClick={() => handlePactAction(pact.id, 'completed')}
                                                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        Mark Completed
                                                    </button>
                                                )}
                                                {pact.status === 'pending' && pact.creator_id === user?.id && (
                                                    <button className="flex-1 py-3 bg-gray-100 dark:bg-stone-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                                                        Awaiting Partner...
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {pacts.length === 0 && (
                                        <div className="md:col-span-2 py-20 text-center bg-white dark:bg-stone-900 rounded-[2.5rem] border border-dashed border-border-light dark:border-border-dark">
                                            <Icon name="handshake" className="text-5xl text-slate-200 mb-4 mx-auto" />
                                            <h3 className="text-lg font-black text-slate-800 dark:text-white">No Active Pacts</h3>
                                            <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto mt-2">Challenge your friends to stay accountable. Propose your first pact above!</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'marathons' && (
                        <div className="space-y-8">
                            {marathons.map(marathon => {
                                const participation = getMarathonProgress(marathon.id);
                                const isJoined = !!participation;
                                const progressPercent = isJoined ? (participation.progress / marathon.task_goal) * 100 : 0;
                                const daysRemaining = Math.max(0, Math.ceil((new Date(marathon.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

                                return (
                                    <div key={marathon.id} className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-6">
                                                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    {marathon.status === 'active' ? 'Ongoing Event' : 'Upcoming'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Icon name="groups" className="text-white/60" />
                                                    <span className="text-xs font-black">{marathon.participant_count} Participating</span>
                                                </div>
                                            </div>
                                            
                                            <h2 className="text-4xl font-black tracking-tighter mb-4">{marathon.title}</h2>
                                            <p className="text-lg font-medium text-white/80 max-w-xl mb-8 leading-relaxed">{marathon.description}</p>
                                            
                                            <div className="flex flex-wrap items-center gap-8">
                                                <div>
                                                    <p className="text-3xl font-black">{marathon.xp_reward}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">XP Reward</p>
                                                </div>
                                                <div className="h-10 w-px bg-white/20 hidden sm:block" />
                                                <div>
                                                    <p className="text-3xl font-black">{daysRemaining} Days</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Remaining</p>
                                                </div>
                                                
                                                {isJoined ? (
                                                    <div className="flex-1 min-w-[200px]">
                                                        <div className="flex justify-between items-end mb-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Your Progress: {participation.progress}/{marathon.task_goal} Tasks</p>
                                                            <p className="text-xl font-black">{Math.round(progressPercent)}%</p>
                                                        </div>
                                                        <div className="h-3 w-full bg-white/20 rounded-full overflow-hidden">
                                                            <motion.div 
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progressPercent}%` }}
                                                                className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleJoinMarathon(marathon.id)}
                                                        className="ml-auto px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-105 transition-all"
                                                    >
                                                        Join Marathon
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {marathon.banner_image && (
                                            <img src={marathon.banner_image} className="absolute right-0 top-0 h-full w-1/3 object-cover opacity-20 pointer-events-none" />
                                        )}
                                        <Icon name="auto_awesome" className="absolute -right-8 -bottom-8 text-[15rem] text-white/5 rotate-12" />
                                    </div>
                                );
                            })}

                            {marathons.length === 0 && !isLoading && (
                                <div className="py-20 text-center bg-white dark:bg-stone-900 rounded-[2.5rem] border border-dashed border-border-light dark:border-border-dark">
                                    <Icon name="event_available" className="text-5xl text-slate-200 mb-4 mx-auto" />
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">No Active Marathons</h3>
                                    <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto mt-2">Check back later for community learning events!</p>
                                </div>
                            )}
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
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="flex -space-x-2">
                                                        <div className="w-7 h-7 rounded-full border-2 border-white dark:border-stone-900 bg-purple-100 flex items-center justify-center">
                                                            <Icon name="person" className="text-[10px] text-purple-600" />
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400">Collaborative Session</span>
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
                                        <Icon name="history" className="text-indigo-600" />
                                        Activity Stream
                                    </h2>
                                    <div className="space-y-6">
                                        {friendActivities.length > 0 ? (
                                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                                                {friendActivities.map((act, i) => (
                                                    <div key={i} className="flex gap-3 text-xs items-start p-3 bg-gray-50 dark:bg-stone-850/30 rounded-xl">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                                        <div className="flex-1">
                                                            <p className="text-stone-700 dark:text-stone-300 font-bold leading-normal">
                                                                <span className="font-black text-stone-900 dark:text-white">{act.userName}</span> {act.title}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                                                {new Date(act.time).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center bg-gray-50/50 dark:bg-stone-800/30 rounded-[1.5rem] border border-dashed border-border-light dark:border-border-dark">
                                                <Icon name="rss_feed" className="text-3xl text-slate-200 mb-3 mx-auto" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stream Empty</p>
                                                <p className="text-[9px] font-bold text-slate-400/60 mt-1 max-w-[150px] mx-auto">No friend activity recorded yet!</p>
                                            </div>
                                        )}
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
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-stone-900 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-2">Propose Study Pact</h3>
                                <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest">Select a friend and set the stakes.</p>

                                <form onSubmit={handleCreatePact} className="space-y-6">
                                    <div className="relative">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Who are you challenging?</label>
                                        <div className="relative">
                                            <Icon name="person_search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                required={!selectedUser}
                                                value={selectedUser ? selectedUser.name : searchQuery}
                                                onChange={e => { setSelectedUser(null); handleSearchUsers(e.target.value); }}
                                                className="w-full bg-gray-50 dark:bg-stone-800/50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 ring-indigo-500/10"
                                                placeholder="Search by ID or Username"
                                            />
                                            {isSearching && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>

                                        {/* User Search Dropdown */}
                                        <AnimatePresence>
                                            {searchResults.length > 0 && !selectedUser && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl z-20 border border-border-light dark:border-border-dark overflow-hidden"
                                                >
                                                    {searchResults.map(res => (
                                                        <button
                                                            key={res.id}
                                                            type="button"
                                                            onClick={() => { setSelectedUser(res); setSearchResults([]); }}
                                                            className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left"
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600">
                                                                {res.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black">{res.name}</p>
                                                                <p className="text-[10px] text-slate-400">@{res.username}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
