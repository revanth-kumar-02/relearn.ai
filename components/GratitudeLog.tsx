import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Icon from './common/Icon';
import { motion, AnimatePresence } from 'motion/react';

interface GratitudeEntry {
  id: string;
  text: string;
  date: string;
  topic?: string;
}

const LS_KEY = 'relearn_gratitude_log';

function getEntries(): GratitudeEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch { return []; }
}

function saveEntries(entries: GratitudeEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

const GratitudeLog: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<GratitudeEntry[]>(getEntries());
  const [input, setInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const hasEntryToday = entries.some(e => e.date === today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const entry: GratitudeEntry = {
      id: `grat_${Date.now()}`,
      text: input.trim(),
      date: today,
    };

    const updated = [entry, ...entries];
    if (updated.length > 365) updated.length = 365; // Keep 1 year
    setEntries(updated);
    saveEntries(updated);
    setInput('');
    setShowInput(false);
  };

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, GratitudeEntry[]> = {};
    entries.forEach(e => {
      const month = e.date.slice(0, 7); // YYYY-MM
      if (!groups[month]) groups[month] = [];
      groups[month].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const d = new Date();
    // Check if today has an entry, if not start from yesterday
    if (!entries.some(e => e.date === today)) {
      d.setDate(d.getDate() - 1);
    }
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (entries.some(e => e.date === dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [entries, today]);

  return (
    <div className="min-h-screen pb-28 animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-border-light dark:border-border-dark">
        <div className="max-w-2xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Icon name="self_improvement" className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Gratitude Log</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary-light">What did you learn today?</p>
            </div>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-full border border-amber-200 dark:border-amber-800">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">{currentStreak}d</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Today's Prompt */}
        {!hasEntryToday ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-rose-950/20 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-800/30"
          >
            <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-4">
              ✨ What's one thing you're grateful you learned today?
            </p>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="I learned that..."
                maxLength={200}
                className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all placeholder:text-stone-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-40 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Save
              </button>
            </form>
          </motion.div>
        ) : (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-5 border border-emerald-200/50 dark:border-emerald-800/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Icon name="check_circle" className="text-emerald-500 filled" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Today's gratitude logged ✨</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50 mt-0.5">{entries.find(e => e.date === today)?.text}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark text-center">
            <p className="text-2xl font-black text-primary">{entries.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary-light mt-1">Total Entries</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark text-center">
            <p className="text-2xl font-black text-amber-500">{currentStreak}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary-light mt-1">Day Streak</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark text-center">
            <p className="text-2xl font-black text-emerald-500">{grouped.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary-light mt-1">Months Active</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-8">
          {grouped.map(([month, monthEntries]) => {
            const [year, m] = month.split('-');
            const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            
            return (
              <div key={month}>
                <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary-light mb-3 px-1">{monthName}</h3>
                <div className="space-y-2">
                  {monthEntries.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex gap-3 items-start group"
                    >
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 group-hover:bg-amber-500 transition-colors shadow-sm shadow-amber-400/30" />
                        {idx < monthEntries.length - 1 && <div className="w-px h-full bg-amber-200 dark:bg-amber-800/30 min-h-[2rem]" />}
                      </div>
                      <div className="bg-surface-light dark:bg-surface-dark px-4 py-3 rounded-xl border border-border-light dark:border-border-dark flex-1 group-hover:border-amber-300 dark:group-hover:border-amber-700 transition-colors">
                        <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{entry.text}</p>
                        <p className="text-[10px] font-bold text-text-secondary-light mt-1">
                          {new Date(entry.date).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {entries.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">🌱</span>
            <h3 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">Start your gratitude journey</h3>
            <p className="text-sm text-text-secondary-light mt-2 max-w-sm mx-auto">
              Write one thing you're grateful for each day. Over time, you'll build a beautiful timeline of your growth.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default GratitudeLog;
