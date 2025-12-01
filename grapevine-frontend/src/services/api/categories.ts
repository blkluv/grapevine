import { getClient } from './client';

// Category endpoint methods
export const categoriesApi = {
  /**
   * Get all categories with optional filtering (cursor-based pagination)
   */
  async getCategories(params?: {
    page_size?: string;
    page_token?: string;
    is_active?: 'true' | 'false';
    search?: string;
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/categories', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get categories: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get category by ID
   */
  async getCategory(category_id: string) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/categories/{category_id}', {
      params: { path: { category_id } },
    });

    if (error) {
      throw new Error(`Failed to get category: ${JSON.stringify(error)}`);
    }

    return data;
  },
};
