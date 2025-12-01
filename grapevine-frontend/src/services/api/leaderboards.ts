import { getClient } from './client';

// Leaderboard endpoint methods
export const leaderboardsApi = {
  /**
   * Get recent entries leaderboard (cursor-based pagination)
   */
  async getRecentEntries(params?: {
    page_size?: string;
    page_token?: string;
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/leaderboards/recent-entries', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get recent entries: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get top feeds leaderboard (feeds with most entries)
   */
  async getTopFeeds(params?: {
    page_size?: string;
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/leaderboards/top-feeds', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get top feeds: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get top revenue feeds leaderboard
   */
  async getTopRevenue(params?: {
    period?: '1d' | '7d' | '30d' | 'all';
    page_size?: string;
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/leaderboards/top-revenue', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get top revenue: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get top providers leaderboard
   */
  async getTopProviders(params?: {
    period?: '1d' | '7d' | '30d' | 'all';
    page_size?: string;
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/leaderboards/top-providers', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get top providers: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get top buyers leaderboard
   */
  async getTopBuyers(params?: {
    period?: '1d' | '7d' | '30d' | 'all';
    page_size?: string;
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/leaderboards/top-buyers', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get top buyers: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get trending feeds leaderboard
   */
  async getTrending(params?: {
    page_size?: string;
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/leaderboards/trending', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get trending feeds: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get most popular feeds leaderboard
   */
  async getMostPopular(params?: {
    period?: '1d' | '7d' | '30d' | 'all';
    page_size?: string;
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/leaderboards/most-popular', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get most popular feeds: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get category statistics
   */
  async getCategoryStats() {
    const client = getClient();
    const { data, error } = await client.GET('/v1/leaderboards/category-stats');

    if (error) {
      throw new Error(`Failed to get category stats: ${JSON.stringify(error)}`);
    }

    return data;
  },
};
