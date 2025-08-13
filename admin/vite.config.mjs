// FILE: vite.config.mjs
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  // Load .env files for the current mode (development/production)
  // Vite will also auto-load VITE_* into import.meta.env at runtime,
  // but we set defaults here so the app has values even if the .env is absent.
  const env = loadEnv(mode, process.cwd(), '')

  const VITE_FIREBASE_FUNCTIONS_REGION =
    env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-south1'
  const VITE_USE_FN_RECURSIVE_DELETE =
    env.VITE_USE_FN_RECURSIVE_DELETE || 'false'
  const VITE_USE_FN_TOGGLE_PUBLISH =
    env.VITE_USE_FN_TOGGLE_PUBLISH || 'false'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'components': path.resolve(__dirname, './src/components'),
        'pages': path.resolve(__dirname, './src/pages'),
        'router': path.resolve(__dirname, './src/router'),
      },
    },
    server: {
      port: 5196,
      strictPort: true,   // don’t auto-switch ports
      open: true,
      // host: true, // uncomment if you need LAN access
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
    // Ensure these envs are always defined on the client
    define: {
      'import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION': JSON.stringify(VITE_FIREBASE_FUNCTIONS_REGION),
      'import.meta.env.VITE_USE_FN_RECURSIVE_DELETE': JSON.stringify(VITE_USE_FN_RECURSIVE_DELETE),
      'import.meta.env.VITE_USE_FN_TOGGLE_PUBLISH': JSON.stringify(VITE_USE_FN_TOGGLE_PUBLISH),
    },
    // envPrefix defaults to 'VITE_', so no change needed
    // envPrefix: 'VITE_',
  }
})
