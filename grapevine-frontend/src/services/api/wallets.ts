import { getClient } from './client';

// Auth headers type for authenticated requests
type AuthHeaders = {
  'x-wallet-address': string;
  'x-signature': string;
  'x-message': string;
  'x-timestamp': string;
};

// Wallet endpoint methods
export const walletsApi = {
  /**
   * Get wallet by ID
   */
  async getWallet(wallet_id: string) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/wallets/{wallet_id}', {
      params: { path: { wallet_id } },
    });

    if (error) {
      throw new Error(`Failed to get wallet: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get wallet by address
   */
  async getWalletByAddress(address: string) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/wallets/address/{address}', {
      params: { path: { address } },
    });

    if (error) {
      throw new Error(`Failed to get wallet by address: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Get wallet statistics
   */
  async getWalletStats(wallet_id: string) {
    const client = getClient();
    const { data, error } = await client.GET('/v1/wallets/{wallet_id}/stats', {
      params: { path: { wallet_id } },
    });

    if (error) {
      throw new Error(`Failed to get wallet stats: ${JSON.stringify(error)}`);
    }

    return data;
  },

  /**
   * Update wallet (requires authentication)
   */
  async updateWallet(
    wallet_id: string,
    walletData: {
      username?: string;
      picture_url?: string;
    },
    authHeaders: AuthHeaders
  ) {
    const client = getClient();
    const { data, error } = await client.PATCH('/v1/wallets/{wallet_id}', {
      params: {
        path: { wallet_id },
        header: authHeaders,
      },
      body: walletData,
    });

    if (error) {
      throw new Error(`Failed to update wallet: ${JSON.stringify(error)}`);
    }

    return data;
  },
};
