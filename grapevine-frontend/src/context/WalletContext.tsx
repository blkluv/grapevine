import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useSignMessage, useAccount, useConnect, useDisconnect } from 'wagmi';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import type { SignaturePayload } from '@/services/auth';
import { grapevineApiClient } from '@/services/grapevineApi';
import { useFarcaster } from './FarcasterContext';

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

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { isInMiniApp, isSDKReady } = useFarcaster();

  // Privy hooks (only used when NOT in mini app)
  const { ready: privyReady, authenticated: privyAuthenticated, login: privyLogin, logout: privyLogout } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();

  // Wagmi hooks (used in both modes)
  const wagmiAccount = useAccount();
  const { connect: wagmiConnect } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  // Farcaster connector ref (stable instance)
  const farcasterConnectorRef = useRef(miniAppConnector());

  // Track if we've attempted auto-connect in Farcaster mode
  const [farcasterConnectAttempted, setFarcasterConnectAttempted] = useState(false);

  // Determine the mode we're operating in
  const isFarcasterMode = isSDKReady && isInMiniApp;
  const isPrivyMode = !isFarcasterMode;

  console.log('[WalletContext] Mode:', isFarcasterMode ? 'FARCASTER' : 'PRIVY');

  // ============================================
  // FARCASTER MODE: Auto-connect wagmi on load
  // ============================================
  useEffect(() => {
    if (!isFarcasterMode || farcasterConnectAttempted || wagmiAccount.isConnected) {
      return;
    }

    const autoConnect = async () => {
      try {
        console.log('[WalletContext] 🔄 Farcaster mode: Auto-connecting wagmi...');
        await wagmiConnect({ connector: farcasterConnectorRef.current });
        console.log('[WalletContext] ✅ Farcaster wagmi connected!');
      } catch (error) {
        console.error('[WalletContext] ❌ Farcaster auto-connect failed:', error);
      } finally {
        setFarcasterConnectAttempted(true);
      }
    };

    autoConnect();
  }, [isFarcasterMode, farcasterConnectAttempted, wagmiAccount.isConnected, wagmiConnect]);

  // ============================================
  // PRIVY MODE: Sync Privy wallet to Wagmi
  // ============================================
  useEffect(() => {
    if (!isPrivyMode || privyWallets.length === 0) return;
    setActiveWallet(privyWallets[0]);
  }, [isPrivyMode, privyWallets, setActiveWallet]);

  // ============================================
  // DETERMINE CONNECTION STATE
  // ============================================
  let isConnected = false;
  let isConnecting = false;
  let address: string | null = null;

  if (isFarcasterMode) {
    // Farcaster mode: connection state from wagmi
    isConnected = wagmiAccount.isConnected;
    isConnecting = !isSDKReady || (wagmiAccount.status === 'connecting');
    address = wagmiAccount.address ?? null;
  } else {
    // Privy mode: connection state from Privy + wagmi
    isConnecting = !privyReady;
    isConnected = privyReady && privyAuthenticated && wagmiAccount.isConnected;
    address = wagmiAccount.address ?? null;
  }

  // ============================================
  // ACTIONS
  // ============================================
  const connect = () => {
    if (isFarcasterMode) {
      // In Farcaster mode, try to connect wagmi with Farcaster connector
      console.log('[WalletContext] Farcaster connect requested');
      wagmiConnect({ connector: farcasterConnectorRef.current });
    } else {
      // In Privy mode, open Privy login modal
      console.log('[WalletContext] Privy connect requested');
      if (privyReady) {
        privyLogin();
      }
    }
  };

  const disconnect = async () => {
    if (isFarcasterMode) {
      // In Farcaster mode, disconnect wagmi
      console.log('[WalletContext] Farcaster disconnect requested');
      wagmiDisconnect();
    } else {
      // In Privy mode, logout from Privy (which handles wagmi disconnect)
      console.log('[WalletContext] Privy disconnect requested');
      await privyLogout();
    }
  };

  // ============================================
  // SIGN REQUEST (works the same in both modes via wagmi)
  // ============================================
  const signRequest = async (
    _method: string,
    _endpoint: string
  ): Promise<SignaturePayload> => {
    console.log('[WalletContext] 📝 signRequest called');
    console.log('[WalletContext] - Mode:', isFarcasterMode ? 'FARCASTER' : 'PRIVY');
    console.log('[WalletContext] - isConnected:', isConnected);
    console.log('[WalletContext] - address:', address);

    if (!isConnected || !address) {
      console.error('[WalletContext] ❌ Wallet not connected');
      throw new Error('Wallet not connected');
    }

    // Get nonce from API
    console.log('[WalletContext] Step 1: Getting nonce from API for address:', address);
    const nonceResponse = await grapevineApiClient.getNonce(address);
    console.log('[WalletContext] ✅ Got nonce response:', nonceResponse);

    // Sign using wagmi (works in both modes - wagmi uses the appropriate connector)
    console.log('[WalletContext] Step 2: Requesting signature via wagmi...');
    try {
      const signaturePromise = signMessageAsync({
        message: nonceResponse.message,
      });

      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Signature request timed out. Please check your wallet and try again.'));
        }, 30000);
      });

      // Race between signature and timeout
      const signature = await Promise.race([signaturePromise, timeoutPromise]);
      console.log('[WalletContext] ✅ Got signature:', signature);

      const payload = {
        address,
        message: nonceResponse.message,
        signature,
      };
      console.log('[WalletContext] ✅ Signature payload ready:', payload);
      return payload;
    } catch (error) {
      console.error('[WalletContext] ❌ Signature request failed:', error);

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

  // ============================================
  // DEBUG LOGGING
  // ============================================
  useEffect(() => {
    const privyWalletAddress = privyWallets[0]?.address;

    console.log('[WalletContext] 🔍 ===== STATE UPDATE =====');
    console.log('[WalletContext] - Mode:', isFarcasterMode ? 'FARCASTER' : 'PRIVY');
    console.log('[WalletContext] - isSDKReady:', isSDKReady);
    console.log('[WalletContext] - isInMiniApp:', isInMiniApp);
    console.log('[WalletContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[WalletContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[WalletContext] - wagmiAccount.status:', wagmiAccount.status);
    if (isPrivyMode) {
      console.log('[WalletContext] - privyReady:', privyReady);
      console.log('[WalletContext] - privyAuthenticated:', privyAuthenticated);
      console.log('[WalletContext] - privyWallets:', privyWallets.length);
      console.log('[WalletContext] - privyWallet[0].address:', privyWalletAddress);

      // Check for address mismatch
      if (privyWalletAddress && wagmiAccount.address && privyWalletAddress.toLowerCase() !== wagmiAccount.address.toLowerCase()) {
        console.warn('[WalletContext] ⚠️ ADDRESS MISMATCH!');
        console.warn('[WalletContext] - Privy wallet:', privyWalletAddress);
        console.warn('[WalletContext] - Wagmi account:', wagmiAccount.address);
        console.warn('[WalletContext] This could cause signature verification to fail!');
      }
    }
    console.log('[WalletContext] 🎯 FINAL: isConnected:', isConnected, 'address:', address);
    console.log('[WalletContext] ===== END STATE =====');
  }, [isFarcasterMode, isSDKReady, isInMiniApp, wagmiAccount, privyReady, privyAuthenticated, privyWallets, isConnected, address, isPrivyMode]);

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
