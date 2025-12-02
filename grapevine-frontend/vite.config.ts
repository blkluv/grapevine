import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Plugin to serve Farcaster manifest for local development
function farcasterManifestPlugin(tunnelUrl: string): Plugin {
  return {
    name: 'farcaster-manifest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/.well-known/farcaster.json') {
          const manifest = {
            frame: {
              name: 'Grapevine dev',
              homeUrl: tunnelUrl,
              iconUrl: `${tunnelUrl}/icon.png`,
              version: '1',
              imageUrl: `${tunnelUrl}/image.png`,
              subtitle: 'x402 markets',
              webhookUrl: `${tunnelUrl}/api/webhook`,
              description: 'x402 feeds',
              splashImageUrl: `${tunnelUrl}/splash.png`,
              primaryCategory: 'utility',
              splashBackgroundColor: '#6200ea',
            },
            accountAssociation: {
              header: 'eyJmaWQiOjIyMjg5NiwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDY0MGI5ZjI0NEMxNWU5NTAzMDIxODAzNDFjQTAyMjU0ZmZENUViRDAifQ',
              payload: 'eyJkb21haW4iOiJncmFwZXZpbmUubWFya2V0cyJ9',
              signature: 'pVgMv4+pnKq6LJ8sInJ27wW/vdom8EALwdkxd4GXZN1UHCq/ELyVmVJbNLvg7nJwrMm+FitXhgOy35CXrIqctBw=',
            },
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(manifest))
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDevelopment = env.VITE_ENV === 'develop' || mode === 'development'

  // Tunnel URL for Farcaster mini app development
  const farcasterTunnelUrl = env.VITE_FARCASTER_TUNNEL_URL || 'https://paulo-clerk.devpinata.cloud'

  return {
    plugins: [
      react(),
      // Only add Farcaster manifest plugin in development
      ...(isDevelopment ? [farcasterManifestPlugin(farcasterTunnelUrl)] : []),
    ],
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
