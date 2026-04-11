import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '')
  return {
    envDir: '..',
    plugins: [react(), tsconfigPaths()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/v1'),
        },
        '/v1': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/v1'),
        },
        '/v1': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('posthog-js')) return 'analytics'
            if (
              id.includes('react-router') ||
              id.includes('@remix-run/router') ||
              id.includes('react-dom') ||
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'react-vendor'
            }
            if (id.includes('@tanstack/react-query')) return 'query-vendor'
            if (id.includes('lucide-react') || id.includes('framer-motion')) return 'ui-vendor'
            return 'vendor'
          },
        },
      },
    },
  }
})

// Trigger full reload
