import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { transactionsApi } from '@/services/grapevineApi';
import { useWallet } from '@/context/WalletContext';

type TransactionsParams = {
  page_size?: string;
  page_token?: string;
  payer?: string;
  pay_to?: string;
  entry_id?: string;
};

type TransactionData = {
  id: string;
  piid: string | null;
  payer: string;
  pay_to: string;
  amount: string;
  asset: string;
  entry_id: string | null;
  transaction_hash: string;
  created_at: number;
};

type TransactionsResponse = {
  data: TransactionData[];
  pagination: {
    page_size: number;
    next_page_token: string | null;
    has_more: boolean;
  };
};

/**
 * Hook to fetch transactions with optional filtering
 * No authentication required
 */
export function useTransactions(
  params?: TransactionsParams,
  options?: Omit<UseQueryOptions<TransactionsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      // Fetch transactions (no auth required)
      const response = await transactionsApi.getTransactions(params);
      return response;
    },
    ...options,
  });
}

/**
 * Hook to check if the current user has already purchased a specific entry
 * No authentication required - uses wallet address to filter transactions
 */
export function useHasPurchasedEntry(
  entryId: string | undefined,
  options?: Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'>
) {
  const { address } = useWallet();

  return useQuery({
    queryKey: ['has-purchased-entry', entryId, address],
    queryFn: async () => {
      if (!address || !entryId) {
        return false;
      }

      try {
        // Fetch transactions filtered by payer (current wallet) and entry_id
        // No auth required
        const response = await transactionsApi.getTransactions({
          payer: address,
          entry_id: entryId,
          page_size: '1', // We only need to know if at least one exists
        });

        // Return true if any transactions exist
        return (response?.data?.length ?? 0) > 0;
      } catch (error) {
        console.error('Failed to check if entry is purchased:', error);
        // Return false if there's an error (don't block the UI)
        return false;
      }
    },
    enabled: !!address && !!entryId && (options?.enabled ?? true),
    staleTime: 0, // Always refetch to ensure fresh data
    ...options,
  });
}
