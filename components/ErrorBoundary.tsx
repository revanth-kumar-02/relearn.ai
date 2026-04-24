import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback to render. If not provided, a default recovery UI is shown. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ─────────────────────────────────────────────────────────────────
 *  Global Error Boundary
 * ─────────────────────────────────────────────────────────────────
 *
 *  Catches uncaught JavaScript errors in any child component tree
 *  and renders a recovery UI instead of crashing the entire app
 *  to a blank white screen.
 *
 *  Usage:
 *    <ErrorBoundary>
 *      <YourComponent />
 *    </ErrorBoundary>
 * ─────────────────────────────────────────────────────────────────
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      isChunkError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorMsg = error.message || '';
    const isChunkError = 
      errorMsg.includes('Failed to fetch dynamically imported module') || 
      errorMsg.includes('ChunkLoadError') ||
      errorMsg.includes('loading chunk');

    return { 
      hasError: true, 
      isChunkError,
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log to console — in production, this could be sent to Sentry/LogRocket
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = (): void => {
    // If it's a chunk error, we need to be aggressive about clearing cache
    if (this.state.isChunkError) {
      console.log('[ErrorBoundary] Version mismatch detected. Attempting hard recovery...');
      
      // 1. Unregister any service workers that might be serving stale content
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let registration of registrations) {
            registration.unregister();
          }
        }).catch(err => console.error('SW unregistration failed:', err));
      }

      // 2. Clear session storage as a precaution
      try {
        sessionStorage.clear();
      } catch (e) {}

      // 3. Force hard reload with cache busting query param
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.href = url.toString();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = (): void => {
    // Navigate to dashboard via hash router
    window.location.hash = '#/dashboard';
    this.setState({ hasError: false, isChunkError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = this.state.isChunkError;

      // Default recovery UI
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6 transition-colors duration-500">
          <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-300">
            {/* Icon */}
            <div className={`w-24 h-24 rounded-3xl ${isChunkError ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-red-100 dark:bg-red-900/30'} flex items-center justify-center mx-auto shadow-2xl shadow-current/10 transition-transform hover:rotate-12 duration-500`}>
              <span className={`material-symbols-outlined text-5xl ${isChunkError ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500 dark:text-red-400'}`}>
                {isChunkError ? 'system_update' : 'error_outline'}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-text-primary-light dark:text-text-primary-dark tracking-tight leading-tight">
                {isChunkError ? 'Update Available!' : 'Oops! Something went wrong'}
              </h1>
              <p className="text-base text-text-secondary-light dark:text-text-secondary-dark leading-relaxed px-4">
                {isChunkError 
                  ? "We've released a new version of ReLearn.ai. A quick refresh is needed to load the latest features."
                  : "An unexpected error occurred. Don't worry, your data is safe. Let's get you back on track."}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={this.handleReload}
                className={`w-full sm:w-auto px-8 py-4 ${isChunkError ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-primary shadow-primary/20'} text-white rounded-2xl font-black text-base shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2`}
              >
                <span className="material-symbols-outlined">{isChunkError ? 'refresh' : 'restart_alt'}</span>
                {isChunkError ? 'Refresh Now' : 'Reload Page'}
              </button>
              
              {!isChunkError && (
                <button
                  onClick={this.handleGoHome}
                  className="w-full sm:w-auto px-8 py-4 bg-stone-200 dark:bg-stone-800 text-text-primary-light dark:text-text-primary-dark rounded-2xl font-bold text-base hover:bg-stone-300 dark:hover:bg-stone-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">home</span>
                  Dashboard
                </button>
              )}
            </div>

            {/* Error details (collapsed) */}
            {this.state.error && !isChunkError && (
              <details className="group text-left bg-stone-100/50 dark:bg-stone-900/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 transition-all">
                <summary className="px-6 py-4 text-xs font-bold text-stone-500 cursor-pointer select-none flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                  <span>Technical System Details</span>
                  <span className="material-symbols-outlined text-sm group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <div className="px-6 pb-6 mt-2">
                    <pre className="text-[10px] font-mono text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed opacity-80">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack && (
                        <div className="mt-4 pt-4 border-t border-red-200/30 dark:border-red-800/30">
                            <span className="font-bold uppercase tracking-widest text-[9px] mb-2 block">Component Stack</span>
                            {this.state.errorInfo.componentStack}
                        </div>
                    )}
                    </pre>
                </div>
              </details>
            )}

            {/* Version */}
            <div className="pt-8 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-base">verified</span>
                    </div>
                    <p className="text-[10px] font-black text-stone-400 dark:text-stone-600 tracking-[0.2em] uppercase">
                        ReLearn.ai Secure Recovery
                    </p>
                </div>
                {isChunkError && (
                    <p className="text-[9px] text-stone-400 dark:text-stone-600 italic">
                        Reference: System Version Mismatch Detected
                    </p>
                )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
