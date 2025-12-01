import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { app } from '../../src/index.js';
import { testPool } from '../setup.js';
import {
  createTestWallet,
  createTestCategory,
  createTestFeed,
  createTestPaymentInstruction,
  createTestEntry,
} from '../helpers/factories.js';
import {
  expectValidUUID,
  expectValidEpochTimestamp,
  expectValidWalletAddress,
  expectCursorPaginatedResponse,
} from '../helpers/assertions.js';
import { createAdminAuthHeaders } from '../helpers/auth.js';
import { generateRandomTransactionHash } from '../helpers/generators.js';
import { uuidv7 } from 'uuidv7';

/**
 * Transactions API Tests
 * Tests the transaction endpoints with wallet auth and admin auth
 */

describe('Transactions API', () => {
  let testWallet1: any;
  let testWallet2: any;
  let testCategory: any;
  let testFeed: any;
  let testPI: any;
  let testEntry: any;

  beforeEach(async () => {
    // Create test data for each test
    testWallet1 = await createTestWallet(testPool);
    testWallet2 = await createTestWallet(testPool);
    testCategory = await createTestCategory(testPool);
    testFeed = await createTestFeed(testPool, testWallet1.id, testCategory.id);
    testPI = await createTestPaymentInstruction(testPool, uuidv7(), testWallet1.id);
    testEntry = await createTestEntry(testPool, testFeed.id, testPI.id);
  });

  describe('POST /v1/transactions - Create Transaction', () => {
    it('should create a transaction with valid admin auth and x402_data', async () => {
      const transactionData = [{
        timestamp: Math.floor(Date.now() / 1000),
        root_cid: testEntry.cid,
        request: {
          method: 'GET',
          url: 'https://example.com',
          headers: {},
        },
        response: {
          status_code: 200,
          headers: {},
        },
        location_data: {
          city: 'San Francisco',
          country: 'US',
        },
        x402_data: {
          settled: true,
          verified: true,
          x402_version: 1,
          scheme: 'ethereum',
          network: 'base-sepolia',
          payment_instruction_id: testPI.id,
          pay_to: testWallet1.wallet_address,
          payer: testWallet2.wallet_address,
          asset: 'USDC',
          amount: '1000000', // 1 USDC in wei
          transaction: generateRandomTransactionHash(),
        },
      }];

      const response = await app.request('/v1/transactions', {
        method: 'POST',
        headers: createAdminAuthHeaders(),
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(201);
      const result = await response.json();

      expect(result.created).toBe(1);
      expect(result.transactions).toHaveLength(1);

      const transaction = result.transactions[0];
      expectValidUUID(transaction.id);
      expect(transaction.payer).toBe(testWallet2.wallet_address);
      expect(transaction.pay_to).toBe(testWallet1.wallet_address);
      expect(transaction.amount).toBe(1000000);
      expect(transaction.asset).toBe('USDC');
      expect(transaction.entry_id).toBe(testEntry.id);
      expect(transaction.transaction_hash).toBe(transactionData[0].x402_data.transaction);
      expectValidEpochTimestamp(transaction.created_at);
    });

    it('should return 204 when x402_data is null', async () => {
      const transactionData = [{
        timestamp: Math.floor(Date.now() / 1000),
        root_cid: testEntry.cid,
        request: {
          method: 'GET',
          url: 'https://example.com',
          headers: {},
        },
        response: {
          status_code: 200,
          headers: {},
        },
        location_data: {
          city: 'San Francisco',
          country: 'US',
        },
        x402_data: null,
      }];

      const response = await app.request('/v1/transactions', {
        method: 'POST',
        headers: createAdminAuthHeaders(),
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(204);
    });

    it('should return 204 when x402_data is missing', async () => {
      const transactionData = [{
        timestamp: Math.floor(Date.now() / 1000),
        root_cid: testEntry.cid,
        request: {
          method: 'GET',
          url: 'https://example.com',
          headers: {},
        },
        response: {
          status_code: 200,
          headers: {},
        },
        location_data: {
          city: 'San Francisco',
          country: 'US',
        },
      }];

      const response = await app.request('/v1/transactions', {
        method: 'POST',
        headers: createAdminAuthHeaders(),
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(204);
    });

    it('should return 401 when admin API key is missing', async () => {
      const transactionData = [{
        timestamp: Math.floor(Date.now() / 1000),
        root_cid: testEntry.cid,
        request: { method: 'GET', url: 'https://example.com', headers: {} },
        response: { status_code: 200, headers: {} },
        location_data: { city: 'San Francisco', country: 'US' },
        x402_data: {
          settled: true,
          payer: testWallet2.wallet_address,
          pay_to: testWallet1.wallet_address,
          asset: 'USDC',
          amount: '1000000',
          transaction: generateRandomTransactionHash(),
        },
      }];

      const response = await app.request('/v1/transactions', {
        method: 'POST',
        headers: {},
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('Admin API key is required');
    });

    it('should return 401 when admin API key is invalid', async () => {
      const transactionData = [{
        timestamp: Math.floor(Date.now() / 1000),
        root_cid: testEntry.cid,
        request: { method: 'GET', url: 'https://example.com', headers: {} },
        response: { status_code: 200, headers: {} },
        location_data: { city: 'San Francisco', country: 'US' },
        x402_data: {
          settled: true,
          payer: testWallet2.wallet_address,
          pay_to: testWallet1.wallet_address,
          asset: 'USDC',
          amount: '1000000',
          transaction: generateRandomTransactionHash(),
        },
      }];

      const response = await app.request('/v1/transactions', {
        method: 'POST',
        headers: {
          'admin-api-key': 'wrong-key-that-is-not-test-admin-key-12345',
        },
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toContain('Invalid Admin API key');
    });


    it('should log warnings for invalid transactions but create valid ones', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
      const transactionData = [
        {
          timestamp: Math.floor(Date.now() / 1000),
          root_cid: testEntry.cid,
          request: { method: 'GET', url: 'https://example.com', headers: {} },
          response: { status_code: 200, headers: {} },
          location_data: { city: 'San Francisco', country: 'US' },
          x402_data: {
            settled: true,
            verified: true,
            x402_version: 1,
            scheme: 'ethereum',
            network: 'base-sepolia',
            payment_instruction_id: testPI.id,
            payer: testWallet2.wallet_address,
            pay_to: testWallet1.wallet_address,
            asset: 'USDC',
            amount: '1000000',
            transaction: generateRandomTransactionHash(),
          },
        },
        {
          timestamp: Math.floor(Date.now() / 1000),
          root_cid: testEntry.cid,
          request: { method: 'GET', url: 'https://example.com/2', headers: {} },
          response: { status_code: 200, headers: {} },
          location_data: { city: 'New York', country: 'US' },
          x402_data: {
            settled: true,
            // Missing required fields: payer, amount, asset, transaction
            pay_to: testWallet1.wallet_address,
          },
        },
      ];
      const response = await app.request('/v1/transactions', {
        method: 'POST',
        headers: createAdminAuthHeaders(),
        body: JSON.stringify(transactionData),
      });
      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.created).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].payer).toBe(testWallet2.wallet_address);

      // Verify the structured logger was called with error context
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleWarnSpy.mock.calls[0][0];
      expect(loggedMessage).toContain('Validation errors creating 1 transactions:');
      expect(loggedMessage).toContain('Missing required fields');

      consoleWarnSpy.mockRestore();
    });

    it('should create multiple transactions in bulk', async () => {
      const testEntry2 = await createTestEntry(testPool, testFeed.id, testPI.id);

      const transactionData = [
        {
          timestamp: Math.floor(Date.now() / 1000),
          root_cid: testEntry.cid,
          request: { method: 'GET', url: 'https://example.com', headers: {} },
          response: { status_code: 200, headers: {} },
          location_data: { city: 'San Francisco', country: 'US' },
          x402_data: {
            settled: true,
            verified: true,
            x402_version: 1,
            scheme: 'ethereum',
            network: 'base-sepolia',
            payment_instruction_id: testPI.id,
            payer: testWallet2.wallet_address,
            pay_to: testWallet1.wallet_address,
            asset: 'USDC',
            amount: '1000000',
            transaction: generateRandomTransactionHash(),
          },
        },
        {
          timestamp: Math.floor(Date.now() / 1000),
          root_cid: testEntry2.cid,
          request: { method: 'GET', url: 'https://example.com/2', headers: {} },
          response: { status_code: 200, headers: {} },
          location_data: { city: 'New York', country: 'US' },
          x402_data: {
            settled: true,
            verified: true,
            x402_version: 1,
            scheme: 'ethereum',
            network: 'base-sepolia',
            payment_instruction_id: testPI.id,
            payer: testWallet1.wallet_address,
            pay_to: testWallet2.wallet_address,
            asset: 'USDC',
            amount: '2000000',
            transaction: generateRandomTransactionHash(),
          },
        },
      ];

      const response = await app.request('/v1/transactions', {
        method: 'POST',
        headers: createAdminAuthHeaders(),
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.created).toBe(2);
      expect(result.transactions).toHaveLength(2);

      // Verify first transaction
      expect(result.transactions[0].payer).toBe(testWallet2.wallet_address);
      expect(result.transactions[0].pay_to).toBe(testWallet1.wallet_address);
      expect(result.transactions[0].amount).toBe(1000000);
      expect(result.transactions[0].entry_id).toBe(testEntry.id);

      // Verify second transaction
      expect(result.transactions[1].payer).toBe(testWallet1.wallet_address);
      expect(result.transactions[1].pay_to).toBe(testWallet2.wallet_address);
      expect(result.transactions[1].amount).toBe(2000000);
      expect(result.transactions[1].entry_id).toBe(testEntry2.id);
    });

    it('should filter out transactions without x402_data and create only valid ones', async () => {
      const transactionData = [
        {
          timestamp: Math.floor(Date.now() / 1000),
          root_cid: testEntry.cid,
          request: { method: 'GET', url: 'https://example.com', headers: {} },
          response: { status_code: 200, headers: {} },
          location_data: { city: 'San Francisco', country: 'US' },
          x402_data: null, // This should be filtered out
        },
        {
          timestamp: Math.floor(Date.now() / 1000),
          root_cid: testEntry.cid,
          request: { method: 'GET', url: 'https://example.com/2', headers: {} },
          response: { status_code: 200, headers: {} },
          location_data: { city: 'New York', country: 'US' },
          x402_data: {
            settled: true,
            verified: true,
            x402_version: 1,
            scheme: 'ethereum',
            network: 'base-sepolia',
            payment_instruction_id: testPI.id,
            payer: testWallet2.wallet_address,
            pay_to: testWallet1.wallet_address,
            asset: 'USDC',
            amount: '1000000',
            transaction: generateRandomTransactionHash(),
          },
        },
      ];

      const response = await app.request('/v1/transactions', {
        method: 'POST',
        headers: createAdminAuthHeaders(),
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.created).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].payer).toBe(testWallet2.wallet_address);
    });
  });

  describe('GET /v1/transactions - Get All Transactions', () => {
    beforeEach(async () => {
      // Create additional test entries to avoid unique constraint violations
      const testEntry2 = await createTestEntry(testPool, testFeed.id, testPI.id);
      const testEntry3 = await createTestEntry(testPool, testFeed.id, testPI.id);

      // Create some test transactions with unique (entry_id, payer) combinations
      const hash1 = generateRandomTransactionHash();
      const hash2 = generateRandomTransactionHash();
      const hash3 = generateRandomTransactionHash();

      await testPool.query(
        `INSERT INTO gv_transactions (id, payer, pay_to, amount, asset, entry_id, transaction_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv7(), testWallet1.wallet_address, testWallet2.wallet_address, 1000000, 'USDC', testEntry.id, hash1, Math.floor(Date.now() / 1000)]
      );

      await testPool.query(
        `INSERT INTO gv_transactions (id, payer, pay_to, amount, asset, entry_id, transaction_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv7(), testWallet2.wallet_address, testWallet1.wallet_address, 2000000, 'USDC', testEntry2.id, hash2, Math.floor(Date.now() / 1000)]
      );

      await testPool.query(
        `INSERT INTO gv_transactions (id, payer, pay_to, amount, asset, entry_id, transaction_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv7(), testWallet1.wallet_address, testWallet2.wallet_address, 3000000, 'USDC', testEntry3.id, hash3, Math.floor(Date.now() / 1000)]
      );
    });

    it('should retrieve paginated list of all transactions', async () => {
      const response = await app.request('/v1/transactions?page_size=20', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expectCursorPaginatedResponse(data);
      expect(data.data.length).toBeGreaterThanOrEqual(3);

      // Verify transaction structure
      data.data.forEach((tx: any) => {
        expectValidUUID(tx.id);
        expectValidWalletAddress(tx.payer);
        expectValidWalletAddress(tx.pay_to);
        expectValidEpochTimestamp(tx.created_at);
      });
    });

    it('should filter transactions by payer', async () => {
      const response = await app.request(
        `/v1/transactions?page_size=20&payer=${testWallet1.wallet_address}`,
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expectCursorPaginatedResponse(data);
      data.data.forEach((tx: any) => {
        expect(tx.payer).toBe(testWallet1.wallet_address);
      });
    });

    it('should filter transactions by pay_to', async () => {
      const response = await app.request(
        `/v1/transactions?page_size=20&pay_to=${testWallet2.wallet_address}`,
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expectCursorPaginatedResponse(data);
      data.data.forEach((tx: any) => {
        expect(tx.pay_to).toBe(testWallet2.wallet_address);
      });
    });

    it('should filter transactions by entry_id', async () => {
      const response = await app.request(
        `/v1/transactions?page_size=20&entry_id=${testEntry.id}`,
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expectCursorPaginatedResponse(data);
      data.data.forEach((tx: any) => {
        expect(tx.entry_id).toBe(testEntry.id);
      });
    });

    it('should return transactions ordered by created_at DESC', async () => {
      const response = await app.request('/v1/transactions?page_size=20', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      const timestamps = data.data.map((tx: any) => tx.created_at);
      const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sortedTimestamps);
    });
  });

  describe('GET /v1/transactions/:id - Get Transaction by ID', () => {
    let transaction: any;

    beforeEach(async () => {
      // Create a test transaction
      const hash = generateRandomTransactionHash();
      const result = await testPool.query(
        `INSERT INTO gv_transactions (id, payer, pay_to, amount, asset, entry_id, transaction_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [uuidv7(), testWallet1.wallet_address, testWallet2.wallet_address, 1000000, 'USDC', testEntry.id, hash, Math.floor(Date.now() / 1000)]
      );
      transaction = result.rows[0];
    });

    it('should retrieve transaction by ID', async () => {
      const response = await app.request(`/v1/transactions/${transaction.id}`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const tx = await response.json();

      expect(tx.id).toBe(transaction.id);
      expect(tx.payer).toBe(testWallet1.wallet_address);
      expect(tx.pay_to).toBe(testWallet2.wallet_address);
      expectValidUUID(tx.id);
      expectValidWalletAddress(tx.payer);
      expectValidWalletAddress(tx.pay_to);
    });

    it('should return 404 when transaction ID does not exist', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';

      const response = await app.request(`/v1/transactions/${fakeId}`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Transaction not found');
    });

    it('should return transaction even when requesting wallet is not involved', async () => {
      const response = await app.request(`/v1/transactions/${transaction.id}`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(transaction.id);
    });
  });

  describe('GET /v1/transactions/hash/:hash - Get Transaction by Hash', () => {
    let transaction: any;
    const testHash = generateRandomTransactionHash();

    beforeEach(async () => {
      // Create a test transaction
      const result = await testPool.query(
        `INSERT INTO gv_transactions (id, payer, pay_to, amount, asset, entry_id, transaction_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [uuidv7(), testWallet1.wallet_address, testWallet2.wallet_address, 1000000, 'USDC', testEntry.id, testHash, Math.floor(Date.now() / 1000)]
      );
      transaction = result.rows[0];
    });

    it('should retrieve transaction by hash', async () => {
      const response = await app.request(`/v1/transactions/hash/${testHash}`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const tx = await response.json();

      expect(tx.id).toBe(transaction.id);
      expect(tx.transaction_hash).toBe(testHash);
      expect(tx.payer).toBe(testWallet1.wallet_address);
      expect(tx.pay_to).toBe(testWallet2.wallet_address);
    });

    it('should return 404 when transaction hash does not exist', async () => {
      const fakeHash = generateRandomTransactionHash();

      const response = await app.request(`/v1/transactions/hash/${fakeHash}`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Transaction not found');
    });

    it('should return transaction by hash even when requesting wallet is not involved', async () => {
      const response = await app.request(`/v1/transactions/hash/${testHash}`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.transaction_hash).toBe(testHash);
    });
  });
});
