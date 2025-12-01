import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useGrapevine } from '@/context/GrapevineContext';
import type { ListEntriesQuery, PaginatedResponse, Entry } from '@pinata/grapevine-sdk/dist/types';

const GATEWAY_URL = 'https://gateway.grapevine.fyi/x402/cid';

type EntryParams = {
  page_size?: number;
  page_token?: string;
  is_free?: boolean;
};

type EntryContent = {
  hash: string;
  text: string;
  timestamp: string;
  author: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
    bio: string;
    follower_count: number;
    following_count: number;
    verified_addresses?: {
      eth_addresses?: string[];
      sol_addresses?: string[];
      primary?: {
        eth_address?: string;
        sol_address?: string;
      };
    };
    power_badge: boolean;
  };
  thread?: any;
  channel?: any;
  embeds?: any[];
  frames?: any[];
  engagement: {
    likes_count: number;
    recasts_count: number;
    replies_count: number;
  };
  mentioned_profiles?: any[];
  warpcast_url: string;
};

type EntryWithContent = {
  id: string;
  cid: string;
  content: EntryContent | null;
  error?: string;
};

/**
 * Hook to fetch entries from a specific feed and their content from the gateway
 */
export function useFeedEntries(
  feedId: string,
  params?: EntryParams,
  options?: Omit<UseQueryOptions<EntryWithContent[]>, 'queryKey' | 'queryFn'>
) {
  const { grapevine } = useGrapevine();

  return useQuery({
    queryKey: ['feed-entries', feedId, params],
    queryFn: async () => {
      if (!grapevine) {
        throw new Error('Grapevine SDK not initialized');
      }

      // Fetch the feed entries using SDK
      const query: ListEntriesQuery = {
        page_size: params?.page_size,
        page_token: params?.page_token,
        is_free: params?.is_free,
      };

      const response: PaginatedResponse<Entry> = await grapevine.entries.list(feedId, query);

      if (!response?.data || response.data.length === 0) {
        return [];
      }

      // Fetch content for each entry from the gateway
      const entriesWithContent = await Promise.all(
        response.data.map(async (entry: Entry) => {
          try {
            const contentResponse = await fetch(`${GATEWAY_URL}/${entry.cid}`);
            if (!contentResponse.ok) {
              throw new Error(`Failed to fetch content: ${contentResponse.statusText}`);
            }
            const content = await contentResponse.json();
            return {
              id: entry.id,
              cid: entry.cid,
              content,
            };
          } catch (error) {
            console.error(`Failed to fetch content for CID ${entry.cid}:`, error);
            return {
              id: entry.id,
              cid: entry.cid,
              content: null,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      // Filter out entries that failed to load
      return entriesWithContent.filter((entry) => entry.content !== null);
    },
    ...options,
  });
}
