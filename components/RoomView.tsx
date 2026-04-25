import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { roomService } from '../services/roomService';
import { StudyRoom, RoomMember, RoomMessage } from '../types';
import Icon from './common/Icon';
import StudyTimer from './StudyTimer';

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
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (id && user) {
      initRoom();
    }
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initRoom = async () => {
    try {
      setLoading(true);
      // 1. Fetch room details
      const roomData = await roomService.getRoom(id!);
      setRoom(roomData);

      // 2. Fetch members
      const memberList = await roomService.getRoomMembers(id!);
      setMembers(memberList);

      // 3. Fetch recent messages
      const msgList = await roomService.getRecentMessages(id!);
      setMessages(msgList);

      // 4. Subscribe to updates
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
      
      // Update stats and award XP
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:flex-row overflow-hidden">
      {/* Sidebar: Members */}
      <div className="w-full md:w-80 border-r border-border-light dark:border-border-dark flex flex-col bg-surface-light/50 dark:bg-surface-dark/50 backdrop-blur-md">
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl">{room?.name}</h2>
            <div className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
              {room?.room_code}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLeave}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all text-sm"
            >
              <Icon name="logout" className="text-sm" />
              Leave
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(room?.room_code || '');
                // Show toast or feedback
              }}
              className="px-4 py-2 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary transition-all"
              title="Copy Code"
            >
              <Icon name="content_copy" className="text-sm" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {showTimer && (
            <div className="mb-6 p-1 bg-surface-light dark:bg-surface-dark rounded-2xl border border-primary/20 shadow-xl shadow-primary/5">
              <StudyTimer 
                initialMinutes={status === 'break' ? 5 : 25}
                onStop={() => setShowTimer(false)}
                onComplete={() => {
                  handleStatusChange('break');
                  setShowTimer(false);
                }}
              />
            </div>
          )}

          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark px-2">
            Members • {members.length}
          </h3>
          {members.map(member => (
            <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-light dark:hover:bg-surface-dark transition-all">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {member.user_name.charAt(0)}
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface-light dark:border-surface-dark ${
                  member.status === 'studying' ? 'bg-green-500' : 
                  member.status === 'break' ? 'bg-yellow-500' : 'bg-slate-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {member.user_name}
                  {member.user_id === user?.id && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">Me</span>}
                </div>
                <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                  {member.status === 'studying' ? (member.current_task || 'Focusing...') : 
                   member.status === 'break' ? 'Taking a break' : 'Chilling'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area: Chat + Status */}
      <div className="flex-1 flex flex-col bg-background-light dark:bg-background-dark relative">
        {/* Status Bar */}
        <div className="p-4 glass-card border-b border-border-light dark:border-border-dark flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-surface-light dark:bg-surface-dark p-1 rounded-2xl border border-border-light dark:border-border-dark">
            <button
              onClick={() => handleStatusChange('studying')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                status === 'studying' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
            >
              <Icon name="auto_stories" />
              <span className="hidden sm:inline">Studying</span>
            </button>
            <button
              onClick={() => {
                handleStatusChange('studying');
                setShowTimer(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:bg-primary/10 text-primary border border-primary/20`}
            >
              <Icon name="timer" />
              <span className="hidden sm:inline">Start Focus</span>
            </button>
            <button
              onClick={() => handleStatusChange('break')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                status === 'break' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : 'hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
            >
              <Icon name="coffee" />
              <span className="hidden sm:inline">Break</span>
            </button>
            <button
              onClick={() => handleStatusChange('idle')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                status === 'idle' ? 'bg-slate-500 text-white shadow-lg shadow-slate-500/20' : 'hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
            >
              <Icon name="chair" />
              <span className="hidden sm:inline">Idle</span>
            </button>
          </div>

          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="What are you working on?"
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              onBlur={() => handleStatusChange(status)}
              className="w-full px-4 py-2 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark focus:border-primary outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] font-bold uppercase text-text-secondary-light dark:text-text-secondary-dark">
                  {msg.user_name}
                </span>
                <span className="text-[10px] text-text-secondary-light/60 dark:text-text-secondary-dark/60">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-sm ${
                msg.user_id === user?.id 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 p-b-safe">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-6 py-3 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark focus:border-primary outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              <Icon name="send" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomView;
