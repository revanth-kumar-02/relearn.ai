import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        // Required for Firebase Auth Google Sign-In popup to communicate back
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        // Proxy Gemini API calls to avoid CORS issues in browser
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/gemini/, ''),
          headers: {
            'x-goog-api-key': env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '',
          },
        },
        // Proxy OpenAI API calls to avoid CORS issues in browser
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/openai/, ''),
          headers: {
            'Authorization': `Bearer ${env.VITE_OPENAI_API_KEY || ''}`,
          },
        },
        // Proxy Formspree calls to avoid DNS and CSP issues
        '/api/feedback': {
          target: 'https://formspree.io',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/feedback/, ''),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
