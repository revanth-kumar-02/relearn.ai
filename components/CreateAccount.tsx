import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logAuthDiagnostic } from '../utils/authDiagnostics';

const CreateAccount: React.FC = () => {
    const navigate = useNavigate();
    const { signup, loginWithGoogle, user } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check for OAuth errors in the URL
        const parseOAuthError = () => {
            const href = window.location.href;
            let errorMsg = '';
            
            if (href.includes('error=')) {
                const urlParams = new URLSearchParams(href.split('?')[1] || href.split('#')[1] || '');
                const error = urlParams.get('error') || '';
                const description = urlParams.get('error_description') || '';
                
                if (error) {
                    errorMsg = description 
                        ? decodeURIComponent(description).replace(/\+/g, ' ') 
                        : `Authentication failed: ${error}`;
                        
                    logAuthDiagnostic('OAuth Redirect Error parsed on Signup Page', { error, description: errorMsg });
                    
                    // Clean up the URL to remove the error parameters
                    const cleanUrl = window.location.origin + window.location.pathname + '#/signup';
                    window.history.replaceState(null, '', cleanUrl);
                }
            }
            return errorMsg;
        };

        const oauthError = parseOAuthError();
        if (oauthError) {
            setError(oauthError);
        }
    }, []);

    useEffect(() => {
        if (user && user.isVerified) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        const result = await loginWithGoogle();
        if (!result.success) {
            setError(result.message || 'Failed to authenticate with Google.');
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            setError('All fields are required.');
            return;
        }
        if (password.length < 6) {
            setError('Password should be at least 6 characters.');
            return;
        }
        setError('');
        setLoading(true);

        const result = await signup(name, email, password);

        if (result.success) {
            // No redirect - verification modal will appear via App.tsx
        } else {
            setError(result.message || "We couldn't save your changes right now. Let's try that again.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-white dark:bg-background-dark animate-fade-in">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/5">
                        <span className="material-symbols-outlined text-5xl">school</span>
                    </div>
                    <h1 className="text-4xl font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">Create Account</h1>
                    <p className="text-text-secondary-light dark:text-text-secondary-dark font-medium mt-1">Start your personalized learning path</p>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl relative mb-6 text-sm font-medium animate-scale-in" role="alert">{error}</div>}

                <form onSubmit={handleSignup} className="space-y-5">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-light/60 group-focus-within:text-primary transition-colors input-icon">person</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                            required
                        />
                    </div>

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

                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-light/60 group-focus-within:text-primary transition-colors input-icon">lock</span>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password (min. 6 characters)"
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-2 rounded-2xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-[0.98] disabled:opacity-60"
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="flex items-center my-6">
                    <div className="flex-grow border-t border-gray-200 dark:border-border-dark"></div>
                    <span className="mx-4 text-xs font-bold text-text-secondary-light/60 uppercase tracking-widest">or</span>
                    <div className="flex-grow border-t border-gray-200 dark:border-border-dark"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-4 px-6 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-stone-700 text-text-primary-light dark:text-text-primary-dark font-bold text-base transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 shadow-sm"
                >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 0, 0)">
                            <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.28c1.92,-1.78 3.03,-4.4 3.03,-7.4C21.65,11.8 21.55,11.4 21.35,11.1z" fill="#4285F4" />
                            <path d="M12,20.7c2.6,0 4.8,-0.9 6.4,-2.4l-3.28,-2.6c-0.9,0.6 -2.06,1 -3.12,1 -2.4,0 -4.43,-1.6 -5.16,-3.8H3.45v2.7C5.05,18.7 8.35,20.7 12,20.7z" fill="#34A853" />
                            <path d="M6.84,12.9c-0.2,-0.6 -0.3,-1.2 -0.3,-1.9s0.1,-1.3 0.3,-1.9V6.4H3.45C2.85,7.6 2.5,9 2.5,11s0.35,3.4 0.95,4.6L6.84,12.9z" fill="#FBBC05" />
                            <path d="M12,5.3c1.4,0 2.7,0.5 3.7,1.4l2.77,-2.7C16.8,2.5 14.6,1.5 12,1.5c-3.65,0 -6.95,2 -8.55,5.2l3.39,2.7C7.57,6.9 9.6,5.3 12,5.3z" fill="#EA4335" />
                        </g>
                    </svg>
                    Continue with Google
                </button>

                <div className="text-center mt-10">
                    <p className="text-base text-text-secondary-light font-medium">
                        Already have an account? <button onClick={() => navigate('/login')} className="font-bold text-primary hover:underline ml-1">Log In</button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CreateAccount;