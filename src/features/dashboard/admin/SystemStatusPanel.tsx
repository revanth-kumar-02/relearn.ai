import React from 'react';
import Icon from '../../../components/ui/Icon';
import { SystemStatus } from '../../../services/api/systemService';

interface SystemStatusPanelProps {
    systemStatus: SystemStatus | null;
    handleSystemUpdate: (updates: Partial<SystemStatus>) => void;
    announcements: any[];
    newAnnouncement: string;
    setNewAnnouncement: (val: string) => void;
    announcementType: 'info' | 'warning' | 'emergency';
    setAnnouncementType: (val: 'info' | 'warning' | 'emergency') => void;
    handlePostAnnouncement: () => void;
    handleDeleteAnnouncement: (id: string) => void;
}

const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({
    systemStatus,
    handleSystemUpdate,
    announcements,
    newAnnouncement,
    setNewAnnouncement,
    announcementType,
    setAnnouncementType,
    handlePostAnnouncement,
    handleDeleteAnnouncement
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Maintenance Mode */}
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-8 shadow-xl shadow-black/[0.02]">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-8">
                    <Icon name="settings" className="text-slate-400" />
                    Global System Control
                </h3>
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-stone-900/50 rounded-3xl border border-border-light dark:border-border-dark">
                        <div>
                            <div className="text-sm font-black tracking-tight mb-1">Maintenance Mode</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blocks all user interaction</div>
                        </div>
                        <button
                            onClick={() => handleSystemUpdate({ maintenance_mode: !systemStatus?.maintenance_mode })}
                            className={`w-14 h-8 rounded-full transition-all relative ${systemStatus?.maintenance_mode ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-slate-200 dark:bg-stone-800'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${systemStatus?.maintenance_mode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-stone-900/50 rounded-3xl border border-border-light dark:border-border-dark">
                        <div>
                            <div className="text-sm font-black tracking-tight mb-1">AI Service Restriction</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate limit AI generations</div>
                        </div>
                        <button
                            onClick={() => handleSystemUpdate({ ai_restricted: !systemStatus?.ai_restricted })}
                            className={`w-14 h-8 rounded-full transition-all relative ${systemStatus?.ai_restricted ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-slate-200 dark:bg-stone-800'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${systemStatus?.ai_restricted ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Announcements Panel */}
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-8 shadow-xl shadow-black/[0.02]">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-8">
                    <Icon name="campaign" className="text-indigo-600" />
                    Global Broadcast
                </h3>
                <div className="space-y-6">
                    <div className="relative">
                        <textarea
                            value={newAnnouncement}
                            onChange={(e) => setNewAnnouncement(e.target.value)}
                            placeholder="Type a system-wide announcement..."
                            className="w-full bg-slate-50 dark:bg-stone-900/50 border border-border-light dark:border-border-dark rounded-3xl p-6 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none min-h-[120px] resize-none"
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            <select
                                value={announcementType}
                                onChange={(e: any) => setAnnouncementType(e.target.value)}
                                className="bg-white dark:bg-stone-800 border border-border-light dark:border-border-dark rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none"
                            >
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="emergency">Emergency</option>
                            </select>
                            <button
                                disabled={!newAnnouncement.trim()}
                                onClick={handlePostAnnouncement}
                                className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                            >
                                <Icon name="send" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Broadcasts</h4>
                        {announcements.map(a => (
                            <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-stone-900/50 rounded-2xl border border-border-light dark:border-border-dark">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${a.type === 'emergency' ? 'bg-red-500' : a.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                                    <span className="text-[11px] font-bold line-clamp-1">{a.content}</span>
                                </div>
                                <button onClick={() => handleDeleteAnnouncement(a.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                    <Icon name="delete" className="text-sm" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemStatusPanel;
