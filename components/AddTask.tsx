import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Task } from '../types';

const AddTask: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addTask } = useData();
  
  // Capture passed planId from navigation state (if coming from PlanDetails)
  const incomingPlanId = location.state?.planId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Reading']);

  const handleAddTag = () => {
      if(tagInput.trim()) {
          setTags([...tags, tagInput.trim()]);
          setTagInput('');
      }
  };

  const handleSubmit = () => {
      if(!title) return;

      addTask({
          id: crypto.randomUUID(),
          title,
          description,
          durationMinutes: minutes,
          dueDate,
          status: 'Not Started',
          tags,
          priority,
          type: 'assignment', // Default for manual entry
          color: 'text-secondary',
          bgColor: 'bg-secondary/10',
          subtitle: description || 'Custom Task',
          planId: incomingPlanId // Associate with plan if available
      });
      navigate(-1); // Go back to previous screen (Dashboard or PlanDetails)
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
       {/* Header */}
       <div className="p-4 flex items-center justify-center sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm z-10">
        <button onClick={() => navigate(-1)} className="absolute left-4 text-text-primary-light dark:text-text-primary-dark"><span className="material-symbols-outlined">arrow_back</span></button>
        <h2 className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">Add New Task</h2>
      </div>

      <div className="flex-1 p-4 space-y-6">
         <div>
             <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Task Title</label>
             <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Read Chapter 5" 
                className="w-full p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark" 
             />
         </div>

         <div>
             <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Description</label>
             <textarea 
                rows={4} 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Summarize key concepts..." 
                className="w-full p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark resize-none"
             ></textarea>
         </div>

         <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Est. Minutes</label>
                <input 
                    type="number" 
                    value={isNaN(minutes) ? '' : minutes}
                    onChange={e => setMinutes(parseInt(e.target.value))}
                    placeholder="60" 
                    className="w-full p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark" 
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Due Date</label>
                <input 
                    type="date" 
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark" 
                />
             </div>
         </div>
         
         <div>
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Priority</label>
             <div className="relative">
                <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                    className="w-full p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark appearance-none"
                >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary-light">expand_more</span>
            </div>
         </div>


         <div>
             <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Tags</label>
             <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark min-h-[60px]">
                 {tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium flex items-center gap-1">
                        {tag} <button onClick={() => setTags(tags.filter(t => t !== tag))}><span className="material-symbols-outlined text-sm">close</span></button>
                    </span>
                 ))}
                 <input 
                    type="text" 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add a tag..." 
                    className="flex-1 bg-transparent outline-none min-w-[100px] text-sm text-text-primary-light dark:text-text-primary-dark" 
                 />
             </div>
         </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm sticky bottom-0">
          <button onClick={() => navigate(-1)} className="py-3.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark font-bold">Cancel</button>
          <button onClick={handleSubmit} className="py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90">Add Task</button>
      </div>
    </div>
  );
};

export default AddTask;