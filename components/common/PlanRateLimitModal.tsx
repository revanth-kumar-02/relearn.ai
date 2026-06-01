import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { triggerHaptic } from '../../utils/haptics';

interface PlanRateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  cooldownText: string | null;
}

const PlanRateLimitModal: React.FC<PlanRateLimitModalProps> = ({ isOpen, onClose, cooldownText }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 animate-scale-in">
        {/* Animated Gradient Header */}
        <div className="relative h-36 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <Icon name="hourglass_empty" className="text-9xl -rotate-12 absolute -right-6 -top-2 text-white animate-pulse" />
            <Icon name="lock" className="text-8xl rotate-12 absolute -left-8 -bottom-4 text-white" />
          </div>
          <div className="relative z-10 bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 shadow-lg">
            <Icon name="history_toggle_off" className="text-4xl text-white" />
          </div>
        </div>

        <div className="p-8 text-center">
          <h3 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-2">AI Generation Quota Limit</h3>
          
          {/* Remaining Cooldown badge */}
          {cooldownText && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold mb-4 border border-purple-500/20">
              <Icon name="schedule" className="text-sm" />
              <span>{cooldownText}</span>
            </div>
          )}

          <p className="text-sm text-text-secondary-light dark:text-gray-400 mb-8 leading-relaxed">
            To maintain premium speed and content quality, AI generation is limited to <span className="font-semibold text-text-primary-light dark:text-white">3 plans per 48 hours</span>.
            <br />
            <span className="text-xs text-text-secondary-light/80 block mt-2">
              Tip: Importing shared plans does not consume your quota!
            </span>
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                onClose();
                navigate('/dashboard');
              }}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="dashboard" /> Go to Dashboard
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
                triggerHaptic('light');
                onClose();
              }}
              className="w-full py-3 text-sm font-bold text-text-secondary-light hover:text-text-primary-light transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanRateLimitModal;
