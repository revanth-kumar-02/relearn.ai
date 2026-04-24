import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PLAN_TEMPLATES } from '../data/templates';
import { PlanTemplate } from '../types';
import Icon from './common/Icon';
import { useData } from '../contexts/DataContext';

const TemplateGallery: React.FC = () => {
  const navigate = useNavigate();
  const { addPlanWithTasks } = useData();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredTemplates = useMemo(() => {
    return PLAN_TEMPLATES.filter(template => {
      const matchesFilter = filter === 'all' || template.category === filter;
      const matchesSearch = template.title.toLowerCase().includes(search.toLowerCase()) || 
                            template.subject.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  const handleUseTemplate = async (template: PlanTemplate) => {
    const confirmUse = window.confirm(`Start your learning journey with "${template.title}"? This will create a new plan in your dashboard.`);
    if (!confirmUse) return;

    const newPlan = {
      id: crypto.randomUUID(),
      title: template.title,
      description: template.description,
      subject: template.subject,
      totalDays: template.totalDays,
      completedDays: 0,
      progress: 0,
      dailyGoalMins: template.dailyGoalMins,
      difficulty: template.difficulty,
      status: 'Active' as const,
      createdAt: new Date().toISOString()
    };

    const newTasks = template.days.map(day => ({
      id: crypto.randomUUID(),
      planId: newPlan.id,
      title: day.topic,
      description: day.guidance,
      durationMinutes: template.dailyGoalMins,
      status: 'Not Started' as const,
      dueDate: new Date(Date.now() + (day.day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tags: [template.subject, template.category],
      type: 'reading' as const, // Default to reading for templates
      createdAt: new Date().toISOString()
    }));

    await addPlanWithTasks(newPlan, newTasks);
    navigate('/dashboard');
  };

  return (
    <div className="pb-24 animate-fade-in">
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Templates</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary-light">search</span>
            <input 
              type="text" 
              placeholder="Search templates..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['all', 'programming', 'science', 'creative', 'business', 'language'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all whitespace-nowrap ${
                  filter === cat 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-surface-light dark:bg-surface-dark text-text-secondary-light border border-border-light dark:border-border-dark'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={template.id}
              className="group bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className={`h-32 bg-gradient-to-br ${template.coverGradient} p-4 flex flex-col justify-between relative overflow-hidden`}>
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[120px]">{template.icon}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/30">
                    {template.difficulty}
                  </span>
                  <div className="flex items-center gap-1 text-white/90">
                    <span className="material-symbols-outlined text-xs">local_fire_department</span>
                    <span className="text-[10px] font-bold">{template.popularity}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg border border-white/30">
                    <span className="material-symbols-outlined text-white">{template.icon}</span>
                  </div>
                  <h3 className="text-white font-bold drop-shadow-md">{template.title}</h3>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-sm text-text-secondary-light line-clamp-2 min-h-[40px]">
                  {template.description}
                </p>

                <div className="flex items-center justify-between text-xs font-semibold text-text-secondary-light">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                    <span>{template.totalDays} Days</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>{template.dailyGoalMins}m / day</span>
                  </div>
                </div>

                <button
                  onClick={() => handleUseTemplate(template)}
                  className="w-full py-3 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  Start Learning
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-surface-dark rounded-full flex items-center justify-center mb-4 border border-dashed border-border-light dark:border-border-dark">
              <span className="material-symbols-outlined text-4xl text-text-secondary-light">sentiment_dissatisfied</span>
            </div>
            <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark">No templates found</h3>
            <p className="text-sm text-text-secondary-light">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGallery;
