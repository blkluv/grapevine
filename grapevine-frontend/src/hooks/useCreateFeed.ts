import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/context/WalletContext';
import { useGrapevine } from '@/context/GrapevineContext';
import { type CreateFeedInput } from '@/services/grapevineApi';

// Re-export the API type for convenience
export type CreateFeedFormInput = CreateFeedInput;

/**
 * Hook for creating feeds with x402 micropayments
 * Integrates with the real Grapevine API
 */
export function useCreateFeed() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { grapevine, isWalletReady } = useGrapevine();

  return useMutation({
    mutationFn: async (data: CreateFeedFormInput) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!isWalletReady) {
        throw new Error('Wallet is still initializing. Please wait a moment and try again.');
      }

      if (!grapevine) return;

      const feed = await grapevine.feeds.create({
        name: data.name,
        description: data.description,
        tags: data.tags || undefined,
        image_url: data.image_url || undefined,
        category_id: data.category_id || undefined,
      });

      console.log('Feed created:', feed.id);

      // Success response without payment
      return feed
    },
    onSuccess: () => {
      // Invalidate grapevine feeds to refetch
      queryClient.invalidateQueries({ queryKey: ['grapevine-feeds'] });
    },
  });
}
