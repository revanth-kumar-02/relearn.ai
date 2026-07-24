import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ShortcutEntry {
  key: string;
  label: string;
  description: string;
  category: 'navigation' | 'actions' | 'general';
}

export const SHORTCUT_MAP: ShortcutEntry[] = [
  { key: 'd', label: 'D', description: 'Go to Dashboard', category: 'navigation' },
  { key: 'p', label: 'P', description: 'Go to Progress', category: 'navigation' },
  { key: 'n', label: 'N', description: 'Create New Plan', category: 'navigation' },
  { key: 'l', label: 'L', description: 'Learning Diary', category: 'navigation' },
  { key: 's', label: 'S', description: 'Go to Settings', category: 'navigation' },
  { key: 'Escape', label: 'Esc', description: 'Close modals / Go back', category: 'actions' },
  { key: '?', label: '?', description: 'Show keyboard shortcuts', category: 'general' },
];

/**
 * Global keyboard shortcuts hook.
 * Skips shortcuts when the user is typing in an input/textarea/contenteditable.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  const isAuthPage = ['/', '/signup'].includes(location.pathname);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.tagName === 'SELECT' ||
                    target.isContentEditable;

    // Escape always works (to close things)
    if (e.key === 'Escape') {
      setShowHelp(false);
      return; // Let other Escape handlers (modals) also fire
    }

    // Don't fire navigation shortcuts on auth pages or when typing
    if (isAuthPage || isInput) return;

    // Don't fire if modifier keys are held (Ctrl+S, Cmd+N, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key.toLowerCase()) {
      case 'd':
        e.preventDefault();
        navigate('/dashboard');
        break;
      case 'p':
        e.preventDefault();
        navigate('/progress');
        break;
      case 'n':
        e.preventDefault();
        navigate('/create-plan');
        break;
      case 'l':
        e.preventDefault();
        navigate('/diary');
        break;
      case 's':
        e.preventDefault();
        navigate('/settings');
        break;
      case '?':
        e.preventDefault();
        setShowHelp(prev => !prev);
        break;
    }
  }, [navigate, isAuthPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
