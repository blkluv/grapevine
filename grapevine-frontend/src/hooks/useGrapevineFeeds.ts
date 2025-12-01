import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useGrapevine } from '@/context/GrapevineContext';
import type { ListFeedsQuery, PaginatedResponse, Feed } from '@pinata/grapevine-sdk/dist/types';

type FeedParams = {
  page_size?: number;
  page_token?: string;
  owner_id?: string;
  category?: string;
  minEntries?: number;
  min_age?: number;
  max_age?: number;
};

type FeedResponse = {
  feeds: Feed[];
  pagination: {
    page_size: number;
    next_page_token?: string;
    has_more: boolean;
  };
};

/**
 * Hook to fetch feeds from the Grapevine API with cursor-based pagination
 */
export function useGrapevineFeeds(
  params?: FeedParams,
  options?: Omit<UseQueryOptions<FeedResponse>, 'queryKey' | 'queryFn'>
) {
  const { grapevine } = useGrapevine();

  return useQuery({
    queryKey: ['grapevine-feeds', params],
    queryFn: async () => {
      if (!grapevine) {
        throw new Error('Grapevine SDK not initialized');
      }

      const query: ListFeedsQuery = {
        page_size: params?.page_size,
        page_token: params?.page_token,
        owner_id: params?.owner_id,
        category: params?.category,
        min_entries: params?.minEntries,
        min_age: params?.min_age,
        max_age: params?.max_age,
      };

      const response: PaginatedResponse<Feed> = await grapevine.feeds.list(query);
      console.log("response", response)

      // Feeds are already sorted by created_at DESC from the API
      return {
        feeds: response.data,
        pagination: {
          page_size: params?.page_size || 20,
          next_page_token: response.next_page_token,
          has_more: !!response.next_page_token,
        },
      };
    },
    ...options,
  });
}
