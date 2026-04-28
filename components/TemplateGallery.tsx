import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PLAN_TEMPLATES } from '../data/templates';
import { PlanTemplate } from '../types';
import Icon from './common/Icon';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './common/ConfirmationModal';
import { generateLearningPlan } from '../services/gemini/planGeneratorService';

const TemplateGallery: React.FC = () => {
  const navigate = useNavigate();
  const { addPlanWithTasks } = useData();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const { showToast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'confirm' | 'refining'>('confirm');

  const filteredTemplates = useMemo(() => {
    return PLAN_TEMPLATES.filter(template => {
      const matchesFilter = filter === 'all' || template.category === filter;
      const matchesSearch = template.title.toLowerCase().includes(search.toLowerCase()) || 
                            template.subject.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);

  const handleConfirmTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    setGenerationStep('refining');
    try {
      // Use AI to generate a full detailed plan based on the template milestones
      const milestonesText = selectedTemplate.days.map(d => `Day ${d.day}: ${d.topic} (${d.guidance})`).join('\n');
      const aiResponse = await generateLearningPlan(
        selectedTemplate.title,
        selectedTemplate.totalDays,
        selectedTemplate.difficulty,
        undefined, // Default model
        'English',
        `Focus on ${selectedTemplate.subject}. Use these key milestones as anchors: ${milestonesText}. Ensure there is a task for EVERY day of the ${selectedTemplate.totalDays}-day period.`
      );

      const generatedData = JSON.parse(aiResponse);

      const newPlan = {
        id: crypto.randomUUID(),
        title: generatedData.title || selectedTemplate.title,
        description: generatedData.description || selectedTemplate.description,
        subject: selectedTemplate.subject,
        totalDays: selectedTemplate.totalDays,
        completedDays: 0,
        progress: 0,
        dailyGoalMins: selectedTemplate.dailyGoalMins,
        difficulty: selectedTemplate.difficulty,
        status: 'Active' as const,
        createdAt: new Date().toISOString()
      };

      const newTasks = generatedData.days.map((day: any) => ({
        id: crypto.randomUUID(),
        planId: newPlan.id,
        title: day.topic,
        description: day.guidance,
        durationMinutes: selectedTemplate.dailyGoalMins,
        status: 'Not Started' as const,
        dueDate: new Date(Date.now() + (day.day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tags: [selectedTemplate.subject, selectedTemplate.category],
        type: (day.topic.toLowerCase().includes('quiz') || day.topic.toLowerCase().includes('test')) ? 'quiz' : 
              (day.topic.toLowerCase().includes('code') || day.topic.toLowerCase().includes('build')) ? 'coding' : 'reading',
        createdAt: new Date().toISOString()
      }));

      await addPlanWithTasks(newPlan, newTasks);
      navigate('/dashboard');
    } catch (error) {
      console.error("Error creating plan from template:", error);
      
      // Intelligent Fallback: Use the original template milestones if AI expansion fails
      try {
        const fallbackPlan = {
          id: crypto.randomUUID(),
          title: selectedTemplate.title,
          description: selectedTemplate.description,
          subject: selectedTemplate.subject,
          totalDays: selectedTemplate.totalDays,
          completedDays: 0,
          progress: 0,
          dailyGoalMins: selectedTemplate.dailyGoalMins,
          difficulty: selectedTemplate.difficulty,
          status: 'Active' as const,
          createdAt: new Date().toISOString()
        };

        const fallbackTasks = selectedTemplate.days.map(day => ({
          id: crypto.randomUUID(),
          planId: fallbackPlan.id,
          title: day.topic,
          description: day.guidance,
          durationMinutes: selectedTemplate.dailyGoalMins,
          status: 'Not Started' as const,
          dueDate: new Date(Date.now() + (day.day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tags: [selectedTemplate.subject, selectedTemplate.category],
          type: 'reading' as const,
          createdAt: new Date().toISOString()
        }));

        await addPlanWithTasks(fallbackPlan, fallbackTasks);
        navigate('/dashboard');
      } catch (fallbackError) {
        console.error("Critical failure during template fallback:", fallbackError);
        showToast("We're having trouble reaching the AI brain. Falling back to the standard plan structure.", "warning");
      }
    } finally {
      setIsGenerating(false);
      setGenerationStep('confirm');
      setSelectedTemplate(null);
    }
  };

  return (
    <div className="pb-24 animate-fade-in relative min-h-screen">
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
              transition={{ delay: idx * 0.05 }}
              key={template.id}
              className="group bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
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
                    <span className="material-symbols-outlined text-xs">star</span>
                    <span className="text-[10px] font-bold">{template.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg border border-white/30">
                    <span className="material-symbols-outlined text-white">{template.icon}</span>
                  </div>
                  <h3 className="text-white font-bold drop-shadow-md truncate">{template.title}</h3>
                </div>
              </div>

              <div className="p-4 space-y-4 flex-1 flex flex-col">
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
                  onClick={() => setSelectedTemplate(template)}
                  className="w-full py-3 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-auto"
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

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTemplate(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface-light dark:bg-surface-dark rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-border-light dark:border-border-dark"
            >
              <div className={`h-24 bg-gradient-to-br ${selectedTemplate.coverGradient} flex items-center justify-center`}>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-4xl">{selectedTemplate.icon}</span>
                </div>
              </div>
              <div className="p-6 text-center space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                    {isGenerating ? 'Refining Roadmap...' : 'Start Learning Journey?'}
                  </h3>
                  <p className="text-sm text-text-secondary-light">
                    {isGenerating 
                      ? `Our AI is expanding "${selectedTemplate.title}" into a full ${selectedTemplate.totalDays}-day schedule just for you...`
                      : `This will add "${selectedTemplate.title}" to your active learning plans with a custom AI-refined schedule.`}
                  </p>
                </div>

                {isGenerating && (
                  <div className="py-4 space-y-3">
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 10, ease: "linear" }}
                        className="h-full bg-primary"
                      />
                    </div>
                    <p className="text-[10px] text-text-secondary-light animate-pulse">
                      Generating {selectedTemplate.totalDays} daily tasks based on key milestones...
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  {!isGenerating && (
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-text-primary-light dark:text-text-primary-dark font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    disabled={isGenerating}
                    onClick={handleConfirmTemplate}
                    className={`${isGenerating ? 'w-full' : 'flex-1'} py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-90`}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Applying Smart Path...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">check</span>
                        Confirm
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateGallery;
