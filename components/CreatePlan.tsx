import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateLearningPlan } from '../services/gemini/planGeneratorService';
import { validateTopicSafety } from '../services/gemini/contentSafetyService';
import { generatePlanCoverImage } from '../services/gemini/imageService';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { triggerHaptic } from '../services/utils/haptics';
import { Plan, Task } from '../types';
import Icon from './common/Icon';

const CreatePlan: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addPlanWithTasks, updatePlan } = useData();
    const { showToast } = useToast();
    
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // AI Inputs
    const [aiDuration, setAiDuration] = useState(30);
    const [dailyGoalMins, setDailyGoalMins] = useState(45);
    const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');

    useEffect(() => {
        // Cleanup on unmount - cancel any pending AI request
        return () => {
            if (abortControllerRef.current) {
                console.log("[CreatePlan] Component unmounting, aborting AI request...");
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleGenerate = async () => {
        const cleanPrompt = prompt.trim();
        if (!cleanPrompt) {
            showToast("What's on your mind? Add a topic to get started.", "warning");
            return;
        }
        
        if (cleanPrompt.length > 1000) {
            showToast("Prompt is too long (max 1000 characters)", "warning");
            return;
        }

        setIsLoading(true);
        
        // Initialize AbortController
        abortControllerRef.current = new AbortController();

        try {
            // Validate content safety
            const safetyResult = await validateTopicSafety(cleanPrompt, undefined, abortControllerRef.current.signal);
            if (!safetyResult.isSafe) {
                showToast(safetyResult.message || "This topic falls outside our current learning paths. Let’s explore something else.", "error");
                setIsLoading(false);
                abortControllerRef.current = null;
                return;
            }

            const safePrompt = safetyResult.redirectedTopic || cleanPrompt;
            if (safetyResult.redirectedTopic && safetyResult.redirectedTopic.toLowerCase() !== cleanPrompt.toLowerCase()) {
                showToast(`Topic adjusted to: ${safetyResult.redirectedTopic}`, "info");
                setPrompt(safetyResult.redirectedTopic);
            }
            const userContext = user ? `
          Academic Level: ${user.academicLevel}
          Learning Goals: ${user.learningGoals?.join(', ')}
          Strong Subjects: ${user.strongSubjects?.join(', ')}
          Weak Subjects: ${user.weakSubjects?.join(', ')}
          Preferred Study Time: ${user.preferredStudyTime}
        ` : undefined;

            const result = await generateLearningPlan(
                safePrompt, 
                aiDuration, 
                difficulty, 
                undefined, 
                userContext, 
                abortControllerRef.current.signal
            );

            let parsedData;
            try {
                parsedData = JSON.parse(result);
            } catch (e) {
                console.error("JSON Parse Error", e);
                showToast("We caught a small hiccup while structuring your plan. Let's give it another try.", "error");
                setIsLoading(false);
                return;
            }

            const planId = crypto.randomUUID();
            const planTitle = parsedData.title || `Learn ${prompt.slice(0, 30)}...`;
            let planDays = parsedData.days || parsedData.dailyTopics || [];

            if (!Array.isArray(planDays) || planDays.length === 0) {
                showToast("We had trouble mapping out your plan. Let's try again.", "error");
                setIsLoading(false);
                return;
            }

            const immediateCover = `https://image.pollinations.ai/prompt/${encodeURIComponent(planTitle + ' abstract digital art')}?width=1280&height=720&nologo=true`;

            const newPlan: Plan = {
                id: planId,
                title: planTitle,
                description: parsedData.description,
                subject: "AI Generated",
                totalDays: planDays.length,
                completedDays: 0,
                progress: 0,
                dailyGoalMins: dailyGoalMins,
                difficulty: difficulty,
                coverImage: immediateCover,
                updatedAt: new Date().toISOString()
            };

            const newTasks: Task[] = planDays.map((item: any, index: number) => {
                const date = new Date();
                date.setDate(date.getDate() + index);
                
                const topicName = item.topic || item.title || item.subject || `Topic ${index + 1}`;
                const description = item.guidance || item.description || item.summary || `Study ${topicName}`;
                const sanitizedTopic = topicName.replace(/^(Day|Week)\s*\d+[:\s-]*/i, '').trim();

                return {
                    id: crypto.randomUUID(),
                    planId: planId,
                    title: `Day ${index + 1}: ${sanitizedTopic}`,
                    description: description,
                    durationMinutes: dailyGoalMins,
                    dueDate: date.toISOString().split('T')[0],
                    status: 'Not Started',
                    tags: ['AI Generated'],
                    type: 'reading',
                    color: 'text-primary',
                    bgColor: 'bg-primary/10',
                    subtitle: sanitizedTopic,
                    priority: 'Medium',
                    updatedAt: new Date().toISOString()
                };
            });

            await addPlanWithTasks(newPlan, newTasks);
            showToast("Plan generated successfully!", "success");
            triggerHaptic('success'); // U3: Tactile feedback

            // Background high-quality image generation (also abortable)
            generatePlanCoverImage(planTitle, abortControllerRef.current.signal).then(imageUrl => {
                if (imageUrl) updatePlan(planId, { coverImage: imageUrl });
            }).catch(err => {
                if (err.message !== "AbortError") {
                    console.error("Failed to generate high-quality cover:", err);
                }
            });

            setTimeout(() => navigate('/plan-details', { state: { planId } }), 100);
        } catch (e: any) {
            if (e.message === "AbortError") {
                console.log("Plan generation aborted.");
                return;
            }
            console.error("Plan Generation Failed:", e);
            showToast(e?.message || "We lost connection for a moment. Let's reconnect.", "error");
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleClose = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        navigate('/dashboard');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center backdrop-blur-sm p-0 md:p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-background-light dark:bg-background-dark w-full max-w-md rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">

                <div className="w-full flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>

                <div className="relative px-6 py-5 flex items-center justify-between border-b border-border-light dark:border-border-dark">
                    <h2 id="modal-title" className="font-bold text-xl text-text-primary-light dark:text-text-primary-dark">AI Plan Generator</h2>
                    <button 
                        onClick={handleClose} 
                        className="text-text-secondary-light hover:text-primary transition-colors p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                        aria-label="Close generator"
                    >
                        <Icon name="close" />
                    </button>
                </div>

                <div className="p-6 pb-8">
                    <div className="space-y-5">
                        <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/10 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                <Icon name="auto_awesome" className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">AI Intelligence</h3>
                                <p className="text-xs text-text-secondary-light">Describe your goal and let AI handle the heavy lifting.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="prompt-input" className="text-xs font-bold text-text-secondary-light uppercase tracking-widest block mb-2 px-1">What do you want to learn?</label>
                                <textarea
                                    id="prompt-input"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., 'Learn Flutter for mobile app development from scratch'"
                                    maxLength={1000}
                                    aria-describedby="prompt-tip"
                                    className="w-full p-4 h-32 rounded-xl bg-gray-50 dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none font-medium"
                                ></textarea>
                                <div className="flex justify-between mt-1 px-1">
                                    <p id="prompt-tip" className="text-[10px] text-text-secondary-light">Be specific about your current skill level.</p>
                                    <p className={`text-[10px] font-bold ${prompt.length > 900 ? 'text-red-500' : 'text-text-secondary-light'}`}>
                                        {prompt.length}/1000
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="duration-input" className="text-xs font-bold text-text-secondary-light uppercase tracking-widest block mb-2 px-1">Duration (Days)</label>
                                <input
                                    id="duration-input"
                                    type="number"
                                    value={isNaN(aiDuration) ? '' : aiDuration}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setAiDuration(val > 100 ? 100 : (val < 1 ? 1 : val));
                                    }}
                                    min={1}
                                    max={100}
                                    className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-medium"
                                />
                            </div>

                            <div role="group" aria-labelledby="difficulty-label">
                                <label id="difficulty-label" className="text-xs font-bold text-text-secondary-light uppercase tracking-widest block mb-2 px-1">Difficulty Level</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setDifficulty(level)}
                                            aria-pressed={difficulty === level}
                                            className={`py-3 rounded-xl font-bold text-xs transition-all border ${difficulty === level
                                                ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                                                : 'bg-gray-50 dark:bg-surface-dark text-text-secondary-light border-border-light dark:border-border-dark hover:bg-gray-100 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full py-4 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
                            aria-busy={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Engineering Your Path...</span>
                                </div>
                            ) : (
                                <>
                                    <Icon name="auto_awesome" /> Generate AI Plan
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePlan;
