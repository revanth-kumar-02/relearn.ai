import React from 'react';
import Icon from '../../../components/ui/Icon';

interface FeedbackPanelProps {
    feedback: any[];
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ feedback }) => {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02] overflow-hidden">
            <div className="p-8 border-b border-border-light dark:border-border-dark">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Icon name="feedback" className="text-indigo-600" />
                    User Feedback & Requests
                </h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {feedback.map(f => (
                    <div key={f.id} className="p-6 bg-slate-50 dark:bg-stone-900/50 rounded-3xl border border-border-light dark:border-border-dark relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-black text-xs">
                                    {f.users?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <div className="text-xs font-black">{f.users?.name || 'Anonymous'}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(f.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest">
                                {f.category || 'General'}
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-3 mb-4">{f.message}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-border-light dark:border-border-dark">
                            <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors">Mark Resolved</button>
                            <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">Delete</button>
                        </div>
                    </div>
                ))}
                {feedback.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <Icon name="forum" className="text-4xl text-slate-200 mb-4 mx-auto" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No feedback submissions yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackPanel;
