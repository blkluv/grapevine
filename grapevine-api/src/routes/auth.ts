import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { generateNonce } from '../services/auth.js';
import { logger } from '../services/logger.js';
import { nonceStore } from '../services/nonceStore.js';

/**
 * Authentication Routes
 * Endpoints for wallet signature authentication (MetaMask, WalletConnect, etc.)
 */

const auth = new OpenAPIHono();

/**
 * Schema for nonce generation request
 */
const GenerateNonceSchema = z.object({
  wallet_address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')
    .describe('Ethereum wallet address (0x prefixed)'),
});

/**
 * Schema for nonce response
 */
const NonceResponseSchema = z.object({
  nonce: z.string().describe('Random nonce to be included in signature message'),
  message: z.string().describe('Complete message to sign with wallet'),
  expiresAt: z.number().describe('Unix timestamp (milliseconds) when nonce expires'),
});

/**
 * POST /v1/auth/nonce
 * Generate a nonce for wallet signature authentication
 *
 * This endpoint generates a unique nonce for a wallet address that must be
 * included in the signed message. The nonce expires after 5 minutes.
 *
 * Flow:
 * 1. Client calls this endpoint with their wallet address
 * 2. Server generates nonce and stores it temporarily
 * 3. Client signs the returned message with MetaMask
 * 4. Client calls create feed endpoint with signature
 * 5. Server verifies signature matches and nonce hasn't expired
 */
const generateNonceRoute = createRoute({
  method: 'post',
  path: '/nonce',
  summary: 'Generate authentication nonce',
  description:
    'Generate a nonce for wallet signature authentication. The nonce expires after 5 minutes and can only be used once.',
  tags: ['Authentication'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: GenerateNonceSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Nonce generated successfully',
      content: {
        'application/json': {
          schema: NonceResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid wallet address format',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

auth.openapi(generateNonceRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const walletAddress = body.wallet_address.toLowerCase();

    // Generate nonce
    const nonce = generateNonce();
    const ttlMs = 5 * 60 * 1000; // 5 minutes
    const expiresAt = Date.now() + ttlMs;

    // Store nonce with expiration
    await nonceStore.set(walletAddress, nonce, ttlMs);

    // Create message to sign (following EIP-4361 SIWE pattern)
    const timestamp = new Date().toISOString();
    const message = `I am signing in to Grapevine at ${timestamp} with nonce: ${nonce}`;

    return c.json({
      nonce,
      message,
      expiresAt,
    }, 200);
  } catch (error) {
    logger.error('Error generating nonce', error as Error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to generate nonce',
      },
      500
    );
  }
});

/**
 * Helper function to verify and consume a nonce
 * Returns true if nonce is valid and matches, false otherwise
 */
export async function verifyAndConsumeNonce(
  walletAddress: string,
  expectedNonce: string
): Promise<boolean> {
  try {
    const stored = await nonceStore.get(walletAddress);

    if (!stored) {
      return false; // No nonce found
    }

    if (stored.nonce !== expectedNonce) {
      return false; // Nonce doesn't match
    }

    // Consume nonce (one-time use)
    await nonceStore.delete(walletAddress);
    return true;
  } catch (error) {
    logger.error('Error verifying nonce', error as Error, {
      walletAddress: walletAddress.toLowerCase(),
    });
    return false;
  }
}

export default auth;
