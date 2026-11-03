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
            proxy.on('proxyReq', (proxyReq) => {
              const latestKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || env.GROQ_API_KEY || env.VITE_GROQ_API_KEY || '';
              if (latestKey) {
                proxyReq.setHeader('Authorization', `Bearer ${latestKey}`);
              }
            });
          },
        },

        // Proxy OpenRouter API calls to avoid CORS issues in browser
        '/api/openrouter': {
          target: 'https://openrouter.ai/api/v1',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/openrouter/, ''),
          headers: {
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY || ''}`,
            'HTTP-Referer': 'https://relearn.ai',
            'X-Title': 'Relearn.ai',
          },
        },

        // Proxy Formspree calls to avoid DNS and CSP issues
        '/api/feedback': {
          target: 'https://formspree.io',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/feedback/, ''),
        },

        // Dev Proxy for Local Ollama runtime
        '/api/ai/ollama': {
          target: env.AI_OLLAMA_SERVER_URL || env.VITE_AI_OLLAMA_BASE_URL || 'http://localhost:11434',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/ai\/ollama/, ''),
        },

        // Dev Proxy for Local vLLM runtime
        '/api/ai/vllm': {
          target: env.AI_VLLM_SERVER_URL || env.VITE_AI_VLLM_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/ai\/vllm/, ''),
        },
      },
    },
    plugins: [react()],
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
