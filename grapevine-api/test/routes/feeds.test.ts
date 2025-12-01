// Set required environment variables BEFORE any imports
// This ensures the config module sees them when it's loaded

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app } from '../../src/index.js';
import { testPool } from '../setup.js';
import { createTestWallet, createTestCategory, createTestFeed, createTestEntry, createTestPaymentInstruction } from '../helpers/factories.js';
import { expectValidUUID, expectValidEpochTimestamp } from '../helpers/assertions.js';
import { createWalletAuthHeaders } from '../helpers/auth.js';
import * as pinataV3 from '../../src/services/pinataV3.js';
import crypto from 'crypto';
import { uuidv7 } from 'uuidv7';
import { config } from '../../src/services/config.js';

// Mock Pinata V3 functions at the module level to avoid actual API calls
vi.mock('../../src/services/pinataV3.js', async (importOriginal) => {
  const mod = await importOriginal<typeof pinataV3>();
  const { uuidv7 } = await import('uuidv7');
  return {
    ...mod,
    getPinataV3Config: vi.fn(() => ({
      uploadsUrl: 'https://uploads.pinata.cloud',
      adminKey: 'test_admin_key',
      userId: 'test_user_id',
    })),
    createGroup: vi.fn(async () => {
      // Generate a new UUIDv7 (time-ordered) for each call
      return uuidv7();
    }),
  };
});

/**
 * Feeds API Tests
 * Tests the feed management endpoints using app.request()
 */

