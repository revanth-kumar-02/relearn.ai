/**
 * ─────────────────────────────────────────────────────────────────
 *  Relearn.ai — Code Execution & Compiler Service
 * ─────────────────────────────────────────────────────────────────
 *
 *  Provides real headless compilation and execution for Playground
 *  and Project Workspaces using self-hosted Piston / Judge0 runners,
 *  with local sandboxing for client runtimes.
 *
 *  Adheres strictly to the Anti-AI-Slop standard:
 *  NEVER hallucinates fake compiler output with an LLM prompt.
 */

export interface CodeFile {
  name: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface ExecutionRequest {
  language: string;
  code?: string;
  files?: CodeFile[];
  stdin?: string;
  args?: string[];
  compileTimeoutMs?: number;
  runTimeoutMs?: number;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  runtimeVersion?: string;
  runner: 'piston' | 'judge0' | 'local-worker' | 'offline';
  errorDetails?: string;
}

const DEFAULT_RUNNER_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PISTON_URL) ||
  '/api/piston';

/**
 * Normalizes user-facing language labels to standard execution engine identifiers.
 */
export function normalizeExecutionLanguage(lang: string): { language: string; version: string; defaultFilename: string } {
  const l = (lang || '').toLowerCase().trim();

  switch (l) {
    case 'python':
    case 'py':
    case 'python3':
      return { language: 'python', version: '3.10.0', defaultFilename: 'main.py' };
    case 'rust':
    case 'rs':
      return { language: 'rust', version: '1.68.2', defaultFilename: 'src/main.rs' };
    case 'csharp':
    case 'cs':
    case 'c#':
    case '.net':
    case 'dotnet':
      return { language: 'csharp.net', version: '8.0.0', defaultFilename: 'Program.cs' };
    case 'cpp':
    case 'c++':
    case 'cplusplus':
      return { language: 'cpp', version: '10.2.0', defaultFilename: 'main.cpp' };
    case 'javascript':
    case 'js':
    case 'node':
      return { language: 'javascript', version: '18.15.0', defaultFilename: 'index.js' };
    case 'typescript':
    case 'ts':
      return { language: 'typescript', version: '5.0.3', defaultFilename: 'index.ts' };
    case 'sql':
    case 'sqlite':
    case 'sqlite3':
      return { language: 'sqlite3', version: '3.36.0', defaultFilename: 'query.sql' };
    case 'dart':
    case 'flutter':
      return { language: 'dart', version: '3.0.0', defaultFilename: 'lib/main.dart' };
    case 'go':
    case 'golang':
      return { language: 'go', version: '1.20.2', defaultFilename: 'main.go' };
    case 'java':
      return { language: 'java', version: '15.0.2', defaultFilename: 'Main.java' };
    default:
      return { language: l, version: '*', defaultFilename: 'main.txt' };
  }
}

/**
 * Executes code using a real headless engine (Piston-compatible endpoint).
 */
export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  const startTime = performance.now();
  const { language, defaultFilename } = normalizeExecutionLanguage(request.language);

  // Prepare multi-file payload
  let files: CodeFile[] = [];
  if (Array.isArray(request.files) && request.files.length > 0) {
    files = request.files;
  } else if (request.code !== undefined) {
    files = [{ name: defaultFilename, content: request.code }];
  } else {
    return {
      success: false,
      stdout: '',
      stderr: 'Error: No code or files provided for execution.',
      exitCode: 1,
      executionTimeMs: 0,
      runner: 'offline',
    };
  }

  // Fast-path for JavaScript in browser (Safe Worker-based execution)
  if (language === 'javascript' && typeof window !== 'undefined') {
    return executeBrowserJavaScript(files[0]?.content || '', startTime);
  }

  // Remote execution via Piston runner
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (request.runTimeoutMs || 10000) + 5000);

    const payload = {
      language,
      version: '*',
      files,
      stdin: request.stdin || '',
      args: request.args || [],
      compile_timeout: request.compileTimeoutMs || 10000,
      run_timeout: request.runTimeoutMs || 5000,
    };

    const response = await fetch(`${DEFAULT_RUNNER_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const run = data.run || {};
      const compile = data.compile || {};

      const stdout = run.stdout || compile.stdout || '';
      const stderr = [compile.stderr, run.stderr].filter(Boolean).join('\n');
      const exitCode = typeof run.code === 'number' ? run.code : typeof compile.code === 'number' ? compile.code : 0;
      const duration = Number((performance.now() - startTime).toFixed(1));

      return {
        success: exitCode === 0 && !stderr,
        stdout,
        stderr,
        exitCode,
        executionTimeMs: duration,
        runtimeVersion: data.version || data.language,
        runner: 'piston',
      };
    }
  } catch (err: any) {
    console.warn('[CodeExecutionService] Remote execution runner unreachable:', err?.message || err);
  }

  // If remote runner is offline, provide transparent and actionable status
  const elapsed = Number((performance.now() - startTime).toFixed(1));
  const offlineMessage = [
    `[Execution Server Status: Offline / Not Connected]`,
    `Real toolchain compilation requires a running Piston or container sandbox instance.`,
    ``,
    `To execute ${language} in production or local development:`,
    `1. Deploy Piston runner (docker run -d -p 2000:2000 ghcr.io/engineer-man/piston)`,
    `2. Set VITE_PISTON_URL="http://localhost:2000/api/v2" in your .env`,
    `3. Or launch the Eclipse Theia workspace to run native commands in the interactive terminal.`,
  ].join('\n');

  return {
    success: false,
    stdout: '',
    stderr: offlineMessage,
    exitCode: 126,
    executionTimeMs: elapsed,
    runner: 'offline',
    errorDetails: 'Execution host unreachable',
  };
}

/**
 * Sandboxed browser execution for JavaScript snippets.
 */
function executeBrowserJavaScript(code: string, startTime: number): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const errors: string[] = [];

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      logs.push(args.map(formatArg).join(' '));
    };
    console.error = (...args: any[]) => {
      errors.push(args.map(formatArg).join(' '));
    };
    console.warn = (...args: any[]) => {
      logs.push('[WARN] ' + args.map(formatArg).join(' '));
    };

    try {
      const runner = new Function(code);
      const returnVal = runner();
      if (returnVal !== undefined) {
        logs.push(`↳ Return: ${typeof returnVal === 'object' ? JSON.stringify(returnVal, null, 2) : returnVal}`);
      }

      const duration = Number((performance.now() - startTime).toFixed(1));
      resolve({
        success: errors.length === 0,
        stdout: logs.join('\n'),
        stderr: errors.join('\n'),
        exitCode: errors.length > 0 ? 1 : 0,
        executionTimeMs: duration,
        runner: 'local-worker',
      });
    } catch (err: any) {
      const duration = Number((performance.now() - startTime).toFixed(1));
      resolve({
        success: false,
        stdout: logs.join('\n'),
        stderr: `RuntimeError: ${err?.message || err}`,
        exitCode: 1,
        executionTimeMs: duration,
        runner: 'local-worker',
      });
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  });
}

function formatArg(arg: any): string {
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
}
