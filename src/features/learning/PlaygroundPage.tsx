import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Terminal, Code2, Cpu, Laptop } from 'lucide-react';
import CodePlaygroundModule from './CodePlaygroundModule';

export const PlaygroundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors shadow-sm"
              title="Go Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Engineering Sandbox
                </span>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Live Execution Engine
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                Relearn.ai Code Playground
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="flex items-center gap-1 bg-white dark:bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800">
              <Cpu size={14} className="text-emerald-500" />
              Isolated Client Runtime
            </span>
          </div>
        </div>

        {/* Feature Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
              <Code2 size={16} className="text-primary" />
              <span>Multi-Language Sandboxes</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Switch freely between JavaScript algorithms, HTML/CSS live rendering, Python logic, and in-memory SQL query tables.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
              <Sparkles size={16} className="text-amber-500" />
              <span>Built-in AI Code Mentor</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              1-click code explanation, automatic bug diagnosis, algorithm optimization, and automated test-case generation.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
              <Terminal size={16} className="text-emerald-500" />
              <span>Zero-Setup Client Execution</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Zero backend compilation delay. Real-time console logs, execution benchmarks, and sandboxed DOM preview.
            </p>
          </div>
        </div>

        {/* The Core Playground */}
        <div className="w-full">
          <CodePlaygroundModule
            topic="Free Practice"
            title="General Engineering Sandbox"
            initialLanguage="javascript"
          />
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPage;
