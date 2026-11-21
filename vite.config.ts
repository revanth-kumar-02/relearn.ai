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
        // Proxy Groq API calls to avoid CORS issues in browser
        '/api/groq': {
          target: 'https://api.groq.com/openai/v1',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/groq/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const scope = ((req.headers['x-groq-scope'] as string) || '').toLowerCase().trim();
              let apiKey = '';

              if (scope === 'workspace') {
                apiKey = (process.env.GROQ_API_KEY_WORKSPACE || env.GROQ_API_KEY_WORKSPACE || '').trim();
              } else if (scope === 'plan_chat') {
                apiKey = (process.env.GROQ_API_KEY_PLAN_CHAT || env.GROQ_API_KEY_PLAN_CHAT || '').trim();
              }

              // Fallback to general GROQ_API_KEY if specific scope key is not provided
              if (!apiKey) {
                apiKey = (process.env.GROQ_API_KEY || env.GROQ_API_KEY || '').trim();
              }

              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              }
              proxyReq.removeHeader('x-groq-scope');
            });
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
    plugins: [
      react(),
      {
        name: 'youtube-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/api/youtube', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: { message: 'Method not allowed' } }));
              return;
            }
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const { endpoint, params } = JSON.parse(body || '{}');
                const apiKey = (process.env.YOUTUBE_API_KEY || env.YOUTUBE_API_KEY || '').trim();
                if (!apiKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: { message: 'YOUTUBE_API_KEY is not configured on the local server.' } }));
                  return;
                }
                if (!['search', 'videos'].includes(endpoint)) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: { message: `Invalid endpoint: "${endpoint}"` } }));
                  return;
                }
                const searchParams = new URLSearchParams({ ...params, key: apiKey });
                const googleRes = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${searchParams}`);
                const data = await googleRes.json();
                res.statusCode = googleRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: { message: e?.message || 'Internal proxy error' } }));
              }
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('pdfjs-dist')) {
                return 'vendor-pdfjs';
              }
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'vendor-jspdf';
              }
              if (id.includes('dompurify')) {
                return 'vendor-dompurify';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('unified')) {
                return 'vendor-markdown';
              }
              if (id.includes('zod')) {
                return 'vendor-zod';
              }
              return 'vendor-core';
            }
          },
        },
      },
    },
  };
});
