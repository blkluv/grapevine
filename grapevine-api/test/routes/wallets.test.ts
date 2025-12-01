import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../src/index.js';
import { testPool } from '../setup.js';
import {
  createTestWallet,
  createTestCategory,
  createTestFeed,
  createTestEntry,
  createTestPaymentInstruction,
  createTestTransaction,
} from '../helpers/factories.js';
import {
  expectValidUUID,
  expectValidEpochTimestamp,
  expectValidWalletAddress,
  expectPaginatedResponse,
} from '../helpers/assertions.js';
import { generateMockWallet } from '../helpers/generators.js';
import { createWalletAuthHeaders } from '../helpers/auth.js';
import { uuidv7 } from 'uuidv7';

/**
 * Wallets API Tests
 * Tests the wallet management endpoints using app.request()
 */

describe('Wallets API', () => {
  let testWallet: any;

  beforeEach(async () => {
    // Create a test wallet for each test
    testWallet = await createTestWallet(testPool);
  });

  describe('GET /v1/wallets', () => {
    it.skip('should retrieve paginated list of wallets', async () => {
      // Create additional wallets
      await createTestWallet(testPool);
      await createTestWallet(testPool);

      const response = await app.request('/v1/wallets?page=1&page_size=20');
      expect(response.status).toBe(200);

      const data = await response.json();
      expectPaginatedResponse(data);
      expect(data.data.length).toBeGreaterThanOrEqual(3);

      const wallet = data.data[0];
      expectValidUUID(wallet.id);
      expectValidWalletAddress(wallet.wallet_address);
      expectValidEpochTimestamp(wallet.created_at);
      expectValidEpochTimestamp(wallet.updated_at);
    });

    it('should return wallets with correct structure', async () => {
      const response = await app.request(`/v1/wallets/${testWallet.id}`);
      expect(response.status).toBe(200);

      const wallet = await response.json();
      expect(wallet).toHaveProperty('id');
      expect(wallet).toHaveProperty('wallet_address');
      expect(wallet).toHaveProperty('wallet_address_network');
      expect(wallet).toHaveProperty('username');
      expect(wallet).toHaveProperty('created_at');
      expect(wallet).toHaveProperty('updated_at');
    });
  });

  describe('GET /v1/wallets/:wallet_id', () => {
    it('should retrieve wallet by ID', async () => {
      const response = await app.request(`/v1/wallets/${testWallet.id}`);
      expect(response.status).toBe(200);

      const wallet = await response.json();
      expect(wallet.id).toBe(testWallet.id);
      expect(wallet.wallet_address).toBe(testWallet.wallet_address);
    });

    it('should return 404 for non-existent wallet ID', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const response = await app.request(`/v1/wallets/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /v1/wallets/address/:address', () => {
    it('should retrieve wallet by address', async () => {
      const response = await app.request(`/v1/wallets/address/${testWallet.wallet_address}`);
      expect(response.status).toBe(200);

      const wallet = await response.json();
      expect(wallet.id).toBe(testWallet.id);
      expect(wallet.wallet_address).toBe(testWallet.wallet_address);
    });

    it('should return 404 for non-existent address', async () => {
      // Use a different address than 0x0000... since that's used for free payment instruction
      const fakeAddress = '0x1111111111111111111111111111111111111111';
      const response = await app.request(`/v1/wallets/address/${fakeAddress}`);
      expect(response.status).toBe(404);
    });
  });

  describe.skip('POST /v1/wallets', () => {
    it('should create a new wallet', async () => {
      const newWallet = generateMockWallet();

      const response = await app.request('/v1/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWallet),
      });

      expect(response.status).toBe(201);

      const wallet = await response.json();
      expectValidUUID(wallet.id);
      expect(wallet.wallet_address).toBe(newWallet.wallet_address);
      expect(wallet.wallet_address_network).toBe(newWallet.wallet_address_network);
      expect(wallet.username).toBe(newWallet.username);
      expectValidEpochTimestamp(wallet.created_at);
    });

    it('should prevent duplicate wallet addresses on the same network', async () => {
      const response = await app.request('/v1/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: testWallet.wallet_address,
          wallet_address_network: testWallet.wallet_address_network,
          username: 'duplicate',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('PATCH /v1/wallets/:wallet_id', () => {
    it('should update wallet username', async () => {
      const newUsername = 'updated_user';

      const response = await app.request(`/v1/wallets/${testWallet.id}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ username: newUsername }),
      });

      expect(response.status).toBe(200);

      const wallet = await response.json();
      expect(wallet.username).toBe(newUsername);
      expect(wallet.updated_at).toBeGreaterThanOrEqual(testWallet.updated_at);
    });

    it('should update wallet picture_url', async () => {
      const newPictureUrl = 'https://example.com/avatar.png';

      const response = await app.request(`/v1/wallets/${testWallet.id}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ picture_url: newPictureUrl }),
      });

      expect(response.status).toBe(200);

      const wallet = await response.json();
      expect(wallet.picture_url).toBe(newPictureUrl);
      expect(wallet.updated_at).toBeGreaterThanOrEqual(testWallet.updated_at);
    });

    it('should update both username and picture_url', async () => {
      const newUsername = 'new_username';
      const newPictureUrl = 'https://example.com/new-avatar.jpg';

      const response = await app.request(`/v1/wallets/${testWallet.id}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ username: newUsername, picture_url: newPictureUrl }),
      });

      expect(response.status).toBe(200);

      const wallet = await response.json();
      expect(wallet.username).toBe(newUsername);
      expect(wallet.picture_url).toBe(newPictureUrl);
      expect(wallet.updated_at).toBeGreaterThanOrEqual(testWallet.updated_at);
    });

    it('should return 404 when updating non-existent wallet', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';

      const response = await app.request(`/v1/wallets/${fakeId}`, {
        method: 'PATCH',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify({ username: 'new_name' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Wallet data validation', () => {
    it.skip('should reject wallet with invalid address format', async () => {
      const response = await app.request('/v1/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: '0x123', // Too short
          wallet_address_network: 'base',
          username: 'test',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should store timestamps as epoch integers', async () => {
      const response = await app.request(`/v1/wallets/${testWallet.id}`);
      expect(response.status).toBe(200);

      const wallet = await response.json();
      expect(typeof wallet.created_at).toBe('number');
      expect(typeof wallet.updated_at).toBe('number');
      expect(Number.isInteger(wallet.created_at)).toBe(true);
      expect(Number.isInteger(wallet.updated_at)).toBe(true);
    });
  });

  describe('GET /v1/wallets/:wallet_id/stats', () => {
    let testCategory: any;
    let testFeed: any;
    let testEntry: any;
    let testPaymentInstruction: any;

    beforeEach(async () => {
      testCategory = await createTestCategory(testPool);
      testFeed = await createTestFeed(testPool, testWallet.id, testCategory.id);
      testPaymentInstruction = await createTestPaymentInstruction(testPool, uuidv7(), testWallet.id);
      testEntry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
    });

    it('should retrieve wallet stats when they exist', async () => {
      // First, create wallet stats by calling the update function
      await testPool.query('SELECT update_wallet_stats($1)', [testWallet.id]);

      const response = await app.request(`/v1/wallets/${testWallet.id}/stats`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expectValidUUID(data.wallet_id);
      expect(data.wallet_id).toBe(testWallet.id);
      expect(typeof data.total_feeds_created).toBe('number');
      expect(typeof data.total_entries_published).toBe('number');
      expect(typeof data.total_items_sold).toBe('number');
      expect(typeof data.unique_buyers_count).toBe('number');
      expect(typeof data.total_purchases_made).toBe('number');
      expect(typeof data.unique_feeds_purchased_from).toBe('number');
      expect(data.total_revenue_earned).toBeDefined();
      expect(data.total_amount_spent).toBeDefined();
      expectValidEpochTimestamp(data.last_calculated_at);
      expectValidEpochTimestamp(data.created_at);
    });

    it('should return 404 for non-existent wallet stats', async () => {
      const fakeWalletId = '00000000-0000-0000-0000-000000000000';
      const response = await app.request(`/v1/wallets/${fakeWalletId}/stats`);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('Not Found');
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await app.request('/v1/wallets/invalid-uuid/stats');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/wallets/:wallet_id/stats - with transactions', () => {
    let testCategory: any;
    let testFeed: any;
    let testEntry: any;
    let testPaymentInstruction: any;

    beforeEach(async () => {
      testCategory = await createTestCategory(testPool);
      testFeed = await createTestFeed(testPool, testWallet.id, testCategory.id);
      testPaymentInstruction = await createTestPaymentInstruction(testPool, uuidv7(), testWallet.id);
      testEntry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
    });

    it('should reflect provider stats correctly', async () => {
      // Create a buyer wallet
      const buyerWallet = await createTestWallet(testPool);

      // Create a transaction (buyer purchases from provider)
      await createTestTransaction(
        testPool,
        buyerWallet.wallet_address,  // from (buyer wallet address)
        testWallet.wallet_address,    // to (provider wallet address)
        testEntry.id,
        { amount: 2550, asset: 'USDC' } // Amount in cents
      );

      // Update wallet stats
      await testPool.query('SELECT update_wallet_stats($1)', [testWallet.id]);

      const response = await app.request(`/v1/wallets/${testWallet.id}/stats`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total_feeds_created).toBeGreaterThanOrEqual(1);
      expect(data.total_entries_published).toBeGreaterThanOrEqual(1);
      expect(data.total_items_sold).toBeGreaterThanOrEqual(1);
      expect(data.unique_buyers_count).toBeGreaterThanOrEqual(1);
      expect(parseFloat(data.total_revenue_earned)).toBeGreaterThan(0);
    });

    it('should reflect buyer stats correctly', async () => {
      // Create a provider wallet
      const providerWallet = await createTestWallet(testPool);
      const providerFeed = await createTestFeed(testPool, providerWallet.id, testCategory.id);
      const providerPI = await createTestPaymentInstruction(testPool, uuidv7(), providerWallet.id);
      const providerEntry = await createTestEntry(testPool, providerFeed.id, providerPI.id);

      // testWallet purchases from provider
      await createTestTransaction(
        testPool,
        testWallet.wallet_address,  // from (buyer wallet address)
        providerWallet.wallet_address,  // to (provider wallet address)
        providerEntry.id,
        { amount: 1500, asset: 'USDC' } // Amount in cents
      );

      // Update wallet stats for buyer
      await testPool.query('SELECT update_wallet_stats($1)', [testWallet.id]);

      const response = await app.request(`/v1/wallets/${testWallet.id}/stats`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total_purchases_made).toBeGreaterThanOrEqual(1);
      expect(parseFloat(data.total_amount_spent)).toBeGreaterThan(0);
      expect(data.unique_feeds_purchased_from).toBeGreaterThanOrEqual(1);
    });
  });
});
