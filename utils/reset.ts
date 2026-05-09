/**
 * ─────────────────────────────────────────────────────────────────
 *  ReLearn.ai — System Recovery Utility
 * ─────────────────────────────────────────────────────────────────
 * 
 *  Provides a graceful way to clear corrupted state or perform
 *  a complete factory reset of the application's local data.
 */

export function performSystemReset(hard: boolean = false): void {
  console.warn('[SystemRecovery] Initiating system reset. Hard reset:', hard);

  // 1. Clear session-specific data
  try {
    sessionStorage.clear();
  } catch (e) {}

  // 2. Clear known application keys while preserving critical auth if possible
  const keysToClear = [
    'relearn_plans_',
    'relearn_tasks_',
    'relearn_activity_',
    'relearn_notifications_',
    'unsynced_changes',
    'analytics_v1',
    'relearn_last_sync'
  ];

  if (hard) {
    localStorage.clear();
  } else {
    // Selective clear
    Object.keys(localStorage).forEach(key => {
      if (keysToClear.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    });
  }

  // 3. Clear service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }

  // 4. Force reload
  const url = new URL(window.location.href);
  url.searchParams.set('reset', Date.now().toString());
  window.location.href = url.toString();
}

export function generateErrorReport(error: Error | null, errorInfo: any): string {
  const report = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : null,
    componentStack: errorInfo?.componentStack || null,
    localStorageSnapshot: Object.keys(localStorage).reduce((acc, key) => {
      // Don't include actual data for privacy, just keys and sizes
      acc[key] = localStorage.getItem(key)?.length || 0;
      return acc;
    }, {} as Record<string, number>)
  };

  return JSON.stringify(report, null, 2);
}

export function downloadErrorReport(reportJson: string): void {
  const blob = new Blob([reportJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relearn-error-report-${new Date().getTime()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
