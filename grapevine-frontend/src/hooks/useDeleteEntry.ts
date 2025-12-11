import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/context/WalletContext';
import { useGrapevine } from '@/context/GrapevineContext';

export interface DeleteEntryInput {
  feedId: string;
  entryId: string;
}

/**
 * Hook for deleting entries with signature authentication
 * Integrates with the Grapevine SDK
 */
export function useDeleteEntry() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { grapevine, isWalletReady } = useGrapevine();

  return useMutation({
    mutationFn: async ({ feedId, entryId }: DeleteEntryInput) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!isWalletReady) {
        throw new Error('Wallet is still initializing. Please wait a moment and try again.');
      }

      if (!grapevine) {
        throw new Error('Grapevine SDK not initialized');
      }

      await grapevine.entries.delete(feedId, entryId);

      console.log('Entry deleted:', entryId);
    },
    onSuccess: (_, variables) => {
      // Invalidate entries for this feed to refetch
      queryClient.invalidateQueries({ queryKey: ['grapevine-entries', variables.feedId] });
      // Also invalidate the feed to update entry count
      queryClient.invalidateQueries({ queryKey: ['grapevine-feed', variables.feedId] });
    },
  });
}
