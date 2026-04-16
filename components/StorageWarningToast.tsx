import React, { useState, useEffect, useCallback } from 'react';

/**
 * Listens for `relearn:storage-error` events dispatched by dataService
 * when localStorage is full, and shows a dismissible warning toast
 * so the user is aware their data may not be saved.
 */
const StorageWarningToast: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const handleStorageError = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setMessage(detail?.message || 'Storage is full. Some data may not be saved.');
    setVisible(true);

    // Auto-dismiss after 8 seconds
    setTimeout(() => setVisible(false), 8000);
  }, []);

  useEffect(() => {
    window.addEventListener('relearn:storage-error', handleStorageError);
    return () => window.removeEventListener('relearn:storage-error', handleStorageError);
  }, [handleStorageError]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[95vw] sm:w-[500px] animate-slide-up"
    >
      <div className="bg-amber-50 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 shadow-2xl shadow-amber-500/10 flex items-start gap-3 backdrop-blur-sm">
        <span className="material-symbols-outlined text-amber-500 text-xl shrink-0 mt-0.5">
          warning
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
            Storage Warning
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 shrink-0 p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          aria-label="Dismiss warning"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
};

export default StorageWarningToast;
