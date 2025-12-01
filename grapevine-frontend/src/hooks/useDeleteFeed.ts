import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/context/WalletContext';
import { useGrapevine } from '@/context/GrapevineContext';

/**
 * Hook for deleting feeds with signature authentication
 * Integrates with the real Grapevine API
 */
export function useDeleteFeed() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { grapevine } = useGrapevine();

  return useMutation({
    mutationFn: async (feedId: string) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!grapevine) {
        throw new Error('Grapevine SDK not initialized');
      }

      await grapevine.feeds.delete(feedId);

      console.log('Feed deleted:', feedId);
    },
    onSuccess: () => {
      // Invalidate all feed-related queries to refetch
      queryClient.invalidateQueries({ queryKey: ['grapevine-feeds'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
    },
  });
}
