import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { Plan } from '../../types/index';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { triggerHaptic } from '../../utils/haptics';

interface ActivePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan: Plan;
}

const ActivePlanModal: React.FC<ActivePlanModalProps> = ({ isOpen, onClose, activePlan }) => {
  const navigate = useNavigate();
  const { updatePlan } = useData();
  const { showToast } = useToast();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 animate-scale-in">
        <div className="relative h-32 bg-primary flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <Icon name="auto_awesome" className="text-9xl -rotate-12 absolute -right-4 -top-4 text-white" />
            <Icon name="rocket_launch" className="text-8xl rotate-12 absolute -left-8 -bottom-4 text-white" />
          </div>
          <div className="relative z-10 bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30">
            <Icon name="psychology" className="text-4xl text-white" />
          </div>
        </div>

        <div className="p-8 text-center">
          <h3 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">Active Learning Journey Found</h3>
          <p className="text-sm text-text-secondary-light mb-8 leading-relaxed">
            You're currently focused on <span className="text-primary font-bold">"{activePlan.title}"</span>. 
            Complete or archive it before starting another journey to stay focused.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                onClose();
                navigate('/plan-details', { state: { planId: activePlan.id } });
              }}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="play_circle" /> Continue Current Plan
            </button>

            <button
              onClick={() => {
                onClose();
                navigate('/progress');
              }}
              className="w-full py-4 bg-gray-50 dark:bg-stone-800 text-text-primary-light dark:text-text-primary-dark font-bold rounded-2xl hover:bg-gray-100 dark:hover:bg-stone-700 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="query_stats" /> View Progress
            </button>

            <button
              onClick={() => {
                updatePlan(activePlan.id, { status: 'archived', isArchived: true });
                onClose();
                showToast("Current plan archived. You can now create a new one!", "success");
                triggerHaptic('success');
              }}
              className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-stone-700 text-text-secondary-light hover:text-primary hover:border-primary/50 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Icon name="archive" /> Archive & Start New
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 text-sm font-bold text-text-secondary-light hover:text-text-primary-light transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivePlanModal;