describe('Feeds API', () => {
  let testWallet: any;
  let testCategory: any;
  let testFeed: any;
  let testPaymentInstructionId = config.payment.freePaymentInstructionId!;

  beforeEach(async () => {
    testWallet = await createTestWallet(testPool);
    testCategory = await createTestCategory(testPool);
    testFeed = await createTestFeed(testPool, testWallet.id, testCategory.id);

    // Create a test entry for the feed to ensure it meets the min_entries=1 default
    await createTestEntry(testPool, testFeed.id, testPaymentInstructionId);
  });

  describe('GET /v1/feeds', () => {
    it('should retrieve cursor-paginated list of feeds', async () => {
      // Create additional feeds with entries
      const feed2 = await createTestFeed(testPool, testWallet.id, testCategory.id);
      await createTestEntry(testPool, feed2.id, testPaymentInstructionId);
      const feed3 = await createTestFeed(testPool, testWallet.id, testCategory.id);
      await createTestEntry(testPool, feed3.id, testPaymentInstructionId);

      const response = await app.request('/v1/feeds?page_size=20');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('page_size');
      expect(data.pagination).toHaveProperty('next_page_token');
      expect(data.pagination).toHaveProperty('has_more');
      expect(data.data.length).toBeGreaterThanOrEqual(3);

      const feed = data.data[0];
      expectValidUUID(feed.id);
      expectValidUUID(feed.owner_id);
      expect(feed.owner_wallet_address).toBeTruthy();
      expect(feed.owner_wallet_address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expectValidUUID(feed.category_id);
      expectValidEpochTimestamp(feed.created_at);
    });

    it('should filter feeds by owner_id', async () => {
      const anotherWallet = await createTestWallet(testPool);
      const anotherFeed = await createTestFeed(testPool, anotherWallet.id, testCategory.id);
      await createTestEntry(testPool, anotherFeed.id, testPaymentInstructionId);

      const response = await app.request(`/v1/feeds?owner_id=${testWallet.id}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      data.data.forEach((feed: any) => {
        expect(feed.owner_id).toBe(testWallet.id);
      });
    });

    it('should filter feeds by category', async () => {
      const anotherCategory = await createTestCategory(testPool, { name: 'Another Category' });
      const anotherFeed = await createTestFeed(testPool, testWallet.id, anotherCategory.id);
      await createTestEntry(testPool, anotherFeed.id, testPaymentInstructionId);

      const response = await app.request(`/v1/feeds?category=${testCategory.id}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      data.data.forEach((feed: any) => {
        expect(feed.category_id).toBe(testCategory.id);
      });
    });

    it('should filter feeds by tags', async () => {
      const taggedFeed = await createTestFeed(testPool, testWallet.id, testCategory.id, {
        tags: ['crypto', 'trading'],
      });
      await createTestEntry(testPool, taggedFeed.id, testPaymentInstructionId);

      const response = await app.request('/v1/feeds?tags=crypto');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter feeds by is_active status', async () => {
      // Update feed to inactive
      await testPool.query(
        'UPDATE gv_feeds SET is_active = false WHERE id = $1',
        [testFeed.id]
      );

      const response = await app.request('/v1/feeds?is_active=true');
      expect(response.status).toBe(200);

      const data = await response.json();
      data.data.forEach((feed: any) => {
        expect(feed.is_active).toBe(true);
      });
    });

    it('should filter feeds by minEntries count', async () => {
      const piid = (await createTestPaymentInstruction(testPool, uuidv7(), testWallet.id)).id;

      // Create entries for the feed
      await createTestEntry(testPool, testFeed.id, piid);
      await createTestEntry(testPool, testFeed.id, piid);
      await createTestEntry(testPool, testFeed.id, piid);

      const response = await app.request('/v1/feeds?min_entries=3');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter feeds by age (minAge/maxAge)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;

      const response = await app.request(`/v1/feeds?max_age=${oneHourAgo}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      data.data.forEach((feed: any) => {
        expect(feed.created_at).toBeGreaterThanOrEqual(oneHourAgo);
      });
    });
  });

  describe('GET /v1/feeds/:feed_id', () => {
    it('should retrieve feed by ID', async () => {
      const response = await app.request(`/v1/feeds/${testFeed.id}`);
      expect(response.status).toBe(200);

      const feed = await response.json();
      expect(feed.id).toBe(testFeed.id);
      expect(feed.name).toBe(testFeed.name);
      expect(feed.owner_id).toBe(testWallet.id);
      expect(feed.owner_wallet_address).toBeTruthy();
      expect(feed.owner_wallet_address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('should return 404 for non-existent feed', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const response = await app.request(`/v1/feeds/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /v1/feeds', () => {
    it('should create a new feed', async () => {
      const newFeedData = {
        category_id: testCategory.id,
        name: 'New Test Feed',
        description: 'A brand new feed',
        tags: ['test', 'new'],
      };

      const response = await app.request('/v1/feeds', {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(newFeedData),
      });

      if (response.status !== 201) {
        console.log('Response:', response.status, await response.json());
      }
      expect(response.status).toBe(201);

      const feed = await response.json();
      expectValidUUID(feed.id);
      expect(feed.name).toBe(newFeedData.name);
      expect(feed.description).toBe(newFeedData.description);
      expect(feed.owner_id).toBe(testWallet.id);
      expect(feed.owner_wallet_address).toBeTruthy();
      expect(feed.owner_wallet_address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(feed.category_id).toBe(newFeedData.category_id);
      expect(feed.tags).toEqual(newFeedData.tags);
      expect(feed.is_active).toBe(true);
      expectValidEpochTimestamp(feed.created_at);
    });

    it('should create feed with only required fields', async () => {
      const minimalFeed = {
        category_id: testCategory.id,
        name: 'Minimal Feed',
      };

      const response = await app.request('/v1/feeds', {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(minimalFeed),
      });

      expect(response.status).toBe(201);

      const feed = await response.json();
      expect(feed.name).toBe(minimalFeed.name);
      expect(feed.description).toBeNull();
      expect(feed.tags).toBeNull();
      expect(feed.is_active).toBe(true);
    });

    it('should only allow Base chain wallets to create feeds', async () => {
      // Create wallet on different network
      const nonBaseWallet = await testPool.query(
        `INSERT INTO gv_wallets (wallet_address, wallet_address_network, created_at, updated_at)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        ['0x1234567890123456789012345678901234567890', 'ethereum', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      );

      const response = await app.request('/v1/feeds', {
        method: 'POST',
        headers: createWalletAuthHeaders(nonBaseWallet.rows[0].wallet_address),
        body: JSON.stringify({
          category_id: testCategory.id,
          name: 'Invalid Network Feed',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Base chain');
    });

    it('should reject invalid category_id', async () => {
      const response = await app.request('/v1/feeds', {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({
          category_id: '00000000-0000-4000-8000-000000000000',
          name: 'Invalid Category Feed',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should auto-create wallet when creating feed with new wallet', async () => {
      // Use a wallet address that doesn't exist in the database
      const newWalletAddress = '0x9999999999999999999999999999999999999999';

      const feedData = {
        category_id: testCategory.id,
        name: 'Feed from New Wallet',
        description: 'Testing auto wallet creation',
      };

      const response = await app.request('/v1/feeds', {
        method: 'POST',
        headers: createWalletAuthHeaders(newWalletAddress),
        body: JSON.stringify(feedData),
      });

      expect(response.status).toBe(201);

      const feed = await response.json();
      expect(feed.name).toBe(feedData.name);
      expectValidUUID(feed.owner_id);

      // Verify the wallet was created
      const walletCheck = await testPool.query(
        'SELECT * FROM gv_wallets WHERE LOWER(wallet_address) = LOWER($1)',
        [newWalletAddress]
      );

      expect(walletCheck.rows.length).toBe(1);
      expect(walletCheck.rows[0].wallet_address.toLowerCase()).toBe(newWalletAddress.toLowerCase());
      expect(walletCheck.rows[0].wallet_address_network).toBe('base');
      expect(feed.owner_id).toBe(walletCheck.rows[0].id);
    });

    // Note: extractCIDFromURL with folder paths is thoroughly tested in test/services/pinataV3.test.ts
    // The unit tests cover all scenarios including:
    // - CID extraction with nested folder paths (e.g., /ipfs/CID/folder/image.png)
    // - Query parameters and URL fragments handling
    // - Different gateway domains and protocols (ipfs://, https://, etc.)
    // Integration tests for feed creation with IPFS URLs are not included here because they require
    // Pinata API mocking that's already covered by the comprehensive unit tests.
  });

  describe('PATCH /v1/feeds/:feed_id', () => {
    it('should update feed name', async () => {
      const newName = 'Updated Feed Name';

      const response = await app.request(`/v1/feeds/${testFeed.id}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ name: newName }),
      });

      expect(response.status).toBe(200);

      const feed = await response.json();
      expect(feed.name).toBe(newName);
      expect(feed.updated_at).toBeGreaterThanOrEqual(testFeed.updated_at);
    });

    it('should update feed description', async () => {
      const newDescription = 'Updated description';

      const response = await app.request(`/v1/feeds/${testFeed.id}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ description: newDescription }),
      });

      expect(response.status).toBe(200);

      const feed = await response.json();
      expect(feed.description).toBe(newDescription);
    });

    it('should update feed tags', async () => {
      const newTags = ['updated', 'tags'];

      const response = await app.request(`/v1/feeds/${testFeed.id}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ tags: newTags }),
      });

      expect(response.status).toBe(200);

      const feed = await response.json();
      expect(feed.tags).toEqual(newTags);
    });

    it('should toggle is_active status', async () => {
      const response = await app.request(`/v1/feeds/${testFeed.id}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ is_active: false }),
      });

      expect(response.status).toBe(200);

      const feed = await response.json();
      expect(feed.is_active).toBe(false);
    });

    it('should return 404 when updating non-existent feed', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';

      const response = await app.request(`/v1/feeds/${fakeId}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /v1/feeds/:feed_id', () => {
    it('should delete a feed and all its entries', async () => {
      const feedToDelete = await createTestFeed(testPool, testWallet.id, testCategory.id);

      // Create some entries for this feed
      const entry1 = await createTestEntry(testPool, feedToDelete.id, testPaymentInstructionId);
      const entry2 = await createTestEntry(testPool, feedToDelete.id, testPaymentInstructionId);

      const response = await app.request(`/v1/feeds/${feedToDelete.id}`, {
        method: 'DELETE',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
      });

      expect(response.status).toBe(204);

      // Verify soft delete: feed still exists but is_active is false
      const getResponse = await app.request(`/v1/feeds/${feedToDelete.id}`);
      expect(getResponse.status).toBe(200);

      const feed = await getResponse.json();
      expect(feed.is_active).toBe(false);
      expect(feed.id).toBe(feedToDelete.id);

      // Verify all entries are also soft deleted
      const entry1Response = await app.request(`/v1/feeds/${feedToDelete.id}/entries/${entry1.id}`);
      expect(entry1Response.status).toBe(200);
      const deletedEntry1 = await entry1Response.json();
      expect(deletedEntry1.is_active).toBe(false);

      const entry2Response = await app.request(`/v1/feeds/${feedToDelete.id}/entries/${entry2.id}`);
      expect(entry2Response.status).toBe(200);
      const deletedEntry2 = await entry2Response.json();
      expect(deletedEntry2.is_active).toBe(false);
    });

    it('should return 404 when deleting non-existent feed', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';

      const response = await app.request(`/v1/feeds/${fakeId}`, {
        method: 'DELETE',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
      });

      expect(response.status).toBe(404);
    });
  });
});
