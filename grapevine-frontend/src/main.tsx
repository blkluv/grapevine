import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { wagmiConfig } from './lib/wagmi'
import { WalletProvider } from './context/WalletContext'
import { GrapevineProvider } from './context/GrapevineContext'
import { ToastProvider } from './context/ToastContext'
import { LayoutProvider } from './context/LayoutContext'
import { ThemeContextProvider } from './context/ThemeContext'
import { FarcasterProvider } from './context/FarcasterContext'
import './index.css'
import App from './App.tsx'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
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
          <WagmiProvider config={wagmiConfig}>
            <WalletProvider>
              <GrapevineProvider>
                <ToastProvider>
                  <ThemeContextProvider>
                    <LayoutProvider>
                      <App />
                    </LayoutProvider>
                  </ThemeContextProvider>
                </ToastProvider>
              </GrapevineProvider>
            </WalletProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </FarcasterProvider>
  </StrictMode>,
)
