import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { verifyWalletSignature, parseSignedMessage } from '../services/auth.js';
import { verifyAndConsumeNonce } from '../routes/auth.js';
import { config } from '../services/config.js';

/**
 * Wallet Authentication Middleware
 *
 * Verifies wallet ownership via cryptographic signature verification.
 * This middleware checks for signature authentication fields in the request headers
 * and validates them before allowing the request to proceed.
 *
 * Expected headers:
 * - x-wallet-address: The wallet address (0x prefixed)
 * - x-signature: The cryptographic signature (hex format)
 * - x-message: The signed message (base64 encoded if it contains newlines)
 * - x-timestamp: Unix timestamp in seconds
 * - x-chain-id: Optional chain ID for network detection (8453=base, 1=ethereum, 137=polygon, etc.)
 *
 * @example
 * ```typescript
 * import { walletAuth } from '../middleware/walletAuth.js';
 *
 * // Apply to specific route
 * app.post('/feeds', walletAuth({ required: true }), async (c) => {
 *   const verifiedWallet = c.get('verifiedWallet');
 *   // ... create feed with verified wallet
 * });
 *
 * // Make optional
 * app.post('/feeds', walletAuth({ required: false }), async (c) => {
 *   const verifiedWallet = c.get('verifiedWallet'); // may be undefined
 *   // ... handle both authenticated and unauthenticated requests
 * });
 * ```
 *
 * @param options Configuration options
 * @param options.required If true, throws 401 if signature fields are missing or invalid (default: false)
 *
 * @returns Middleware that verifies wallet signatures and sets 'verifiedWallet' in context
 *
 * The middleware sets the following in context on successful verification:
 * - `verifiedWallet`: The verified wallet address
 * - `verifiedAt`: Timestamp when verification occurred
 */
export const walletAuth = (options?: {
  required?: boolean;
}) => {
  const {
    required = false,
  } = options || {};

  return createMiddleware(async (c, next) => {
    // Get auth data from headers only
    const walletAddress = c.req.header('x-wallet-address');
    const signature = c.req.header('x-signature');
    let message = c.req.header('x-message');
    const headerTimestamp = c.req.header('x-timestamp');
    const timestamp = headerTimestamp ? parseInt(headerTimestamp, 10) : undefined;
    const chainId = c.req.header('x-chain-id'); // Optional chain ID for network detection

    // Decode base64 message if it appears to be encoded
    if (message && !message.includes('\n') && message.length > 20) {
      try {
        const decoded = Buffer.from(message, 'base64').toString('utf-8');
        // Check if it looks like our message format
        if (decoded.includes('Grapevine Authentication')) {
          message = decoded;
        }
      } catch (e) {
        // If decoding fails, use message as-is
      }
    }

    // Check if any auth fields are present
    const hasAnyAuthField = walletAddress || signature || message || timestamp;

    // If required is true and no auth fields, return error
    if (required && !hasAnyAuthField) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Wallet signature authentication required. Please provide x-wallet-address, x-signature, x-message, and x-timestamp headers.',
        },
        401
      );
    }

    // If no auth fields are present and not required, skip verification
    if (!hasAnyAuthField) {
      return next();
    }

    // If any auth field is provided, all must be provided
    if (!walletAddress || !signature || !message || !timestamp) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'When using signature authentication, all headers are required: x-wallet-address, x-signature, x-message, x-timestamp',
        },
        400
      );
    }

    // Validate wallet address format (42 chars, starts with 0x)
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid wallet address format. Expected 42-character hex string starting with 0x',
        },
        400
      );
    }

    // Validate signature format (130 hex chars for standard Ethereum signature, or test signature, starts with 0x)
    // Standard Ethereum signatures are 65 bytes: r (32) + s (32) + v (1) = 130 hex characters + 0x prefix = 132 total
    if (!/^0x([0-9a-fA-F]{130}|DEADBEEF)$/.test(signature)) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid signature format. Expected 132-character hex string starting with 0x (65 bytes)',
        },
        400
      );
    }

    // TEST MODE: Bypass signature verification in test environment with special signature
    const isTest = config.server.nodeEnv === 'test' || process.env.VITEST === 'true';
    const isTestSignature = signature === '0xDEADBEEF';

    if (isTest && isTestSignature) {
      // In test mode with mock signature, skip verification and directly set the wallet
      c.set('verifiedWallet', walletAddress);
      c.set('verifiedAt', Date.now());
      return next();
    }

    // Parse and validate the message format
    const parsed = parseSignedMessage(message);
    if (!parsed) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid message format. Expected: "I am signing in to Grapevine at {ISO_TIMESTAMP} with nonce: {NONCE}"',
        },
        400
      );
    }

    // Verify the nonce was issued and hasn't been used
    const nonceValid = await verifyAndConsumeNonce(walletAddress, parsed.nonce);
    if (!nonceValid) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or expired nonce. Please request a new nonce from POST /v1/auth/nonce',
        },
        401
      );
    }

    // Verify the complete signature
    const verificationResult = await verifyWalletSignature({
      message,
      signature,
      walletAddress,
      timestamp,
      expectedNonce: parsed.nonce,
    });

    if (!verificationResult.success) {
      return c.json(
        {
          error: 'Unauthorized',
          message: verificationResult.error || 'Signature verification failed',
        },
        401
      );
    }

    // Map chain ID to network name
    // Supported networks:
    // - Base (mainnet: 8453, testnet: 84532)
    // - Ethereum (mainnet: 1, testnet: 11155111)
    // - Polygon (mainnet: 137, testnet: 80002)
    const networkMap: Record<string, string> = {
      '8453': 'base',
      '84532': 'base-sepolia',
      '1': 'ethereum',
      '11155111': 'ethereum-sepolia',
      '137': 'polygon',
      '80002': 'polygon-amoy',
    };

    const detectedNetwork = chainId && networkMap[chainId] ? networkMap[chainId] : 'base';

    // Store verified wallet address, detected network, and verification timestamp in context
    c.set('verifiedWallet', walletAddress);
    c.set('verifiedNetwork', detectedNetwork);
    c.set('verifiedAt', Date.now());

    return next();
  });
};

/**
 * Middleware to require wallet signature authentication
 * Shorthand for walletAuth({ required: true })
 *
 * @example
 * ```typescript
 * app.post('/protected', requireWalletAuth, async (c) => {
 *   const wallet = c.get('verifiedWallet'); // guaranteed to exist
 *   // ...
 * });
 * ```
 */
export const requireWalletAuth = walletAuth({ required: true });

/**
 * Middleware to optionally verify wallet signature
 * Shorthand for walletAuth({ required: false })
 *
 * @example
 * ```typescript
 * app.post('/optional', optionalWalletAuth, async (c) => {
 *   const wallet = c.get('verifiedWallet'); // may be undefined
 *   if (wallet) {
 *     // Authenticated request
 *   } else {
 *     // Unauthenticated request
 *   }
 * });
 * ```
 */
export const optionalWalletAuth = walletAuth({ required: false });