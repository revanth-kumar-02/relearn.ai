import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './common/Icon';

interface HelpSection {
  id: string;
  category: 'Getting Started' | 'Core Features' | 'AI & Personalization' | 'Social & Community';
  title: string;
  icon: string;
  color: string;
  content: React.ReactNode;
}

const helpSections: HelpSection[] = [
  {
    id: 'dashboard',
    category: 'Core Features',
    title: 'Momentum-First Dashboard',
    icon: 'bolt',
    color: 'text-amber-500',
    content: (
      <div className="space-y-6">
        <p>The Dashboard is your command center, intelligently designed to prioritize action over noise.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700">
            <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-amber-600 mb-3">Active Nudges</h4>
            <p className="text-sm leading-relaxed">High-priority items like study streaks, daily goals, and active plan tasks are anchored at the top to maintain your learning momentum.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700">
            <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-amber-600 mb-3">Smart Routing</h4>
            <p className="text-sm leading-relaxed">Passive notifications such as system updates or general study tips are automatically routed to the sidebar to keep your main workspace distraction-free.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'rooms',
    category: 'Social & Community',
    title: 'Collaborative Study Hub',
    icon: 'hub',
    color: 'text-indigo-500',
    content: (
      <div className="space-y-6">
        <p>Learning is better together. The Study Hub connects you with students worldwide for synchronized focus sessions.</p>
        <ul className="space-y-4">
          <li className="flex gap-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <Icon name="chat" className="text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-bold mb-1">Real-Time Interaction</p>
              <p className="text-xs opacity-70">Engage in real-time messaging with full Markdown and code snippet support.</p>
            </div>
          </li>
          <li className="flex gap-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <Icon name="timer" className="text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-bold mb-1">Synchronized Pomodoro</p>
              <p className="text-xs opacity-70">Join collective study cycles with synchronized timers to stay productive with peers.</p>
            </div>
          </li>
          <li className="flex gap-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <Icon name="group" className="text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-bold mb-1">Presence & Activity</p>
              <p className="text-xs opacity-70">See who's online, what they're studying, and join their room with one click.</p>
            </div>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 'search',
    category: 'Getting Started',
    title: 'Global Search (⌘K)',
    icon: 'search',
    color: 'text-primary',
    content: (
      <div className="space-y-6">
        <p>Navigate the entire platform at the speed of thought using our universal command palette.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl font-mono text-xs border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 text-primary font-bold">
              <Icon name="keyboard" className="text-sm" />
              <span className="uppercase tracking-widest text-[10px]">macOS Shortcut</span>
            </div>
            <div className="space-y-2 opacity-80">
              <p className="flex justify-between"><span>Open Search</span> <span className="text-white bg-white/10 px-2 py-0.5 rounded">⌘K</span></p>
              <p className="flex justify-between"><span>Navigate</span> <span className="text-white bg-white/10 px-2 py-0.5 rounded">↑ ↓</span></p>
              <p className="flex justify-between"><span>Select</span> <span className="text-white bg-white/10 px-2 py-0.5 rounded">Enter</span></p>
            </div>
          </div>
          <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl font-mono text-xs border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 text-sky-400 font-bold">
              <Icon name="laptop_windows" className="text-sm" />
              <span className="uppercase tracking-widest text-[10px]">Windows Shortcut</span>
            </div>
            <div className="space-y-2 opacity-80">
              <p className="flex justify-between"><span>Open Search</span> <span className="text-white bg-white/10 px-2 py-0.5 rounded">Ctrl+K</span></p>
              <p className="flex justify-between"><span>Navigate</span> <span className="text-white bg-white/10 px-2 py-0.5 rounded">↑ ↓</span></p>
              <p className="flex justify-between"><span>Select</span> <span className="text-white bg-white/10 px-2 py-0.5 rounded">Enter</span></p>
            </div>
          </div>
        </div>
        <p className="text-xs leading-relaxed opacity-70">Search currently supports navigation to all major pages and instant lookup of your personal Learning Plans.</p>
      </div>
    )
  },
  {
    id: 'generation',
    category: 'AI & Personalization',
    title: 'AI Plan Generation',
    icon: 'auto_awesome',
    color: 'text-purple-500',
    content: (
      <div className="space-y-6">
        <p>Turn any goal, topic, or document into a structured learning roadmap in seconds.</p>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-purple-500/5 border border-purple-500/10 transition-colors hover:bg-purple-500/10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <Icon name="description" className="text-purple-500" />
            </div>
            <div>
              <h5 className="text-sm font-bold mb-1">PDF Learning</h5>
              <p className="text-xs opacity-70 leading-relaxed">Upload textbooks, lecture slides, or research papers. ReLearn.ai will extract the core concepts and build a plan around them.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-purple-500/5 border border-purple-500/10 transition-colors hover:bg-purple-500/10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <Icon name="palette" className="text-purple-500" />
            </div>
            <div>
              <h5 className="text-sm font-bold mb-1">Visual Identity</h5>
              <p className="text-xs opacity-70 leading-relaxed">Every plan is assigned a unique, AI-generated cover image based on its subject matter, making your library visually distinct.</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'workspace',
    category: 'Core Features',
    title: 'Interactive Learning Workspace',
    icon: 'school',
    color: 'text-emerald-500',
    content: (
      <div className="space-y-6">
        <p>A distraction-free environment designed for deep focus and active engagement with your study material.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'AI Tutor', desc: 'Concept breakdowns' },
            { label: 'Video Hub', desc: 'Curated mentors' },
            { label: 'Activity', desc: 'Practice tasks' }
          ].map(f => (
            <div key={f.label} className="p-4 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">{f.label}</p>
              <p className="text-[9px] opacity-60 leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700">
          <p className="text-xs leading-relaxed">The workspace integrates <strong>YouTube Data API</strong> to bring you the best video resources and <strong>Gemini 3.1 Pro</strong> for deep contextual explanations of every topic.</p>
        </div>
      </div>
    )
  },
  {
    id: 'progress',
    category: 'Core Features',
    title: 'Analytics & Progress Tracking',
    icon: 'analytics',
    color: 'text-cyan-500',
    content: (
      <div className="space-y-6">
        <p>Monitor your growth with high-fidelity analytics and interactive data visualizations.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700">
             <div className="flex items-center gap-3">
                <Icon name="query_stats" className="text-cyan-500" />
                <span className="text-sm font-bold">Weekly Activity</span>
             </div>
             <span className="text-[10px] text-slate-400">Bar Charts</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700">
             <div className="flex items-center gap-3">
                <Icon name="pie_chart" className="text-cyan-500" />
                <span className="text-sm font-bold">Task Breakdown</span>
             </div>
             <span className="text-[10px] text-slate-400">Distribution</span>
          </div>
        </div>
        <p className="text-xs opacity-70">Filter your progress by specific plans or view your global performance across the entire platform.</p>
      </div>
    )
  },
  {
    id: 'gamification',
    category: 'AI & Personalization',
    title: 'Gamification & Identity',
    icon: 'military_tech',
    color: 'text-rose-500',
    content: (
      <div className="space-y-6">
        <p>Your journey is celebrated with a sophisticated reward system and a digital student identity.</p>
        <ul className="space-y-3">
          <li className="flex items-start gap-4">
            <Icon name="stars" className="text-rose-500 mt-1" />
            <div>
              <p className="text-sm font-bold">Level System</p>
              <p className="text-xs opacity-70 leading-relaxed">Earn XP for every task completed. Advance through levels and unlock new capabilities.</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <Icon name="verified" className="text-rose-500 mt-1" />
            <div>
              <p className="text-sm font-bold">Achievement Badges</p>
              <p className="text-xs opacity-70 leading-relaxed">Collect 30+ unique badges across Bronze, Silver, Gold, and Mythic tiers. Showcase them on your profile.</p>
            </div>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 'diary',
    category: 'Core Features',
    title: 'Learning Diary & Archive',
    icon: 'menu_book',
    color: 'text-orange-500',
    content: (
      <div className="space-y-6">
        <p>Your personal archive of every learning journey you've ever embarked on.</p>
        <div className="p-5 rounded-3xl bg-orange-500/5 border border-orange-500/10">
          <h5 className="text-sm font-bold mb-2">The "Journey Card"</h5>
          <p className="text-xs opacity-70 leading-relaxed">Each entry in your diary tracks your total progress, last engagement time, and provides a quick-access button to jump back into learning.</p>
        </div>
        <p className="text-xs leading-relaxed italic opacity-60">Archive plans once completed to keep your dashboard clean while preserving your learning history.</p>
      </div>
    )
  },
  {
    id: 'settings',
    category: 'Getting Started',
    title: 'Customization & Settings',
    icon: 'settings',
    color: 'text-slate-500',
    content: (
      <div className="space-y-6">
        <p>Tailor the ReLearn experience to fit your specific study habits and aesthetic preferences.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700 text-center">
            <Icon name="dark_mode" className="text-slate-400 mb-2" />
            <p className="text-[10px] font-bold">Theme Engine</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700 text-center">
            <Icon name="notifications" className="text-slate-400 mb-2" />
            <p className="text-[10px] font-bold">Alert Rules</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700 text-center">
            <Icon name="translate" className="text-slate-400 mb-2" />
            <p className="text-[10px] font-bold">Video Language</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800/50 border border-slate-100 dark:border-stone-700 text-center">
            <Icon name="vibration" className="text-slate-400 mb-2" />
            <p className="text-[10px] font-bold">Haptic Feedback</p>
          </div>
        </div>
      </div>
    )
  }
];

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    if (!query) return helpSections;
    return helpSections.filter(s => 
      s.title.toLowerCase().includes(query.toLowerCase()) || 
      s.category.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const categories = useMemo(() => 
    Array.from(new Set(helpSections.map(s => s.category))),
  []);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      {/* Refined Full-Width Hero Header */}
      <div className="relative overflow-hidden bg-slate-900 pt-16 pb-28 px-6 w-full">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[5%] w-[30%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
        </div>

        <div className="relative z-10 w-full text-center">
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => navigate(-1)} 
            className="mb-8 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            <Icon name="arrow_back" className="text-sm" /> Dashboard
          </motion.button>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight"
          >
            How can we <span className="text-primary">help?</span>
          </motion.h1>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative max-w-xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative">
                <Icon name="search" className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search features or shortcuts..."
                  className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-xl transition-all shadow-xl"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content Grid with Proper Gap */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {categories.map((category) => {
          const categoryItems = filteredSections.filter(s => s.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <section key={category} className="mb-12">
              <div className="flex items-center gap-4 mb-6 px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 shrink-0">
                  {category}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-border-light dark:from-border-dark to-transparent opacity-30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className={`group bg-surface-light dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark shadow-sm overflow-hidden transition-all duration-300 ${
                      expandedId === item.id ? 'ring-2 ring-primary/20 md:col-span-2 lg:col-span-3' : 'hover:shadow-lg hover:-translate-y-1'
                    }`}
                  >
                    <button 
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="w-full flex items-center gap-5 p-6 text-left"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${item.color.replace('text-', 'bg-')}/10 ${item.color}`}>
                        <Icon name={item.icon} className="text-2xl" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">{item.title}</h4>
                        <p className="text-[9px] text-text-secondary-light uppercase font-bold tracking-widest opacity-50">Quick Guide</p>
                      </div>
                      <Icon 
                        name={expandedId === item.id ? 'expand_less' : 'expand_more'} 
                        className={`text-slate-300 transition-all duration-300 ${expandedId === item.id ? 'text-primary' : ''}`} 
                      />
                    </button>

                    <AnimatePresence>
                      {expandedId === item.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="px-8 pb-8 pt-2 border-t border-slate-50 dark:border-stone-800">
                            <div className="text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                              {item.content}
                            </div>
                            
                            <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-slate-50 dark:border-stone-800">
                              <p className="text-[10px] font-bold text-slate-400">Official v6.0 Guide</p>
                              <div className="flex gap-2">
                                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-stone-800 transition-colors"><Icon name="thumb_up" className="text-xs" /></button>
                                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-stone-800 transition-colors"><Icon name="thumb_down" className="text-xs" /></button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Compact Trust Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: 'Status', val: 'Online', icon: 'check_circle', color: 'text-green-500' },
            { label: 'AI', val: 'Gemini 3.1 Pro', icon: 'bolt', color: 'text-amber-500' },
            { label: 'Privacy', val: 'Protected', icon: 'lock', color: 'text-blue-500' },
            { label: 'Version', val: 'v6.0', icon: 'cloud_sync', color: 'text-primary' }
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center gap-3">
              <Icon name={s.icon} className={`${s.color} text-xl`} />
              <div>
                <p className="text-[8px] font-bold uppercase text-slate-400">{s.label}</p>
                <p className="text-[10px] font-bold">{s.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Elegant Footer Support */}
        <div className="p-10 rounded-[3rem] bg-slate-900 dark:bg-stone-900 border border-white/5 text-center relative overflow-hidden group shadow-xl">
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Need more help?</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">Our support team and student community are here to assist you.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/feedback')}
                className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all uppercase tracking-widest"
              >
                Contact Support
              </button>
              <button 
                onClick={() => navigate('/rooms')}
                className="w-full sm:w-auto px-8 py-3.5 bg-white/5 text-white rounded-2xl font-bold text-xs border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all uppercase tracking-widest"
              >
                Community Hub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;