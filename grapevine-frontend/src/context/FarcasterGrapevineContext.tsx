import { useEffect, type ReactNode } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useGrapevine as useGrapevineSDK } from '@pinata/grapevine-sdk/dist/react';
// Import the shared context and type from the main GrapevineContext
import { GrapevineContext, type GrapevineContextType } from './GrapevineContext';

interface FarcasterGrapevineProviderProps {
  children: ReactNode;
}

// Farcaster-only GrapevineProvider - uses wagmi wallet client directly
export function FarcasterGrapevineProvider({ children }: FarcasterGrapevineProviderProps) {
  const wagmiAccount = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient();

  // Get network from environment variable
  const network = import.meta.env.VITE_NETWORK as 'testnet' | 'mainnet';
  const validNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';

  // Initialize Grapevine SDK with wagmi's wallet client
  const grapevine = useGrapevineSDK({
    walletClient: walletClient ?? undefined,
    network: validNetwork,
    debug: import.meta.env.DEV,
  });

  // Wallet is ready when:
  // - We have a connected account AND
  // - We have a wallet client AND
  // - The wallet client is not loading
  const isWalletReady = wagmiAccount.isConnected && !!walletClient && !isWalletClientLoading;

  // Debug logging
  useEffect(() => {
    const walletClientAccount = walletClient?.account?.address;

    console.log('[FarcasterGrapevineContext] 🔍 ===== STATE =====');
    console.log('[FarcasterGrapevineContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[FarcasterGrapevineContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[FarcasterGrapevineContext] - walletClient.account:', walletClientAccount);
    console.log('[FarcasterGrapevineContext] - walletClient:', walletClient ? 'available' : 'null');
    console.log('[FarcasterGrapevineContext] - isWalletClientLoading:', isWalletClientLoading);
    console.log('[FarcasterGrapevineContext] - isWalletReady:', isWalletReady);
    console.log('[FarcasterGrapevineContext] - grapevine:', grapevine ? 'initialized' : 'null');
    console.log('[FarcasterGrapevineContext] ===== END =====');
  }, [wagmiAccount, walletClient, isWalletClientLoading, isWalletReady, grapevine]);

  const value: GrapevineContextType = {
    grapevine,
    isInitialized: !!grapevine,
    isWalletReady,
  };

  return (
    <GrapevineContext.Provider value={value}>
      {children}
    </GrapevineContext.Provider>
  );
}

// Note: useGrapevine hook is exported from GrapevineContext.tsx
// All consumers should import from there, not from this file
