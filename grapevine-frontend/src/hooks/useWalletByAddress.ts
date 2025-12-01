import { useQuery } from '@tanstack/react-query';
import { grapevineApiClient } from '@/services/grapevineApi';

export const walletKeys = {
  all: ['wallets'] as const,
  byAddress: () => [...walletKeys.all, 'by-address'] as const,
  byAddressValue: (address: string) => [...walletKeys.byAddress(), address] as const,
  byId: () => [...walletKeys.all, 'by-id'] as const,
  byIdValue: (id: string) => [...walletKeys.byId(), id] as const,
  stats: (id: string) => [...walletKeys.byIdValue(id), 'stats'] as const,
};

/**
 * Hook to fetch wallet information by wallet address
 */
export function useWalletByAddress(address: string | null | undefined) {
  return useQuery({
    queryKey: walletKeys.byAddressValue(address || ''),
    queryFn: async () => {
      if (!address) {
        throw new Error('Wallet address is required');
      }
      try {
        return await grapevineApiClient.getWalletByAddress(address);
      } catch (error: any) {
        // If wallet not found (404), return null instead of throwing
        // This is expected for wallets that haven't interacted with the platform yet
        if (error?.message?.includes('Not Found') || error?.message?.includes('Wallet not found')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!address,
  });
}

/**
 * Hook to fetch wallet information by wallet ID
 */
export function useWallet(walletId: string | null | undefined) {
  return useQuery({
    queryKey: walletKeys.byIdValue(walletId || ''),
    queryFn: async () => {
      if (!walletId) {
        throw new Error('Wallet ID is required');
      }
      return await grapevineApiClient.getWallet(walletId);
    },
    enabled: !!walletId,
  });
}

/**
 * Hook to fetch wallet statistics
 */
export function useWalletStats(walletId: string | null | undefined) {
  return useQuery({
    queryKey: walletKeys.stats(walletId || ''),
    queryFn: async () => {
      if (!walletId) {
        throw new Error('Wallet ID is required');
      }
      return await grapevineApiClient.getWalletStats(walletId);
    },
    enabled: !!walletId,
  });
}
