import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { testPool } from '../setup.js';
import { createTestWallet, createTestCategory, createTestFeed } from '../helpers/factories.js';
import { generateTestContent } from '../helpers/pinata.js';

/**
 * X402 Payment Middleware Tests
 * Tests that the x402 payment middleware is properly applied to protected endpoints
 *
 * NOTE: This test file unmocks the x402-hono middleware that is mocked globally in setup.ts
 * to actually test the payment protection behavior
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
    it('should return 402 Payment Required when creating feed without payment', async () => {
      const newFeedData = {
        category_id: testCategory.id,
        name: 'Test Feed Requiring Payment',
        description: 'This feed creation should require payment',
        tags: ['test', 'payment'],
      };

      const response = await app.request('/v1/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFeedData),
      });

      expect(response.status).toBe(402);

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    it('should include x402 payment instructions in 402 response', async () => {
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

      expect(response.status).toBe(402);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should not apply payment middleware to GET /v1/feeds', async () => {
      const response = await app.request('/v1/feeds?page_size=20');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
    });

  });

  describe('POST /v1/feeds/:id/entries - Entry Creation Payment Protection', () => {
    it('should return 402 Payment Required when creating entry without payment', async () => {
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

      expect(response.status).toBe(402);

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });


    it('should not apply payment middleware to GET /v1/feeds/:id/entries', async () => {
      const response = await app.request(`/v1/feeds/${testFeed.id}/entries?page_size=20`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
    });

  });

  describe('Wildcard Path Matching', () => {
    it('should apply middleware to nested feed entry paths with any feed_id', async () => {
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

      expect(response.status).toBe(402);
    });

  });
});
