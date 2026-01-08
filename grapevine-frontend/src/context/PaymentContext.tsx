import { createContext, useContext, useState, type ReactNode } from 'react';
import { useWalletClient } from 'wagmi';
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import type { ClientEvmSigner } from '@x402/evm';
import { useWallet } from '@/context/WalletContext';
import { createFarcasterAccount } from '@/lib/wallet-adapters/farcaster';

interface PaymentContextType {
  fetchWithPayment: (url: string, options?: RequestInit) => Promise<Response>;
  isLoading: boolean;
  error: string | null;
}

// Export the context so both providers can use it
export const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

/**
 * Farcaster Payment Provider - uses wagmi wallet client directly
 */
export function FarcasterPaymentProvider({ children }: { children: ReactNode }) {
  const { isConnected, address } = useWallet();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithPayment = async (url: string, options?: RequestInit): Promise<Response> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🛒 [x402] Starting purchase flow (Farcaster mode)...');
      console.log('🔍 [x402] Connected address:', address);

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      console.log('🔍 [x402] Wallet client:', {
        address: walletClient.account?.address,
        chainId: walletClient.chain?.id,
      });

      const account = createFarcasterAccount(walletClient);

      console.log('🔍 [x402] Account created:', {
        address: account.address,
        type: account.type,
        source: account.source,
      });

      // Create x402 client and register EVM schemes (supports both v1 and v2)
      const client = new x402Client();
      registerExactEvmScheme(client, { signer: account as ClientEvmSigner });

      // Wrap fetch with x402 payment handling
      const paymentFetch = wrapFetchWithPayment(fetch, client);

      console.log('🌐 [x402] Making x402 request to:', url);

      // Ensure options is always defined (required by @x402/fetch v2)
      const response = await paymentFetch(url, options ?? { method: 'GET' });

      console.log('📦 [x402] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      setIsLoading(false);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  };

  return (
    <PaymentContext.Provider value={{ fetchWithPayment, isLoading, error }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment(): PaymentContextType {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}
