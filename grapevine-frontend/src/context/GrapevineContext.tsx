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

  // Initialize Grapevine SDK with wagmi's wallet client
  // This works in both Privy mode and Farcaster mode since both use wagmi
  const grapevine = useGrapevineSDK({
    walletClient,
    network: validNetwork,
    debug: import.meta.env.DEV,
  });

  // Debug logging
  useEffect(() => {
    console.log('[GrapevineContext] 🔍 ===== STATE =====');
    console.log('[GrapevineContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[GrapevineContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[GrapevineContext] - walletClient:', walletClient ? 'available' : 'null');
    console.log('[GrapevineContext] - grapevine:', grapevine ? 'initialized' : 'null');
    console.log('[GrapevineContext] ===== END =====');
  }, [wagmiAccount, walletClient, grapevine]);

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
