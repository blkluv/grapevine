import { useQuery } from '@tanstack/react-query';
import { useGrapevine } from '@/context/GrapevineContext';
import type { ListFeedsQuery, PaginatedResponse, Feed } from '@pinata/grapevine-sdk/dist/types';

/**
 * Hook to fetch feeds for a specific user by owner_id
 */
export function useUserFeeds(ownerId: string | null | undefined, params?: {
  page_size?: number;
  page_token?: string;
}) {
  const { grapevine } = useGrapevine();

  return useQuery({
    queryKey: ['user-feeds', ownerId, params],
    queryFn: async () => {
      if (!ownerId) {
        throw new Error('Owner ID is required');
      }

      if (!grapevine) {
        throw new Error('Grapevine SDK not initialized');
      }

      const query: ListFeedsQuery = {
        owner_id: ownerId,
        page_size: params?.page_size,
        page_token: params?.page_token,
      };

      const response: PaginatedResponse<Feed> = await grapevine.feeds.list(query);

      return {
        feeds: response.data,
        pagination: {
          page_size: params?.page_size || 20,
          next_page_token: response.next_page_token,
          has_more: !!response.next_page_token,
        },
      };
    },
    enabled: !!ownerId,
  });
}
