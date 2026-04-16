import React from 'react';
import Icon from './Icon';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon: string;
  isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  actionLabel, 
  onConfirm, 
  onCancel, 
  icon, 
  isDanger 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-surface-light dark:bg-surface-dark rounded-3xl w-full max-w-sm p-8 shadow-2xl relative z-10 border border-border-light/10 dark:border-border-dark/10"
          >
            <div className={`h-16 w-16 rounded-2xl ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'} flex items-center justify-center mb-6 mx-auto`}>
              <Icon name={icon} className="text-3xl" />
            </div>
            
            <h3 className="font-bold text-xl text-center mb-2 text-text-primary-light dark:text-text-primary-dark">
              {title}
            </h3>
            
            <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark mb-8 leading-relaxed px-2">
              {message}
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={onConfirm} 
                className={`w-full py-4 rounded-2xl text-white font-bold transition-all shadow-lg active:scale-95 ${isDanger ? 'bg-red-500 shadow-red-500/20 hover:bg-red-600' : 'bg-primary shadow-primary/20 hover:opacity-90'}`}
              >
                {actionLabel}
              </button>
              <button 
                onClick={onCancel} 
                className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-white/5 font-bold text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-white/10 transition-colors active:scale-95"
              >
                Keep Everything
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
