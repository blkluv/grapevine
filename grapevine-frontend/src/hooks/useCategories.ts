import { useQuery } from '@tanstack/react-query';

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

// HARDCODED categories - always return these
const hardcodedCategories = [
  { id: '1', name: 'food' },
  { id: '2', name: 'healxyz' },
  { id: '3', name: 'musik' },
  { id: '4', name: 'sex' },
  { id: '5', name: 'magic' },
  { id: '6', name: 'reviews' },
  { id: '7', name: 'truth' },
  { id: '8', name: 'money' },
  { id: '9', name: 'relationships' },
];

/**
 * Hook to fetch all categories
 * TEMPORARY: Returns hardcoded data to avoid API errors
 */
export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list({}),
    queryFn: async () => {
      console.log('Using hardcoded categories');
      return hardcodedCategories;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook to fetch a single category
 * TEMPORARY: Uses hardcoded lookup
 */
export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => {
      const category = hardcodedCategories.find(cat => cat.id === id);
      if (!category) {
        throw new Error(`Category ${id} not found`);
      }
      return category;
    },
    enabled: !!id,
  });
}