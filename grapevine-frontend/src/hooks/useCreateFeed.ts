import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/context/WalletContext';
import { useGrapevine } from '@/context/GrapevineContext';
import { type CreateFeedInput, grapevineApiClient } from '@/services/grapevineApi';

// Re-export the API type for convenience
export type CreateFeedFormInput = CreateFeedInput;

/**
 * Hook for creating feeds with x402 micropayments
 * Integrates with the real Grapevine API
 */
export function useCreateFeed() {
  const queryClient = useQueryClient();
  const { address, signRequest } = useWallet(); // Get signRequest
  const { grapevine, isInitialized, authError, refreshAuth } = useGrapevine();

  return useMutation({
    mutationFn: async (data: CreateFeedFormInput) => {
      console.log('[useCreateFeed] Starting feed creation...');
      console.log('[useCreateFeed] Wallet address:', address);
      console.log('[useCreateFeed] Grapevine initialized:', isInitialized);
      console.log('[useCreateFeed] Auth error:', authError);

      if (!address) {
        throw new Error('Wallet not connected');
      }

      // OPTION 1: Use Grapevine SDK (if properly authenticated)
      if (grapevine && isInitialized && !authError) {
        try {
          console.log('[useCreateFeed] Using Grapevine SDK to create feed');
          const feed = await grapevine.feeds.create({
            name: data.name,
            description: data.description || undefined, // Use undefined instead of empty string
            tags: data.tags?.length ? data.tags : undefined,
            image_url: data.image_url || undefined,
            category_id: data.category_id || undefined,
          });

          console.log('[useCreateFeed] Feed created via SDK:', feed.id);
          return feed;
        } catch (error: any) {
          console.error('[useCreateFeed] Grapevine SDK failed:', error);
          
          // If 401, try to refresh auth
          if (error?.status === 401) {
            console.log('[useCreateFeed] Attempting to refresh auth...');
            await refreshAuth();
            throw new Error('Authentication expired. Please try again.');
          }
          
          throw error;
        }
      }
      
      // OPTION 2: Use your existing API client with proper auth
      console.log('[useCreateFeed] Using custom API client (grapevineApiClient)');
      
      try {
        // The API client should already handle auth internally
        // If it needs manual auth, check how it's implemented
        console.log('[useCreateFeed] Creating feed via authenticated API...');
        
        // Check what createFeed actually expects by looking at the implementation
        const feed = await grapevineApiClient.createFeed({
          name: data.name,
          description: data.description || undefined,
          tags: data.tags || [],
          image_url: data.image_url || undefined,
          category_id: data.category_id || undefined,
        });
        
        console.log('[useCreateFeed] Feed created via API client:', feed.id);
        return feed;
      } catch (error) {
        console.error('[useCreateFeed] Failed to create feed:', error);
        
        // If it's an auth error, try to get a fresh signature
        if (error instanceof Error && (
          error.message.includes('401') || 
          error.message.includes('unauthorized') ||
          error.message.includes('authentication')
        )) {
          console.log('[useCreateFeed] Auth error detected, trying to sign and retry...');
          try {
            // Manually sign and retry with fresh auth
            const signaturePayload = await signRequest('POST', '/v1/feeds');
            console.log('[useCreateFeed] Got fresh signature, retrying...');
            
            // You might need to manually make the API call here
            // since grapevineApiClient.createFeed might not use the fresh signature
            const response = await fetch('https://api.grapevine.markets/v1/feeds', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${signaturePayload.signature}`,
              },
              body: JSON.stringify({
                name: data.name,
                description: data.description || undefined,
                tags: data.tags || [],
                image_url: data.image_url || undefined,
                category_id: data.category_id || undefined,
              }),
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const feed = await response.json();
            console.log('[useCreateFeed] Feed created via manual API call:', feed.id);
            return feed;
          } catch (retryError) {
            console.error('[useCreateFeed] Retry also failed:', retryError);
            throw retryError;
          }
        }
        
        throw error;
      }
    },
    onSuccess: (feed) => {
      console.log('[useCreateFeed] Feed creation successful:', feed?.id);
      
      // Invalidate grapevine feeds to refetch
      queryClient.invalidateQueries({ queryKey: ['grapevine-feeds'] });
      
      // Also invalidate user's feeds
      if (address) {
        queryClient.invalidateQueries({ queryKey: ['grapevine-feeds', address] });
      }
    },
    onError: (error) => {
      console.error('[useCreateFeed] Feed creation failed:', error);
    },
  });
}