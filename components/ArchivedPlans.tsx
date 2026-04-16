import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import Icon from './common/Icon';

const ArchivedPlans: React.FC = () => {
  const navigate = useNavigate();
  const { plans, updatePlan } = useData();
  const { showToast } = useToast();

  const archivedPlans = plans.filter(p => p.isArchived);

  const handleUnarchive = (planId: string, title: string) => {
    updatePlan(planId, { isArchived: false });
    showToast(`"${title}" restored to dashboard`, "success");
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-border-light dark:border-border-dark">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-text-primary-light dark:text-text-primary-dark transition-colors"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">Archived Plans</h1>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {archivedPlans.length > 0 ? (
          archivedPlans.map(plan => (
            <div key={plan.id} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-light dark:border-border-dark flex items-center justify-between animate-fade-in group hover:border-primary/20 transition-all">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark truncate group-hover:text-primary transition-colors">{plan.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-text-secondary-light">{plan.totalDays} total tasks</p>
                    {plan.difficulty && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            plan.difficulty === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            plan.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`} aria-label={`Difficulty: ${plan.difficulty}`}>
                            {plan.difficulty}
                        </span>
                    )}
                </div>
              </div>
              <button 
                onClick={() => handleUnarchive(plan.id, plan.title)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-bold rounded-lg hover:bg-primary/20 transition-colors"
                aria-label={`Restore ${plan.title} to dashboard`}
              >
                <Icon name="unarchive" className="text-base" />
                Restore
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-center opacity-60">
            <Icon name="inventory_2" className="text-5xl mb-4 text-text-secondary-light" />
            <p className="text-text-secondary-light font-semibold text-base">No archived plans</p>
            <p className="text-xs text-text-secondary-light mt-1.5">
              You can archive plans from the Plan Details page.
            </p>
            <button 
                onClick={() => navigate('/dashboard')}
                className="mt-6 text-primary font-bold text-sm hover:underline"
            >
                Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedPlans;