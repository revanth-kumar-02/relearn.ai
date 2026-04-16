import React, { createContext, useContext, useState, useEffect } from 'react';

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  startTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
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
  const [currentStep, setCurrentStep] = useState(0);

  // Removed automatic check on mount. 
  // Tutorial should now be triggered explicitly by calling startTutorial()

  const startTutorial = () => {
    const isCompleted = localStorage.getItem('tutorial_completed');
    if (!isCompleted) {
        setCurrentStep(0);
        setIsActive(true);
    }
  };

  const completeTutorial = () => {
    setIsActive(false);
    localStorage.setItem('tutorial_completed', 'true');
  };

  const skipTutorial = () => {
    setIsActive(false);
    localStorage.setItem('tutorial_completed', 'true');
  };

  const resetTutorial = () => {
    localStorage.removeItem('tutorial_completed');
    setCurrentStep(0);
    setIsActive(true);
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
