import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { marathonService } from '../../services/marathonService';
import { Marathon } from '../../types';
import Icon from '../common/Icon';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../services/supabase';

const MarathonManager: React.FC = () => {
    const { showToast } = useToast();
    const [marathons, setMarathons] = useState<Marathon[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteMarathonId, setDeleteMarathonId] = useState<string | null>(null);
    const [newMarathon, setNewMarathon] = useState({
        title: '',
        description: '',
        task_goal: 10,
        xp_reward: 1000,
        status: 'active' as Marathon['status'],
        end_date: '',
        banner_image: ''
    });

    useEffect(() => {
        loadMarathons();
    }, []);

    const loadMarathons = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('marathons')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setMarathons(data);
        } catch (err) {
            showToast("Failed to load marathons", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('marathons').insert({
                ...newMarathon,
                created_at: new Date().toISOString()
            });
            if (error) throw error;
            showToast("Marathon created!", "success");
            setShowCreate(false);
            loadMarathons();
        } catch (err) {
            showToast("Failed to create marathon", "error");
        }
    };

    const confirmDeleteMarathon = async () => {
        if (!deleteMarathonId) return;
        try {
            const { error } = await supabase.from('marathons').delete().eq('id', deleteMarathonId);
            if (error) throw error;
            showToast("Marathon deleted", "success");
            setDeleteMarathonId(null);
            loadMarathons();
        } catch (err) {
            showToast("Delete failed", "error");
        }
    };

    const selectedMarathon = marathons.find(m => m.id === deleteMarathonId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Marathon Events</h2>
                <button 
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                >
                    <Icon name="add" /> Create New Marathon
                </button>
            </div>

            {showCreate && (
                <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm animate-fade-in">
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Title</label>
                            <input 
                                required
                                value={newMarathon.title}
                                onChange={e => setNewMarathon({...newMarathon, title: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-stone-800 rounded-xl px-4 py-3 text-sm outline-none"
                                placeholder="e.g. Mastery Marathon 2026"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description</label>
                            <textarea 
                                required
                                value={newMarathon.description}
                                onChange={e => setNewMarathon({...newMarathon, description: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-stone-800 rounded-xl px-4 py-3 text-sm outline-none h-24"
                                placeholder="What is this challenge about?"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Task Goal</label>
                            <input 
                                type="number"
                                required
                                value={newMarathon.task_goal}
                                onChange={e => setNewMarathon({...newMarathon, task_goal: parseInt(e.target.value)})}
                                className="w-full bg-gray-50 dark:bg-stone-800 rounded-xl px-4 py-3 text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">XP Reward</label>
                            <input 
                                type="number"
                                required
                                value={newMarathon.xp_reward}
                                onChange={e => setNewMarathon({...newMarathon, xp_reward: parseInt(e.target.value)})}
                                className="w-full bg-gray-50 dark:bg-stone-800 rounded-xl px-4 py-3 text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End Date</label>
                            <input 
                                type="date"
                                required
                                value={newMarathon.end_date}
                                onChange={e => setNewMarathon({...newMarathon, end_date: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-stone-800 rounded-xl px-4 py-3 text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Banner URL</label>
                            <input 
                                value={newMarathon.banner_image}
                                onChange={e => setNewMarathon({...newMarathon, banner_image: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-stone-800 rounded-xl px-4 py-3 text-sm outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <div className="md:col-span-2 flex gap-3 pt-2">
                            <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs">Save Marathon</button>
                            <button type="button" onClick={() => setShowCreate(false)} className="px-6 bg-gray-100 dark:bg-stone-800 rounded-xl text-xs font-bold uppercase">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {marathons.map(m => (
                    <div key={m.id} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-border-light dark:border-border-dark flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                                <Icon name="emoji_events" />
                            </div>
                            <div>
                                <h4 className="font-bold">{m.title}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{m.status} • {m.participant_count} joined • Ends {new Date(m.end_date).toLocaleDateString()}</p>
                            </div>
                        </div>
                         <button 
                             onClick={() => setDeleteMarathonId(m.id)}
                             className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                         >
                             <Icon name="delete" />
                         </button>
                    </div>
                ))}
            </div>

            {/* Marathon Delete Modal */}
            <AnimatePresence>
                {deleteMarathonId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-border-light dark:border-border-dark text-left"
                        >
                            <h2 className="text-2xl font-black tracking-tight mb-2">Delete Marathon?</h2>
                            <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest">
                                Target: {selectedMarathon?.title || 'Unknown Event'}
                            </p>
                            <p className="text-sm font-medium text-slate-500 dark:text-stone-400 mb-8 leading-relaxed">
                                Are you sure you want to proceed? This action will permanently remove this marathon event and delete all user participation records too.
                            </p>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setDeleteMarathonId(null)} 
                                    className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-stone-800 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-stone-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDeleteMarathon} 
                                    className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MarathonManager;
