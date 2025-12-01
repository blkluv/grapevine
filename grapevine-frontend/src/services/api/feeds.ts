import type { paths } from '../../types/api';
import { getClient } from './client';

// Auth headers type for authenticated requests
type AuthHeaders = {
  'x-wallet-address': string;
  'x-signature': string;
  'x-message': string;
  'x-timestamp': string;
};

// Payment header type for x402 payment requests
type PaymentHeader = {
  'x-payment': string;
};

// Request body types
type CreateFeedInput = NonNullable<
  paths['/v1/feeds']['post']['requestBody']
>['content']['application/json'];

type UpdateFeedInput = NonNullable<
  paths['/v1/feeds/{feed_id}']['patch']['requestBody']
>['content']['application/json'];

// Feed endpoint methods
export const feedsApi = {
  /**
   * Get all feeds with optional filtering (cursor-based pagination)
   */
  async getFeeds(params?: {
    page_size?: string;
    page_token?: string;
    owner_id?: string;
    category?: string;
    tags?: string;
    min_entries?: string;
    min_age?: string;
    max_age?: string;
    is_active?: 'true' | 'false';
  }) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/feeds', {
      params: { query: params },
    });

    if (error) {
      throw new Error(`Failed to get feeds: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get feed by ID
   */
  async getFeed(feed_id: string) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/feeds/{feed_id}', {
      params: { path: { feed_id } },
    });

    if (error) {
      throw new Error(`Failed to get feed: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Create a new feed (requires x402 payment)
   */
  async createFeed(feedData: CreateFeedInput, paymentHeader: PaymentHeader) {
    const client = getClient();
    const { data, error } = await client.POST('/v1/feeds', {
      params: {
        header: paymentHeader,
      },
      body: feedData,
    });

    if (error) {
      throw new Error(`Failed to create feed: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Update feed (requires authentication)
   */
  async updateFeed(feed_id: string, feedData: UpdateFeedInput, authHeaders: AuthHeaders) {
    const client = getClient();
    const { data, error } = await client.PATCH('/v1/feeds/{feed_id}', {
      params: {
        path: { feed_id },
        header: authHeaders,
      },
      body: feedData,
    });

    if (error) {
      throw new Error(`Failed to update feed: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Delete feed
   */
  async deleteFeed(feed_id: string) {
    const client = getClient();
    const { data, error } = await client.DELETE('/v1/feeds/{feed_id}', {
      params: {
        path: { feed_id },
      },
    });

    if (error) {
      throw new Error(`Failed to delete feed: ${JSON.stringify(error)}`);
    }

    return data;
  },
};

// Export types for convenience
export type { CreateFeedInput, UpdateFeedInput };
