import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, forgotPassword, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  useEffect(() => {
    if (user && user.isVerified) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.message || "We couldn't match that email and password.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await forgotPassword(recoveryEmail);
    if (result.success) {
      setSuccess('Reset link sent! Please check your email.');
      setTimeout(() => setIsRecovering(false), 3000);
    } else {
      setError(result.message || 'Failed to send reset link.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-white dark:bg-background-dark animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="material-symbols-outlined text-6xl text-primary mb-2">school</span>
          <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">Welcome Back!</h1>
          <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium mt-1">Continue your learning journey</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl relative mb-6 text-sm font-medium animate-scale-in" role="alert">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-light/60 group-focus-within:text-primary transition-colors input-icon">mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-light/60 group-focus-within:text-primary transition-colors input-icon">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-2xl py-4 pl-12 pr-14 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-secondary-light/60 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            <div className="flex justify-end px-1">
              <button 
                type="button" 
                onClick={() => setIsRecovering(true)}
                className="text-xs font-bold text-primary hover:underline transition-all"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 rounded-2xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div className="text-center mt-10">
          <p className="text-base text-text-secondary-light font-medium">
            Don't have an account? <button onClick={() => navigate('/signup')} className="font-bold text-primary hover:underline ml-1">Sign Up</button>
          </p>
        </div>
      </div>

      {/* Recovery Modal */}
      {isRecovering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-scale-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">lock_reset</span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">Reset Password</h2>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2 font-medium">Enter your email and we'll send you a link to get back into your account.</p>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-4">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold mb-4">{success}</div>}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-light/60 group-focus-within:text-primary transition-colors">mail</span>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full bg-gray-50 dark:bg-stone-900 border-none rounded-2xl py-4 pl-12 pr-4 outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all text-sm font-medium"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setIsRecovering(false); setError(''); setSuccess(''); }}
                className="w-full py-3 text-sm font-bold text-text-secondary-light hover:text-text-primary-light transition-colors"
              >
                Go Back
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;