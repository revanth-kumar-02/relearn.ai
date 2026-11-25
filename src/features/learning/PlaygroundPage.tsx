import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Terminal, Keyboard } from 'lucide-react';
import CodePlaygroundModule from './CodePlaygroundModule';
import { triggerHaptic } from '../../utils/haptics';
import ComingSoonOverlay from '../../components/common/ComingSoonOverlay';

export const PlaygroundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none select-none min-h-screen py-4 px-3 sm:px-6 max-w-7xl mx-auto flex flex-col space-y-4">
      {/* Sleek, Minimal Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-stone-200 dark:border-stone-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHaptic('light');
              navigate(-1);
            }}
            className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors shadow-sm"
            title="Go Back"
            aria-label="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black tracking-tight text-stone-900 dark:text-stone-100">
              Code Playground
            </h1>
            <span className="text-stone-300 dark:text-stone-700">/</span>
            <span className="text-xs font-mono text-stone-500">
              Interactive Execution
            </span>
          </div>
        </div>

        {/* Runtime & Keyboard Shortcut Indicators */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] font-mono text-stone-500">
            <Keyboard size={13} className="text-stone-400" />
            <span><kbd className="font-semibold text-stone-700 dark:text-stone-300">Ctrl</kbd> + <kbd className="font-semibold text-stone-700 dark:text-stone-300">Enter</kbd> to run</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Runtime Active</span>
          </div>
        </div>
      </header>

      {/* Main Full-Width Coding Canvas */}
      <main className="flex-1 w-full">
        <CodePlaygroundModule
          topic="Interactive Sandbox"
          title="Engineering Editor"
          initialLanguage="javascript"
        />
      </main>
    </div>
      <ComingSoonOverlay feature="playground" />
    </>
  );
};

export default PlaygroundPage;
