import { supabase } from './supabase';

export interface AppError {
  id?: string;
  message: string;
  stack?: string;
  component?: string;
  userId?: string;
  userAgent: string;
  url: string;
  severity: 'error' | 'warning' | 'fatal';
  metadata?: Record<string, any>;
  timestamp: string;
  resolved?: boolean;
}

const MAX_LOCAL_ERRORS = 100;

export const errorTrackingService = {
  /**
   * Initialize global error handlers
   */
  init: () => {
    window.addEventListener('error', (event) => {
      errorTrackingService.logError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        severity: 'error',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      errorTrackingService.logError({
        message: `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        severity: 'error',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    });
  },

  /**
   * Log an error to the system
   */
  logError: async (error: Omit<AppError, 'id'>) => {
    // 1. Store locally for quick access
    try {
      const localErrors = JSON.parse(localStorage.getItem('relearn_internal_errors') || '[]');
      localErrors.unshift(error);
      if (localErrors.length > MAX_LOCAL_ERRORS) localErrors.length = MAX_LOCAL_ERRORS;
      localStorage.setItem('relearn_internal_errors', JSON.stringify(localErrors));
    } catch {}

    // 2. Push to Supabase if possible
    try {
      await supabase.from('app_errors').insert(error);
    } catch {
      // Fail silently, don't want error tracking to cause more errors
    }

    console.error(`[AppError] ${error.message}`, error);
  },

  /**
   * Fetch errors for the admin dashboard
   */
  getErrors: async (page = 1, limit = 20): Promise<{ data: AppError[], count: number }> => {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('app_errors')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch {
      const local = JSON.parse(localStorage.getItem('relearn_internal_errors') || '[]');
      return { 
        data: local.slice((page - 1) * limit, page * limit), 
        count: local.length 
      };
    }
  },

  /**
   * Mark an error as resolved
   */
  resolveError: async (id: string) => {
    try {
      await supabase.from('app_errors').update({ resolved: true }).eq('id', id);
    } catch {}
  }
};
