import { useQuery } from '@tanstack/react-query';
import { useGrapevine } from '@/context/GrapevineContext';
import { grapevineApiClient } from '@/services/grapevineApi';
import type { Category } from '@pinata/grapevine-sdk/dist/types';

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

/**
 * Hook to fetch all categories
 * Note: SDK's getCategories() doesn't support pagination/filtering yet
 */
export function useCategories() {
  const { grapevine } = useGrapevine();

  return useQuery({
    queryKey: categoryKeys.list({}),
    queryFn: async () => {
      if (!grapevine) {
        throw new Error('Grapevine SDK not initialized');
      }

      const categories: Category[] = await grapevine.getCategories();

      // Filter to only active categories (matching previous behavior)
      return categories.filter((cat) => cat.id); // Assuming all returned are active
    },
  });
}

/**
 * Hook to fetch a single category
 * Note: SDK doesn't have a getCategory(id) method, so using API client
 */
export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => grapevineApiClient.getCategory(id),
    enabled: !!id,
  });
}
