import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../src/index.js';
import { testPool } from '../setup.js';

describe('Authentication API', () => {
  describe('POST /v1/auth/nonce', () => {
    it('should generate a nonce for a valid wallet address', async () => {
      const response = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('nonce');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('expiresAt');

      // Validate nonce format (32 alphanumeric characters)
      expect(data.nonce).toHaveLength(32);
      expect(data.nonce).toMatch(/^[a-zA-Z0-9]+$/);

      // Validate message format
      expect(data.message).toContain('I am signing in to Grapevine');
      expect(data.message).toContain(data.nonce);

      // Validate expiration is ~5 minutes in the future
      const now = Date.now();
      const expiryDuration = data.expiresAt - now;
      expect(expiryDuration).toBeGreaterThan(4.5 * 60 * 1000); // At least 4.5 minutes
      expect(expiryDuration).toBeLessThan(5.5 * 60 * 1000); // At most 5.5 minutes
    });

    it('should generate different nonces for multiple requests', async () => {
      const response1 = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        }),
      });

      const response2 = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        }),
      });

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.nonce).not.toBe(data2.nonce);
      expect(data1.message).not.toBe(data2.message);
    });

    it('should generate different nonces for different wallet addresses', async () => {
      const response1 = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        }),
      });

      const response2 = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x1234567890123456789012345678901234567890',
        }),
      });

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.nonce).not.toBe(data2.nonce);
    });

    it('should reject invalid wallet address format', async () => {
      const invalidAddresses = [
        'not-an-address',
        '0x123', // Too short
        '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // Invalid hex
        'abcdef1234567890123456789012345678901234', // Missing 0x prefix
        '', // Empty
      ];

      for (const address of invalidAddresses) {
        const response = await app.request('/v1/auth/nonce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: address,
          }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data).toHaveProperty('error');
      }
    });

    it('should handle uppercase wallet addresses (hex part)', async () => {
      const response = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x742D35CC6634C0532925A3B844BC9E7595F0BEB1',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('nonce');
    });

    it('should handle mixed case wallet addresses (checksummed)', async () => {
      const response = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('nonce');
    });

    it('should reject missing wallet_address field', async () => {
      const response = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should reject request with invalid JSON', async () => {
      const response = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      });

      // Should return 400 or 500 for invalid JSON
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('Nonce storage and expiration', () => {
    it('should overwrite previous nonce when generating a new one for same address', async () => {
      const wallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';

      // Generate first nonce
      const response1 = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet }),
      });

      const data1 = await response1.json();
      const nonce1 = data1.nonce;

      // Generate second nonce for same wallet
      const response2 = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet }),
      });

      const data2 = await response2.json();
      const nonce2 = data2.nonce;

      // Nonces should be different (old one is replaced)
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('Message format', () => {
    it('should include ISO timestamp in the message', async () => {
      const response = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        }),
      });

      const data = await response.json();

      // Check message contains ISO timestamp format
      expect(data.message).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should follow expected message format', async () => {
      const response = await app.request('/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        }),
      });

      const data = await response.json();

      // Message should follow: "I am signing in to Grapevine at {timestamp} with nonce: {nonce}"
      const expectedPattern =
        /^I am signing in to Grapevine at .+ with nonce: [a-zA-Z0-9]{32}$/;
      expect(data.message).toMatch(expectedPattern);
    });
  });
});
