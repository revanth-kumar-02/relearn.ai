import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/appConstants';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth();

  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
    } catch {
      // localStorage may fail in restricted privacy modes
    }
    if (user?.preferences?.theme) {
      const userTheme = user.preferences.theme as Theme;
      if (['light', 'dark', 'system'].includes(userTheme)) {
        return userTheme;
      }
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Sync theme when user logs in or user.preferences.theme updates
  useEffect(() => {
    if (user?.preferences?.theme) {
      const userTheme = user.preferences.theme as Theme;
      if (['light', 'dark', 'system'].includes(userTheme)) {
        const stored = localStorage.getItem(STORAGE_KEYS.THEME);
        if (!stored) {
          setThemeState(userTheme);
        }
      }
    }
  }, [user?.preferences?.theme]);

  // Apply theme class to document root element
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      
      const currentResolved = isDark ? 'dark' : 'light';
      setResolvedTheme(currentResolved);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // Ignore write errors if localStorage is restricted
    }

    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      } catch {
        // Ignore write errors
      }

      if (user && user.preferences?.theme !== newTheme) {
        updateProfile({
          preferences: {
            ...user.preferences,
            theme: newTheme,
          },
        }).catch((err) => {
          console.error('[ThemeContext] Failed to save theme preference to profile:', err);
        });
      }
    },
    [user, updateProfile]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
