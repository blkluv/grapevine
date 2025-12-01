import type { paths } from '../../types/api';
import { getClient } from './client';

// Admin auth headers type
type AdminAuthHeaders = {
  'admin-api-key': string;
};

// Request body type
type CreateTransactionInput = NonNullable<
  paths['/v1/transactions']['post']['requestBody']
>['content']['application/json'];

// Transaction endpoint methods
export const transactionsApi = {
  /**
   * Get all transactions with optional filtering (no authentication required, cursor-based pagination)
   */
  async getTransactions(
    params?: {
      page_size?: string;
      page_token?: string;
      payer?: string;
      pay_to?: string;
      entry_id?: string;
    }
  ) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/transactions', {
      params: {
        query: params,
      },
    });

    if (error) {
      throw new Error(`Failed to get transactions: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get transaction by ID (no authentication required)
   */
  async getTransaction(id: string) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/transactions/{id}', {
      params: {
        path: { id },
      },
    });

    if (error) {
      throw new Error(`Failed to get transaction: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get transaction by hash (no authentication required)
   */
  async getTransactionByHash(hash: string) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/transactions/hash/{hash}', {
      params: {
        path: { hash },
      },
    });

    if (error) {
      throw new Error(`Failed to get transaction by hash: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Create transactions (bulk insert, requires admin API key)
   */
  async createTransaction(transactionData: CreateTransactionInput, adminHeaders: AdminAuthHeaders) {
    const client = getClient();
    const { data, error } = await client.POST('/v1/transactions', {
      params: {
        header: adminHeaders,
      },
      body: transactionData,
    });

    if (error) {
      throw new Error(`Failed to create transaction: ${JSON.stringify(error)}`);
    }

    return data;
  },
};

// Export types for convenience
export type { CreateTransactionInput };
