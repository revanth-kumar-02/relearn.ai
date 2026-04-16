import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Task } from '../types';

const EditTask: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tasks, plans, updateTask, deleteTask } = useData();
  
  const taskId = location.state?.taskId;
  const currentTask = tasks.find(t => t.id === taskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<string>('Not Started');
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
      if (currentTask) {
          setTitle(currentTask.title);
          setDescription(currentTask.description || '');
          setDurationMinutes(currentTask.durationMinutes);
          setDueDate(currentTask.dueDate);
          setStatus(currentTask.status);
          setPlanId(currentTask.planId);
          setPriority(currentTask.priority || 'Medium');
      } else {
          // If accessing directly without state or invalid ID, redirect
          // But allow render if just loading (though data context is sync usually)
          if (taskId) {
              // navigate('/dashboard'); 
          }
      }
  }, [currentTask, taskId]);

  const handleSave = () => {
      if (currentTask) {
          updateTask(currentTask.id, {
              title,
              description,
              durationMinutes,
              dueDate,
              status: status as 'Not Started' | 'In Progress' | 'Completed',
              planId: planId || undefined,
              priority,
              // Update subtitle for dashboard if description changed
              subtitle: description 
          });
          navigate(-1);
      }
  };

  const handleDelete = () => {
      if (currentTask) {
          setShowDeleteConfirm(true);
      }
  };

  const confirmDelete = () => {
      deleteTask(currentTask!.id);
      navigate(-1);
  };

  if (!currentTask) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
             <div className="text-center">
                 <p className="text-text-primary-light dark:text-text-primary-dark font-bold">It looks like this task wandered off.</p>
                 <button onClick={() => navigate('/dashboard')} className="mt-4 text-primary font-bold">Go to Dashboard</button>
             </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
       <div className="p-4 flex items-center justify-center sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm z-10 border-b border-border-light dark:border-border-dark">
        <button onClick={() => navigate(-1)} className="absolute left-4 text-text-primary-light dark:text-text-primary-dark"><span className="material-symbols-outlined">arrow_back</span></button>
        <h2 className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">Edit Task</h2>
      </div>

      <div className="flex-1 p-4 space-y-6">
         <div>
             <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Task Title</label>
             <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark" 
             />
         </div>

         <div>
             <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Description</label>
             <textarea 
                rows={4} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark resize-none"
             ></textarea>
         </div>

         <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Estimated Minutes</label>
                <input 
                    type="number" 
                    value={isNaN(durationMinutes) ? '' : durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                    className="w-full p-3 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark" 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Due Date</label>
                <input 
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-3 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark" 
                />
             </div>
         </div>
         
         <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Status</label>
                <div className="relative">
                    <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full p-3 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark appearance-none"
                    >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary-light">expand_more</span>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">Priority</label>
                <div className="relative">
                    <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Task['priority'])}
                        className="w-full p-3 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark appearance-none"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary-light">expand_more</span>
                </div>
            </div>
         </div>
      </div>

      <div className="p-4 bg-background-light dark:bg-background-dark border-t border-border-light dark:border-border-dark sticky bottom-0">
          <button onClick={handleSave} className="w-full py-3.5 mb-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">Save Changes</button>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate(-1)} className="py-3.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark font-bold">Cancel</button>
            <button onClick={handleDelete} className="py-3.5 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold">Delete Task</button>
          </div>
      </div>
      {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-surface-light dark:bg-surface-dark rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in border border-border-light dark:border-border-dark">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mb-4 mx-auto">
                      <span className="material-symbols-outlined text-2xl">delete</span>
                  </div>
                  <h3 className="font-bold text-lg text-center mb-2 text-text-primary-light dark:text-text-primary-dark">Delete Task?</h3>
                  <p className="text-center text-sm text-text-secondary-light mb-6">This will permanently remove this task. This action cannot be undone.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-text-primary-light dark:text-text-primary-dark">Cancel</button>
                      <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold">Delete</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default EditTask;