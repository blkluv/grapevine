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
  { id: '123e4567-e89b-12d3-a456-426614174001', name: 'food' },
  { id: '123e4567-e89b-12d3-a456-426614174002', name: 'healxyz' },
  { id: '123e4567-e89b-12d3-a456-426614174003', name: 'musik' },
  { id: '123e4567-e89b-12d3-a456-426614174004', name: 'sex' },
  { id: '123e4567-e89b-12d3-a456-426614174005', name: 'magic' },
  { id: '123e4567-e89b-12d3-a456-426614174006', name: 'reviews' },
  { id: '123e4567-e89b-12d3-a456-426614174007', name: 'truth' },
  { id: '123e4567-e89b-12d3-a456-426614174008', name: 'money' },
  { id: '123e4567-e89b-12d3-a456-426614174009', name: 'relationships' },
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