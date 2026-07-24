import React, { useState, useEffect } from 'react';

interface StudyTimerProps {
  initialMinutes?: number;
  onComplete?: () => void;
  onStop: () => void;
}

const StudyTimer: React.FC<StudyTimerProps> = ({ initialMinutes = 25, onComplete, onStop }) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(true); // Auto-start
  const totalSeconds = initialMinutes * 60;

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (onComplete) onComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete]);

  const toggleTimer = () => setIsActive(!isActive);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 283 : 0;

  return (
    <div className="flex flex-col items-center py-6 bg-background-light dark:bg-background-dark/50 rounded-xl border border-dashed border-border-light dark:border-border-dark animate-fade-in">
      <div className="relative h-40 w-40 flex items-center justify-center mb-6">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            className="text-gray-200 dark:text-gray-700 stroke-current"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="4"
          ></circle>
          <circle
            className="text-primary stroke-current transition-all duration-1000 ease-linear"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="4"
            strokeDasharray="283"
            strokeDashoffset={283 - progress}
            strokeLinecap="round"
          ></circle>
        </svg>
        <div className="text-center z-10">
          <h1 className="text-3xl font-bold tracking-tighter mb-0 font-mono text-text-primary-light dark:text-text-primary-dark">
            {formatTime(timeLeft)}
          </h1>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-wider">
            {isActive ? 'Focus' : 'Paused'}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={toggleTimer}
          className="h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-95"
        >
          <span className="material-symbols-outlined text-2xl">
            {isActive ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button
          onClick={onStop}
          className="h-14 w-14 rounded-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-secondary-light flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-2xl">stop</span>
        </button>
      </div>
    </div>
  );
};

export default StudyTimer;
