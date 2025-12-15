import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, type WalletClient } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { useGrapevine as useGrapevineSDK } from '@pinata/grapevine-sdk/dist/react';
import type { GrapevineClient } from '@pinata/grapevine-sdk/dist/client';

export interface GrapevineContextType {
  grapevine: GrapevineClient | null;
  isInitialized: boolean;
  isWalletReady: boolean;
}

// Export the context so FarcasterGrapevineProvider can use the same context
export const GrapevineContext = createContext<GrapevineContextType | undefined>(undefined);

interface GrapevineProviderProps {
  children: ReactNode;
}

// Privy-only GrapevineProvider - creates wallet client from Privy's provider
export function GrapevineProvider({ children }: GrapevineProviderProps) {
  const wagmiAccount = useAccount();
  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();
  const { wallets: privyWallets } = useWallets();

  // State for wallet client created from Privy's provider
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [isWalletClientLoading, setIsWalletClientLoading] = useState(false);

  // Get network from environment variable
  const network = import.meta.env.VITE_NETWORK as 'testnet' | 'mainnet';
  const validNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';
  const chain = validNetwork === 'mainnet' ? base : baseSepolia;

  // Create wallet client from Privy's wallet provider
  // Only do this when user is actually authenticated to avoid triggering MetaMask popup
  useEffect(() => {
    const setupWalletClient = async () => {
      // Don't attempt to get provider until Privy is ready AND user is authenticated
      if (!privyReady || !privyAuthenticated) {
        setWalletClient(null);
        return;
      }

      const privyWallet = privyWallets[0];

      if (!privyWallet) {
        setWalletClient(null);
        return;
      }

      try {
        setIsWalletClientLoading(true);

        // Get the EIP-1193 provider from the Privy wallet
        const provider = await privyWallet.getEthereumProvider();

        // Create a viem wallet client from the provider
        const client = createWalletClient({
          account: privyWallet.address as `0x${string}`,
          chain,
          transport: custom(provider),
        });

        setWalletClient(client);
      } catch (error) {
        console.error('[GrapevineContext] Failed to create wallet client:', error);
        setWalletClient(null);
      } finally {
        setIsWalletClientLoading(false);
      }
    };

    setupWalletClient();
  }, [privyReady, privyAuthenticated, privyWallets, chain]);

  // Initialize Grapevine SDK
  const grapevine = useGrapevineSDK({
    walletClient: walletClient ?? undefined,
    network: validNetwork,
    debug: import.meta.env.DEV,
  });

  // Wallet is ready when authenticated, connected, and wallet client is available
  const isWalletReady = privyAuthenticated && wagmiAccount.isConnected && !!walletClient && !isWalletClientLoading;

  // Debug logging
  useEffect(() => {
    const privyWalletAddress = privyWallets[0]?.address;
    const walletClientAccount = walletClient?.account?.address;

    console.log('[GrapevineContext] 🔍 ===== STATE =====');
    console.log('[GrapevineContext] - privyReady:', privyReady);
    console.log('[GrapevineContext] - privyAuthenticated:', privyAuthenticated);
    console.log('[GrapevineContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[GrapevineContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[GrapevineContext] - privyWallet.address:', privyWalletAddress);
    console.log('[GrapevineContext] - walletClient.account:', walletClientAccount);
    console.log('[GrapevineContext] - walletClient:', walletClient ? 'available' : 'null');
    console.log('[GrapevineContext] - isWalletReady:', isWalletReady);
    console.log('[GrapevineContext] - grapevine:', grapevine ? 'initialized' : 'null');

    // Check for address mismatch
    if (privyWalletAddress && wagmiAccount.address && privyWalletAddress !== wagmiAccount.address) {
      console.warn('[GrapevineContext] ⚠️ ADDRESS MISMATCH!');
    }
    console.log('[GrapevineContext] ===== END =====');
  }, [privyReady, privyAuthenticated, wagmiAccount, walletClient, isWalletReady, grapevine, privyWallets]);

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

export function useGrapevine(): GrapevineContextType {
  const context = useContext(GrapevineContext);
  if (context === undefined) {
    throw new Error('useGrapevine must be used within a GrapevineProvider');
  }
  return context;
}
