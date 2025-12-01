import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useWalletClient, useConnectors, useAccount } from 'wagmi';
import { useGrapevine as useGrapevineSDK } from '@pinata/grapevine-sdk/dist/react';
import { useWallet } from './WalletContext';
import { useWallets } from '@privy-io/react-auth';
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
  const { address } = useWallet();
  const { data: walletClient } = useWalletClient();
  const wagmiConnectors = useConnectors();
  const wagmiAccount = useAccount();
  const privyWallets = useWallets();

  // Get the active wallet from Privy (wallets[0] is the active one)
  const activePrivyWallet = privyWallets.wallets[0];

  // Get network from environment variable
  const network = import.meta.env.VITE_NETWORK as 'testnet' | 'mainnet';
  const validNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';

  // LOG: ALL available wallets and connectors
  console.log('[GrapevineContext] 🔍 ===== WALLET DIAGNOSIS START =====');
  console.log('[GrapevineContext] - address from WalletContext:', address);

  console.log('[GrapevineContext] 📋 Privy Wallets (from useWallets):');
  console.log('[GrapevineContext] - Total wallets:', privyWallets.wallets.length);
  privyWallets.wallets.forEach((wallet, index) => {
    console.log(`[GrapevineContext] - Wallet ${index}:`, {
      address: wallet.address,
      walletClientType: wallet.walletClientType,
      connectorType: wallet.connectorType,
      imported: wallet.imported,
      isActive: index === 0,
    });
  });

  console.log('[GrapevineContext] 🔌 Wagmi Connectors (from useConnectors):');
  console.log('[GrapevineContext] - Total connectors:', wagmiConnectors.length);
  wagmiConnectors.forEach((connector, index) => {
    console.log(`[GrapevineContext] - Connector ${index}:`, {
      id: connector.id,
      name: connector.name,
      type: connector.type,
    });
  });

  console.log('[GrapevineContext] 💼 Wagmi Account (from useAccount):');
  console.log('[GrapevineContext] - address:', wagmiAccount.address);
  console.log('[GrapevineContext] - connector:', wagmiAccount.connector);
  console.log('[GrapevineContext] - isConnected:', wagmiAccount.isConnected);
  console.log('[GrapevineContext] - status:', wagmiAccount.status);

  console.log('[GrapevineContext] 🎯 WalletClient (from useWalletClient - WAGMI):');
  console.log('[GrapevineContext] - walletClient:', walletClient);
  if (walletClient) {
    console.log('[GrapevineContext] - walletClient.account:', walletClient.account);
    console.log('[GrapevineContext] - walletClient.chain:', walletClient.chain);
    console.log('[GrapevineContext] - walletClient.transport:', walletClient.transport);
    // @ts-ignore - accessing internal properties for debugging
    console.log('[GrapevineContext] - walletClient.key:', walletClient.key);
    // @ts-ignore
    console.log('[GrapevineContext] - walletClient.name:', walletClient.name);
    // @ts-ignore
    console.log('[GrapevineContext] - walletClient.type:', walletClient.type);
  }
  console.log('[GrapevineContext] ===== WALLET DIAGNOSIS END =====');

  // Initialize Grapevine SDK with wagmi's wallet client
  // The SDK will automatically use the walletClient passed here
  const grapevine = useGrapevineSDK({
    walletClient,
    network: validNetwork,
    debug: import.meta.env.DEV, // Enable debug in development mode
  });

  // Log when the wallet client changes
  useEffect(() => {
    if (walletClient && activePrivyWallet) {
      console.log('[GrapevineContext] 🔄 Wallet client active:');
      console.log('[GrapevineContext] - Active Privy wallet:', activePrivyWallet.walletClientType);
      console.log('[GrapevineContext] - Active Privy wallet address:', activePrivyWallet.address);
      console.log('[GrapevineContext] - Wagmi walletClient address:', walletClient.account.address);
      console.log('[GrapevineContext] - Match:', walletClient.account.address.toLowerCase() === activePrivyWallet.address.toLowerCase() ? '✅ YES' : '⚠️ NO');
    }
  }, [walletClient, activePrivyWallet]);

  const value: GrapevineContextType = {
    grapevine,
    isInitialized: !!grapevine,
  };

  console.log('[GrapevineContext] 🎯 Grapevine SDK initialized:', grapevine);
  console.log('[GrapevineContext] - isInitialized:', !!grapevine);

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
