import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { ensureGamificationStats, levelProgress, xpForLevel, getBadgesWithStatus } from '../services/gamificationService';
import Icon from './common/Icon';

// Helper to get local YYYY-MM-DD string from a Date object
const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Progress: React.FC = () => {
  const navigate = useNavigate();
  const { plans, tasks } = useData();
  const { user } = useAuth();
  const { startTutorial } = useTutorial();

  useEffect(() => {
    startTutorial('progress');
  }, [startTutorial]);

  const stats = useMemo(() => ensureGamificationStats(user?.stats), [user?.stats]);
  const xpProgress = useMemo(() => levelProgress(stats.totalXP), [stats.totalXP]);
  const nextLevelXP = useMemo(() => xpForLevel(stats.level + 1), [stats.level]);
  const currentLevelXP = useMemo(() => xpForLevel(stats.level), [stats.level]);
  const allBadges = useMemo(() => getBadgesWithStatus(stats.badges), [stats.badges]);

  // Filters State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('all');
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = This Week, -1 = Last Week

  // Ensure arrays are defined
  const safeTasks = tasks || [];
  const safePlans = plans || [];

  // 1. Filter Tasks based on Plan Selection
  const filteredTasks = useMemo(() => {
      if (selectedPlanId === 'all') return safeTasks;
      return safeTasks.filter(t => t.planId === selectedPlanId);
  }, [safeTasks, selectedPlanId]);

  // --- Calculate Real Stats (Based on Filtered Tasks) ---

  // 2. Total Time (All time sum for the selected context)
  const totalMinutes = useMemo(() => {
    return filteredTasks
      .filter(t => t.status === 'Completed')
      .reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  }, [filteredTasks]);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // 3. Plans Completed OR Progress % (Context Aware)
  const planStat = useMemo(() => {
      if (selectedPlanId === 'all') {
          return {
              label: 'Plans Completed',
              value: safePlans.filter(p => p.progress === 100).length
          };
      } else {
          const p = safePlans.find(p => p.id === selectedPlanId);
          return {
              label: 'Plan Progress',
              value: p ? `${Math.round(p.progress)}%` : '0%'
          };
      }
  }, [safePlans, selectedPlanId]);

  // 4. Task Breakdown (Pie Chart)
  const taskStats = useMemo(() => {
    const completed = filteredTasks.filter(t => t.status === 'Completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
    const todo = filteredTasks.filter(t => t.status === 'Not Started').length;
    
    // Prevent empty chart if no tasks
    if (completed === 0 && inProgress === 0 && todo === 0) {
        return [{ name: 'No Data', value: 1, color: '#e2e8f0' }];
    }

    return [
      { name: 'Completed', value: completed, color: '#059669' }, // Green
      { name: 'In Progress', value: inProgress, color: '#fbbf24' }, // Amber
      { name: 'To-Do', value: todo, color: '#94a3b8' }, // Slate
    ];
  }, [filteredTasks]);

  // 5. Weekly Activity (Bar Chart) - Respects Week Offset
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = days.map(d => ({ name: d, minutes: 0 }));
    
    const today = new Date();
    today.setHours(0,0,0,0); // Local midnight
    
    // Adjust for week offset
    const offsetDays = weekOffset * 7;
    const currentDay = today.getDay(); // 0-6
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + offsetDays); // Sunday of the target week
    startOfWeek.setHours(0,0,0,0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);

    filteredTasks.forEach(task => {
        if (task.status === 'Completed') {
            let taskDate: Date;
            
            // Determine the "Effective Date" of the task
            if (task.completedAt) {
                taskDate = new Date(task.completedAt); // Local time from ISO
            } else if (task.dueDate) {
                const [y, m, d] = task.dueDate.split('-').map(Number);
                taskDate = new Date(y, m - 1, d);
            } else {
                return;
            }

            // Check if task is within the target week range
            if (taskDate >= startOfWeek && taskDate <= endOfWeek) {
                const dayIndex = taskDate.getDay();
                if (data[dayIndex]) {
                    data[dayIndex].minutes += (task.durationMinutes || 0);
                }
            }
        }
    });

    return { 
        data, 
        dateRange: `${startOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - ${endOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})}`
    };
  }, [filteredTasks, weekOffset]);

  // 6. Streak Calculation
  const currentStreak = useMemo(() => {
      const today = new Date();
      const todayStr = toLocalDateString(today);
      
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = toLocalDateString(yesterday);

      const completedDates = new Set<string>();
      filteredTasks.forEach(t => {
          if (t.status === 'Completed') {
              let dateStr = '';
              if (t.completedAt) {
                  dateStr = toLocalDateString(new Date(t.completedAt));
              } else {
                  dateStr = t.dueDate; 
              }
              if (dateStr) completedDates.add(dateStr);
          }
      });

      if (completedDates.size === 0) return 0;

      if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
          return 0;
      }

      let streak = 0;
      let checkDate = new Date(today);
      
      if (!completedDates.has(todayStr)) {
          checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
          const checkStr = toLocalDateString(checkDate);
          if (completedDates.has(checkStr)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break;
          }
      }
      return streak;
  }, [filteredTasks]);

  return (
    <div className="pb-24 animate-fade-in">
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
         <h1 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Progress</h1>
      </div>

      {/* Functional Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto no-scrollbar">
         {/* Plan Filter */}
         <div className="relative">
             <select 
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
             >
                <option value="all">All Plans</option>
                {safePlans.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                ))}
             </select>
             <button className="flex items-center gap-1 px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-semibold whitespace-nowrap">
                {selectedPlanId === 'all' ? 'All Plans' : (safePlans.find(p => p.id === selectedPlanId)?.title || 'Unknown Plan')} 
                <span className="material-symbols-outlined text-sm">expand_more</span>
             </button>
         </div>

         {/* Time Filter */}
         <div className="relative">
             <select 
                value={weekOffset}
                onChange={(e) => setWeekOffset(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
             >
                <option value={0}>This Week</option>
                <option value={-1}>Last Week</option>
                <option value={-2}>2 Weeks Ago</option>
             </select>
             <button className="flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark rounded-lg text-sm font-semibold whitespace-nowrap">
                {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} Weeks Ago`}
                <span className="material-symbols-outlined text-sm">expand_more</span>
             </button>
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4 mb-6" id="tutorial-progress-stats">
        <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <p className="text-xs font-bold text-text-secondary-light uppercase tracking-wider">Total Time</p>
            <p className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mt-1">
                {hours}h {minutes}m
            </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <p className="text-xs font-bold text-text-secondary-light uppercase tracking-wider">Current Streak</p>
            <p className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mt-1">{currentStreak} days</p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark col-span-2 md:col-span-1 shadow-sm">
            <p className="text-xs font-bold text-text-secondary-light uppercase tracking-wider">{planStat.label}</p>
            <p className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mt-1">{planStat.value}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="px-4 space-y-6">
         {/* Activity Chart */}
         <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark shadow-sm" id="tutorial-progress-chart">
             <div className="mb-4 flex justify-between items-end">
                 <div>
                     <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark">Activity</h3>
                     <p className="text-xs text-text-secondary-light">Minutes Studied</p>
                 </div>
                 <p className="text-xs font-semibold text-primary pr-2">{weeklyData.dateRange}</p>
             </div>
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData.data}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <Tooltip 
                            cursor={{fill: 'transparent'}} 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--color-surface-light)'}} 
                            labelStyle={{color: '#64748b'}}
                        />
                        <Bar dataKey="minutes" radius={[4, 4, 4, 4]}>
                            {weeklyData.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#13a4ec" fillOpacity={entry.minutes > 0 ? 1 : 0.3} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
         </div>

         {/* Task Breakdown */}
         <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-border-light dark:border-border-dark flex flex-col md:flex-row items-center gap-6 shadow-sm">
             <div className="flex-1">
                 <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark mb-4">Task Breakdown</h3>
                 <div className="relative h-[160px] w-[160px] mx-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={taskStats} 
                                innerRadius={50} 
                                outerRadius={70} 
                                paddingAngle={5} 
                                dataKey="value" 
                                startAngle={90} 
                                endAngle={-270}
                                stroke="none"
                            >
                                {taskStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
                            {filteredTasks.length}
                        </span>
                        <span className="text-xs text-text-secondary-light">Tasks</span>
                    </div>
                 </div>
             </div>
             <div className="space-y-3 w-full md:w-auto">
                 {taskStats.map((item, idx) => (
                     item.name !== 'No Data' && (
                         <div key={idx} className="flex items-center gap-3">
                             <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                             <span className="text-sm text-text-secondary-light font-medium">{item.name} ({item.value})</span>
                         </div>
                     )
                 ))}
             </div>
         </div>
      </div>
      
      {/* Insights */}
      <div className="px-4 mt-8">
        <h3 className="font-bold text-lg mb-4 text-text-primary-light dark:text-text-primary-dark">Insights</h3>
        
        {filteredTasks.length > 0 ? (
             <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-border-light dark:border-border-dark flex gap-3 items-start shadow-sm">
                 <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <span className="material-symbols-outlined text-xl">lightbulb</span>
                 </div>
                 <div>
                     <p className="text-sm text-text-primary-light dark:text-text-primary-dark font-semibold">Keep it up!</p>
                     <p className="text-xs text-text-secondary-light mt-1 leading-relaxed">
                        You have {taskStats.find(s=>s.name==='To-Do')?.value || 0} tasks left to do in this selection. 
                        Completing just one task today helps build a habit.
                     </p>
                 </div>
             </div>
        ) : (
             <div className="flex flex-col items-center justify-center p-8 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-border-light dark:border-border-dark text-center">
                <span className="material-symbols-outlined text-4xl text-text-secondary-light mb-2">insights</span>
                <p className="text-sm text-text-secondary-light">No insights yet.</p>
                <p className="text-xs text-text-secondary-light/70 mt-1">Select a plan with tasks to see stats.</p>
             </div>
        )}
      </div>

      {/* Gamification: XP & Level */}
      <div className="px-4 mt-8 space-y-6">
        <div className="bg-gradient-to-br from-primary/10 via-indigo-500/5 to-purple-500/10 p-5 rounded-2xl border border-primary/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                <span className="text-2xl font-black text-primary">{stats.level}</span>
              </div>
              <div>
                <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark text-lg">Level {stats.level}</h3>
                <p className="text-xs text-text-secondary-light">{stats.totalXP} XP Total</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-primary">{Math.round(xpProgress * 100)}%</p>
              <p className="text-[10px] text-text-secondary-light">{nextLevelXP - stats.totalXP} XP to Level {stats.level + 1}</p>
            </div>
          </div>
          <div className="h-3 w-full bg-white/50 dark:bg-black/20 rounded-full overflow-hidden border border-primary/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${Math.max(2, xpProgress * 100)}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] font-bold text-text-secondary-light uppercase tracking-wider">
            <span>{currentLevelXP} XP</span>
            <span>{nextLevelXP} XP</span>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-primary/10">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{stats.studyStreak}</p>
              <p className="text-[10px] text-text-secondary-light font-bold uppercase tracking-wider">Day Streak</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{stats.longestStreak}</p>
              <p className="text-[10px] text-text-secondary-light font-bold uppercase tracking-wider">Best Streak</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{stats.badges.length}</p>
              <p className="text-[10px] text-text-secondary-light font-bold uppercase tracking-wider">Badges</p>
            </div>
          </div>
        </div>

        {/* Badge Gallery */}
        <div>
          <h3 className="font-bold text-lg mb-4 text-text-primary-light dark:text-text-primary-dark">Badges</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {allBadges.map(badge => (
              <div
                key={badge.id}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  badge.earned
                    ? 'bg-surface-light dark:bg-surface-dark border-primary/20 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    : 'bg-gray-100/50 dark:bg-gray-800/30 border-border-light dark:border-border-dark opacity-40 grayscale'
                }`}
                title={badge.earned ? `${badge.name}: ${badge.description}` : `Locked: ${badge.description}`}
              >
                <span className="text-2xl mb-1">{badge.icon}</span>
                <p className="text-[9px] font-bold text-text-primary-light dark:text-text-primary-dark text-center leading-tight">
                  {badge.name}
                </p>
                {badge.earned && (
                  <div className={`absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br ${badge.color} rounded-full flex items-center justify-center shadow-sm`}>
                    <Icon name="check" className="text-white text-[8px]" />
                  </div>
                )}
                {!badge.earned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="lock" className="text-text-secondary-light text-lg opacity-30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;