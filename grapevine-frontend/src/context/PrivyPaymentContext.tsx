import { useState, type ReactNode } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { wrapFetchWithPayment } from 'x402-fetch';
import { useWallet } from '@/context/WalletContext';
import { createPrivyAccount } from '@/lib/wallet-adapters/privy';
import { PaymentContext } from './PaymentContext';

/**
 * Privy Payment Provider - uses Privy wallet for signing
 */
export function PrivyPaymentProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useWallet();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithPayment = async (url: string, options?: RequestInit, maxValue?: bigint): Promise<Response> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🛒 [x402] Starting purchase flow (Privy mode)...');
      const walletsInfo = wallets.map((w, i) => ({
        index: i,
        address: w.address,
        walletClientType: w.walletClientType,
        connectorType: w.connectorType,
      }));
      console.log('🔍 [x402] All available wallets (ordered by recency):', walletsInfo);

      // Use the most recently connected wallet (wallets[0])
      const wallet = wallets[0];

      if (!wallet) {
        throw new Error('No wallet connected');
      }

      console.log('🔍 [x402] Using most recent wallet (wallets[0]):', {
        address: wallet.address,
        walletClientType: wallet.walletClientType,
        connectorType: wallet.connectorType,
      });

      // Create viem-compatible account from Privy wallet
      const account = createPrivyAccount(wallet);

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
