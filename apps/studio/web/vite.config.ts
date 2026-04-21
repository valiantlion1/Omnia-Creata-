import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'node:url'
import { studioSeoPlugin } from './tools/studioSeoPlugin'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '')
  const siteUrl = env.VITE_CANONICAL_SITE_URL || env.PUBLIC_WEB_BASE_URL || 'https://studio.omniacreata.com'
  const localFrontendHost = '127.0.0.1'
  const localFrontendPort = 5173
  const localApiBaseUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
  return {
    envDir: '..',
    plugins: [react(), tsconfigPaths(), studioSeoPlugin({ siteUrl })],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: localFrontendHost,
      port: localFrontendPort,
      strictPort: true,
      allowedHosts: ['127.0.0.1', 'localhost'],
      open: false,
      proxy: {
        '/api': {
          target: localApiBaseUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/v1'),
        },
        '/v1': {
          target: localApiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: localFrontendHost,
      port: localFrontendPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: localApiBaseUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/v1'),
        },
        '/v1': {
          target: localApiBaseUrl,
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
