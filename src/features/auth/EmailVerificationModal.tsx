import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Icon from '../../components/ui/Icon';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../../utils/haptics';

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

  const handleOpenInbox = () => {
    if (!user?.email) return;
    triggerHaptic('light');
    
    const domain = user.email.split('@')[1]?.toLowerCase() || '';
    let url = 'https://mail.google.com'; // Default
    
    if (domain.includes('gmail')) {
      url = 'https://mail.google.com';
    } else if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') || domain.includes('msn')) {
      url = 'https://outlook.live.com';
    } else if (domain.includes('yahoo')) {
      url = 'https://mail.yahoo.com';
    } else if (domain.includes('icloud')) {
      url = 'https://www.icloud.com/mail';
    } else if (domain.includes('proton')) {
      url = 'https://mail.proton.me';
    } else if (domain.includes('zohomail') || domain.includes('zoho')) {
      url = 'https://mail.zoho.com';
    } else {
      url = `https://${domain}`;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
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
              onClick={handleOpenInbox}
              className="w-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-text-secondary-light dark:text-text-secondary-dark font-medium py-4 rounded-2xl flex items-center justify-center gap-2.5 border border-gray-100 dark:border-white/5 shadow-inner transition-colors active:scale-95"
            >
              <Icon name="outgoing_mail" className="text-primary" />
              Check your email for the link
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
