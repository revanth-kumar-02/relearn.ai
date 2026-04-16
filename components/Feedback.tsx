import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Feedback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Initialize with user data if available, but allow editing
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [feedback, setFeedback] = useState('');

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim() || !email.trim() || !feedback.trim()) {
      setErrorMessage("Please fill in all fields.");
      setStatus('error');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch("/api/feedback/f/xkoqwlew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          message: feedback
        })
      });

      if (response.ok) {
        setStatus('success');
        setFeedback('');
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        const data = await response.json();
        if (data.errors) {
          setErrorMessage(data.errors.map((err: any) => err.message).join(", "));
        } else {
          setErrorMessage("Oops! There was a problem submitting your feedback.");
        }
        setStatus('error');
      }
    } catch (error) {
      setErrorMessage("Oops! There was a problem submitting your feedback.");
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 flex items-center border-b border-border-light dark:border-border-dark">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-text-primary-light dark:text-text-primary-dark">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10 text-text-primary-light dark:text-text-primary-dark">Send Feedback</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1"
      >
        <div className="flex-1 p-6 max-w-lg mx-auto w-full space-y-6">
          <div className="bg-primary/10 rounded-xl p-4 flex items-start gap-4">
            <span className="material-symbols-outlined text-primary text-3xl">mail</span>
            <div>
              <h2 className="font-bold text-primary text-lg">We value your opinion</h2>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                Let us know what you think. Your feedback helps us improve the learning experience for everyone.
              </p>
            </div>
          </div>

          {status === 'success' && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
              <span className="material-symbols-outlined">check_circle</span>
              <p className="font-medium">Thank you for your feedback! Your input helps improve ReLearn.ai.</p>
            </div>
          )}

          {status === 'error' && errorMessage && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
              <span className="material-symbols-outlined">error</span>
              <p className="font-medium">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">Your Feedback</label>
              <textarea
                name="message"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you like or how we can improve..."
                className="w-full h-48 p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/50 text-text-primary-light dark:text-text-primary-dark resize-none"
                required
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-4 bg-background-light dark:bg-background-dark border-t border-border-light dark:border-border-dark sticky bottom-0">
          <button
            type="submit"
            disabled={status === 'submitting' || !feedback.trim() || !name.trim() || !email.trim()}
            className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            {status === 'submitting' ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span> Sending...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">send</span> Send Feedback
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Feedback;