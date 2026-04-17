import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';

const CreateAccount: React.FC = () => {
    const navigate = useNavigate();
    const { signup } = useAuth();
    const { startTutorial } = useTutorial();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
                <div className="text-center mb-10">
                    <span className="material-symbols-outlined text-6xl text-primary mb-2">school</span>
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

                <div className="text-center mt-10">
                    <p className="text-base text-text-secondary-light font-medium">
                        Already have an account? <button onClick={() => navigate('/')} className="font-bold text-primary hover:underline ml-1">Log In</button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CreateAccount;