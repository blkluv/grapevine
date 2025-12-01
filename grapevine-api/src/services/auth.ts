/**
 * Authentication utilities for wallet signature verification
 *
 * This module provides functions to verify that a user controls a wallet address
 * by validating cryptographic signatures from Web3 wallets (MetaMask, WalletConnect, etc.).
 *
 * Compatible with Wagmi on the frontend: https://wagmi.sh/react/guides/sign-in-with-ethereum
 *
 * Note: You'll need to install a crypto library for signature verification:
 * Option 1 (Recommended): npm install viem
 * Option 2: npm install ethers
 */

import { logger } from './logger.js';

/**
 * Verify that a signature was created by the claimed wallet address
 *
 * This function verifies ECDSA signatures from Ethereum wallets.
 * Compatible with signatures from Wagmi's useSignMessage hook.
 *
 * @param message - The original message that was signed
 * @param signature - The signature from wallet (hex string starting with 0x)
 * @param expectedAddress - The wallet address that should have signed the message
 * @returns true if the signature is valid and matches the expected address
 *
 * @example
 * const isValid = await verifySignature(
 *   "I am signing in to Grapevine at 2025-10-29T19:50:00.000Z with nonce: abc123",
 *   "0x...",
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 * );
 */
export async function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const { verifyMessage } = await import('viem');

    const isValid = await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    return isValid;
  } catch (error) {
    logger.error('Error verifying signature', error as Error);
    return false;
  }
}

/**
 * Verify that a signed message is recent (not a replay attack)
 *
 * @param timestamp - The timestamp from when the message was signed (Unix timestamp in seconds)
 * @param maxAgeSeconds - Maximum age of the signature in seconds (default: 300 = 5 minutes)
 * @returns true if the signature is recent enough
 */
export function verifyTimestamp(
  timestamp: number,
  maxAgeSeconds: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const age = now - timestamp; // Age in seconds

  return age >= 0 && age <= maxAgeSeconds;
}

/**
 * Parse and validate a signed message for nonce and timestamp
 *
 * Expected format: "I am signing in to Grapevine at {ISO_TIMESTAMP} with nonce: {NONCE}"
 *
 * @param message - The message that was signed
 * @returns Object with nonce and timestamp, or null if invalid
 */
export function parseSignedMessage(message: string): {
  nonce: string;
  timestamp: string;
} | null {
  // Example: "I am signing in to Grapevine at 2025-10-29T19:50:00.000Z with nonce: abc123"
  const nonceMatch = message.match(/with nonce: ([a-zA-Z0-9]+)/);
  const timestampMatch = message.match(/at ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:\.]+Z)/);

  if (!nonceMatch || !timestampMatch) {
    return null;
  }

  return {
    nonce: nonceMatch[1],
    timestamp: timestampMatch[1],
  };
}

/**
 * Generate a random nonce for challenge-response authentication
 *
 * @returns A random alphanumeric string (16 characters)
 */
export function generateNonce(): string {
  // Generate a 32-character alphanumeric nonce
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

/**
 * Complete wallet signature verification with all checks
 *
 * This is the main function you should use - it performs all necessary validations:
 * - Signature authenticity
 * - Timestamp freshness
 * - Message format
 * - Nonce validation (if provided)
 *
 * @param params - Verification parameters
 * @returns Object with success status and error message if failed
 *
 * @example
 * const result = await verifyWalletSignature({
 *   message: "I am signing in to Grapevine at 2025-10-29T19:50:00.000Z with nonce: abc123",
 *   signature: "0x...",
 *   walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
 *   timestamp: 1730234400000,
 *   expectedNonce: "abc123", // Optional, from your nonce store
 * });
 *
 * if (!result.success) {
 *   return response.json({ error: result.error }, 401);
 * }
 */
export async function verifyWalletSignature(params: {
  message: string;
  signature: string;
  walletAddress: string;
  timestamp: number;
  expectedNonce?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { message, signature, walletAddress, timestamp, expectedNonce } = params;

  // 1. Verify signature authenticity
  const isValidSignature = await verifySignature(message, signature, walletAddress);
  if (!isValidSignature) {
    return {
      success: false,
      error: 'Invalid signature: does not match wallet address',
    };
  }

  // 2. Verify timestamp (prevent replay attacks)
  const isRecentTimestamp = verifyTimestamp(timestamp);
  if (!isRecentTimestamp) {
    return {
      success: false,
      error: 'Signature expired: must be signed within the last 5 minutes',
    };
  }

  // 3. Parse and verify message format
  const parsed = parseSignedMessage(message);
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid message format',
    };
  }

  // 4. Verify nonce if provided (prevents nonce reuse)
  if (expectedNonce && parsed.nonce !== expectedNonce) {
    return {
      success: false,
      error: 'Invalid nonce: does not match expected value',
    };
  }

  return { success: true };
}
