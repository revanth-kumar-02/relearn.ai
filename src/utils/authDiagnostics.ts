/**
 * Authentication Diagnostics Utility
 * Stores and manages structured logs for debugging login, signup, session restoration, and redirections.
 */

export interface DiagnosticEntry {
  timestamp: string;
  event: string;
  details?: any;
}

const STORAGE_KEY = 'relearn_auth_diagnostics';

export function logAuthDiagnostic(event: string, details?: any): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    const logs: DiagnosticEntry[] = JSON.parse(raw);
    
    logs.push({
      timestamp: new Date().toISOString(),
      event,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined
    });
    
    // Limit to last 50 entries
    if (logs.length > 50) {
      logs.shift();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    // Avoid breaking application if localStorage is full or disabled
  }
  
  console.log(`[Auth Diagnostic] [${event}]`, details ? JSON.stringify(details) : '');
}

export function getAuthDiagnostics(): DiagnosticEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearAuthDiagnostics(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
