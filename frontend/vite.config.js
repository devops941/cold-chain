import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // When VITE_API_URL is empty the app uses same-origin requests and Vite
  // proxies /api to the Python backend. Set an absolute URL for deployments.
  const apiTarget = env.VITE_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    preview: {
      host: true,
      port: 5173,
      allowedHosts: true,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  }
})
