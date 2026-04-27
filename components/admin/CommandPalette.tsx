import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../common/Icon';
import { adminService } from '../../services/adminService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, filterContext?: any) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults([
          { id: 'tab-users', type: 'tab', title: 'Go to Users', icon: 'people', action: () => onNavigate('users') },
          { id: 'tab-rooms', type: 'tab', title: 'Go to Rooms', icon: 'hub', action: () => onNavigate('rooms') },
          { id: 'tab-plans', type: 'tab', title: 'Go to Plans', icon: 'auto_awesome', action: () => onNavigate('plans') },
          { id: 'tab-system', type: 'tab', title: 'Go to System', icon: 'settings', action: () => onNavigate('system') }
        ]);
        return;
      }

      // Very basic local search for demonstration
      // In production, this would call specialized Supabase RPC functions for full-text search
      try {
        const lowerQuery = query.toLowerCase();
        const users = await adminService.getAllUsers();
        const rooms = await adminService.getAllRooms();
        const plans = await adminService.getAllPlans();
        
        const matchedUsers = users
          .filter(u => u.email.toLowerCase().includes(lowerQuery) || u.name.toLowerCase().includes(lowerQuery))
          .slice(0, 3)
          .map(u => ({ id: u.id, type: 'user', title: u.name, subtitle: u.email, icon: 'person', action: () => { onNavigate('users'); onClose(); } }));

        const matchedRooms = rooms
          .filter(r => r.name.toLowerCase().includes(lowerQuery) || r.room_code.toLowerCase().includes(lowerQuery))
          .slice(0, 3)
          .map(r => ({ id: r.id, type: 'room', title: r.name, subtitle: `Code: ${r.room_code}`, icon: 'hub', action: () => { onNavigate('rooms'); onClose(); } }));

        const matchedPlans = plans
          .filter(p => p.title.toLowerCase().includes(lowerQuery) || (p.subject && p.subject.toLowerCase().includes(lowerQuery)))
          .slice(0, 3)
          .map(p => ({ id: p.id, type: 'plan', title: p.title, subtitle: p.subject, icon: 'auto_awesome', action: () => { onNavigate('plans'); onClose(); } }));

        setResults([...matchedUsers, ...matchedRooms, ...matchedPlans]);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed', err);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, onNavigate, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-border-light dark:border-border-dark"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center px-6 py-4 border-b border-border-light dark:border-border-dark">
            <Icon name="search" className="text-2xl text-slate-400" />
            <input 
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search users, rooms, plans..."
              className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-lg font-bold text-slate-800 dark:text-white"
            />
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-stone-800 rounded text-[10px] font-black text-slate-500 uppercase">ESC</kbd>
            </div>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {results.length === 0 && query.trim() !== '' ? (
              <div className="px-6 py-12 text-center text-slate-500">
                <Icon name="search_off" className="text-4xl mb-2 opacity-50" />
                <p className="text-sm font-bold">No results found for "{query}"</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {results.map((item, index) => (
                  <button
                    key={item.id}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => { item.action(); onClose(); }}
                    className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-colors text-left ${
                      index === selectedIndex ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-stone-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      index === selectedIndex ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-slate-100 dark:bg-stone-800'
                    }`}>
                      <Icon name={item.icon} className="text-lg" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{item.title}</div>
                      {item.subtitle && <div className="text-[10px] font-bold text-slate-500 mt-0.5">{item.subtitle}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
