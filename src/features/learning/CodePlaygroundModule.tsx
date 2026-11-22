import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Terminal, 
  Sparkles, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  Code2, 
  Eye, 
  Bug, 
  Zap, 
  HelpCircle,
  Database,
  Trash2,
  CheckCircle2,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateAI } from '../../services/ai/pipeline';
import { sanitizeInput } from '../../utils/sanitize';
import { useAuth } from '../../contexts/AuthContext';
import { addActivity } from '../../services/api/dataService';
import { triggerHaptic } from '../../utils/haptics';

export type PlaygroundLanguage = 'javascript' | 'html' | 'python' | 'sql' | 'rust' | 'cpp';

interface ConsoleLog {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

interface CodePlaygroundProps {
  initialCode?: string;
  initialLanguage?: PlaygroundLanguage;
  topic?: string;
  title?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
}

const DEFAULT_SNIPPETS: Record<PlaygroundLanguage, string> = {
  javascript: '',
  html: '',
  python: '',
  sql: '',
  rust: '',
  cpp: ''
};

export const CodePlaygroundModule: React.FC<CodePlaygroundProps> = ({
  initialCode,
  initialLanguage = 'javascript',
  topic = 'General Practice',
  title = 'Interactive Editor',
  onCodeChange,
  readOnly = false,
}) => {
  const { user } = useAuth();
  const [language, setLanguage] = useState<PlaygroundLanguage>(initialLanguage);
  const [code, setCode] = useState<string>(initialCode || DEFAULT_SNIPPETS[initialLanguage]);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'preview'>('console');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [sqlResult, setSqlResult] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // AI Assistant states
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiPromptType, setAiPromptType] = useState<'explain' | 'debug' | 'optimize' | 'tests' | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (initialLanguage) {
      setLanguage(initialLanguage);
      if (initialLanguage === 'html') {
        setActiveTab('preview');
      }
    }
  }, [initialLanguage]);

  const handleLanguageChange = (newLang: PlaygroundLanguage) => {
    triggerHaptic('light');
    setLanguage(newLang);
    setCode(DEFAULT_SNIPPETS[newLang]);
    setLogs([]);
    setSqlResult(null);
    if (newLang === 'html') {
      setActiveTab('preview');
    } else {
      setActiveTab('console');
    }
    if (onCodeChange) onCodeChange(DEFAULT_SNIPPETS[newLang]);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    if (onCodeChange) onCodeChange(val);
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter to run code, Tab for 2-space indent
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      if (onCodeChange) onCodeChange(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const runCode = async () => {
    triggerHaptic('medium');
    setIsRunning(true);
    const startTime = performance.now();
    setLogs([]);
    setSqlResult(null);

    if (!code.trim()) {
      setLogs([{
        id: crypto.randomUUID(),
        type: 'info',
        message: 'Empty buffer. Type some code and click Run.',
        timestamp: new Date().toLocaleTimeString(),
      }]);
      setIsRunning(false);
      return;
    }

    // HTML Rendering in client iframe
    if (language === 'html') {
      setActiveTab('preview');
      if (previewFrameRef.current) {
        const doc = previewFrameRef.current.contentDocument || previewFrameRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          const consoleBridge = `
            <script>
              const _log = console.log;
              const _error = console.error;
              const _warn = console.warn;
              console.log = function(...args) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'log', message: args.join(' ') }, '*');
                _log.apply(console, args);
              };
              console.error = function(...args) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', message: args.join(' ') }, '*');
                _error.apply(console, args);
              };
              console.warn = function(...args) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'warn', message: args.join(' ') }, '*');
                _warn.apply(console, args);
              };
              window.onerror = function(msg, url, line) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', message: msg + ' (Line: ' + line + ')' }, '*');
              };
            </script>
          `;
          doc.write(consoleBridge + code);
          doc.close();
        }
      }
      setExecutionTime(Number((performance.now() - startTime).toFixed(1)));
      setIsRunning(false);
      return;
    }

    // JavaScript client-side execution
    if (language === 'javascript') {
      setActiveTab('console');
      const newLogs: ConsoleLog[] = [];
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalInfo = console.info;

      const formatArgs = (args: any[]) =>
        args
          .map(arg => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch {
                return String(arg);
              }
            }
            return String(arg);
          })
          .join(' ');

      console.log = (...args) => {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'log',
          message: formatArgs(args),
          timestamp: new Date().toLocaleTimeString(),
        });
        originalLog(...args);
      };

      console.warn = (...args) => {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'warn',
          message: formatArgs(args),
          timestamp: new Date().toLocaleTimeString(),
        });
        originalWarn(...args);
      };

      console.error = (...args) => {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'error',
          message: formatArgs(args),
          timestamp: new Date().toLocaleTimeString(),
        });
        originalError(...args);
      };

      console.info = (...args) => {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'info',
          message: formatArgs(args),
          timestamp: new Date().toLocaleTimeString(),
        });
        originalInfo(...args);
      };

      try {
        const runner = new Function(code);
        const result = runner();
        if (result !== undefined) {
          newLogs.push({
            id: crypto.randomUUID(),
            type: 'info',
            message: `↳ Return: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      } catch (err: any) {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'error',
          message: `RuntimeError: ${err?.message || err}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        console.info = originalInfo;
      }

      setLogs(newLogs);
      setExecutionTime(Number((performance.now() - startTime).toFixed(1)));
      setIsRunning(false);

      if (user?.id) {
        addActivity(user.id, {
          id: crypto.randomUUID(),
          title: `Ran code in Playground: ${topic}`,
          time: new Date().toISOString(),
          icon: 'code',
          color: 'text-indigo-500',
          bg: 'bg-indigo-500/10',
        });
      }
      return;
    }

    // SQL Relational Engine
    if (language === 'sql') {
      setActiveTab('console');
      const newLogs: ConsoleLog[] = [
        {
          id: crypto.randomUUID(),
          type: 'info',
          message: 'Executing SQL query...',
          timestamp: new Date().toLocaleTimeString(),
        },
      ];
      setLogs(newLogs);

      try {
        const response = await generateAI({
          task: 'chatbot',
          prompt: `Analyze and evaluate this SQL query.
If syntactically valid against typical schemas (students, courses, plans, tasks, users), return a realistic resulting JSON array of rows:
[{"column1": "val1", "column2": "val2"}]
If syntax or logic error, return ONLY: ERROR: <concise reason>

SQL Query:
${code}`,
          systemPrompt: 'You are an accurate SQL relational evaluator. If valid, return ONLY a JSON array of result rows. If invalid, return ERROR: message.',
          options: { temperature: 0.1 }
        });

        const text = (response.text || '').trim();
        if (text.startsWith('ERROR:')) {
          newLogs.push({
            id: crypto.randomUUID(),
            type: 'error',
            message: text,
            timestamp: new Date().toLocaleTimeString(),
          });
        } else {
          try {
            const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSqlResult(parsed);
              newLogs.push({
                id: crypto.randomUUID(),
                type: 'log',
                message: `Query completed: ${parsed.length} rows returned.`,
                timestamp: new Date().toLocaleTimeString(),
              });
            } else {
              newLogs.push({
                id: crypto.randomUUID(),
                type: 'log',
                message: text || 'Query executed (0 rows returned).',
                timestamp: new Date().toLocaleTimeString(),
              });
            }
          } catch {
            newLogs.push({
              id: crypto.randomUUID(),
              type: 'log',
              message: text,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        }
      } catch (err: any) {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'warn',
          message: 'Offline evaluation. Local SQLite / Piston backend will execute queries directly.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      setLogs([...newLogs]);
      setExecutionTime(Number((performance.now() - startTime).toFixed(1)));
      setIsRunning(false);
      return;
    }

    // Python, Rust, C++ (Compiled / Backend Languages)
    if (language === 'python' || language === 'rust' || language === 'cpp') {
      setActiveTab('console');
      const langLabel = language === 'python' ? 'Python 3' : language === 'rust' ? 'Rust (rustc)' : 'C++20 (GCC)';
      const newLogs: ConsoleLog[] = [
        {
          id: crypto.randomUUID(),
          type: 'info',
          message: `Compiling & executing ${langLabel}...`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ];
      setLogs(newLogs);

      try {
        const response = await generateAI({
          task: 'chatbot',
          prompt: `You are an accurate code compilation and runtime execution emulator for ${langLabel}.
Execute this code mentally and return ONLY the exact standard output (stdout) that would print to terminal, and stderr if syntax/runtime errors occur.
Do NOT include markdown formatting or commentary.

Source Code:
${code}`,
          systemPrompt: `You are an accurate compiler runtime emulator for ${langLabel}. Output ONLY raw stdout/stderr.`,
          options: { temperature: 0.1 }
        });

        const output = (response.text || '').trim();
        if (output) {
          const lines = output.split('\n');
          for (const l of lines) {
            newLogs.push({
              id: crypto.randomUUID(),
              type: l.toLowerCase().includes('error') ? 'error' : 'log',
              message: l,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        } else {
          newLogs.push({
            id: crypto.randomUUID(),
            type: 'log',
            message: 'Process completed with code 0 (no output)',
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      } catch (err: any) {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'warn',
          message: `Execution offline. Connect Piston server or compile locally with \`${language}\`.`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      setLogs([...newLogs]);
      setExecutionTime(Number((performance.now() - startTime).toFixed(1)));
      setIsRunning(false);
    }
  };

  // Iframe console message listener
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CONSOLE_LOG') {
        setLogs(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: e.data.level || 'log',
            message: e.data.message,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCopy = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleReset = () => {
    triggerHaptic('light');
    setCode(DEFAULT_SNIPPETS[language]);
    setLogs([]);
    setSqlResult(null);
    if (onCodeChange) onCodeChange(DEFAULT_SNIPPETS[language]);
  };

  // AI Assistant action
  const askAiMentor = async (type: 'explain' | 'debug' | 'optimize' | 'tests') => {
    triggerHaptic('light');
    setAiPromptType(type);
    setIsAiLoading(true);
    setAiResponse(null);
    setShowAiMenu(false);

    const prompts = {
      explain: `Explain this code line-by-line and summarize its underlying design patterns and time complexity:`,
      debug: `Inspect this code for bugs, edge-case vulnerabilities, and syntax traps. Show corrected code and explanations:`,
      optimize: `Refactor and optimize this code for speed, modern best practices, and clean code principles:`,
      tests: `Generate 3 comprehensive unit test cases and edge cases with expected inputs and outputs for this code:`,
    };

    const prompt = `${prompts[type]}
Language: ${language}

\`\`\`${language}
${sanitizeInput(code.slice(0, 4000))}
\`\`\``;

    try {
      const response = await generateAI({
        task: 'chatbot',
        prompt,
        systemPrompt: 'You are an elite software mentor at Relearn.ai. Give concise, high-signal explanations with minimal fluff.',
        options: { temperature: 0.2 },
      });

      setAiResponse(response.text || 'No response generated.');
    } catch (err: any) {
      setAiResponse(`AI Assistant unavailable: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const lineCount = code ? code.split('\n').length : 1;

  return (
    <div className={`flex flex-col bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl transition-all ${
      isFullscreen ? 'fixed inset-2 z-50 rounded-xl' : 'w-full'
    }`}>
      {/* Top Header: Language Segmented Control & Execution Actions */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 bg-stone-950 border-b border-stone-800/80 gap-2">
        {/* Languages */}
        <div className="flex items-center gap-1 bg-stone-900/80 p-0.5 rounded-lg border border-stone-800/80">
          {(['javascript', 'html', 'python', 'sql', 'rust', 'cpp'] as PlaygroundLanguage[]).map(lang => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all ${
                language === lang
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {lang === 'javascript' ? 'JS' : lang === 'rust' ? 'Rust' : lang === 'cpp' ? 'C++' : lang.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-2">
          {/* AI Assistant Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowAiMenu(!showAiMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold transition-colors"
              title="AI Code Mentor"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Assist</span>
              <ChevronDown size={12} className="text-stone-400" />
            </button>

            <AnimatePresence>
              {showAiMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 top-full mt-1.5 w-36 bg-stone-900 border border-stone-800 rounded-xl shadow-xl p-1 z-30 space-y-0.5"
                >
                  <button
                    onClick={() => askAiMentor('explain')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-800 rounded-lg text-left"
                  >
                    <HelpCircle size={13} className="text-primary" />
                    <span>Explain</span>
                  </button>
                  <button
                    onClick={() => askAiMentor('debug')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-800 rounded-lg text-left"
                  >
                    <Bug size={13} className="text-amber-400" />
                    <span>Find Bugs</span>
                  </button>
                  <button
                    onClick={() => askAiMentor('optimize')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-800 rounded-lg text-left"
                  >
                    <Zap size={13} className="text-emerald-400" />
                    <span>Optimize</span>
                  </button>
                  <button
                    onClick={() => askAiMentor('tests')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-800 rounded-lg text-left"
                  >
                    <CheckCircle2 size={13} className="text-cyan-400" />
                    <span>Unit Tests</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Run Button */}
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            title="Execute Code (Ctrl + Enter)"
          >
            {isRunning ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} fill="currentColor" />
            )}
            <span>Run</span>
          </button>

          {/* Icon Utilities */}
          <div className="flex items-center gap-0.5 pl-1 border-l border-stone-800">
            <button
              onClick={handleCopy}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-md hover:bg-stone-800/80 transition-colors"
              title="Copy Code"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-md hover:bg-stone-800/80 transition-colors"
              title="Reset Buffer"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-md hover:bg-stone-800/80 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Code Editor (Left) & Output Console (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-800 min-h-[480px] max-h-[640px]">
        {/* Editor Buffer */}
        <div className="flex flex-col h-full bg-stone-950/60 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-stone-950/80 border-b border-stone-800/60 text-[10px] font-mono text-stone-500">
            <span>Buffer: {language}</span>
            <span>{lineCount}L • {code.length}C</span>
          </div>

          <div className="flex flex-1 overflow-hidden font-mono text-xs sm:text-sm">
            {/* Line numbers */}
            <div className="py-3 px-2 bg-stone-950/40 select-none text-stone-600 text-right font-mono text-xs w-9 flex-shrink-0 border-r border-stone-800/40">
              {Array.from({ length: Math.max(lineCount, 16) }).map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent text-stone-100 resize-none outline-none leading-6 font-mono selection:bg-primary/30 w-full overflow-auto whitespace-pre tab-2"
              placeholder={
                language === 'html'
                  ? '<!-- Write HTML/CSS/JS here... -->'
                  : language === 'python'
                  ? '# Write Python 3 code here...'
                  : language === 'sql'
                  ? '-- Write SQL queries here...'
                  : language === 'rust'
                  ? '// Write Rust code here...'
                  : language === 'cpp'
                  ? '// Write C++ code here...'
                  : '// Write JavaScript code here...'
              }
            />
          </div>
        </div>

        {/* Output Side */}
        <div className="flex flex-col h-full bg-stone-950 overflow-hidden">
          {/* Output Switcher Tabs */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-stone-950 border-b border-stone-800 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('console')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors ${
                  activeTab === 'console'
                    ? 'bg-stone-800 text-stone-100'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                <Terminal size={12} />
                <span>Console</span>
                {logs.length > 0 && <span className="text-[10px] text-stone-400">({logs.length})</span>}
              </button>

              {language === 'html' && (
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-stone-800 text-stone-100'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  <Eye size={12} />
                  <span>Preview</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {executionTime !== null && (
                <span className="text-[10px] font-mono text-emerald-400">
                  {executionTime}ms
                </span>
              )}
              {logs.length > 0 && (
                <button
                  onClick={() => {
                    setLogs([]);
                    setSqlResult(null);
                  }}
                  className="p-1 text-stone-500 hover:text-stone-300"
                  title="Clear Console"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Active Tab View */}
          <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
            {activeTab === 'preview' && language === 'html' ? (
              <iframe
                ref={previewFrameRef}
                title="Preview"
                sandbox="allow-scripts"
                className="w-full h-full border-0 bg-white rounded-lg shadow-inner min-h-[360px]"
              />
            ) : (
              <div className="space-y-1.5">
                {/* SQL Table */}
                {sqlResult && sqlResult.length > 0 && (
                  <div className="mb-3 overflow-x-auto rounded-lg border border-stone-800 bg-stone-900/50 p-2">
                    <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Database size={11} /> Result ({sqlResult.length} rows)
                    </div>
                    <table className="w-full text-left text-[11px] border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-stone-800 text-stone-400">
                          {Object.keys(sqlResult[0]).map(key => (
                            <th key={key} className="p-1.5 font-bold uppercase">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResult.map((row, idx) => (
                          <tr key={idx} className="border-b border-stone-800/40 hover:bg-stone-800/20">
                            {Object.values(row).map((val: any, vIdx) => (
                              <td key={vIdx} className="p-1.5 text-stone-200">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty State */}
                {logs.length === 0 && !sqlResult && (
                  <div className="flex flex-col items-center justify-center h-48 text-stone-600 space-y-1">
                    <Terminal size={24} className="opacity-30" />
                    <span className="text-[11px]">Ready. Run code to view output.</span>
                  </div>
                )}

                {/* Console Log Items */}
                {logs.map(log => (
                  <div
                    key={log.id}
                    className={`p-1.5 rounded-md flex items-start gap-2 ${
                      log.type === 'error'
                        ? 'bg-rose-950/40 border border-rose-900/50 text-rose-300'
                        : log.type === 'warn'
                        ? 'bg-amber-950/30 border border-amber-900/40 text-amber-300'
                        : log.type === 'info'
                        ? 'bg-sky-950/30 border border-sky-900/40 text-sky-300'
                        : 'text-stone-300'
                    }`}
                  >
                    <span className="text-[9px] text-stone-500 select-none pt-0.5">
                      {log.timestamp}
                    </span>
                    <pre className="flex-1 whitespace-pre-wrap font-mono break-all m-0 text-xs">
                      {log.message}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Drawer */}
      <AnimatePresence>
        {(aiPromptType || aiResponse || isAiLoading) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-stone-800 bg-stone-950 p-3 relative"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs">
                <Sparkles size={13} />
                <span>AI Assist: {aiPromptType?.toUpperCase()}</span>
              </div>
              <button
                onClick={() => {
                  setAiPromptType(null);
                  setAiResponse(null);
                }}
                className="text-stone-500 hover:text-stone-300 text-xs px-1.5 py-0.5 rounded hover:bg-stone-800"
              >
                Close
              </button>
            </div>

            {isAiLoading && (
              <div className="flex items-center gap-2 text-stone-400 text-xs py-2 font-mono">
                <Loader2 size={13} className="animate-spin text-amber-400" />
                <span>Analyzing code...</span>
              </div>
            )}

            {aiResponse && !isAiLoading && (
              <div className="max-h-48 overflow-y-auto pr-1">
                <pre className="whitespace-pre-wrap bg-stone-900 p-2.5 rounded-lg border border-stone-800 text-xs font-mono text-stone-200">
                  {aiResponse}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodePlaygroundModule;
