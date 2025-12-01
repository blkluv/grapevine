import { useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { wrapFetchWithPayment } from 'x402-fetch';
import { createPrivyAccount } from '@/lib/wallet-adapters/privy';
import { useWallet } from '@/context/WalletContext';

interface UseX402PaymentReturn {
  /** Make a paid request to an x402-protected resource */
  fetchWithPayment: (url: string, options?: RequestInit, maxValue?: bigint) => Promise<Response>;
  /** Whether a payment request is in progress */
  isLoading: boolean;
  /** Error message if payment failed */
  error: string | null;
}

/**
 * React hook for making x402-authenticated requests with Privy wallets.
 *
 * This hook automatically handles the x402 payment flow:
 * 1. Makes initial request to the protected resource
 * 2. Receives 402 Payment Required response with payment details
 * 3. Prompts user to sign USDC transfer authorization (EIP-712)
 * 4. Submits payment and retrieves content
 *
 * Works with Privy wallet management - automatically uses the active wallet
 * from the WalletContext.
 *
 * @example
 * ```tsx
 * const { fetchWithPayment, isLoading, error } = useX402Payment()
 *
 * const createFeed = async (data) => {
 *   const response = await fetchWithPayment('https://api.example.com/feeds', {
 *     method: 'POST',
 *     body: JSON.stringify(data)
 *   })
 *   const result = await response.json()
 *   return result
 * }
 * ```
 */
export function useX402Payment(): UseX402PaymentReturn {
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
      console.log('🛒 [x402] Starting purchase flow...');
      const walletsInfo = wallets.map((w, i) => ({
        index: i,
        address: w.address,
        walletClientType: w.walletClientType,
        connectorType: w.connectorType,
      }));
      console.log('🔍 [x402] All available wallets (ordered by recency):', walletsInfo);

      // Use the most recently connected wallet (wallets[0])
      // Privy automatically orders wallets by connection recency
      const wallet = wallets[0];

      if (!wallet) {
        throw new Error('No wallet connected');
      }

      console.log('🔍 [x402] Using most recent wallet (wallets[0]):', {
        address: wallet.address,
        walletClientType: wallet.walletClientType,
        connectorType: wallet.connectorType,
      });

      // Create viem-compatible account from Privy wallet using shared adapter
      const account = createPrivyAccount(wallet);

      console.log('🔍 [x402] Account created:', {
        address: account.address,
        type: account.type,
        source: account.source,
      });

      // Wrap fetch with x402 payment handling
      // Pass maxValue to support payments over the default $0.10 limit
      const paymentFetch = wrapFetchWithPayment(fetch, account as any, maxValue);

      console.log('🌐 [x402] Making x402 request to:', url);

      // Make the request - x402-fetch handles payment automatically
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

  return {
    fetchWithPayment,
    isLoading,
    error,
  };
}
