// Rewrite hash query parameters for Supabase compatibility with HashRouter
(function () {
  const logDiagnostic = (event: string, details?: any) => {
    try {
      const raw = localStorage.getItem('relearn_auth_diagnostics') || '[]';
      const logs = JSON.parse(raw);
      logs.push({
        timestamp: new Date().toISOString(),
        event,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined
      });
      if (logs.length > 50) logs.shift();
      localStorage.setItem('relearn_auth_diagnostics', JSON.stringify(logs));
    } catch (e) {}
    console.log(`[Auth Diagnostic] [${event}]`, details ? JSON.stringify(details) : '');
  };

  const pathname = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  // Check if incoming URL has password recovery intent
  const isRecoveryIntent =
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    pathname === '/reset-password' ||
    pathname.includes('reset-password') ||
    hash.includes('reset-password');

  if (isRecoveryIntent) {
    logDiagnostic('Password Recovery intent detected in URL', { pathname, hash, search });
    sessionStorage.setItem('is_password_recovery', 'true');
    sessionStorage.setItem('oauth_redirect_path', '/reset-password');
  }

  // Normalize pathname if browser accessed /reset-password directly (SPA fallback)
  if (pathname === '/reset-password') {
    const targetHash = '#/reset-password' + (hash ? (hash.startsWith('#') ? hash : '#' + hash) : '');
    const newUrl = window.location.origin + '/' + search + targetHash;
    window.history.replaceState(null, '', newUrl);
  }

  const currentHash = window.location.hash;
  if (currentHash) {
    // 1. Handle query parameters inside hash (e.g. #/dashboard?code=xxx or #/reset-password?code=xxx)
    if (currentHash.includes('?')) {
      const parts = currentHash.split('?');
      const rawPath = parts[0];
      const query = parts[1];
      if (query && (query.includes('code=') || query.includes('access_token=') || query.includes('refresh_token='))) {
        const path = rawPath.replace(/^#/, '') || (isRecoveryIntent ? '/reset-password' : '/dashboard');
        logDiagnostic('Auth Callback Redirect (PKCE)', { originalHash: currentHash, parsedPath: path });
        sessionStorage.setItem('oauth_redirect_path', path);
        if (path === '/reset-password' || isRecoveryIntent) {
          sessionStorage.setItem('is_password_recovery', 'true');
        }
        const newUrl = window.location.origin + window.location.pathname + '?' + query;
        window.history.replaceState(null, '', newUrl);
      } else if (query && query.includes('error=')) {
        logDiagnostic('Auth Callback Redirect Error', { query });
      }
    }
    // 2. Handle secondary hash fragments (e.g. #/reset-password#access_token=xxx)
    else if (currentHash.includes('#', 1)) {
      const secondHashIndex = currentHash.indexOf('#', 1);
      const rawPath = currentHash.substring(0, secondHashIndex);
      const tokenFragment = currentHash.substring(secondHashIndex + 1);
      if (tokenFragment && (tokenFragment.includes('access_token=') || tokenFragment.includes('refresh_token='))) {
        const path = rawPath.replace(/^#/, '') || (isRecoveryIntent ? '/reset-password' : '/dashboard');
        logDiagnostic('Auth Callback Redirect (Implicit)', { originalHash: currentHash, parsedPath: path });
        sessionStorage.setItem('oauth_redirect_path', path);
        if (path === '/reset-password' || isRecoveryIntent) {
          sessionStorage.setItem('is_password_recovery', 'true');
        }
        const newUrl = window.location.origin + window.location.pathname + '#' + tokenFragment;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './app/App';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
