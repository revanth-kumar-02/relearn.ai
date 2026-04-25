import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { roomService } from '../services/roomService';
import { StudyRoom, RoomMember, RoomMessage } from '../types';
import Icon from './common/Icon';
import StudyTimer from './StudyTimer';
import { AnimatePresence, motion } from 'framer-motion';

const RoomView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { processGamificationReward, addNotification } = useData();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState<'studying' | 'break' | 'idle'>('idle');
  const [currentTask, setCurrentTask] = useState('');
  const [showTimer, setShowTimer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'focus' | 'plan' | 'chat'>('focus');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (id && user?.id) {
      initRoom();
      
      // Ping activity every 45 seconds to stay "Active"
      const pingInterval = setInterval(() => {
        roomService.pingActivity(id, user.id).catch(console.error);
      }, 45000);

      return () => {
        clearInterval(pingInterval);
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }
      };
    }
  }, [id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initRoom = async () => {
    try {
      setLoading(true);
      const roomData = await roomService.getRoom(id!);
      setRoom(roomData);

      const memberList = await roomService.getRoomMembers(id!);
      setMembers(memberList);

      const msgList = await roomService.getRecentMessages(id!);
      setMessages(msgList);

      subscriptionRef.current = roomService.subscribeToRoom(
        id!,
        handleMemberUpdate,
        handleNewMessage
      );

      setLoading(false);
    } catch (err) {
      console.error('Error initializing room:', err);
      navigate('/rooms');
    }
  };

  const handleMemberUpdate = (payload: any) => {
    const { eventType, new: newMember, old: oldMember } = payload;
    
    setMembers(prev => {
      if (eventType === 'INSERT') {
        return [...prev, newMember as RoomMember];
      }
      if (eventType === 'UPDATE') {
        return prev.map(m => m.user_id === newMember.user_id ? { ...m, ...newMember } : m);
      }
      if (eventType === 'DELETE') {
        return prev.filter(m => m.user_id !== oldMember.user_id);
      }
      return prev;
    });
  };

  const handleNewMessage = (payload: any) => {
    setMessages(prev => [...prev, payload.new as RoomMessage]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || !id) return;

    try {
      await roomService.sendMessage(id, user.id, user.name, newMessage.trim());
      setNewMessage('');
      
      const result = await processGamificationReward(1, undefined, {
        totalMessagesSent: (user.stats?.totalMessagesSent || 0) + 1
      });

      if (result && result.newBadges.length > 0) {
        result.newBadges.forEach(badge => {
          addNotification({
            type: 'achievement',
            title: `${badge.icon} Badge Earned: ${badge.name}`,
            message: badge.description,
            time: new Date().toISOString(),
            read: false,
          });
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleStatusChange = async (newStatus: 'studying' | 'break' | 'idle') => {
    if (!user || !id) return;
    try {
      await roomService.updateStatus(id, user.id, newStatus, currentTask);
      setStatus(newStatus);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleLeave = async () => {
    if (!user || !id) return;
    try {
      await roomService.leaveRoom(id, user.id);
      navigate('/rooms');
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  };

  const handleDelete = async () => {
    if (!user || !id || !room) return;
    if (window.confirm('Are you sure you want to delete this room? This will remove all messages and members.')) {
        try {
            await roomService.deleteRoom(id);
            navigate('/rooms');
        } catch (err) {
            console.error('Error deleting room:', err);
        }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-text-secondary-light animate-pulse tracking-tight">Syncing Study Environment...</p>
        </div>
      </div>
    );
  }

  // Mock Group Plan derived from room name
  const groupGoals = [
    { id: 1, title: `Core Concepts of ${room?.name || 'Topic'}`, done: true },
    { id: 2, title: 'Collaborative Problem Solving', done: false },
    { id: 3, title: 'Peer Review & Feedback', done: false },
    { id: 4, title: 'Final Summary & Wrap-up', done: false },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      
      {/* Mobile Tabs Header */}
      <div className="md:hidden flex border-b border-border-light dark:border-border-dark bg-white/50 dark:bg-surface-dark/50 backdrop-blur-md sticky top-0 z-20">
        <button 
          onClick={() => setActiveTab('focus')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'focus' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary-light'}`}
        >
          Focus
        </button>
        <button 
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'plan' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary-light'}`}
        >
          Group Plan
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary-light'}`}
        >
          Chat {messages.length > 0 && <span className="ml-1 bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-full">{messages.length}</span>}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Column: Room Info & Plan (Desktop Only or Plan Tab) */}
        <aside className={`${activeTab === 'plan' ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 flex-col border-r border-border-light dark:border-border-dark bg-surface-light/30 dark:bg-surface-dark/30 backdrop-blur-xl overflow-y-auto no-scrollbar`}>
          <div className="p-6 space-y-8">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center justify-center text-text-secondary-light hover:text-primary transition-all active:scale-95"
                        title="Back to Dashboard"
                    >
                        <Icon name="grid_view" className="text-xl" />
                    </button>
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                        <Icon name="hub" className="text-xl" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-black text-lg truncate leading-tight">{room?.name}</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active Room</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={handleLeave}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-500 font-bold text-xs hover:bg-red-500/20 transition-all active:scale-95"
                    >
                        <Icon name="logout" className="text-sm" />
                        Leave
                    </button>
                    {room?.host_id === user?.id && (
                        <button 
                            onClick={handleDelete}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20"
                        >
                            <Icon name="delete" className="text-sm" />
                            Delete
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(room?.room_code || '');
                        }}
                        className="w-12 flex items-center justify-center rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/40 transition-all active:scale-95 text-text-secondary-light"
                        title="Copy Code"
                    >
                        <Icon name="content_copy" className="text-sm" />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="px-1 text-[11px] font-black text-text-secondary-light/60 dark:text-text-secondary-dark/60 uppercase tracking-[0.2em]">Group Learning Plan</h3>
                <div className="space-y-2">
                    {groupGoals.map(goal => (
                        <div key={goal.id} className={`group p-4 rounded-2xl border transition-all flex items-start gap-3 ${goal.done ? 'bg-green-500/5 border-green-500/10 opacity-70' : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-primary/30 shadow-sm'}`}>
                            <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${goal.done ? 'bg-green-500 border-green-500 text-white' : 'border-border-light dark:border-border-dark group-hover:border-primary/40'}`}>
                                {goal.done && <Icon name="check" className="text-[10px]" />}
                            </div>
                            <p className={`text-xs font-bold leading-relaxed ${goal.done ? 'line-through text-text-secondary-light/60' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
                                {goal.title}
                            </p>
                        </div>
                    ))}
                </div>
                <button className="w-full py-3 rounded-xl border border-dashed border-border-light dark:border-border-dark text-text-secondary-light hover:text-primary hover:border-primary/40 transition-all text-[10px] font-black uppercase tracking-widest">
                    + Add Session Goal
                </button>
            </div>
          </div>
        </aside>

        {/* Center Column: Active Focus (Desktop or Focus Tab) */}
        <main className={`${activeTab === 'focus' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden relative`}>
            {/* Soft Ambient Background */}
            <div className={`absolute inset-0 transition-colors duration-1000 opacity-30 pointer-events-none ${
                status === 'studying' ? 'bg-gradient-to-br from-green-500/20 via-primary/10 to-transparent' :
                status === 'break' ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent' :
                'bg-gradient-to-br from-indigo-500/10 via-slate-500/5 to-transparent'
            }`} />

            {/* Top Toolbar */}
            <header className="p-4 md:p-6 flex flex-wrap items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-2 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md p-1.5 rounded-2xl border border-border-light/50 dark:border-border-dark shadow-xl shadow-black/5">
                    <button
                        onClick={() => handleStatusChange('studying')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all ${
                            status === 'studying' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'text-text-secondary-light hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Icon name="auto_stories" className="text-lg" />
                        <span>Studying</span>
                    </button>
                    <button
                        onClick={() => handleStatusChange('break')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all ${
                            status === 'break' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-text-secondary-light hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Icon name="coffee" className="text-lg" />
                        <span>Break</span>
                    </button>
                    <button
                        onClick={() => handleStatusChange('idle')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all ${
                            status === 'idle' ? 'bg-slate-500 text-white shadow-lg shadow-slate-500/30' : 'text-text-secondary-light hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Icon name="chair" className="text-lg" />
                        <span>Idle</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowTimer(!showTimer)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${showTimer ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-primary hover:border-primary/40'}`}
                    >
                        <Icon name="timer" className="text-lg" />
                        {showTimer ? 'Hide Timer' : 'Start Focus'}
                    </button>
                </div>
            </header>

            {/* Member Grid */}
            <div className="flex-1 overflow-y-auto p-6 z-10 no-scrollbar">
                <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.map(member => (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={member.user_id} 
                            className="relative group"
                        >
                            <div className={`p-5 rounded-3xl border transition-all duration-500 h-full flex flex-col items-center text-center ${
                                member.user_id === user?.id 
                                ? 'bg-white dark:bg-surface-dark border-primary/30 shadow-xl shadow-primary/5 ring-2 ring-primary/5' 
                                : 'bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border-border-light dark:border-border-dark hover:border-primary/20'
                            }`}>
                                {/* Status Ring Avatar */}
                                <div className="relative mb-4">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black transition-all duration-500 border-4 ${
                                        member.status === 'studying' ? 'border-green-500 bg-green-500/10 text-green-600' :
                                        member.status === 'break' ? 'border-amber-500 bg-amber-500/10 text-amber-600' :
                                        'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                        {member.user_name.charAt(0)}
                                        {/* Activity Pulse */}
                                        {new Date().getTime() - new Date(member.last_active_at).getTime() < 120000 && (
                                            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-20" />
                                        )}
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white dark:border-surface-dark flex items-center justify-center ${
                                        member.status === 'studying' ? 'bg-green-500 text-white' :
                                        member.status === 'break' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'
                                    }`}>
                                        <Icon name={member.status === 'studying' ? 'auto_stories' : member.status === 'break' ? 'coffee' : 'chair'} className="text-[12px]" />
                                    </div>
                                </div>

                                <div className="space-y-1 w-full">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <h4 className="font-black text-sm tracking-tight truncate flex items-center justify-center gap-2">
                                            {member.user_name}
                                            {member.user_id === user?.id && <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">You</span>}
                                        </h4>
                                        <span className="text-[9px] font-bold text-text-secondary-light/50 uppercase tracking-tighter">
                                            {new Date().getTime() - new Date(member.last_active_at).getTime() < 60000 ? 'Active Now' : 
                                             `Active ${new Date(member.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        </span>
                                    </div>
                                    
                                    {/* Focus Bubble */}
                                    <div className="mt-3 relative inline-block max-w-full">
                                        <div className={`px-4 py-2 rounded-2xl text-[11px] font-bold tracking-tight italic transition-all duration-500 ${
                                            member.status === 'studying' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 
                                            member.status === 'break' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}>
                                            {member.status === 'studying' ? (member.current_task || "Focusing deeply...") : 
                                             member.status === 'break' ? "Resting & Refueling" : "Ready to start"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom Input Area (Task Input) */}
            <footer className="p-6 z-10 max-w-2xl mx-auto w-full">
                <div className="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl p-2 rounded-2xl border border-border-light dark:border-border-dark shadow-2xl flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-secondary-light shrink-0">
                        <Icon name="edit_note" />
                    </div>
                    <input
                        type="text"
                        placeholder="What's your current focus?"
                        value={currentTask}
                        onChange={(e) => setCurrentTask(e.target.value)}
                        onBlur={() => handleStatusChange(status)}
                        className="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-text-secondary-light/40"
                    />
                    <button 
                        onClick={() => handleStatusChange(status)}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                    >
                        Update
                    </button>
                </div>
            </footer>

            {/* Floating Timer UI */}
            <AnimatePresence>
                {showTimer && (
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4"
                    >
                        <div className="bg-white dark:bg-surface-dark rounded-3xl p-2 border-2 border-primary/30 shadow-2xl shadow-primary/20">
                            <StudyTimer 
                                initialMinutes={status === 'break' ? 5 : 25}
                                onStop={() => setShowTimer(false)}
                                onComplete={() => {
                                    handleStatusChange('break');
                                    setShowTimer(false);
                                    addNotification({
                                        type: 'reminder',
                                        title: 'Focus Complete!',
                                        message: 'Time for a well-deserved break.',
                                        time: new Date().toISOString(),
                                        read: false
                                    });
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>

        {/* Right Column: Chat Sidebar (Desktop Only or Chat Tab) */}
        <aside className={`${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 flex-col border-l border-border-light dark:border-border-dark bg-white/50 dark:bg-surface-dark/50 backdrop-blur-2xl overflow-hidden`}>
            <div className="p-5 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon name="chat" className="text-primary" />
                    <h3 className="font-black text-xs uppercase tracking-[0.2em]">Live Discussion</h3>
                </div>
                <span className="text-[10px] font-bold text-text-secondary-light bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{messages.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-text-secondary-light">
                                {msg.user_name}
                            </span>
                            <span className="text-[9px] font-bold text-text-secondary-light/40">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.user_id === user?.id 
                            ? 'bg-primary text-white rounded-tr-none' 
                            : 'bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-tl-none'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 pb-6 border-t border-border-light dark:border-border-dark bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Say something..."
                        className="flex-1 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-stone-800 border-none focus:ring-2 focus:ring-primary/30 outline-none transition-all text-sm font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shrink-0"
                    >
                        <Icon name="send" />
                    </button>
                </form>
            </div>
        </aside>

      </div>
    </div>
  );
};

export default RoomView;
