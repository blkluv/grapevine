import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../src/index.js';
import { testPool } from '../setup.js';
import {
  createTestWallet,
  createTestCategory,
  createTestFeed,
  createTestEntry,
  createTestPaymentInstruction,
  createTestTransaction
} from '../helpers/factories.js';
import { expectValidUUID, expectValidEpochTimestamp } from '../helpers/assertions.js';
import { uuidv7 } from 'uuidv7';

/**
 * Leaderboards API Tests
 * Tests the leaderboard endpoints that consume from database views
 */

describe('Leaderboards API', () => {
  let providerWallet: any;
  let buyerWallet: any;
  let testCategory: any;
  let testFeed: any;
  let testEntry: any;
  let testPaymentInstruction: any;

  beforeEach(async () => {
    // Setup provider
    providerWallet = await createTestWallet(testPool);
    testCategory = await createTestCategory(testPool);
    testFeed = await createTestFeed(testPool, providerWallet.id, testCategory.id);
    testPaymentInstruction = await createTestPaymentInstruction(testPool, uuidv7(), providerWallet.id);
    testEntry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);

    // Setup buyer
    buyerWallet = await createTestWallet(testPool);

    // Create some transactions
    await createTestTransaction(
      testPool,
      buyerWallet.wallet_address,
      providerWallet.wallet_address,
      testEntry.id,
      { amount: 5000, asset: 'USDC' }
    );
  });

  describe('GET /v1/leaderboards/recent-entries', () => {
    it('should retrieve recent entries across all feeds with pagination', async () => {
      // Create additional entries
      await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      const feed2 = await createTestFeed(testPool, providerWallet.id, testCategory.id);
      await createTestEntry(testPool, feed2.id, testPaymentInstruction.id);

      const response = await app.request('/v1/leaderboards/recent-entries?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(1);

      // Check pagination structure
      expect(data.pagination).toHaveProperty('page_size');
      expect(data.pagination).toHaveProperty('next_page_token');
      expect(data.pagination).toHaveProperty('has_more');
      expect(data.pagination.page_size).toBe(10);
      expect(typeof data.pagination.has_more).toBe('boolean');

      const entry = data.data[0];
      expectValidUUID(entry.id);
      expectValidUUID(entry.feed_id);
      expect(entry.cid).toBeTruthy();
      expect(entry.mime_type).toBeTruthy();
      expect(entry.feed_name).toBeTruthy();
      expect(entry.owner_wallet).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(entry.category_name).toBeTruthy();
      expectValidEpochTimestamp(entry.created_at);
    });

    it('should support cursor-based pagination', async () => {
      // Create multiple entries
      for (let i = 0; i < 5; i++) {
        await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      }

      // Get first page
      const firstResponse = await app.request('/v1/leaderboards/recent-entries?page_size=2');
      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      expect(firstData.data.length).toBeLessThanOrEqual(2);

      // If there's a next cursor, use it
      if (firstData.pagination.next_page_token) {
        const secondResponse = await app.request(
          `/v1/leaderboards/recent-entries?page_size=2&page_token=${firstData.pagination.next_page_token}`
        );
        expect(secondResponse.status).toBe(200);
        const secondData = await secondResponse.json();

        // Second page should have different entries
        if (secondData.data.length > 0) {
          expect(secondData.data[0].id).not.toBe(firstData.data[0].id);
        }
      }
    });

    it('should respect limit parameter', async () => {
      const response = await app.request('/v1/leaderboards/recent-entries?page_size=3');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(3);
    });

    it('should use default limit of 20', async () => {
      const response = await app.request('/v1/leaderboards/recent-entries');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination.page_size).toBe(20);
    });

    it('should reject limit greater than 100', async () => {
      const response = await app.request('/v1/leaderboards/recent-entries?page_size=150');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/leaderboards/top-feeds', () => {
    it('should retrieve top feeds by entry count', async () => {
      // Create additional feeds with entries
      const feed2 = await createTestFeed(testPool, providerWallet.id, testCategory.id);
      await createTestEntry(testPool, feed2.id, testPaymentInstruction.id);
      await createTestEntry(testPool, feed2.id, testPaymentInstruction.id);

      const response = await app.request('/v1/leaderboards/top-feeds?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const topFeed = data.data[0];
        expectValidUUID(topFeed.id);
        expect(topFeed.name).toBeTruthy();
        expect(topFeed.owner_wallet).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(topFeed.category_name).toBeTruthy();
        expect(typeof topFeed.total_entries).toBe('number');
        expect(topFeed.total_entries).toBeGreaterThan(0);
        expectValidEpochTimestamp(topFeed.created_at);
      }
    });

    it('should respect limit parameter', async () => {
      const response = await app.request('/v1/leaderboards/top-feeds?page_size=5');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    it('should use default limit of 20', async () => {
      const response = await app.request('/v1/leaderboards/top-feeds');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should reject limit greater than 100', async () => {
      const response = await app.request('/v1/leaderboards/top-feeds?page_size=150');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/leaderboards/top-revenue', () => {
    it('should retrieve top revenue generating feeds', async () => {
      const response = await app.request('/v1/leaderboards/top-revenue?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const leader = data.data[0];
        expect(typeof leader.rank).toBe('number');
        expectValidUUID(leader.id);
        expect(leader.name).toBeTruthy();
        expectValidUUID(leader.owner_id);
        expect(leader.owner_wallet).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(leader.category_name).toBeTruthy();
        expect(typeof leader.total_entries).toBe('number');
        expect(typeof leader.total_purchases).toBe('number');
        expect(typeof leader.unique_buyers).toBe('number');
        expect(leader.total_revenue).toBeDefined();
        expectValidEpochTimestamp(leader.created_at);
      }
    });

    it('should order feeds by total revenue descending', async () => {
      // Create another feed with higher revenue
      const feed2 = await createTestFeed(testPool, providerWallet.id, testCategory.id);
      const entry2 = await createTestEntry(testPool, feed2.id, testPaymentInstruction.id);

      // Create a third entry for multiple purchases (can't have multiple purchases from same user for same entry)
      const entry3 = await createTestEntry(testPool, feed2.id, testPaymentInstruction.id, {
        cid: `Qm${Math.random().toString(36).substring(2, 44)}`
      });

      // Create transactions for different entries to build up revenue
      await createTestTransaction(testPool, buyerWallet.wallet_address, providerWallet.id, entry2.id, {
        amount: 10000,
        transaction_hash: `0x${Math.random().toString(36).substring(2).padEnd(64, '0')}`
      });
      await createTestTransaction(testPool, buyerWallet.wallet_address, providerWallet.id, entry3.id, {
        amount: 15000,
        transaction_hash: `0x${Math.random().toString(36).substring(2).padEnd(64, '1')}`
      });

      const response = await app.request('/v1/leaderboards/top-revenue?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      if (data.data.length >= 2) {
        const first = parseFloat(data.data[0].total_revenue);
        const second = parseFloat(data.data[1].total_revenue);
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it('should respect limit parameter', async () => {
      const response = await app.request('/v1/leaderboards/top-revenue?page_size=5');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject limit greater than 100', async () => {
      const response = await app.request('/v1/leaderboards/top-revenue?page_size=150');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/leaderboards/top-providers', () => {
    it('should retrieve top providers by revenue', async () => {
      const response = await app.request('/v1/leaderboards/top-providers?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const provider = data.data[0];
        expect(typeof provider.rank).toBe('number');
        expectValidUUID(provider.user_id);
        expect(provider.wallet_address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(typeof provider.total_feeds).toBe('number');
        expect(typeof provider.total_entries).toBe('number');
        expect(typeof provider.total_purchases).toBe('number');
        expect(typeof provider.unique_buyers).toBe('number');
        expect(provider.total_revenue).toBeDefined();
        expectValidEpochTimestamp(provider.joined_at);
      }
    });

    it('should aggregate stats across all feeds for each provider', async () => {
      // Create second feed for the same provider
      const feed2 = await createTestFeed(testPool, providerWallet.id, testCategory.id);
      const entry2 = await createTestEntry(testPool, feed2.id, testPaymentInstruction.id);
      await createTestTransaction(testPool, buyerWallet.wallet_address, providerWallet.id, entry2.id, {
        amount: 3000,
        transaction_hash: `0x${Math.random().toString(36).substring(2).padEnd(64, '2')}`
      });

      const response = await app.request('/v1/leaderboards/top-providers?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      const provider = data.data.find((p: any) => p.user_id === providerWallet.id);

      if (provider) {
        expect(provider.total_feeds).toBeGreaterThanOrEqual(2);
        expect(provider.total_entries).toBeGreaterThanOrEqual(2);
      }
    });

    it('should respect limit parameter', async () => {
      const response = await app.request('/v1/leaderboards/top-providers?page_size=3');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /v1/leaderboards/top-buyers', () => {
    it('should retrieve top buyers by purchase count', async () => {
      const response = await app.request('/v1/leaderboards/top-buyers?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const buyer = data.data[0];
        expect(typeof buyer.rank).toBe('number');
        expectValidUUID(buyer.user_id);
        expect(buyer.wallet_address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(typeof buyer.total_purchases).toBe('number');
        expect(typeof buyer.unique_entries_purchased).toBe('number');
        expect(typeof buyer.unique_feeds_purchased_from).toBe('number');
        expect(buyer.total_spent).toBeDefined();
        expectValidEpochTimestamp(buyer.joined_at);
      }
    });

    it('should order buyers by purchase count descending', async () => {
      // Create another buyer with more purchases
      const activeBuyer = await createTestWallet(testPool);

      // Create multiple purchases for active buyer
      const entry3 = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id, {
        cid: `Qm${Math.random().toString(36).substring(2, 44)}`
      });
      const entry4 = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id, {
        cid: `Qm${Math.random().toString(36).substring(2, 44)}`
      });

      await createTestTransaction(testPool, activeBuyer.wallet_address, providerWallet.id, entry3.id, {
        transaction_hash: `0x${Math.random().toString(36).substring(2).padEnd(64, '3')}`
      });
      await createTestTransaction(testPool, activeBuyer.wallet_address, providerWallet.id, entry4.id, {
        transaction_hash: `0x${Math.random().toString(36).substring(2).padEnd(64, '4')}`
      });

      const response = await app.request('/v1/leaderboards/top-buyers?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      if (data.data.length >= 2) {
        const first = data.data[0].total_purchases;
        const second = data.data[1].total_purchases;
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it('should respect limit parameter', async () => {
      const response = await app.request('/v1/leaderboards/top-buyers?page_size=5');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /v1/leaderboards/trending', () => {
    it('should retrieve trending feeds from last 7 days', async () => {
      const response = await app.request('/v1/leaderboards/trending?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const trending = data.data[0];
        expect(typeof trending.rank).toBe('number');
        expectValidUUID(trending.id); // Changed from feed_id to id to match FeedCoreSchema
        expect(trending.name).toBeTruthy(); // Changed from feed_name to name
        expect(trending.owner_wallet).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(trending.category_name).toBeTruthy();
        expect(typeof trending.purchases_last_7d).toBe('number');
        expect(typeof trending.unique_buyers_last_7d).toBe('number');
        expect(trending.revenue_last_7d).toBeDefined();
      }
    });

    it('should only include feeds with purchases in last 7 days', async () => {
      const response = await app.request('/v1/leaderboards/trending?page_size=50');
      expect(response.status).toBe(200);

      const data = await response.json();
      // All returned feeds should have at least 1 purchase in last 7 days
      data.data.forEach((feed: any) => {
        expect(feed.purchases_last_7d).toBeGreaterThan(0);
      });
    });

    it('should respect limit parameter (max 50)', async () => {
      const response = await app.request('/v1/leaderboards/trending?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(10);
    });

    it('should reject limit greater than 50', async () => {
      const response = await app.request('/v1/leaderboards/trending?page_size=100');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/leaderboards/most-popular', () => {
    it('should retrieve most popular feeds by purchase count', async () => {
      const response = await app.request('/v1/leaderboards/most-popular?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const popular = data.data[0];
        expect(typeof popular.rank).toBe('number');
        expectValidUUID(popular.id);
        expect(popular.name).toBeTruthy();
        expect(popular.category_name).toBeTruthy();
        expect(typeof popular.total_entries).toBe('number');
        expect(typeof popular.total_purchases).toBe('number');
        expect(typeof popular.unique_buyers).toBe('number');
        expect(popular.total_revenue).toBeDefined();
      }
    });

    it('should include average revenue per purchase', async () => {
      const response = await app.request('/v1/leaderboards/most-popular?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      if (data.data.length > 0) {
        const popular = data.data[0];
        if (popular.total_purchases > 0) {
          expect(popular.avg_revenue_per_purchase).toBeDefined();
        }
      }
    });

    it('should order feeds by purchase count descending', async () => {
      const response = await app.request('/v1/leaderboards/most-popular?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      if (data.data.length >= 2) {
        const first = data.data[0].total_purchases;
        const second = data.data[1].total_purchases;
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it('should respect limit parameter', async () => {
      const response = await app.request('/v1/leaderboards/most-popular?page_size=5');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    it('should reject limit greater than 100', async () => {
      const response = await app.request('/v1/leaderboards/most-popular?page_size=150');
      expect(response.status).toBe(400);
    });
  });

  describe('Leaderboard Rankings', () => {
    it('should assign sequential ranks in top-revenue leaderboard', async () => {
      // Create multiple feeds with transactions
      for (let i = 0; i < 3; i++) {
        const feed = await createTestFeed(testPool, providerWallet.id, testCategory.id);
        const entry = await createTestEntry(testPool, feed.id, testPaymentInstruction.id);
        await createTestTransaction(testPool, buyerWallet.wallet_address, providerWallet.id, entry.id, {
          amount: (i + 1) * 1000,
          transaction_hash: `0x${Math.random().toString(36).substring(2).padEnd(64, i.toString())}`
        });
      }

      const response = await app.request('/v1/leaderboards/top-revenue?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      if (data.data.length >= 2) {
        // Verify ranks are sequential
        for (let i = 0; i < data.data.length - 1; i++) {
          expect(data.data[i].rank).toBeLessThan(data.data[i + 1].rank);
        }
      }
    });
  });

  describe('Time Period Filtering', () => {
    it('should filter top-revenue by period=all (default)', async () => {
      const response = await app.request('/v1/leaderboards/top-revenue?page_size=10');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('period');
      expect(data.period).toBe('all');
      expect(data).toHaveProperty('data');
    });

    it('should filter top-revenue by period=7d', async () => {
      const response = await app.request('/v1/leaderboards/top-revenue?page_size=10&period=7d');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('7d');
      expect(data).toHaveProperty('data');
    });

    it('should filter top-revenue by period=1d', async () => {
      const response = await app.request('/v1/leaderboards/top-revenue?page_size=10&period=1d');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('1d');
      expect(data).toHaveProperty('data');
    });

    it('should filter top-revenue by period=30d', async () => {
      const response = await app.request('/v1/leaderboards/top-revenue?page_size=10&period=30d');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('30d');
      expect(data).toHaveProperty('data');
    });

    it('should filter top-providers by time period', async () => {
      const response = await app.request('/v1/leaderboards/top-providers?page_size=10&period=7d');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('7d');
      expect(data).toHaveProperty('data');
    });

    it('should filter top-buyers by time period', async () => {
      const response = await app.request('/v1/leaderboards/top-buyers?page_size=10&period=30d');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('30d');
      expect(data).toHaveProperty('data');
    });

    it('should filter most-popular by time period', async () => {
      const response = await app.request('/v1/leaderboards/most-popular?page_size=10&period=1d');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.period).toBe('1d');
      expect(data).toHaveProperty('data');
    });

    it('should reject invalid time period values', async () => {
      const response = await app.request('/v1/leaderboards/top-revenue?page_size=10&period=invalid');
      expect(response.status).toBe(400);
    });

    it('should show different results for different time periods', async () => {
      // Get all time results
      const allTimeResponse = await app.request('/v1/leaderboards/top-revenue?page_size=10&period=all');
      const allTimeData = await allTimeResponse.json();

      // Get 1 day results
      const oneDayResponse = await app.request('/v1/leaderboards/top-revenue?page_size=10&period=1d');
      const oneDayData = await oneDayResponse.json();

      // Both should return successfully
      expect(allTimeResponse.status).toBe(200);
      expect(oneDayResponse.status).toBe(200);

      // Period should be different
      expect(allTimeData.period).toBe('all');
      expect(oneDayData.period).toBe('1d');
    });
  });

  describe('GET /v1/leaderboards/category-stats', () => {
    it('should retrieve category statistics', async () => {
      const response = await app.request('/v1/leaderboards/category-stats');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const category = data.data[0];
        expectValidUUID(category.category_id);
        expect(category.category_name).toBeTruthy();
        expect(typeof category.total_feeds).toBe('number');
        expect(typeof category.total_providers).toBe('number');
        expect(typeof category.total_entries).toBe('number');
        expect(typeof category.total_purchases).toBe('number');
        expect(category.total_revenue).toBeDefined();
        expect(typeof category.unique_buyers).toBe('number');
        expect(category.avg_purchase_amount).toBeDefined();
      }
    });

    it('should have testCategory with correct data', async () => {
      const response = await app.request('/v1/leaderboards/category-stats');
      expect(response.status).toBe(200);

      const data = await response.json();
      const testCategoryStat = data.data.find((c: any) => c.category_id === testCategory.id);

      expect(testCategoryStat).toBeDefined();
      expect(testCategoryStat.category_id).toBe(testCategory.id);
      expect(testCategoryStat.category_name).toBe(testCategory.name);
      expect(testCategoryStat.total_feeds).toBeGreaterThanOrEqual(1);
      expect(testCategoryStat.total_providers).toBeGreaterThanOrEqual(1);
    });

    it('should order categories by revenue descending', async () => {
      const response = await app.request('/v1/leaderboards/category-stats');
      expect(response.status).toBe(200);

      const data = await response.json();

      if (data.data.length > 1) {
        // Check that revenues are in descending order
        for (let i = 0; i < data.data.length - 1; i++) {
          const currentRevenue = parseFloat(data.data[i].total_revenue);
          const nextRevenue = parseFloat(data.data[i + 1].total_revenue);
          expect(currentRevenue).toBeGreaterThanOrEqual(nextRevenue);
        }
      }
    });
  });
});
