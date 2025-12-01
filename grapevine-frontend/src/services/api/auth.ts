import { getClient } from './client';

// Auth endpoint methods
export const authApi = {
  /**
   * Get nonce for wallet signature authentication
   */
  async getNonce(walletAddress: string) {
    const client = getClient();
    const { data, error } = await client.POST('/v1/auth/nonce', {
      body: { wallet_address: walletAddress },
    });

    if (error) {
      throw new Error(`Failed to get nonce: ${JSON.stringify(error)}`);
    }

    return data;
  },
};
