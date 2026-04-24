import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { roomService } from '../services/roomService';
import { StudyRoom } from '../types';
import Icon from './common/Icon';

const StudyRooms: React.FC = () => {
  const { user } = useData();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRooms();
  }, [user]);

  const fetchMyRooms = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await roomService.getMyRooms(user.id);
      setRooms(data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRoomName.trim()) return;

    try {
      setError(null);
      const room = await roomService.createRoom(newRoomName, user.id, user.name);
      navigate(`/rooms/${room.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;

    try {
      setError(null);
      const room = await roomService.joinRoomByCode(joinCode, user.id, user.name);
      navigate(`/rooms/${room.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Study Rooms</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark">
            Focus together with friends and peers in real-time.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-all"
          >
            <Icon name="group_add" className="text-primary" />
            <span>Join Room</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            <Icon name="add" />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 skeleton rounded-2xl" />
          ))}
        </div>
      ) : rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
            <div
              key={room.id}
              onClick={() => navigate(`/rooms/${room.id}`)}
              className="group glass-card p-6 rounded-2xl cursor-pointer hover:border-primary transition-all relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Icon name="hub" />
                  </div>
                  <div className="text-sm font-mono bg-surface-light dark:bg-surface-dark px-2 py-1 rounded border border-border-light dark:border-border-dark">
                    {room.room_code}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {room.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  <span className="flex items-center gap-1">
                    <Icon name="group" className="text-xs" />
                    Max {room.max_members} members
                  </span>
                  <span className="flex items-center gap-1 text-green-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Live Now
                  </span>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon name="hub" className="text-9xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 glass-card rounded-3xl border-dashed border-2">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="groups" className="text-4xl" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No active rooms found</h2>
          <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8 max-w-md mx-auto">
            Create your own study room or enter a room code to join your friends.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            Create Your First Room
          </button>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Create Study Room</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-all">
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., Final Exam Grind"
                  className="w-full px-4 py-3 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark focus:border-primary outline-none transition-all"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={!newRoomName.trim()}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
              >
                Launch Room
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Join Study Room</h2>
              <button onClick={() => setShowJoinModal(false)} className="p-2 hover:bg-surface-light dark:hover:bg-surface-dark rounded-xl transition-all">
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Enter Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="6-character code"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark focus:border-primary outline-none transition-all text-center text-2xl font-mono tracking-widest"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={joinCode.length < 6}
                className="w-full py-4 bg-secondary text-white rounded-xl font-bold shadow-lg shadow-secondary/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
              >
                Join Now
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRooms;
