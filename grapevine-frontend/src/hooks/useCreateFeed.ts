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
      console.log('[CreateFeed] 🚀 ===== STARTING FEED CREATION =====');
      console.log('[CreateFeed] - WalletContext address:', address);
      console.log('[CreateFeed] - isWalletReady:', isWalletReady);
      console.log('[CreateFeed] - grapevine SDK:', grapevine ? 'initialized' : 'null');

      if (!address) {
        console.error('[CreateFeed] ❌ No address from WalletContext');
        throw new Error('Wallet not connected');
      }

      if (!isWalletReady) {
        console.error('[CreateFeed] ❌ Wallet not ready');
        throw new Error('Wallet is still initializing. Please wait a moment and try again.');
      }

      if (!grapevine) {
        console.error('[CreateFeed] ❌ Grapevine SDK not initialized');
        return;
      }

      // Log the SDK's internal wallet address if accessible
      // @ts-expect-error - accessing internal for debugging
      const sdkWalletAddress = grapevine.walletClient?.account?.address;
      console.log('[CreateFeed] - SDK walletClient.account.address:', sdkWalletAddress);

      if (sdkWalletAddress && address && sdkWalletAddress.toLowerCase() !== address.toLowerCase()) {
        console.warn('[CreateFeed] ⚠️ ADDRESS MISMATCH DETECTED!');
        console.warn('[CreateFeed] - WalletContext says:', address);
        console.warn('[CreateFeed] - SDK walletClient says:', sdkWalletAddress);
        console.warn('[CreateFeed] The signature will be made by SDK wallet, but WalletContext shows different address!');
      }

      console.log('[CreateFeed] 📝 Calling grapevine.feeds.create...');

      try {
        const feed = await grapevine.feeds.create({
          name: data.name,
          description: data.description,
          tags: data.tags || undefined,
          image_url: data.image_url || undefined,
          category_id: data.category_id || undefined,
        });

        console.log('[CreateFeed] ✅ Feed created:', feed.id);
        return feed;
      } catch (error) {
        console.error('[CreateFeed] 🔴 Error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate grapevine feeds to refetch
      queryClient.invalidateQueries({ queryKey: ['grapevine-feeds'] });
    },
  });
}
