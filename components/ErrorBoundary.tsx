import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback to render. If not provided, a default recovery UI is shown. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
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
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log to console — in production, this could be sent to Sentry/LogRocket
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    // Navigate to dashboard via hash router
    window.location.hash = '#/dashboard';
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default recovery UI
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl text-red-500 dark:text-red-400">
                error_outline
              </span>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                An unexpected error occurred. Your data is safe — try refreshing
                the page or navigating back to the dashboard.
              </p>
            </div>

            {/* Error details (collapsed) */}
            {this.state.error && (
              <details className="text-left bg-stone-100 dark:bg-stone-900 rounded-xl p-4 border border-stone-200 dark:border-stone-800">
                <summary className="text-xs font-bold text-stone-500 cursor-pointer select-none">
                  Error details
                </summary>
                <pre className="mt-2 text-[10px] text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
              >
                Go to Dashboard
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-stone-200 dark:bg-stone-800 text-text-primary-light dark:text-text-primary-dark rounded-xl font-bold text-sm hover:bg-stone-300 dark:hover:bg-stone-700 transition-all active:scale-95"
              >
                Reload Page
              </button>
            </div>

            {/* Version */}
            <p className="text-[10px] font-bold text-stone-300 dark:text-stone-700 tracking-wider uppercase">
              ReLearn.ai Error Recovery
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
