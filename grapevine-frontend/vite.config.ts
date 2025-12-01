import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDevelopment = env.VITE_ENV === 'develop' || mode === 'development'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    assetsInclude: ['**/*.wsz'],
    server: {
      // In development, allow all hosts for tunnel flexibility
      // In production, this config won't apply (prod uses build output)
      allowedHosts: isDevelopment ? true : [],
    },
  }
})
