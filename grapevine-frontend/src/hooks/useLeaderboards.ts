import { useQuery } from '@tanstack/react-query'
import { leaderboardsApi } from '@/services/grapevineApi'

export function useRecentEntries(
  params?: {
    page_size?: string
    page_token?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['leaderboards', 'recent-entries', params],
    queryFn: () => leaderboardsApi.getRecentEntries(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (previously cacheTime in v4)
    ...options,
  })
}

export function useTopFeeds(
  params?: {
    page_size?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['leaderboards', 'top-feeds', params],
    queryFn: () => leaderboardsApi.getTopFeeds(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (previously cacheTime in v4)
    ...options,
  })
}

export function useTopRevenue(
  params?: {
    period?: '1d' | '7d' | '30d' | 'all'
    page_size?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['leaderboards', 'top-revenue', params],
    queryFn: () => leaderboardsApi.getTopRevenue(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (previously cacheTime in v4)
    ...options,
  })
}

export function useTopProviders(
  params?: {
    period?: '1d' | '7d' | '30d' | 'all'
    page_size?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['leaderboards', 'top-providers', params],
    queryFn: () => leaderboardsApi.getTopProviders(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (previously cacheTime in v4)
    ...options,
  })
}

export function useTopBuyers(
  params?: {
    period?: '1d' | '7d' | '30d' | 'all'
    page_size?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['leaderboards', 'top-buyers', params],
    queryFn: () => leaderboardsApi.getTopBuyers(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (previously cacheTime in v4)
    ...options,
  })
}

export function useTrending(
  params?: {
    page_size?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['leaderboards', 'trending', params],
    queryFn: () => leaderboardsApi.getTrending(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (previously cacheTime in v4)
    ...options,
  })
}

export function useMostPopular(
  params?: {
    period?: '1d' | '7d' | '30d' | 'all'
    page_size?: string
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['leaderboards', 'most-popular', params],
    queryFn: () => leaderboardsApi.getMostPopular(params),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (previously cacheTime in v4)
    ...options,
  })
}

export function useCategoryStats(
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['leaderboards', 'category-stats'],
    queryFn: () => leaderboardsApi.getCategoryStats(),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (previously cacheTime in v4)
    ...options,
  })
}
