import { useState, useEffect, type ReactNode } from 'react';
import { useSignMessage, useAccount, useConnect, useDisconnect, useConfig } from 'wagmi';
import type { SignaturePayload } from '@/services/auth';
import { grapevineApiClient } from '@/services/grapevineApi';
import { useFarcaster } from './FarcasterContext';
// Import the shared context and type from the main WalletContext
import { WalletContext, type WalletContextType } from './WalletContext';

interface FarcasterWalletProviderProps {
  children: ReactNode;
}

export function FarcasterWalletProvider({ children }: FarcasterWalletProviderProps) {
  const { isSDKReady } = useFarcaster();

  // Wagmi hooks
  const wagmiAccount = useAccount();
  const { connect: wagmiConnect, connectors: connectConnectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const config = useConfig();

  // Get connectors from config - more reliable than useConnectors()
  const configConnectors = config.connectors;

  // Find the Farcaster connector - check multiple possible IDs/names
  const farcasterConnector = configConnectors.find(c =>
    c.id === 'farcasterMiniApp' ||
    c.id === 'farcaster' ||
    c.id.toLowerCase().includes('farcaster') ||
    c.name?.toLowerCase().includes('farcaster')
  ) || connectConnectors.find(c =>
    c.id === 'farcasterMiniApp' ||
    c.id === 'farcaster' ||
    c.id.toLowerCase().includes('farcaster') ||
    c.name?.toLowerCase().includes('farcaster')
  );

  // Track if we've attempted auto-connect
  const [connectAttempted, setConnectAttempted] = useState(false);

  console.log('[FarcasterWalletContext] Mode: FARCASTER');

  // Auto-connect wagmi on load
  useEffect(() => {
    console.log('[FarcasterWalletContext] Auto-connect check:', {
      isSDKReady,
      connectAttempted,
      wagmiAccountConnected: wagmiAccount.isConnected,
      wagmiAccountStatus: wagmiAccount.status,
      farcasterConnectorFound: !!farcasterConnector,
      farcasterConnectorId: farcasterConnector?.id,
      configConnectors: configConnectors.map(c => ({ id: c.id, name: c.name })),
      connectConnectors: connectConnectors.map(c => ({ id: c.id, name: c.name })),
    });

    if (!isSDKReady || connectAttempted || wagmiAccount.isConnected) {
      return;
    }

    if (!farcasterConnector) {
      console.error('[FarcasterWalletContext] ❌ Farcaster connector not found in wagmi config!');
      setConnectAttempted(true);
      return;
    }

    const autoConnect = async () => {
      try {
        console.log('[FarcasterWalletContext] 🔄 Auto-connecting wagmi...');
        console.log('[FarcasterWalletContext] Using connector:', {
          id: farcasterConnector.id,
          name: farcasterConnector.name,
        });

        const result = await wagmiConnect({ connector: farcasterConnector });
        console.log('[FarcasterWalletContext] ✅ Connected! Result:', result);
      } catch (error) {
        console.error('[FarcasterWalletContext] ❌ Auto-connect failed:', error);
        console.error('[FarcasterWalletContext] Error details:', {
          name: (error as Error)?.name,
          message: (error as Error)?.message,
        });
      } finally {
        setConnectAttempted(true);
      }
    };

    autoConnect();
  }, [isSDKReady, connectAttempted, wagmiAccount.isConnected, wagmiAccount.status, wagmiConnect, farcasterConnector, configConnectors, connectConnectors]);

  // Connection state
  const isConnected = wagmiAccount.isConnected;
  const isConnecting = !isSDKReady || wagmiAccount.status === 'connecting';
  const address = wagmiAccount.address ?? null;

  // Actions
  const connect = () => {
    console.log('[FarcasterWalletContext] Connect requested');
    if (farcasterConnector) {
      wagmiConnect({ connector: farcasterConnector });
    } else {
      console.error('[FarcasterWalletContext] Farcaster connector not found!');
    }
  };

  const disconnect = () => {
    console.log('[FarcasterWalletContext] Disconnect requested');
    wagmiDisconnect();
  };

  // Sign request
  const signRequest = async (
    _method: string,
    _endpoint: string
  ): Promise<SignaturePayload> => {
    console.log('[FarcasterWalletContext] 📝 signRequest called');
    console.log('[FarcasterWalletContext] - isConnected:', isConnected);
    console.log('[FarcasterWalletContext] - address:', address);

    if (!isConnected || !address) {
      console.error('[FarcasterWalletContext] ❌ Wallet not connected');
      throw new Error('Wallet not connected');
    }

    // Get nonce from API
    console.log('[FarcasterWalletContext] Getting nonce for address:', address);
    const nonceResponse = await grapevineApiClient.getNonce(address);
    console.log('[FarcasterWalletContext] ✅ Got nonce');

    // Sign using wagmi
    console.log('[FarcasterWalletContext] Requesting signature...');
    try {
      const signature = await signMessageAsync({
        message: nonceResponse.message,
      });
      console.log('[FarcasterWalletContext] ✅ Got signature');

      return {
        address,
        message: nonceResponse.message,
        signature,
      };
    } catch (error) {
      console.error('[FarcasterWalletContext] ❌ Signature failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('denied')) {
          throw new Error('Signature request was rejected');
        }
      }

      throw new Error('Failed to sign message. Please try again.');
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('[FarcasterWalletContext] 🔍 ===== STATE =====');
    console.log('[FarcasterWalletContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[FarcasterWalletContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[FarcasterWalletContext] - wagmiAccount.status:', wagmiAccount.status);
    console.log('[FarcasterWalletContext] 🎯 FINAL: isConnected:', isConnected, 'address:', address);
    console.log('[FarcasterWalletContext] ===== END =====');
  }, [wagmiAccount, isConnected, address]);

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

// Note: useWallet hook is exported from WalletContext.tsx
// All consumers should import from there, not from this file
