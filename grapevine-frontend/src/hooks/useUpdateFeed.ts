import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/context/WalletContext';
import { useGrapevine } from '@/context/GrapevineContext';
import type { UpdateFeedInput } from '@pinata/grapevine-sdk/dist/types';

// Re-export the SDK type for convenience
export type UpdateFeedFormInput = UpdateFeedInput;

/**
 * Hook for updating feeds with signature authentication
 * Integrates with the real Grapevine API
 */
export function useUpdateFeed() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { grapevine, isWalletReady } = useGrapevine();

  return useMutation({
    mutationFn: async ({ feedId, data }: { feedId: string; data: UpdateFeedFormInput }) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!isWalletReady) {
        throw new Error('Wallet is still initializing. Please wait a moment and try again.');
      }

      if (!grapevine) {
        throw new Error('Grapevine SDK not initialized');
      }

      const feed = await grapevine.feeds.update(feedId, data);

      console.log('Feed updated:', feed.id);

      return feed;
    },
    onSuccess: () => {
      // Invalidate grapevine feeds to refetch
      queryClient.invalidateQueries({ queryKey: ['grapevine-feeds'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
    },
  });
}
