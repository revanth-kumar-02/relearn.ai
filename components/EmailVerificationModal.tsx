import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Icon from './common/Icon';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

const EmailVerificationModal: React.FC = () => {
  const { user, checkVerification, resendVerification, logout } = useAuth();
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user || user.isVerified) return null;

  const handleCheck = async () => {
    setChecking(true);
    triggerHaptic('medium');
    const isVerified = await checkVerification();
    setChecking(false);
    
    if (isVerified) {
      showToast('Email verified successfully!', 'success');
    } else {
      showToast('Email not yet verified. Please check your inbox.', 'warning');
    }
  };

  const handleResend = async () => {
    setResending(true);
    triggerHaptic('light');
    const { success, message } = await resendVerification();
    setResending(false);
    
    if (success) {
      showToast('Verification email resent!', 'success');
    } else {
      showToast(message || 'Failed to resend email', 'error');
    }
  };

  const openMailApp = () => {
    triggerHaptic('light');
    window.open('mailto:', '_blank');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl p-8 shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Icon name="mark_email_unread" className="text-4xl" />
          </div>

          <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-3">
            Verify your email to continue
          </h2>
          
          <p className="text-text-secondary-light dark:text-text-secondary-dark mb-8">
            We’ve sent a verification link to <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">{user.email}</span>. Please check your inbox.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checking ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon name="verified" />
              )}
              I have verified
            </button>

            <button
              onClick={openMailApp}
              className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-primary-light dark:text-text-primary-dark font-semibold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Icon name="mail_outline" />
              Open Mail App
            </button>

            <div className="flex gap-4 pt-2">
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex-1 text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                {resending ? 'Resending...' : 'Resend Email'}
              </button>
              
              <button
                onClick={logout}
                className="flex-1 text-sm font-medium text-red-500 hover:underline"
              >
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmailVerificationModal;
