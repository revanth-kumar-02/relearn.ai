import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

const TaskTimer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tasks, plans, updateTask } = useData();
  
  // Get Task ID from navigation state
  const taskId = location.state?.taskId;
  const task = tasks.find(t => t.id === taskId);
  const plan = plans.find(p => p.id === task?.planId);

  // Timer State
  const defaultSeconds = task ? task.durationMinutes * 60 : 25 * 60;
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds); // For progress bar calculation
  const [isActive, setIsActive] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [noteContent, setNoteContent] = useState(task?.notes || '');
  
  // Duration Adjustment State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(task ? task.durationMinutes : 25);

  // Persist notes on unmount or save
  const saveNotes = () => {
      if (task) {
          updateTask(task.id, { notes: noteContent });
      }
  };

  useEffect(() => {
    // Auto-start the timer and update task status on mount
    if (task) {
        if(task.status === 'Not Started') {
            updateTask(task.id, { status: 'In Progress' });
        }
        setIsActive(true); // auto-start
    } else if (!taskId) {
        // If no task ID at all, redirect
        navigate('/dashboard');
    }
  }, [task, taskId, navigate, updateTask]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Auto-complete task on timer finish
      if (task && task.status !== 'Completed') {
          updateTask(task.id, { status: 'Completed' });
          alert("Time's up! Task marked as completed.");
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, task, updateTask]);

  const toggleTimer = () => {
      setIsActive(!isActive);
      if (isPickerOpen) setIsPickerOpen(false);
  };
  
  const finishSession = () => {
      saveNotes();
      setIsActive(false);
      navigate(-1);
  };

  const markComplete = () => {
      if (task) {
          updateTask(task.id, { status: 'Completed' });
          saveNotes();
          navigate(-1);
      }
  };

  const adjustTime = (minutesToAdd: number) => {
      const newSeconds = Math.max(0, timeLeft + (minutesToAdd * 60));
      setTimeLeft(newSeconds);
      // Update totalSeconds so the progress bar doesn't jump wildly, 
      // or keep it to track progress from the original goal. 
      // Usually, it's better to update totalSeconds to the new capacity.
      setTotalSeconds(prev => Math.max(newSeconds, prev));
  };

  const handleSetCustomTime = () => {
      const seconds = customMinutes * 60;
      setTimeLeft(seconds);
      setTotalSeconds(seconds);
      setIsPickerOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 283 : 0;

  if (!task) return <div className="p-8 text-center text-white">Loading task...</div>;

  return (
    <div className="min-h-screen bg-background-dark text-white flex flex-col overflow-hidden">
       {/* Dark mode only screen */}
       <div className="p-4 flex items-center justify-between z-10">
            <button onClick={finishSession} className="h-10 w-10 rounded-full bg-surface-dark flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="font-bold text-lg">Focus Mode</h2>
            <button className="h-10 w-10 rounded-full bg-surface-dark flex items-center justify-center text-gray-400 opacity-50 cursor-not-allowed">
                <span className="material-symbols-outlined">more_vert</span>
            </button>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
            {/* Background Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-20'}`}></div>

            {/* Timer Circle */}
            <div className="relative h-72 w-72 flex items-center justify-center mb-8">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle className="text-gray-800 stroke-current" cx="50" cy="50" r="45" fill="none" strokeWidth="4"></circle>
                    <circle 
                        className="text-primary stroke-current transition-all duration-1000 ease-linear" 
                        cx="50" cy="50" r="45" fill="none" strokeWidth="4"
                        strokeDasharray="283"
                        strokeDashoffset={283 - progress}
                        strokeLinecap="round"
                    ></circle>
                </svg>
                <div 
                    className={`text-center z-10 cursor-pointer group transition-transform active:scale-95`}
                    onClick={() => !isActive && setIsPickerOpen(true)}
                >
                    <div className="relative">
                        <h1 className="text-6xl font-bold tracking-tighter mb-2 font-mono text-white drop-shadow-lg">{formatTime(timeLeft)}</h1>
                        {!isActive && (
                            <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-xl">edit</span>
                            </div>
                        )}
                    </div>
                    <p className="text-primary font-medium uppercase tracking-widest text-xs">
                        {isActive ? 'Focusing' : 'Paused'}
                    </p>
                </div>
            </div>

            {/* Quick Adjust Buttons - Only show when paused */}
            {!isActive && !isPickerOpen && (
                <div className="flex gap-4 mb-8 animate-fade-in">
                    <button 
                        onClick={() => adjustTime(-5)} 
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
                    >
                        -5m
                    </button>
                    <button 
                        onClick={() => adjustTime(5)} 
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
                    >
                        +5m
                    </button>
                </div>
            )}

            <div className="flex gap-8 mb-8">
                <button 
                    onClick={toggleTimer} 
                    className={`h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 ${isActive ? 'bg-amber-500 text-white shadow-amber-900/20' : 'bg-primary text-white shadow-primary/30'}`}
                >
                    <span className="material-symbols-outlined text-4xl">{isActive ? 'pause' : 'play_arrow'}</span>
                </button>
                <button 
                    onClick={markComplete} 
                    className="h-20 w-20 rounded-full bg-gray-800 text-green-400 flex items-center justify-center hover:bg-gray-700 transition-colors border border-gray-700 hover:border-green-500/50"
                    title="Finish & Mark Complete"
                >
                    <span className="material-symbols-outlined text-4xl">check</span>
                </button>
            </div>
       </div>

       {/* Bottom Sheet */}
       <div className={`bg-surface-dark rounded-t-3xl shadow-2xl border-t border-gray-800 transition-all duration-500 ease-in-out ${isNotesOpen ? 'h-[60vh]' : 'h-auto'}`}>
           <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold mb-1 text-white line-clamp-1">{task.title}</h3>
                        <p className="text-sm text-primary">{plan?.title || 'Standalone Task'}</p>
                    </div>
                    <button onClick={() => setIsNotesOpen(!isNotesOpen)} className="text-gray-400 hover:text-white p-2">
                        <span className="material-symbols-outlined">{isNotesOpen ? 'expand_more' : 'expand_less'}</span>
                    </button>
                </div>
                
                <div className="flex bg-gray-900 rounded-lg p-1 mb-4">
                    <button 
                        className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${isNotesOpen ? 'bg-surface-dark text-white shadow' : 'text-gray-400'}`}
                        onClick={() => setIsNotesOpen(true)}
                    >
                        Notes
                    </button>
                    <button className="flex-1 py-2 rounded-md text-gray-500 font-medium text-sm cursor-not-allowed">Resources</button>
                </div>

                <div className={`space-y-3 ${isNotesOpen ? 'block' : 'hidden'}`}>
                    <textarea 
                        className="w-full h-48 bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-300 focus:outline-none focus:border-primary resize-none placeholder-gray-600"
                        placeholder="Type your study notes here..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        onBlur={saveNotes}
                    ></textarea>
                </div>
                
                {!isNotesOpen && (
                     <div className="flex gap-3 items-start p-3 rounded-lg bg-gray-900/50 border border-gray-800" onClick={() => setIsNotesOpen(true)}>
                        <span className="material-symbols-outlined text-gray-500 text-sm mt-1">edit_note</span>
                        <p className="text-sm text-gray-400 truncate">{noteContent || "Tap to add notes for this session..."}</p>
                   </div>
                )}
           </div>
       </div>

       {/* Duration Picker Modal */}
       {isPickerOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
               <div className="w-full max-w-xs bg-surface-dark rounded-3xl p-6 border border-white/10 shadow-2xl animate-scale-in">
                   <h3 className="text-center font-bold text-lg mb-6">Set Duration</h3>
                   
                   <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setCustomMinutes(prev => Math.max(1, prev - 1))}
                                className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10"
                            >
                                <span className="material-symbols-outlined">remove</span>
                            </button>
                            <div className="text-center">
                                <input 
                                    type="number" 
                                    value={isNaN(customMinutes) ? '' : customMinutes}
                                    onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 1)}
                                    className="bg-transparent text-4xl font-mono font-bold w-20 text-center outline-none text-primary"
                                />
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Minutes</p>
                            </div>
                            <button 
                                onClick={() => setCustomMinutes(prev => prev + 1)}
                                className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10"
                            >
                                <span className="material-symbols-outlined">add</span>
                            </button>
                        </div>
                   </div>

                   <div className="flex gap-3">
                        <button 
                            onClick={() => setIsPickerOpen(false)}
                            className="flex-1 py-3 rounded-xl bg-white/5 font-bold text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSetCustomTime}
                            className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm"
                        >
                            Confirm
                        </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default TaskTimer;