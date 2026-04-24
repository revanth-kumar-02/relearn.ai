import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SHORTCUT_MAP } from '../../hooks/useKeyboardShortcuts';
import Icon from './Icon';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const categories = {
    navigation: { title: 'Navigation', icon: 'explore' },
    actions: { title: 'Actions', icon: 'touch_app' },
    general: { title: 'General', icon: 'info' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[91] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Icon name="keyboard" className="text-primary text-xl" />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-text-secondary-light"
                  aria-label="Close shortcuts modal"
                >
                  <Icon name="close" className="text-xl" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                {Object.entries(categories).map(([key, { title, icon }]) => {
                  const shortcuts = SHORTCUT_MAP.filter(s => s.category === key);
                  if (shortcuts.length === 0) return null;

                  return (
                    <div key={key}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon name={icon} className="text-sm text-text-secondary-light" />
                        <h3 className="text-xs font-bold text-text-secondary-light uppercase tracking-wider">{title}</h3>
                      </div>
                      <div className="space-y-2">
                        {shortcuts.map(shortcut => (
                          <div
                            key={shortcut.key}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
                          >
                            <span className="text-sm text-text-primary-light dark:text-text-primary-dark">{shortcut.description}</span>
                            <kbd className="min-w-[2rem] text-center px-2.5 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-xs font-mono font-bold text-text-secondary-light shadow-sm">
                              {shortcut.label}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50">
                <p className="text-xs text-text-secondary-light text-center">
                  Press <kbd className="px-1.5 py-0.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-[10px] font-mono font-bold mx-0.5">?</kbd> anytime to toggle this panel
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcutsModal;
