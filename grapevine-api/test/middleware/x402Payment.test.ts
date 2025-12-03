import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { testPool } from '../setup.js';
import { createTestWallet, createTestCategory, createTestFeed } from '../helpers/factories.js';
import { generateTestContent } from '../helpers/pinata.js';

/**
 * X402 Payment Middleware Tests
 *
 * NOTE: Payment middleware has been disabled in favor of wallet auth.
 * These tests now verify that wallet auth is required instead of payment.
 * The routes now return 401 Unauthorized when no auth headers are provided.
 */

describe('X402 Payment Middleware', () => {
  let app: any;

  beforeAll(async () => {
    // Unmock the x402-hono middleware for this test suite only
    vi.unmock('x402-hono');

    // Re-import the app with the real payment middleware
    const { app: realApp } = await import('../../src/index.js');
    app = realApp;
  });
  let testWallet: any;
  let testCategory: any;
  let testFeed: any;

  beforeEach(async () => {


    testWallet = await createTestWallet(testPool);
    testCategory = await createTestCategory(testPool);
    testFeed = await createTestFeed(testPool, testWallet.id, testCategory.id);
  });

  describe('POST /v1/feeds - Feed Creation Payment Protection', () => {
    // Payment middleware disabled - now uses wallet auth which returns 401
    it('should return 401 Unauthorized when creating feed without auth', async () => {
      const newFeedData = {
        category_id: testCategory.id,
        name: 'Test Feed Requiring Payment',
        description: 'This feed creation should require auth',
        tags: ['test', 'payment'],
      };

      const response = await app.request('/v1/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFeedData),
      });

      expect(response.status).toBe(401);

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    // Payment middleware disabled - now uses wallet auth which returns 401
    it('should return 401 with error message when no auth provided', async () => {
      const newFeedData = {
        category_id: testCategory.id,
        name: 'Test Feed',
        description: 'Test',
      };

      const response = await app.request('/v1/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFeedData),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should not apply auth middleware to GET /v1/feeds', async () => {
      const response = await app.request('/v1/feeds?page_size=20');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
    });

  });

  describe('POST /v1/feeds/:id/entries - Entry Creation Payment Protection', () => {
    // Payment middleware disabled - now uses wallet auth which returns 401
    it('should return 401 Unauthorized when creating entry without auth', async () => {
      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        title: 'Test Entry Requiring Payment',
        is_free: false,
        price: {
          amount: '1000000',
          currency: 'USDC',
          network: 'base' as const,
        },
      };

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });

      expect(response.status).toBe(401);

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });


    it('should not apply auth middleware to GET /v1/feeds/:id/entries', async () => {
      const response = await app.request(`/v1/feeds/${testFeed.id}/entries?page_size=20`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
    });

  });

  describe('Wildcard Path Matching', () => {
    // Payment middleware disabled - now uses wallet auth which returns 401
    it('should require auth for nested feed entry paths with any feed_id', async () => {
      const anotherFeed = await createTestFeed(testPool, testWallet.id, testCategory.id);

      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        is_free: true,
      };

      const response = await app.request(`/v1/feeds/${anotherFeed.id}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });

      expect(response.status).toBe(401);
    });

  });
});
