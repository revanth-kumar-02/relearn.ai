import React from 'react';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import Icon from '../ui/Icon';

interface ThemeToggleProps {
  variant?: 'icon' | 'segmented' | 'full';
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  className = '',
  showLabels = false,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'segmented' || variant === 'full') {
    const options: { value: Theme; label: string; icon: string }[] = [
      { value: 'light', label: 'Light', icon: 'light_mode' },
      { value: 'dark', label: 'Dark', icon: 'dark_mode' },
      { value: 'system', label: 'System', icon: 'hdr_auto' },
    ];

    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-border-light dark:border-border-dark ${className}`}
        role="radiogroup"
        aria-label="Select Theme Mode"
      >
        {options.map((opt) => {
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`${opt.label} Theme`}
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white dark:bg-surface-dark text-primary dark:text-primary-dark shadow-sm border border-border-light/50 dark:border-border-dark/50'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
              }`}
            >
              <Icon name={opt.icon} className="text-sm" />
              {(showLabels || variant === 'full') && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // Default 'icon' variant toggle
  const isDark = resolvedTheme === 'dark';
  const labelText = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={labelText}
      aria-label={labelText}
      className={`p-2.5 rounded-xl text-text-secondary-light dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary hover:bg-stone-100 dark:hover:bg-white/5 border border-transparent hover:border-border-light dark:hover:border-border-dark transition-all active:scale-95 flex items-center justify-center ${className}`}
    >
      <Icon
        name={isDark ? 'light_mode' : 'dark_mode'}
        className="text-xl transition-transform duration-300 transform group-hover:rotate-45"
      />
      {showLabels && (
        <span className="ml-2 text-xs font-semibold">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
