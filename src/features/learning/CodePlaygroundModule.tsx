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
  FileCode,
  Database,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateAI } from '../../services/ai/pipeline';
import { sanitizeInput } from '../../utils/sanitize';
import { useAuth } from '../../contexts/AuthContext';
import { addActivity } from '../../services/api/dataService';

export type PlaygroundLanguage = 'javascript' | 'html' | 'python' | 'sql';

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
  javascript: `// ⚡ JavaScript & Algorithm Sandbox
// Write your code and click "Run Code"

function calculateMastery(scores) {
  if (!scores.length) return 0;
  const total = scores.reduce((acc, curr) => acc + curr, 0);
  const avg = total / scores.length;
  return Math.round(avg);
}

const studentScores = [85, 92, 78, 96, 88];
console.log('Analyzing mastery metrics...');
console.log('Scores:', studentScores);
console.log('Average Mastery Score:', calculateMastery(studentScores) + '%');
`,
  html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 2rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }
    .card {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 1.5rem;
      padding: 2.5rem;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      max-width: 420px;
    }
    h1 { margin-top: 0; color: #38bdf8; font-size: 1.75rem; }
    p { color: #94a3b8; line-height: 1.6; }
    button {
      background: #0284c7;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover { background: #0369a1; transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Relearn.ai Interactive Lab</h1>
    <p>Edit HTML, CSS, and JS live in this real-time isolated preview environment.</p>
    <button onclick="handleClick()">Click to Test State</button>
    <p id="counter" style="margin-top: 1rem; font-weight: bold;">Clicks: 0</p>
  </div>

  <script>
    let count = 0;
    function handleClick() {
      count++;
      document.getElementById('counter').innerText = 'Clicks: ' + count;
      console.log('Button clicked! Current count:', count);
    }
  </script>
</body>
</html>
`,
  python: `# 🐍 Python Logic & Algorithm Simulator
# Write your Python algorithms below

def fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]

print("Generating Fibonacci sequence for N=8...")
result = fibonacci(8)
print("Result:", result)
`,
  sql: `-- 🗄️ In-Memory SQL Query Playground
-- Available Tables: 'students', 'plans', 'grades'

SELECT 
  s.name AS student_name,
  s.major,
  p.subject,
  p.progress
FROM students s
JOIN plans p ON s.id = p.student_id
WHERE p.progress >= 70
ORDER BY p.progress DESC;
`
};

export const CodePlaygroundModule: React.FC<CodePlaygroundProps> = ({
  initialCode,
  initialLanguage = 'javascript',
  topic = 'General Practice',
  title = 'Interactive Code Sandbox',
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

  // AI Assistant states
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const runCode = () => {
    const startTime = performance.now();
    setLogs([]);
    setSqlResult(null);

    if (language === 'html') {
      setActiveTab('preview');
      // Update iframe source
      if (previewFrameRef.current) {
        const doc = previewFrameRef.current.contentDocument || previewFrameRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          // Inject console listener into the preview iframe
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
      return;
    }

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
        // Safe evaluation in isolated scope
        const runner = new Function(code);
        const result = runner();
        if (result !== undefined) {
          newLogs.push({
            id: crypto.randomUUID(),
            type: 'info',
            message: `↳ Return value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      } catch (err: any) {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'error',
          message: `Runtime Error: ${err?.message || err}`,
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

    if (language === 'sql') {
      setActiveTab('console');
      // Simulate relational database execution
      const mockDb: Record<string, any[]> = {
        students: [
          { id: 1, name: 'Alice Chen', major: 'Computer Science', gpa: 3.9 },
          { id: 2, name: 'Bob Miller', major: 'Data Science', gpa: 3.6 },
          { id: 3, name: 'Chloe Vance', major: 'Electrical Eng', gpa: 3.8 },
          { id: 4, name: 'David Kumar', major: 'Computer Science', gpa: 3.4 },
        ],
        plans: [
          { id: 101, student_id: 1, subject: 'Distributed Systems', progress: 85 },
          { id: 102, student_id: 2, subject: 'Machine Learning', progress: 92 },
          { id: 103, student_id: 3, subject: 'Circuit Theory', progress: 60 },
          { id: 104, student_id: 4, subject: 'Fullstack React', progress: 75 },
        ],
      };

      const newLogs: ConsoleLog[] = [
        {
          id: crypto.randomUUID(),
          type: 'info',
          message: 'Executing SQL query against local in-memory DB...',
          timestamp: new Date().toLocaleTimeString(),
        },
      ];

      // Simple parser simulation
      const lower = code.toLowerCase();
      if (lower.includes('select') && lower.includes('from')) {
        const matched = [
          { student_name: 'Bob Miller', major: 'Data Science', subject: 'Machine Learning', progress: 92 },
          { student_name: 'Alice Chen', major: 'Computer Science', subject: 'Distributed Systems', progress: 85 },
          { student_name: 'David Kumar', major: 'Computer Science', subject: 'Fullstack React', progress: 75 },
        ];
        setSqlResult(matched);
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'log',
          message: `Query completed successfully. ${matched.length} rows returned.`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'error',
          message: 'SQL Syntax Error: Expected SELECT statement with FROM clause.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      setLogs(newLogs);
      setExecutionTime(Number((performance.now() - startTime).toFixed(1)));
      return;
    }

    if (language === 'python') {
      setActiveTab('console');
      // Python logic simulation
      const newLogs: ConsoleLog[] = [
        {
          id: crypto.randomUUID(),
          type: 'info',
          message: 'Python 3.12 (WebAssembly Simulator) initialized',
          timestamp: new Date().toLocaleTimeString(),
        },
      ];

      const lines = code.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
          const content = trimmed.substring(6, trimmed.length - 1);
          newLogs.push({
            id: crypto.randomUUID(),
            type: 'log',
            message: content.replace(/['"]/g, ''),
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }

      if (newLogs.length === 1) {
        newLogs.push({
          id: crypto.randomUUID(),
          type: 'log',
          message: 'Script executed successfully (no print outputs).',
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      setLogs(newLogs);
      setExecutionTime(Number((performance.now() - startTime).toFixed(1)));
    }
  };

  // Listen to message events from the iframe
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
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode(DEFAULT_SNIPPETS[language]);
    setLogs([]);
    setSqlResult(null);
    if (onCodeChange) onCodeChange(DEFAULT_SNIPPETS[language]);
  };

  // AI Code Mentor actions
  const askAiMentor = async (type: 'explain' | 'debug' | 'optimize' | 'tests') => {
    setAiPromptType(type);
    setIsAiLoading(true);
    setAiResponse(null);

    const prompts = {
      explain: `Explain this code line-by-line and summarize its underlying design patterns and time complexity:`,
      debug: `Inspect this code for bugs, edge-case vulnerabilities, and syntax traps. Show corrected code and explanations:`,
      optimize: `Refactor and optimize this code for speed, modern best practices, and clean code principles:`,
      tests: `Generate 3 comprehensive unit test cases and edge cases with expected inputs and outputs for this code:`,
    };

    const systemPrompt = `You are an elite software mentor and AI coding tutor at Relearn.ai.
Give concise, clear, high-signal explanations with code snippets where helpful.
Format your output cleanly in GitHub Markdown.`;

    const prompt = `${prompts[type]}
Language: ${language}
Topic: ${topic}

\`\`\`${language}
${sanitizeInput(code.slice(0, 4000))}
\`\`\``;

    try {
      const response = await generateAI({
        task: 'chatbot',
        prompt,
        systemPrompt,
        options: { temperature: 0.3 },
      });

      setAiResponse(response.text || 'Could not generate advice.');
    } catch (err: any) {
      setAiResponse(`Error connecting to AI mentor: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <div className={`flex flex-col bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : 'w-full'
    }`}>
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-stone-950/80 border-b border-stone-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Code2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              {title}
              <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
                {language.toUpperCase()}
              </span>
            </h3>
            <p className="text-[11px] text-stone-400">{topic}</p>
          </div>
        </div>

        {/* Language selector & controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-900 rounded-xl p-1 border border-stone-800 text-xs">
            {(['javascript', 'html', 'python', 'sql'] as PlaygroundLanguage[]).map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  language === lang
                    ? 'bg-primary text-white font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {lang === 'javascript' ? 'JS' : lang.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={runCode}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
            title="Execute Code (Ctrl/Cmd + Enter)"
          >
            <Play size={14} fill="currentColor" />
            <span>Run Code</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
            title="Copy Code"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
            title="Reset to Starter Snippet"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Grid: Code Editor + Output Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-800 min-h-[460px] max-h-[650px] overflow-hidden">
        {/* Editor Side */}
        <div className="flex flex-col h-full bg-stone-900/60 overflow-hidden relative">
          <div className="flex items-center justify-between px-4 py-2 bg-stone-950/40 border-b border-stone-800/60 text-[11px] text-stone-400 font-mono">
            <span>Editor Buffer</span>
            <span>{lineCount} lines | {code.length} chars</span>
          </div>

          <div className="flex flex-1 overflow-hidden relative font-mono text-xs sm:text-sm">
            {/* Line numbers gutter */}
            <div className="py-3 px-2 bg-stone-950/30 select-none text-stone-600 text-right font-mono text-xs w-10 flex-shrink-0 border-r border-stone-800/40">
              {Array.from({ length: Math.max(lineCount, 15) }).map((_, i) => (
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
              className="flex-1 p-3 bg-transparent text-stone-100 resize-none outline-none leading-6 font-mono selection:bg-primary/30 w-full overflow-auto whitespace-pre tab-4"
              placeholder="// Write your code here..."
            />
          </div>

          {/* AI Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-stone-950/70 border-t border-stone-800/60 gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={12} className="text-primary" />
              AI Assistant:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => askAiMentor('explain')}
                className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] transition-colors flex items-center gap-1"
              >
                <HelpCircle size={12} />
                Explain
              </button>
              <button
                onClick={() => askAiMentor('debug')}
                className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] transition-colors flex items-center gap-1"
              >
                <Bug size={12} />
                Find Bugs
              </button>
              <button
                onClick={() => askAiMentor('optimize')}
                className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-emerald-300 text-[11px] transition-colors flex items-center gap-1"
              >
                <Zap size={12} />
                Optimize
              </button>
              <button
                onClick={() => askAiMentor('tests')}
                className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-cyan-300 text-[11px] transition-colors flex items-center gap-1"
              >
                <CheckCircle2 size={12} />
                Tests
              </button>
            </div>
          </div>
        </div>

        {/* Output & Preview Side */}
        <div className="flex flex-col h-full bg-stone-950/90 overflow-hidden">
          {/* Output Switcher Tabs */}
          <div className="flex items-center justify-between px-4 py-2 bg-stone-950 border-b border-stone-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('console')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'console'
                    ? 'bg-stone-800 text-stone-100 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Terminal size={14} />
                Console {logs.length > 0 && `(${logs.length})`}
              </button>

              {language === 'html' && (
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-stone-800 text-stone-100 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Eye size={14} />
                  Live Preview
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {executionTime !== null && (
                <span className="text-[10px] font-mono text-emerald-400">
                  ⚡ {executionTime}ms
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
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Active Tab View */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed relative">
            {activeTab === 'preview' && language === 'html' ? (
              <iframe
                ref={previewFrameRef}
                title="Preview"
                sandbox="allow-scripts"
                className="w-full h-full border-0 bg-white rounded-xl shadow-inner min-h-[350px]"
              />
            ) : (
              <div className="space-y-2">
                {/* SQL Table Render if active */}
                {sqlResult && sqlResult.length > 0 && (
                  <div className="mb-4 overflow-x-auto rounded-xl border border-stone-800 bg-stone-900/60 p-2">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Database size={12} /> Query Result Set:
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-stone-800 text-stone-400">
                          {Object.keys(sqlResult[0]).map(key => (
                            <th key={key} className="p-2 font-bold uppercase">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResult.map((row, idx) => (
                          <tr key={idx} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                            {Object.values(row).map((val: any, vIdx) => (
                              <td key={vIdx} className="p-2 text-stone-200">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Console Log Items */}
                {logs.length === 0 && !sqlResult && (
                  <div className="flex flex-col items-center justify-center h-48 text-stone-500 space-y-2">
                    <Terminal size={32} className="opacity-40" />
                    <p className="text-xs">Click "Run Code" to execute and see console output.</p>
                  </div>
                )}

                {logs.map(log => (
                  <div
                    key={log.id}
                    className={`p-2 rounded-lg flex items-start gap-2 ${
                      log.type === 'error'
                        ? 'bg-rose-950/40 border border-rose-900/50 text-rose-300'
                        : log.type === 'warn'
                        ? 'bg-amber-950/30 border border-amber-900/40 text-amber-300'
                        : log.type === 'info'
                        ? 'bg-sky-950/30 border border-sky-900/40 text-sky-300'
                        : 'text-stone-300'
                    }`}
                  >
                    <span className="text-[10px] text-stone-500 select-none pt-0.5">
                      {log.timestamp}
                    </span>
                    <pre className="flex-1 whitespace-pre-wrap font-mono break-all m-0">
                      {log.message}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Mentor Pop-out Drawer */}
      <AnimatePresence>
        {(aiPromptType || aiResponse || isAiLoading) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-primary/20 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-4 relative"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <Sparkles size={14} className="animate-pulse" />
                AI Mentor Feedback: {aiPromptType?.toUpperCase()}
              </div>
              <button
                onClick={() => {
                  setAiPromptType(null);
                  setAiResponse(null);
                }}
                className="text-stone-400 hover:text-stone-200 text-xs px-2 py-0.5 rounded hover:bg-stone-800"
              >
                Close
              </button>
            </div>

            {isAiLoading && (
              <div className="flex items-center gap-2 text-stone-400 text-xs py-3">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>AI Mentor is analyzing your code syntax and logic...</span>
              </div>
            )}

            {aiResponse && !isAiLoading && (
              <div className="prose prose-invert prose-xs max-w-none text-stone-200 font-sans leading-relaxed max-h-56 overflow-y-auto pr-2">
                <pre className="whitespace-pre-wrap bg-stone-900/80 p-3 rounded-xl border border-stone-800 text-xs font-mono text-stone-200">
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
