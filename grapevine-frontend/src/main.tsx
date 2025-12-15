import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider as PrivyWagmiProvider } from '@privy-io/wagmi'
import { WagmiProvider } from 'wagmi'
import { privyWagmiConfig, farcasterWagmiConfig } from './lib/wagmi'
import { WalletProvider } from './context/WalletContext'
import { FarcasterWalletProvider } from './context/FarcasterWalletContext'
import { GrapevineProvider } from './context/GrapevineContext'
import { FarcasterGrapevineProvider } from './context/FarcasterGrapevineContext'
import { FarcasterPaymentProvider } from './context/PaymentContext'
import { PrivyPaymentProvider } from './context/PrivyPaymentContext'
import { ToastProvider } from './context/ToastContext'
import { LayoutProvider } from './context/LayoutContext'
import { ThemeContextProvider } from './context/ThemeContext'
import { FarcasterProvider } from './context/FarcasterContext'
import './index.css'
import App from './App.tsx'
import { Analytics } from "@vercel/analytics/react"
import sdk from '@farcaster/miniapp-sdk'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// Farcaster App - no Privy, uses Farcaster connector
function FarcasterApp() {
  return (
    <StrictMode>
      <FarcasterProvider>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={farcasterWagmiConfig}>
            <FarcasterWalletProvider>
              <FarcasterGrapevineProvider>
                <FarcasterPaymentProvider>
                  <ToastProvider>
                    <ThemeContextProvider>
                      <LayoutProvider>
                        <App />
                      </LayoutProvider>
                    </ThemeContextProvider>
                  </ToastProvider>
                </FarcasterPaymentProvider>
              </FarcasterGrapevineProvider>
            </FarcasterWalletProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </FarcasterProvider>
      <Analytics />
    </StrictMode>
  )
}

// Privy App - full Privy setup, no Farcaster connector
function PrivyApp() {
  return (
    <StrictMode>
      <FarcasterProvider>
        <PrivyProvider
          appId={import.meta.env.VITE_PRIVY_APP_ID}
          config={{
            appearance: {
              theme: 'light',
              accentColor: '#676FFF',
            },
            loginMethods: ['wallet', 'farcaster'],
          }}
        >
          <QueryClientProvider client={queryClient}>
            <PrivyWagmiProvider config={privyWagmiConfig}>
              <WalletProvider>
                <GrapevineProvider>
                  <PrivyPaymentProvider>
                    <ToastProvider>
                      <ThemeContextProvider>
                        <LayoutProvider>
                          <App />
                        </LayoutProvider>
                      </ThemeContextProvider>
                    </ToastProvider>
                  </PrivyPaymentProvider>
                </GrapevineProvider>
              </WalletProvider>
            </PrivyWagmiProvider>
          </QueryClientProvider>
        </PrivyProvider>
      </FarcasterProvider>
      <Analytics />
    </StrictMode>
  )
}

// Global flag to detect mode before hooks are called
// This is set during bootstrap before React mounts
declare global {
  interface Window {
    __FARCASTER_MODE__?: boolean
  }
}

// Detect mode and mount appropriate app
async function bootstrap() {
  const root = createRoot(document.getElementById('root')!)

  try {
    const isInMiniApp = await sdk.isInMiniApp()
    console.log('[Bootstrap] Farcaster mini app detected:', isInMiniApp)

    // Set global flag BEFORE mounting React
    window.__FARCASTER_MODE__ = isInMiniApp

    if (isInMiniApp) {
      console.log('[Bootstrap] Mounting Farcaster app')
      root.render(<FarcasterApp />)
    } else {
      console.log('[Bootstrap] Mounting Privy app')
      root.render(<PrivyApp />)
    }
  } catch (error) {
    console.log('[Bootstrap] Farcaster detection failed, defaulting to Privy:', error)
    window.__FARCASTER_MODE__ = false
    root.render(<PrivyApp />)
  }
}

bootstrap()
