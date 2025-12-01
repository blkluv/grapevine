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

// Request body type
type CreateEntryInput = NonNullable<
  paths['/v1/feeds/{feed_id}/entries']['post']['requestBody']
>['content']['application/json'];

// Entry endpoint methods
export const entriesApi = {
  /**
   * Get all entries for a feed with optional filtering (cursor-based pagination)
   */
  async getEntries(
    feed_id: string,
    params?: {
      page_size?: string;
      page_token?: string;
      is_free?: 'true' | 'false';
    }
  ) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/feeds/{feed_id}/entries', {
      params: {
        path: { feed_id },
        query: params,
      },
    });

    if (error) {
      throw new Error(`Failed to get entries: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get entry by ID
   */
  async getEntry(feed_id: string, entry_id: string) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/feeds/{feed_id}/entries/{entry_id}', {
      params: { path: { feed_id, entry_id } },
    });

    if (error) {
      throw new Error(`Failed to get entry: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Create a new entry (requires x402 payment)
   */
  async createEntry(feed_id: string, entryData: CreateEntryInput, paymentHeader: PaymentHeader) {
    const client = getClient();
    const { data, error } = await client.POST('/v1/feeds/{feed_id}/entries', {
      params: {
        path: { feed_id },
        header: paymentHeader,
      },
      body: entryData,
    });

    if (error) {
      throw new Error(`Failed to create entry: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Delete entry (requires authentication)
   */
  async deleteEntry(feed_id: string, entry_id: string, authHeaders: AuthHeaders) {
    const client = getClient();
    const { data, error } = await client.DELETE('/v1/feeds/{feed_id}/entries/{entry_id}', {
      params: {
        path: { feed_id, entry_id },
        header: authHeaders,
      },
    });

    if (error) {
      throw new Error(`Failed to delete entry: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Create access link for purchased entry (requires authentication)
   * Returns a time-limited presigned URL for accessing private content
   */
  async getAccessLink(feed_id: string, entry_id: string, authHeaders: AuthHeaders) {
    const client = getClient();
    const { data, error } = await client.POST('/v1/feeds/{feed_id}/entries/{entry_id}/access-link', {
      params: {
        path: { feed_id, entry_id },
        header: authHeaders,
      },
      body: {},
      headers: authHeaders
    });

    if (error) {
      throw new Error(`Failed to get access link: ${JSON.stringify(error)}`);
    }

    return data;
  },
};

// Export types for convenience
export type { CreateEntryInput };
