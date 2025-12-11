import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAccount, useWalletClient as useWagmiWalletClient } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom, type WalletClient } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { useGrapevine as useGrapevineSDK } from '@pinata/grapevine-sdk/dist/react';
import type { GrapevineClient } from '@pinata/grapevine-sdk/dist/client';
import { useFarcaster } from './FarcasterContext';

export interface GrapevineContextType {
  grapevine: GrapevineClient | null;
  isInitialized: boolean;
  isWalletReady: boolean;
}

const GrapevineContext = createContext<GrapevineContextType | undefined>(undefined);

interface GrapevineProviderProps {
  children: ReactNode;
}

export function GrapevineProvider({ children }: GrapevineProviderProps) {
  const { isInMiniApp, isSDKReady } = useFarcaster();
  const wagmiAccount = useAccount();
  const { wallets: privyWallets } = useWallets();

  // Wagmi wallet client - used in Farcaster mode where wagmi handles the connection
  const { data: wagmiWalletClient, isLoading: isWagmiWalletClientLoading } = useWagmiWalletClient();

  // State to hold the wallet client we create from Privy's provider (for Privy mode only)
  const [privyWalletClient, setPrivyWalletClient] = useState<WalletClient | null>(null);
  const [isPrivyWalletClientLoading, setIsPrivyWalletClientLoading] = useState(false);

  // Determine if we're in Farcaster mode
  const isFarcasterMode = isSDKReady && isInMiniApp;

  // Get network from environment variable
  const network = import.meta.env.VITE_NETWORK as 'testnet' | 'mainnet';
  const validNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';
  const chain = validNetwork === 'mainnet' ? base : baseSepolia;

  // In Privy mode: Create wallet client from Privy's wallet provider
  // This ensures we use Privy's wallet management rather than relying on wagmi's useWalletClient
  // which can have sync issues with Privy's auth state
  useEffect(() => {
    // Skip if in Farcaster mode - wagmi handles it there
    if (isFarcasterMode) {
      return;
    }

    const setupPrivyWalletClient = async () => {
      // Get the first connected Privy wallet
      const privyWallet = privyWallets[0];

      if (!privyWallet) {
        setPrivyWalletClient(null);
        return;
      }

      try {
        setIsPrivyWalletClientLoading(true);

        // Get the EIP-1193 provider from the Privy wallet
        const provider = await privyWallet.getEthereumProvider();

        // Create a viem wallet client from the provider
        const client = createWalletClient({
          account: privyWallet.address as `0x${string}`,
          chain,
          transport: custom(provider),
        });

        setPrivyWalletClient(client);
      } catch (error) {
        console.error('[GrapevineContext] Failed to create wallet client from Privy:', error);
        setPrivyWalletClient(null);
      } finally {
        setIsPrivyWalletClientLoading(false);
      }
    };

    setupPrivyWalletClient();
  }, [isFarcasterMode, privyWallets, chain]);

  // Determine which wallet client to use:
  // - In Farcaster mode: use wagmi's wallet client (from the Farcaster connector)
  // - In Privy mode: use the wallet client we created from Privy's provider
  const walletClient = isFarcasterMode ? wagmiWalletClient : privyWalletClient;
  const isWalletClientLoading = isFarcasterMode ? isWagmiWalletClientLoading : isPrivyWalletClientLoading;

  // Initialize Grapevine SDK with the appropriate wallet client
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
    console.log('[GrapevineContext] 🔍 ===== STATE =====');
    console.log('[GrapevineContext] - mode:', isFarcasterMode ? 'FARCASTER' : 'PRIVY');
    console.log('[GrapevineContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[GrapevineContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[GrapevineContext] - walletClient:', walletClient ? 'available' : 'null');
    console.log('[GrapevineContext] - isWalletReady:', isWalletReady);
    console.log('[GrapevineContext] - grapevine:', grapevine ? 'initialized' : 'null');
    console.log('[GrapevineContext] ===== END =====');
  }, [isFarcasterMode, wagmiAccount, walletClient, isWalletReady, grapevine]);

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
