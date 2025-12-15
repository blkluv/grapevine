import { createContext, useContext, useState, type ReactNode } from 'react';
import { useWalletClient } from 'wagmi';
import { wrapFetchWithPayment } from 'x402-fetch';
import { useWallet } from '@/context/WalletContext';
import { createFarcasterAccount } from '@/lib/wallet-adapters/farcaster';

interface PaymentContextType {
  fetchWithPayment: (url: string, options?: RequestInit, maxValue?: bigint) => Promise<Response>;
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

  const fetchWithPayment = async (url: string, options?: RequestInit, maxValue?: bigint): Promise<Response> => {
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

      // Wrap fetch with x402 payment handling
      const paymentFetch = wrapFetchWithPayment(fetch, account as any, maxValue);

      console.log('🌐 [x402] Making x402 request to:', url);

      const response = await paymentFetch(url, options);

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
