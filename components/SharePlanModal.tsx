import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './common/Icon';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { sharePlan } from '../services/shareService';
import { Plan, Task } from '../types';

interface SharePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  tasks: Task[];
}

const SharePlanModal: React.FC<SharePlanModalProps> = ({ isOpen, onClose, plan, tasks }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleShare = async () => {
    if (!user) {
      showToast("You must be logged in to share plans", "error");
      return;
    }

    setIsSharing(true);
    try {
      const slug = await sharePlan(plan, tasks, user.id);
      const url = `${window.location.origin}/#/shared/${slug}`;
      setShareLink(url);
      showToast("Share link generated!", "success");
    } catch (err) {
      showToast("Failed to generate share link", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    showToast("Link copied to clipboard!", "success");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-light dark:bg-surface-dark rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-border-light dark:border-border-dark"
      >
        <div className="p-6 border-b border-border-light dark:border-border-dark flex justify-between items-center">
          <h3 className="font-bold text-xl text-text-primary-light dark:text-text-primary-dark">Share Learning Plan</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">share</span>
            </div>
            <h4 className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">Invite others to learn</h4>
            <p className="text-sm text-text-secondary-light px-4">
              Create a public link for your plan. Anyone with the link can import this structure into their dashboard.
            </p>
          </div>

          {!shareLink ? (
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSharing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Generating Link...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">link</span>
                  <span>Generate Share Link</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-background-light dark:bg-background-dark p-4 rounded-xl border border-border-light dark:border-border-dark break-all text-xs font-mono text-text-primary-light dark:text-text-primary-dark relative group">
                {shareLink}
                <button 
                  onClick={copyToClipboard}
                  className="absolute right-2 top-2 p-1.5 bg-primary/10 text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={copyToClipboard}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copy Link
                </button>
                <button 
                  onClick={() => setShareLink('')}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-text-secondary-light font-bold rounded-xl"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-500">info</span>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
              Only the plan structure (title, tasks, descriptions) will be shared. Your personal progress, notes, and diary entries remain private.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SharePlanModal;
