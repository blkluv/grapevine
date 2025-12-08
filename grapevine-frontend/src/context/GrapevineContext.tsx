import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { useGrapevine as useGrapevineSDK } from '@pinata/grapevine-sdk/dist/react';
import type { GrapevineClient } from '@pinata/grapevine-sdk/dist/client';

export interface GrapevineContextType {
  grapevine: GrapevineClient | null;
  isInitialized: boolean;
}

const GrapevineContext = createContext<GrapevineContextType | undefined>(undefined);

interface GrapevineProviderProps {
  children: ReactNode;
}

export function GrapevineProvider({ children }: GrapevineProviderProps) {
  const { data: walletClient } = useWalletClient();
  const wagmiAccount = useAccount();

  // Get network from environment variable
  const network = import.meta.env.VITE_NETWORK as 'testnet' | 'mainnet';
  const validNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';
  
  // Get API URL from environment variable
  const apiUrl = import.meta.env.VITE_API_URL || '';

  // Initialize Grapevine SDK with wagmi's wallet client
  // This works in both Privy mode and Farcaster mode since both use wagmi
  const grapevine = useGrapevineSDK({
    walletClient,
    network: validNetwork,
    debug: import.meta.env.DEV,
  });

  // ★★★ MONKEY PATCH THE SDK API URL ★★★
  useEffect(() => {
    if (grapevine && apiUrl) {
      console.log('[GrapevineContext] 🐒 Monkey patching SDK API URL');
      
      // Type assertion since the SDK might not expose apiUrl publicly
      const sdkWithApiUrl = grapevine as any;
      if (sdkWithApiUrl.apiUrl) {
        console.log('[GrapevineContext] Original URL:', sdkWithApiUrl.apiUrl);
        sdkWithApiUrl.apiUrl = apiUrl;
        console.log('[GrapevineContext] Patched URL:', apiUrl);
      } else {
        console.warn('[GrapevineContext] SDK does not have apiUrl property to patch');
      }
    }
  }, [grapevine, apiUrl]);

  // Debug logging - EXTENDED to show API URL
  useEffect(() => {
    console.log('[GrapevineContext] 🔍 ===== STATE =====');
    console.log('[GrapevineContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[GrapevineContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[GrapevineContext] - walletClient:', walletClient ? 'available' : 'null');
    console.log('[GrapevineContext] - grapevine:', grapevine ? 'initialized' : 'null');
    console.log('[GrapevineContext] - API URL from env:', apiUrl);
    console.log('[GrapevineContext] - Network:', validNetwork);

    // Log the actual API URL being used by SDK (if accessible)
    if (grapevine) {
      const sdkWithApiUrl = grapevine as any;
      if (sdkWithApiUrl.apiUrl) {
        console.log('[GrapevineContext] - SDK API URL:', sdkWithApiUrl.apiUrl);
      }
    }

    console.log('[GrapevineContext] ===== END =====');
  }, [wagmiAccount, walletClient, grapevine, apiUrl, validNetwork]);

  const value: GrapevineContextType = {
    grapevine,
    isInitialized: !!grapevine,
  };

  return (
    <GrapevineContext.Provider value={value}>
      {children}
    </GrapevineContext.Provider>
  );
}

export function useGrapevine(): GrapevineContextType {
  const context = useContext(GrapevineContext);
  if (context === undefined) {
    throw new Error('useGrapevine must be used within a GrapevineProvider');
  }
  return context;
}