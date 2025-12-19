import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useSignMessage, useAccount } from 'wagmi';
import type { SignaturePayload } from '@/services/auth';
import { grapevineApiClient } from '@/services/grapevineApi';

export interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;

  // Signature
  signRequest: (method: string, endpoint: string) => Promise<SignaturePayload>;
}

// Export the context so FarcasterWalletProvider can use the same context
export const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

// Privy-only WalletProvider (used when NOT in Farcaster mini app)
export function WalletProvider({ children }: WalletProviderProps) {
  // Privy hooks
  const { ready: privyReady, authenticated: privyAuthenticated, login: privyLogin, logout: privyLogout } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();

  // Wagmi hooks
  const wagmiAccount = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Sync Privy wallet to Wagmi
  useEffect(() => {
    if (privyWallets.length === 0) return;
    setActiveWallet(privyWallets[0]);
  }, [privyWallets, setActiveWallet]);

  // Connection state
  const isConnecting = !privyReady;
  const isConnected = privyReady && privyAuthenticated && wagmiAccount.isConnected;
  const address = wagmiAccount.address ?? null;

  // Actions
  const connect = () => {
    console.log('[WalletContext] Privy connect requested');
    if (privyReady) {
      privyLogin();
    }
  };

  const disconnect = async () => {
    console.log('[WalletContext] Privy disconnect requested');
    await privyLogout();
  };

  // Sign request
  const signRequest = async (
    _method: string,
    _endpoint: string
  ): Promise<SignaturePayload> => {

    console.log('[WalletContext] 📝 signRequest called');
    console.log('[WalletContext] - isConnected:', isConnected);
    console.log('[WalletContext] - address:', address);

    if (!isConnected || !address) {
      console.error('[WalletContext] ❌ Wallet not connected');
      throw new Error('Wallet not connected');
    }

    // Get nonce from API
    console.log('[WalletContext] Getting nonce for address:', address);
    const nonceResponse = await grapevineApiClient.getNonce(address);
    console.log('[WalletContext] ✅ Got nonce');

    // Sign using wagmi
    console.log('[WalletContext] Requesting signature...');
    try {
      const signaturePromise = signMessageAsync({
        message: nonceResponse.message,
      });

      // Timeout after 30 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Signature request timed out. Please check your wallet and try again.'));
        }, 30000);
      });

      const signature = await Promise.race([signaturePromise, timeoutPromise]);
      console.log('[WalletContext] ✅ Got signature');

      return {
        address,
        message: nonceResponse.message,
        signature,
      };
    } catch (error) {
      console.error('[WalletContext] ❌ Signature failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('denied')) {
          throw new Error('Signature request was rejected');
        }
        if (error.message.includes('timeout')) {
          throw error;
        }
      }

      throw new Error('Failed to sign message. Please try again.');
    }
  };

  // Debug logging
  useEffect(() => {
    const privyWalletAddress = privyWallets[0]?.address;

    console.log('[WalletContext] 🔍 ===== STATE =====');
    console.log('[WalletContext] - privyReady:', privyReady);
    console.log('[WalletContext] - privyAuthenticated:', privyAuthenticated);
    console.log('[WalletContext] - privyWallets:', privyWallets.length);
    console.log('[WalletContext] - privyWallet[0].address:', privyWalletAddress);
    console.log('[WalletContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[WalletContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[WalletContext] - wagmiAccount.status:', wagmiAccount.status);

    // Check for address mismatch
    if (privyWalletAddress && wagmiAccount.address && privyWalletAddress.toLowerCase() !== wagmiAccount.address.toLowerCase()) {
      console.warn('[WalletContext] ⚠️ ADDRESS MISMATCH!');
      console.warn('[WalletContext] - Privy wallet:', privyWalletAddress);
      console.warn('[WalletContext] - Wagmi account:', wagmiAccount.address);
    }

    console.log('[WalletContext] 🎯 FINAL: isConnected:', isConnected, 'address:', address);
    console.log('[WalletContext] ===== END =====');
  }, [wagmiAccount, privyReady, privyAuthenticated, privyWallets, isConnected, address]);

  const value: WalletContextType = {
    isConnected,
    isConnecting,
    address,
    connect,
    disconnect,
    signRequest,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
