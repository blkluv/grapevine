import { createContext, useContext, useEffect, useState, type ReactNode, useMemo } from 'react';
import { useWalletClient, useAccount, useSignMessage } from 'wagmi';
import { useGrapevine as useGrapevineSDK } from '@pinata/grapevine-sdk/dist/react';
import type { GrapevineClient } from '@pinata/grapevine-sdk/dist/client';
import { useWallet } from './WalletContext'; // Import your existing wallet context
import { grapevineApiClient } from '@/services/grapevineApi';

export interface GrapevineContextType {
  grapevine: GrapevineClient | null;
  isInitialized: boolean;
  authError: string | null;
  refreshAuth: () => Promise<void>;
}

const GrapevineContext = createContext<GrapevineContextType | undefined>(undefined);

interface GrapevineProviderProps {
  children: ReactNode;
}

export function GrapevineProvider({ children }: GrapevineProviderProps) {
  const { data: walletClient } = useWalletClient();
  const wagmiAccount = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { isConnected, address, signRequest } = useWallet(); // Use your existing wallet auth
  
  // Get network from environment variable
  const network = import.meta.env.VITE_NETWORK as 'testnet' | 'mainnet';
  const validNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';
  
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  // Create a custom wallet adapter that uses your existing auth system
  const customWalletAdapter = useMemo(() => {
    if (!address || !isConnected) {
      console.log('[GrapevineContext] No wallet connected for custom adapter');
      return null;
    }

    console.log('[GrapevineContext] Creating custom wallet adapter for:', address);
    
    return {
      getAddress: () => Promise.resolve(address),
      signMessage: async (message: string) => {
        try {
          console.log('[GrapevineContext] Custom adapter signing message:', message);
          // Use wagmi's signMessageAsync directly
          const signature = await signMessageAsync({ message });
          console.log('[GrapevineContext] Signature obtained:', signature);
          return signature;
        } catch (error) {
          console.error('[GrapevineContext] Failed to sign message:', error);
          throw error;
        }
      },
      // Optional: Add other methods if needed by SDK
      signTypedData: walletClient?.signTypedData?.bind(walletClient),
      signTransaction: walletClient?.signTransaction?.bind(walletClient),
    };
  }, [address, isConnected, signMessageAsync, walletClient]);

  // Initialize Grapevine SDK with our custom wallet adapter
  const grapevine = useGrapevineSDK({
    walletClient: customWalletAdapter || walletClient, // Fallback to wagmi walletClient
    network: validNetwork,
    debug: import.meta.env.DEV,
  });

  // Function to manually add auth headers to SDK requests
  const refreshAuth = async () => {
    if (!address || !isConnected || !grapevine) {
      setAuthError('Wallet not connected or Grapevine not initialized');
      return;
    }

    try {
      console.log('[GrapevineContext] Refreshing auth for address:', address);
      
      // Get nonce and sign using your existing auth flow
      const signaturePayload = await signRequest('GET', '/v1/auth/test');
      console.log('[GrapevineContext] Auth refreshed successfully');
      
      setAuthError(null);
      setIsAuthInitialized(true);
      
      // The SDK should now use this signature for subsequent requests
      // If the SDK has a method to set auth headers, use it here
      if (grapevine && 'setAuthToken' in grapevine) {
        (grapevine as any).setAuthToken(signaturePayload.signature);
      }
    } catch (error) {
      console.error('[GrapevineContext] Failed to refresh auth:', error);
      setAuthError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAuthInitialized(false);
    }
  };

  // Auto-refresh auth when wallet connects or changes
  useEffect(() => {
    if (isConnected && address && grapevine && !isAuthInitialized) {
      console.log('[GrapevineContext] Auto-refreshing auth on wallet connection');
      refreshAuth();
    }
  }, [isConnected, address, grapevine, isAuthInitialized]);

  // Test authentication when Grapevine client is ready
  useEffect(() => {
    if (!grapevine || !isConnected) return;

    const testAuth = async () => {
      try {
        console.log('[GrapevineContext] Testing authentication...');
        // Try a simple API call that requires auth
        await grapevine.feeds.list({ page_size: 1 });
        console.log('[GrapevineContext] ✅ Authentication test passed');
        setAuthError(null);
        setIsAuthInitialized(true);
      } catch (error: any) {
        console.error('[GrapevineContext] ❌ Authentication test failed:', error);
        
        if (error?.status === 401) {
          setAuthError('Authentication required. Please ensure your wallet is connected and try again.');
          setIsAuthInitialized(false);
        } else {
          setAuthError(`API error: ${error?.message || 'Unknown error'}`);
        }
      }
    };

    testAuth();
  }, [grapevine, isConnected]);

  // Debug logging
  useEffect(() => {
    console.log('[GrapevineContext] 🔍 ===== STATE =====');
    console.log('[GrapevineContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[GrapevineContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[GrapevineContext] - walletClient:', walletClient ? 'available' : 'null');
    console.log('[GrapevineContext] - customWalletAdapter:', customWalletAdapter ? 'created' : 'null');
    console.log('[GrapevineContext] - grapevine:', grapevine ? 'initialized' : 'null');
    console.log('[GrapevineContext] - isAuthInitialized:', isAuthInitialized);
    console.log('[GrapevineContext] - authError:', authError);
    
    if (grapevine) {
      // Log the actual API URL being used
      console.log('[GrapevineContext] - API URL:', (grapevine as any).apiUrl || 'unknown');
    }
    
    console.log('[GrapevineContext] ===== END =====');
  }, [wagmiAccount, walletClient, grapevine, customWalletAdapter, isAuthInitialized, authError]);

  const value: GrapevineContextType = {
    grapevine,
    isInitialized: !!grapevine && isAuthInitialized,
    authError,
    refreshAuth,
  };

  return (
    <GrapevineContext.Provider value={value}>
      {authError && (
        <div style={{
          background: '#ff4444',
          color: 'white',
          padding: '10px',
          margin: '10px',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <strong>Authentication Error:</strong> {authError}
          <button 
            onClick={refreshAuth}
            style={{
              marginLeft: '10px',
              background: 'white',
              color: '#ff4444',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}
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