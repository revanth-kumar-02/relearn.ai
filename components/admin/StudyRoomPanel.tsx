import React from 'react';
import Icon from '../common/Icon';
import { StudyRoom } from '../../types';
import { adminService } from '../../services/adminService';

interface StudyRoomPanelProps {
    rooms: StudyRoom[];
    totalItems: number;
    setRooms: React.Dispatch<React.SetStateAction<StudyRoom[]>>;
}

const StudyRoomPanel: React.FC<StudyRoomPanelProps> = ({ rooms, totalItems, setRooms }) => {
    return (
        <>
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Icon name="hub" className="text-amber-600" />
                    Active Study Rooms
                </h3>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary-light">Total: {totalItems}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map(room => (
                    <div key={room.id} className="bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark p-6 shadow-xl shadow-black/[0.02] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                <Icon name="hub" className="text-2xl" />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${room.is_active ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                {room.is_active ? 'Live' : 'Inactive'}
                            </div>
                        </div>
                        <h4 className="font-black tracking-tight text-lg mb-1">{room.name}</h4>
                        <p className="text-[10px] font-bold text-text-secondary-light uppercase tracking-widest mb-6">CODE: {room.room_code}</p>

                        <div className="mt-auto pt-6 border-t border-border-light dark:border-border-dark flex items-center justify-between gap-4">
                            <button
                                onClick={() => { adminService.deleteRoom(room.id); setRooms(r => r.filter(x => x.id !== room.id)); }}
                                className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors whitespace-nowrap"
                            >
                                Force Close
                            </button>
                            <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 whitespace-nowrap">
                                <Icon name="person" className="text-xs" />
                                {room.max_members || (room.settings as any)?.timer || 0} Members
                            </div>
                        </div>
                    </div>
                ))}
                {rooms.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <Icon name="hub" className="text-4xl text-slate-200 mb-4 mx-auto" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No active study rooms</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default StudyRoomPanel;
