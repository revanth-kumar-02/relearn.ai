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

  const hash = window.location.hash;
  if (hash) {
    // 1. Handle query parameters inside hash (e.g. #/dashboard?code=xxx)
    if (hash.includes('?')) {
      const parts = hash.split('?');
      const rawPath = parts[0];
      const query = parts[1];
      if (query && (query.includes('code=') || query.includes('access_token=') || query.includes('refresh_token='))) {
        const path = rawPath.replace(/^#/, '');
        logDiagnostic('OAuth Callback Redirect (PKCE)', { originalHash: hash, parsedPath: path });
        sessionStorage.setItem('oauth_redirect_path', path);
        const newUrl = window.location.origin + window.location.pathname + '?' + query;
        window.history.replaceState(null, '', newUrl);
      } else if (query && query.includes('error=')) {
        logDiagnostic('OAuth Callback Redirect Error', { query });
      }
    }
    // 2. Handle secondary hash fragments (e.g. #/dashboard#access_token=xxx)
    else if (hash.includes('#', 1)) {
      const secondHashIndex = hash.indexOf('#', 1);
      const rawPath = hash.substring(0, secondHashIndex);
      const tokenFragment = hash.substring(secondHashIndex + 1);
      if (tokenFragment && (tokenFragment.includes('access_token=') || tokenFragment.includes('refresh_token='))) {
        const path = rawPath.replace(/^#/, '');
        logDiagnostic('OAuth Callback Redirect (Implicit)', { originalHash: hash, parsedPath: path });
        sessionStorage.setItem('oauth_redirect_path', path);
        const newUrl = window.location.origin + window.location.pathname + '#' + tokenFragment;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';


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
