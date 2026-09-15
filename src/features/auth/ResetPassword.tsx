import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logAuthDiagnostic } from '../../utils/authDiagnostics';
import Icon from '../../components/ui/Icon';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { resetPasswordWithToken, clearRecoveryState, isPasswordRecovery, user } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If a normal verified user is already logged in and not in recovery, redirect to dashboard
  useEffect(() => {
    if (user && !isPasswordRecovery) {
      navigate('/dashboard');
    }
  }, [user, isPasswordRecovery, navigate]);

  // Check for error parameters in the URL (e.g., token expired/invalid from Supabase redirect)
  useEffect(() => {
    const href = window.location.href;
    if (href.includes('error=')) {
      const rawParams = href.split('?')[1] || href.split('#')[1] || '';
      const cleanParams = rawParams.split('#')[0];
      const urlParams = new URLSearchParams(cleanParams);
      const errorParam = urlParams.get('error') || '';
      const descParam = urlParams.get('error_description') || '';
      if (errorParam || descParam) {
        const errorMsg = descParam
          ? decodeURIComponent(descParam).replace(/\+/g, ' ')
          : `Recovery error: ${errorParam}`;
        logAuthDiagnostic('Reset Password URL error detected', { errorParam, errorMsg });
        setError(errorMsg);
      }
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || loading) return;

    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const result = await resetPasswordWithToken(password);

      if (result.success) {
        setSuccess(true);
        // Clear recovery flags
        await clearRecoveryState();
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      } else {
        setError(result.message || 'Failed to update password. Your reset link may have expired.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while resetting your password.');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = async () => {
    await clearRecoveryState();
    navigate('/login');
  };

  // State 1: Success screen
  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-white dark:bg-background-dark animate-fade-in">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-[1.5rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10 animate-scale-in">
            <Icon name="check_circle" className="text-5xl" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">
            Password Reset Complete!
          </h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium mt-2 leading-relaxed">
            Your password has been updated securely. You can now log in with your new credentials.
          </p>
          <div className="mt-8">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-[0.98]"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 2: No active recovery session & not in recovery mode
  if (!isPasswordRecovery && !error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-white dark:bg-background-dark animate-fade-in">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-[1.5rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
            <Icon name="lock_clock" className="text-5xl" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">
            Reset Link Expired or Invalid
          </h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium mt-2 leading-relaxed text-sm">
            For your security, password reset links are single-use and expire after a short period. Please request a new link.
          </p>
          <div className="mt-8 space-y-3">
            <button
              onClick={handleBackToLogin}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-[0.98]"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Active recovery session - Render reset password form
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-white dark:bg-background-dark animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/5">
            <Icon name="lock_reset" className="text-5xl" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">
            Create New Password
          </h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium mt-1 text-sm">
            Please enter and confirm your new password below.
          </p>
        </div>

        {error && (
          <div
            className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl relative mb-6 text-sm font-medium animate-scale-in"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark px-1 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-light/60 group-focus-within:text-primary transition-colors input-icon">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min. 6 characters)"
                className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-2xl py-4 pl-12 pr-14 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-secondary-light/60 hover:text-primary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-2xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark px-1 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-light/60 group-focus-within:text-primary transition-colors input-icon">
                lock_clock
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-2xl py-4 pl-12 pr-14 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-secondary-light/60 hover:text-primary transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-2xl">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="text-sm font-bold text-text-secondary-light hover:text-primary transition-colors"
          >
            Cancel & Return to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
