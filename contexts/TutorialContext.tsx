import React, { createContext, useContext, useState, useEffect } from 'react';

interface TutorialContextType {
  isActive: boolean;
  activeTutorialId: string | null;
  currentStep: number;
  startTutorial: (tutorialId: string) => void;
  completeTutorial: () => void;
  resetTutorial: (tutorialId?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const getCompletedTutorials = (): Record<string, boolean> => {
    try {
      const stored = localStorage.getItem('completed_tutorials');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const markCompleted = (id: string) => {
    const completed = getCompletedTutorials();
    completed[id] = true;
    localStorage.setItem('completed_tutorials', JSON.stringify(completed));
    // Also set legacy key so we don't accidentally re-trigger for existing users
    localStorage.setItem('tutorial_completed', 'true');
  };

  const startTutorial = (tutorialId: string) => {
    // Check legacy key to prevent showing tutorials to people who already did the old one
    const legacyCompleted = localStorage.getItem('tutorial_completed');
    const completed = getCompletedTutorials();
    
    if (!completed[tutorialId] && !legacyCompleted) {
        setActiveTutorialId(tutorialId);
        setCurrentStep(0);
        setIsActive(true);
    }
  };

  const completeTutorial = () => {
    if (activeTutorialId) markCompleted(activeTutorialId);
    setIsActive(false);
    setActiveTutorialId(null);
  };

  const skipTutorial = () => {
    if (activeTutorialId) markCompleted(activeTutorialId);
    setIsActive(false);
    setActiveTutorialId(null);
  };

  const resetTutorial = (tutorialId?: string) => {
    if (tutorialId) {
      const completed = getCompletedTutorials();
      delete completed[tutorialId];
      localStorage.setItem('completed_tutorials', JSON.stringify(completed));
      startTutorial(tutorialId);
    } else {
      localStorage.removeItem('completed_tutorials');
      localStorage.removeItem('tutorial_completed');
      setIsActive(false);
      setActiveTutorialId(null);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  return (
    <TutorialContext.Provider value={{ 
      isActive, 
      activeTutorialId,
      currentStep, 
      startTutorial,
      completeTutorial, 
      resetTutorial, 
      nextStep, 
      prevStep,
      skipTutorial
    }}>
      {children}
    </TutorialContext.Provider>
  );
};
