import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/context/WalletContext';
import { useGrapevine } from '@/context/GrapevineContext';
import type { CreateEntryInput as SDKCreateEntryInput } from '@pinata/grapevine-sdk/dist/types';

export interface CreateEntryInput {
  feedId: string;
  data: SDKCreateEntryInput;
}

/**
 * Hook for creating entries with x402 micropayments
 * Integrates with the real Grapevine API
 */
export function useCreateEntry() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { grapevine, isWalletReady } = useGrapevine();

  return useMutation({
    mutationFn: async ({ feedId, data }: CreateEntryInput) => {
      console.log('[useCreateEntry] 🚀 Starting entry creation');
      console.log('[useCreateEntry] - feedId:', feedId);
      console.log('[useCreateEntry] - data:', data);
      console.log('[useCreateEntry] - address:', address);
      console.log('[useCreateEntry] - grapevine SDK:', grapevine);
      console.log('[useCreateEntry] - isWalletReady:', isWalletReady);

      if (!address) {
        console.error('[useCreateEntry] ❌ Wallet not connected');
        throw new Error('Wallet not connected');
      }

      if (!isWalletReady) {
        console.error('[useCreateEntry] ❌ Wallet still initializing');
        throw new Error('Wallet is still initializing. Please wait a moment and try again.');
      }

      if (!grapevine) {
        console.error('[useCreateEntry] ❌ Grapevine SDK not initialized');
        throw new Error('Grapevine SDK not initialized');
      }

      console.log('[useCreateEntry] 📝 Calling grapevine.entries.create...');
      console.log('[useCreateEntry] - This will trigger wallet signature request');

      const entry = await grapevine.entries.create(feedId, data);

      console.log('[useCreateEntry] ✅ Entry created successfully:', entry.id);

      return entry;
    },
    onSuccess: (_, variables) => {
      // Invalidate entries for this feed to refetch
      queryClient.invalidateQueries({ queryKey: ['grapevine-entries', variables.feedId] });
      // Also invalidate the feed to update entry count
      queryClient.invalidateQueries({ queryKey: ['grapevine-feed', variables.feedId] });
    },
    onError: (_, variables) => {
      console.log(_, variables);
    }
  });
}
