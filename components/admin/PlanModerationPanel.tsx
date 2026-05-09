import React from 'react';
import Icon from '../common/Icon';
import { QualityScore } from '../../services/gemini/qualityScoringService';

interface PlanModerationPanelProps {
    plans: any[];
    planScores: Record<string, QualityScore>;
    handleScorePlan: (plan: any) => void;
    triggerHaptic: (type: any) => void;
}

const PlanModerationPanel: React.FC<PlanModerationPanelProps> = ({
    plans,
    planScores,
    handleScorePlan,
    triggerHaptic
}) => {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark shadow-xl shadow-black/[0.02] overflow-hidden">
            <div className="p-8 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Icon name="auto_awesome" className="text-indigo-600" />
                    AI Plan Library
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-stone-900/50">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Title</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Creator</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Quality Score</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                        {plans.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50/30 dark:hover:bg-stone-900/30 transition-colors">
                                <td className="px-8 py-5 font-bold text-sm text-slate-800 dark:text-white">
                                    {p.title}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black">{p.users?.name || 'Unknown'}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{p.users?.email || 'N/A'}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    {planScores[p.id] ? (
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-black text-indigo-600">{planScores[p.id].overall}/100</div>
                                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-600" style={{ width: `${planScores[p.id].overall}%` }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleScorePlan(p)}
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                                        >
                                            <Icon name="analytics" className="text-xs" />
                                            Analyze Quality
                                        </button>
                                    )}
                                </td>
                                <td className="px-8 py-5">
                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                        <Icon name="visibility" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {plans.length === 0 && (
                    <div className="py-20 text-center">
                        <Icon name="auto_awesome" className="text-4xl text-slate-200 mb-4 mx-auto" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No plans generated yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlanModerationPanel;
