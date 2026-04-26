import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTutorial } from '../contexts/TutorialContext';
import { motion, AnimatePresence } from 'framer-motion';

const tutorialSequences: Record<string, any[]> = {
  dashboard: [
    {
      target: 'tutorial-new-plan',
      title: 'Start Here',
      content: 'Start by generating your first AI learning plan.',
      position: 'right' as const
    },
    {
      target: 'tutorial-active-plans',
      title: 'Your Plans',
      content: 'Your generated learning plans appear here.',
      position: 'bottom' as const
    },
    {
      target: 'tutorial-plan-card',
      title: 'View Roadmap',
      content: 'Click a plan to see your learning roadmap.',
      position: 'bottom' as const,
      waitForAction: true
    },
    {
      target: 'tutorial-plan-progress-card',
      title: 'Track Status',
      content: 'See your overall completion and daily goals at a glance.',
      position: 'bottom' as const
    },
    {
      target: 'tutorial-plan-actions',
      title: 'Manage Plan',
      content: 'Edit details, share your progress, or archive the plan here.',
      position: 'top' as const
    },
    {
      target: 'tutorial-start-learning',
      title: 'Start Learning',
      content: 'This opens your guided learning workspace.',
      position: 'top' as const
    },
    {
      target: 'tutorial-chatbot',
      title: 'AI Assistant',
      content: 'Ask the AI assistant questions while learning.',
      position: 'left' as const
    }
  ],
  progress: [
    {
      target: 'tutorial-progress-stats',
      title: 'Key Metrics',
      content: 'Track your total study time and current streak.',
      position: 'bottom' as const
    },
    {
      target: 'tutorial-progress-chart',
      title: 'Visualize Habits',
      content: 'See your daily study activity over time.',
      position: 'top' as const
    }
  ],
  diary: [
    {
      target: 'tutorial-diary-tabs',
      title: 'Diary Organization',
      content: 'Switch between entries, drafts, and notes.',
      position: 'bottom' as const
    },
    {
      target: 'tutorial-diary-fab',
      title: 'New Entry',
      content: 'Click here to create a new learning diary entry.',
      position: 'left' as const
    }
  ],
  settings: [
    {
      target: 'tutorial-settings-profile',
      title: 'Profile Info',
      content: 'Update your display name and academic level.',
      position: 'bottom' as const
    },
    {
      target: 'tutorial-settings-preferences',
      title: 'Preferences',
      content: 'Adjust notifications and study reminders.',
      position: 'bottom' as const
    }
  ],
  profile: [
    {
      target: 'tutorial-profile-badges',
      title: 'Achievements',
      content: 'View the badges you have earned along your journey.',
      position: 'bottom' as const
    },
    {
      target: 'tutorial-profile-stats',
      title: 'Your Stats',
      content: 'See your all-time learning statistics.',
      position: 'top' as const
    }
  ]
};

const TutorialGuide: React.FC = () => {
  const { isActive, activeTutorialId, currentStep, nextStep, prevStep, skipTutorial, completeTutorial } = useTutorial();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // We need to track if the element is actually visible
  const [isElementVisible, setIsElementVisible] = useState(false);

  const steps = activeTutorialId ? tutorialSequences[activeTutorialId] : [];
  const currentStepData = steps ? steps[currentStep] : null;

  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const updatePosition = () => {
      // Handle mobile/desktop ID variations for navigation items
      let targetId = currentStepData?.target;
      if (window.innerWidth < 768) {
          if (targetId === 'tutorial-new-plan') targetId = 'tutorial-new-plan-mobile';
          if (targetId === 'tutorial-progress') targetId = 'tutorial-progress-mobile';
      }

      const element = document.getElementById(targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Check if element is in viewport and has size
        if (rect.width > 0 && rect.height > 0) {
            setTargetRect(rect);
            setIsElementVisible(true);
        } else {
            setIsElementVisible(false);
        }
      } else {
        setIsElementVisible(false);
      }
    };

    // Initial check
    updatePosition();

    // Check periodically for dynamic content (animations, loading)
    const interval = setInterval(updatePosition, 100);
    
    // Check on resize/scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isActive, currentStep, currentStepData, location.pathname]);

  // Auto-advance logic for navigation steps
  useEffect(() => {
    if (!isActive || !activeTutorialId) return;

    // Dashboard Step 3: Click Plan Card -> Plan Details
    if (activeTutorialId === 'dashboard' && currentStep === 2 && location.pathname === '/plan-details') {
        nextStep();
    }
  }, [location.pathname, currentStep, isActive, activeTutorialId, nextStep]);

  if (!isActive || !activeTutorialId || !steps) return null;

  // Render final success message
  if (currentStep >= steps.length) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-surface-dark p-8 rounded-2xl shadow-2xl max-w-md text-center border border-border-light dark:border-border-dark mx-4"
        >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">You're Ready!</h2>
            <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8">
                You're all set to start learning with ReLearn.ai. Remember, consistency is key!
            </p>
            <button 
                onClick={completeTutorial}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
                Start Learning
            </button>
        </motion.div>
      </div>,
      document.body
    );
  }

  if (!isElementVisible || !targetRect) return null;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const gap = 16;
    const tooltipWidth = 300;
    const tooltipHeight = 180; // Approximate
    
    let top = 0;
    let left = 0;

    // Default positions
    switch (currentStepData.position) {
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - 60;
        left = targetRect.right + gap;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - 60;
        left = targetRect.left - tooltipWidth - gap;
        break;
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - gap;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
    }

    // Viewport Boundary Checks
    const padding = 20;
    
    // Horizontal check
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
    }

    // Vertical check
    if (top < padding) {
        // Flip to bottom if top is clipped
        top = targetRect.bottom + gap;
    } else if (top + tooltipHeight > window.innerHeight - padding) {
        // Flip to top if bottom is clipped
        top = targetRect.top - tooltipHeight - gap;
    }

    return { top, left };
  };

  const { top, left } = getTooltipStyle();

  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-hidden pointer-events-none">
      {/* Spotlight with Overlay using box-shadow */}
      <motion.div
        layoutId="spotlight"
        className="absolute rounded-xl transition-all duration-300 ease-out border-2 border-white/50 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)' // The dark overlay
        }}
        initial={false}
        animate={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8
        }}
      />

      {/* Tooltip */}
      <motion.div 
        className="absolute pointer-events-auto bg-white dark:bg-surface-dark p-5 rounded-xl shadow-2xl w-[300px] border border-border-light dark:border-border-dark z-[100]"
        style={{ top, left }}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        key={currentStep} // Re-animate on step change
      >
        <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark">{currentStepData.title}</h3>
            <span className="text-xs font-bold text-text-secondary-light bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {currentStep + 1} / {steps.length}
            </span>
        </div>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4 leading-relaxed">
            {currentStepData.content}
        </p>
        <div className="flex justify-between items-center">
            <button 
                onClick={skipTutorial}
                className="text-xs font-bold text-text-secondary-light hover:text-text-primary-light transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
                Skip
            </button>
            <div className="flex gap-2">
                {currentStep > 0 && (
                    <button 
                        onClick={prevStep}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-text-primary-light dark:text-text-primary-dark"
                    >
                        Back
                    </button>
                )}
                <button 
                    onClick={nextStep}
                    className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                    {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
        
        {/* Arrow/Tail (Optional, simplified) */}
        {/* <div className="absolute w-3 h-3 bg-white dark:bg-surface-dark transform rotate-45 border-l border-t border-border-light dark:border-border-dark" style={{...}} /> */}
      </motion.div>
    </div>,
    document.body
  );
};

export default TutorialGuide;
