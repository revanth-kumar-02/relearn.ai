import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import { useData } from '../../contexts/DataContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const GlobalCommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const { plans } = useData();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const staticItems = [
      { id: 'nav-dashboard', type: 'nav', title: 'Dashboard', subtitle: 'Overview of your learning', icon: 'dashboard', action: () => onNavigate('/dashboard') },
      { id: 'nav-progress', type: 'nav', title: 'My Progress', subtitle: 'Detailed stats and analytics', icon: 'bar_chart', action: () => onNavigate('/progress') },
      { id: 'nav-diary', type: 'nav', title: 'Learning Diary', subtitle: 'Reflections and study logs', icon: 'menu_book', action: () => onNavigate('/diary') },
      { id: 'nav-templates', type: 'nav', title: 'Templates', subtitle: 'AI study plan templates', icon: 'dashboard_customize', action: () => onNavigate('/templates') },
      { id: 'nav-rooms', type: 'nav', title: 'Study Rooms', subtitle: 'Collaborate with others', icon: 'hub', action: () => onNavigate('/rooms') },
      { id: 'nav-settings', type: 'nav', title: 'Settings', subtitle: 'App and account settings', icon: 'settings', action: () => onNavigate('/settings') },
    ];

    const planItems = plans.map(plan => ({
      id: `plan-${plan.id}`,
      type: 'plan',
      title: plan.title,
      subtitle: `Plan • ${plan.subject} • ${Math.round(plan.progress)}% Complete`,
      icon: 'menu_book',
      action: () => onNavigate(`/plan-details?id=${plan.id}`)
    }));

    return [...staticItems, ...planItems];
  }, [plans, onNavigate]);

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
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
          className="w-full max-w-xl bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center gap-3">
            <Icon name="search" className="text-slate-400" />
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Search features (e.g. 'progress', 'diary')..." 
              className="flex-1 bg-transparent border-none outline-none text-text-primary-light dark:text-text-primary-dark font-medium"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400">
              ESC
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {filteredItems.length > 0 ? (
              <div className="space-y-1">
                {filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors text-left ${
                      index === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => { item.action(); onClose(); }}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      index === selectedIndex ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-stone-800 text-slate-500'
                    }`}>
                      <Icon name={item.icon} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{item.title}</p>
                      <p className={`text-xs ${index === selectedIndex ? 'text-primary/70' : 'text-slate-400'}`}>{item.subtitle}</p>
                    </div>
                    {index === selectedIndex && <Icon name="chevron_right" className="text-primary" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Icon name="search_off" className="text-4xl text-slate-200 mb-2 mx-auto" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No matching features found</p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-border-light dark:border-border-dark flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><Icon name="keyboard_arrow_up" className="text-xs" /> <Icon name="keyboard_arrow_down" className="text-xs" /> Navigate</span>
              <span className="flex items-center gap-1"><Icon name="keyboard_return" className="text-xs" /> Select</span>
            </div>
            <span>ReLearn.ai Search</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
