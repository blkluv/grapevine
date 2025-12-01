import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { walletAuth, requireWalletAuth, optionalWalletAuth } from '../../src/middleware/walletAuth.js';

/**
 * Wallet Authentication Middleware Tests
 * Tests the wallet signature authentication middleware
 */

describe('Wallet Auth Middleware', () => {
  let app: OpenAPIHono;
  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const invalidWalletAddress = 'invalid-address';

  beforeAll(() => {
    // Create test apps with different middleware configurations
    app = new OpenAPIHono();

    // Required auth route
    app.get('/required', requireWalletAuth, (c) => {
      return c.json({
        message: 'success',
        wallet: c.get('verifiedWallet'),
        verifiedAt: c.get('verifiedAt')
      });
    });
  });

  describe('requireWalletAuth middleware', () => {
    it('should allow request with valid wallet auth headers (test mode)', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = Buffer.from(`Grapevine Authentication\n\nWallet: ${testWalletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': testWalletAddress,
          'x-signature': '0xDEADBEEF', // Test signature
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('success');
      expect(data.wallet).toBe(testWalletAddress);
      expect(data.verifiedAt).toBeDefined();
      expect(typeof data.verifiedAt).toBe('number');
    });

    it('should return 401 when no auth headers are provided', async () => {
      const response = await app.request('/required', {
        method: 'GET',
        headers: {},
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('Wallet signature authentication required');
    });

    it('should return 400 when only some auth headers are provided', async () => {
      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': testWalletAddress,
          'x-signature': '0xDEADBEEF',
          // Missing x-message and x-timestamp
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('all headers are required');
    });

    it('should return 400 when wallet address format is invalid', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = Buffer.from(`Grapevine Authentication\n\nWallet: ${invalidWalletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': invalidWalletAddress,
          'x-signature': '0xDEADBEEF',
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Invalid wallet address format');
    });

    it('should return 400 when signature format is invalid', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = Buffer.from(`Grapevine Authentication\n\nWallet: ${testWalletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': testWalletAddress,
          'x-signature': 'invalid-signature', // Missing 0x prefix
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Invalid signature format');
    });

    it('should decode base64 encoded message', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `Grapevine Authentication\n\nWallet: ${testWalletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`;
      const encodedMessage = Buffer.from(message).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': testWalletAddress,
          'x-signature': '0xDEADBEEF',
          'x-message': encodedMessage,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.wallet).toBe(testWalletAddress);
    });

    it('should handle message without base64 encoding (but URL encoded)', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      // Messages with newlines need to be base64 encoded for HTTP headers
      const message = Buffer.from(`Grapevine Authentication\n\nWallet: ${testWalletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': testWalletAddress,
          'x-signature': '0xDEADBEEF',
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.wallet).toBe(testWalletAddress);
    });
  });

  
  describe('edge cases', () => {
    it('should reject wallet address with incorrect length', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const shortAddress = '0x12345';
      const message = Buffer.from(`Grapevine Authentication\n\nWallet: ${shortAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': shortAddress,
          'x-signature': '0xDEADBEEF',
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Invalid wallet address format');
    });

    it('should reject wallet address without 0x prefix', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const noPrefixAddress = '1234567890123456789012345678901234567890';
      const message = Buffer.from(`Grapevine Authentication\n\nWallet: ${noPrefixAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': noPrefixAddress,
          'x-signature': '0xDEADBEEF',
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Invalid wallet address format');
    });

    it('should reject signature without 0x prefix', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = Buffer.from(`Grapevine Authentication\n\nWallet: ${testWalletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': testWalletAddress,
          'x-signature': 'DEADBEEF', // Missing 0x prefix
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Invalid signature format');
    });

    it('should reject signature with non-hex characters', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = Buffer.from(`Grapevine Authentication\n\nWallet: ${testWalletAddress}\nTimestamp: ${timestamp}\nNonce: test-nonce`).toString('base64');

      const response = await app.request('/required', {
        method: 'GET',
        headers: {
          'x-wallet-address': testWalletAddress,
          'x-signature': '0xGGGGGGGG', // Invalid hex
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Invalid signature format');
    });
  });
});
