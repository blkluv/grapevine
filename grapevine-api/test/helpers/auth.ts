/**
 * Authentication test helpers
 * Provides utilities for mocking wallet authentication in tests
 */

/**
 * Creates mock wallet authentication fields for testing
 * These fields bypass actual signature verification by using a test-only pattern
 *
 * @param walletAddress The wallet address to authenticate
 * @returns Object with mock authentication fields to include in request body
 */
export const createMockWalletAuth = (walletAddress: string) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `Grapevine Authentication\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce-${Math.random()}`;

  return {
    wallet_address: walletAddress,
    signature: '0xDEADBEEF', // Valid hex format that middleware recognizes as test signature in test mode
    message,
    timestamp,
  };
};

/**
 * Adds mock wallet authentication fields to a request body
 *
 * @param body The request body object
 * @param walletAddress The wallet address to authenticate with
 * @returns The body with authentication fields added
 */
export const withWalletAuth = (body: any, walletAddress: string) => {
  return {
    ...body,
    ...createMockWalletAuth(walletAddress),
  };
};

/**
 * Creates mock wallet authentication headers for GET requests
 *
 * @param walletAddress The wallet address to authenticate
 * @returns Object with headers for authentication
 */
export const createWalletAuthHeaders = (walletAddress: string) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `Grapevine Authentication\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce-${Math.random()}`;

  // Base64 encode the message since it contains newlines (not allowed in HTTP headers)
  const encodedMessage = Buffer.from(message).toString('base64');

  const mockPaymentProof = Buffer.from(JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: "base", // Use 'base' network for tests
    payload: {
      authorization: {
        from: walletAddress,
        to: walletAddress,
        value: "100000",
        validAfter: String(Math.floor(Date.now() / 1000) - 3600),
        validBefore: String(Math.floor(Date.now() / 1000) + 3600),
        nonce: "0x518e5a6f87f3ae751aec851a5579874a76eecbaf5beb81e715d6319c87311628"
      },
      signature: "0xa064b5ff7c2b1dd93cccb2d5353b4a3a2e9095203a79bd1434e0bc0f19d9195361f73cf4681a51782efdda9c8b19db6174dc259f48861b797cbfe0809a20f7e51c"
    }
  })).toString('base64');

  return {
    'Content-Type': 'application/json',
    'x-wallet-address': walletAddress,
    'x-signature': '0xDEADBEEF',
    'x-message': encodedMessage,
    'x-timestamp': timestamp.toString(),
    'x-payment': mockPaymentProof,
  };
};

/**
 * Creates admin authentication headers for testing
 *
 * @returns Object with admin authentication headers
 */
export const createAdminAuthHeaders = () => {
  const adminKey = process.env.ADMIN_API_KEY || 'test-admin-key-12345';

  return {
    'Content-Type': 'application/json',
    'admin-api-key': adminKey,
  };
};
