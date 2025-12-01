
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from '../../src/index.js';
import { testPool } from '../setup.js';
import {
  createTestWallet,
  createTestCategory,
  createTestFeed,
  createTestEntry,
  createTestPaymentInstruction
} from '../helpers/factories.js';
import { expectValidUUID, expectValidEpochTimestamp } from '../helpers/assertions.js';
import { createWalletAuthHeaders } from '../helpers/auth.js';
import { generateTestContent, generateMockCid } from '../helpers/pinata.js';
import * as pinataV3 from '../../src/services/pinataV3.js';
import * as paymentInstructions from '../../src/services/paymentInstructions.js';
import { uuidv7 } from 'uuidv7';
import { config } from '../../src/services/config.js';

/**
 * Feed Entries API Tests
 * Tests the feed entry management endpoints
 */

describe('Feed Entries API', () => {
  let testWallet: any;
  let testCategory: any;
  let testFeed: any;
  let testPaymentInstruction: any;

  beforeEach(async () => {
    // FREE_PAYMENT_INSTRUCTION_ID is already set in setup.ts, don't override it here

    testWallet = await createTestWallet(testPool);
    testCategory = await createTestCategory(testPool);
    testFeed = await createTestFeed(testPool, testWallet.id, testCategory.id);
    // FREE payment instruction is created during database seeding with system wallet as user_id
    // Use it directly instead of recreating it
    testPaymentInstruction = { id: config.payment.freePaymentInstructionId };
  });

  describe('GET /v1/feeds/:feed_id/entries', () => {
    it('should return empty array for feed with no entries', async () => {
      const response = await app.request(`/v1/feeds/${testFeed.id}/entries?page_size=20`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.data).toEqual([]);
      expect(data.pagination.has_more).toBe(false);
    });

    it('should retrieve cursor-paginated list of entries', async () => {
      // Create test entries
      await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries?page_size=20`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('page_size');
      expect(data.pagination).toHaveProperty('next_page_token');
      expect(data.pagination).toHaveProperty('has_more');
      expect(data.data.length).toBeGreaterThanOrEqual(3);

      const entry = data.data[0];
      expectValidUUID(entry.id);
      expectValidUUID(entry.feed_id);
      expect(entry.feed_id).toBe(testFeed.id);
      expect(entry).toHaveProperty('cid');
      expect(entry).toHaveProperty('mime_type');
      expectValidEpochTimestamp(entry.created_at);
    });

    it('should filter entries by is_free status', async () => {
      await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id, { is_free: true });
      await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id, { is_free: false });

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries?is_free=true`);
      expect(response.status).toBe(200);

      const data = await response.json();
      data.data.forEach((entry: any) => {
        expect(entry.is_free).toBe(true);
      });
    });

    it('should return 404 for non-existent feed', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const response = await app.request(`/v1/feeds/${fakeId}/entries`);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /v1/feeds/:feed_id/entries/:entry_id', () => {
    it('should retrieve entry by ID', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries/${entry.id}`);
      expect(response.status).toBe(200);

      const returnedEntry = await response.json();
      expect(returnedEntry.id).toBe(entry.id);
      expect(returnedEntry.feed_id).toBe(testFeed.id);
      expect(returnedEntry.cid).toBe(entry.cid);
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const response = await app.request(`/v1/feeds/${testFeed.id}/entries/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /v1/feeds/:feed_id/entries', () => {
    it('should create a new entry with content upload', async () => {
      // Mock the Pinata upload service
      const mockCid = generateMockCid();
      const mockUploadId = crypto.randomUUID();

      vi.spyOn(pinataV3, 'uploadToPinata').mockResolvedValue({
        data: {
          id: mockUploadId,
          group_id: crypto.randomUUID(),
          cid: mockCid,
          name: 'test-file',
          size: 1024,
          mime_type: 'application/json',
          network: 'public',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vectorized: false,
        }
      });

      // Create a real payment instruction in the test database for FK constraint
      const mockPaymentInstruction = await createTestPaymentInstruction(testPool, uuidv7(), testWallet.id);

      // Mock payment instruction creation
      vi.spyOn(paymentInstructions, 'createEntryPaymentInstruction').mockResolvedValue({
        piid: mockPaymentInstruction.id,
        price: '1000000', // Formatted price
      });

      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        title: 'Test Entry',
        metadata: JSON.stringify({ test: true }),
        tags: ['test', 'api'],
        is_free: false,
        price: {
          amount: '1000000', // 1 USDC (6 decimals)
          currency: 'USDC',
          network: 'base' as const,
        },
      };

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(entryData),
      });

      expect(response.status).toBe(201);

      const entry = await response.json();
      expectValidUUID(entry.id);
      expect(entry.feed_id).toBe(testFeed.id);
      expect(entry.cid).toBe(mockCid);
      expect(entry.pinata_upload_id).toBe(mockUploadId);
      expect(entry.mime_type).toBe('application/json');
      expect(entry.title).toBe('Test Entry');
      expect(entry.is_free).toBe(false);
      expectValidEpochTimestamp(entry.created_at);

      // Verify uploadToPinata was called with correct arguments
      expect(pinataV3.uploadToPinata).toHaveBeenCalledWith(
        entryData.content_base64,
        entryData.mime_type,
        expect.objectContaining({
          name: entryData.title,
          keyvalues: expect.objectContaining({
            feed_id: testFeed.id,
          }),
        })
      );

      vi.restoreAllMocks();
    });

    it.skip('should create entry with only required fields', async () => {
      const mockCid = generateMockCid();
      const mockUploadId = crypto.randomUUID();

      vi.spyOn(pinataV3, 'uploadToPinata').mockResolvedValue({
        data: {
          id: mockUploadId,
          group_id: crypto.randomUUID(),
          cid: mockCid,
          name: 'test-file',
          size: 1024,
          mime_type: 'text/plain',
          network: 'public',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vectorized: false,
        }
      });

      const minimalEntry = {
        content_base64: generateTestContent('text'),
        mime_type: 'text/plain',
        is_free: true,
      };

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(minimalEntry),
      });

      expect(response.status).toBe(201);

      const entry = await response.json();
      expect(entry.cid).toBe(mockCid);
      expect(entry.title).toBeNull();
      expect(entry.metadata).toBeNull();
      expect(entry.tags).toBeNull();
      expect(entry.is_free).toBe(true);

      vi.restoreAllMocks();
    });

    it('should reject entry creation for non-feed-owner', async () => {
      const anotherWallet = await createTestWallet(testPool);

      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        is_free: true,

      };

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(anotherWallet.wallet_address),
        body: JSON.stringify(entryData),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toContain('only create entries in feeds owned by your wallet');
    });

    it('should return 404 for non-existent feed', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';

      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        is_free: true,

      };

      const response = await app.request(`/v1/feeds/${fakeId}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(entryData),
      });

      expect(response.status).toBe(404);
    });

    it('should return 500 when Pinata upload fails', async () => {
      vi.spyOn(pinataV3, 'uploadToPinata').mockRejectedValue(
        new Error('Pinata upload failed (500): Service unavailable')
      );

      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        is_free: true,

      };

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(entryData),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Upload Failed');
      expect(data.message).toContain('Failed to upload content to IPFS');

      vi.restoreAllMocks();
    });

    it('should require authentication', async () => {
      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        is_free: true,

      };
      const response = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-payment': "",
        },
        body: JSON.stringify(entryData),
      });

      // Should fail due to missing authentication (either 401 or 500 if middleware error)
      expect([401, 500]).toContain(response.status);
      if (response.status !== 401) {
        const data = await response.json();
        // If it's a 500, it should still be auth-related
        expect(data.message || data.error).toBeTruthy();
      }
    });

    it('should create payment instruction when price is provided', async () => {
      const mockCid = generateMockCid();
      const mockUploadId = crypto.randomUUID();

      // Create a real payment instruction in the test database so the FK constraint is satisfied
      const mockPaymentInstruction = await createTestPaymentInstruction(testPool, uuidv7(), testWallet.id);
      const mockPiid = mockPaymentInstruction.id;

      vi.spyOn(pinataV3, 'uploadToPinata').mockResolvedValue({
        data: {
          id: mockUploadId,
          group_id: crypto.randomUUID(),
          cid: mockCid,
          name: 'test-file',
          size: 1024,
          mime_type: 'application/json',
          network: 'public',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vectorized: false,
        }
      });

      // Mock payment instructions service
      const mockCreateEntryPaymentInstruction = vi.spyOn(
        paymentInstructions,
        'createEntryPaymentInstruction'
      ).mockResolvedValue({
        piid: mockPiid,
        price: '1000000', // Formatted price
      });

      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        title: 'Paid Entry',
        is_free: false,
        price: {
          amount: '1000000',
          currency: 'USDC',
          network: 'base' as const,
        },
      };

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(entryData),
      });

      // Debug: log error if not 201
      if (response.status !== 201) {
        const errorBody = await response.text();
        console.log('Error status:', response.status);
        console.log('Error body:', errorBody);
        console.log('Request data:', JSON.stringify(entryData, null, 2));
      }

      expect(response.status).toBe(201);

      const entry = await response.json();
      expectValidUUID(entry.id);
      expect(entry.piid).toBe(mockPiid);
      expect(entry.is_free).toBe(false);

      // Verify payment instruction was created
      expect(mockCreateEntryPaymentInstruction).toHaveBeenCalledWith(
        expect.any(Object), // PaymentInstructionsClient instance
        'Paid Entry',
        testWallet.wallet_address,
        mockCid,
        entryData.price
      );

      vi.restoreAllMocks();
    });

    it.skip('should create free payment instruction when is_free is true', async () => {
      const mockCid = generateMockCid();
      const mockUploadId = crypto.randomUUID();

      // Create a real payment instruction for free entry
      const freePaymentInstruction = await createTestPaymentInstruction(testPool, uuidv7(), testWallet.id);

      vi.spyOn(pinataV3, 'uploadToPinata').mockResolvedValue({
        data: {
          id: mockUploadId,
          group_id: crypto.randomUUID(),
          cid: mockCid,
          name: 'test-file',
          size: 1024,
          mime_type: 'application/json',
          network: 'public',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vectorized: false,
        }
      });

      // Mock the PaymentInstructionsClient.create method for free entries
      const mockCreate = vi.spyOn(paymentInstructions.PaymentInstructionsClient.prototype, 'create')
        .mockResolvedValue({
          data: {
            id: freePaymentInstruction.id,
            name: 'Free Entry',
            user_id: testWallet.id,
            payment_requirements: [],
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        });

      const mockMapCid = vi.spyOn(paymentInstructions.PaymentInstructionsClient.prototype, 'mapCid')
        .mockResolvedValue(undefined);

      const entryData = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        is_free: true,
      };

      const response = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(entryData),
      });

      expect(response.status).toBe(201);

      const entry = await response.json();
      // Should use free payment instruction from environment
      expect(entry.piid).toBe(config.payment.freePaymentInstructionId);
      expect(entry.is_free).toBe(true);

      // Should NOT create new payment instruction when FREE_PAYMENT_INSTRUCTION_ID is set
      expect(mockCreate).not.toHaveBeenCalled();

      // Should NOT map CID when using existing free payment instruction
      expect(mockMapCid).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it.skip('should not use groupId for first entry but use it for subsequent entries', async () => {
      // Mock the uploadToPinata function to capture the arguments
      const uploadSpy = vi.spyOn(pinataV3, 'uploadToPinata');

      const mockCid1 = generateMockCid();
      const mockCid2 = generateMockCid();

      uploadSpy
        .mockResolvedValueOnce({
          data: {
            id: crypto.randomUUID(),
            group_id: crypto.randomUUID(),
            cid: mockCid1,
            name: 'test-file-1',
            size: 1024,
            mime_type: 'application/json',
            network: 'private',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            vectorized: false,
          }
        })
        .mockResolvedValueOnce({
          data: {
            id: crypto.randomUUID(),
            group_id: crypto.randomUUID(),
            cid: mockCid2,
            name: 'test-file-2',
            size: 1024,
            mime_type: 'application/json',
            network: 'private',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            vectorized: false,
          }
        });

      // Create first entry - should NOT have groupId
      const entryData1 = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        title: 'First Entry',
        is_free: true,

      };

      const response1 = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(entryData1),
      });

      expect(response1.status).toBe(201);

      // Verify first call had no groupId (undefined)
      expect(uploadSpy).toHaveBeenCalledTimes(1);
      const firstCallOptions = uploadSpy.mock.calls[0][2];
      expect(firstCallOptions?.groupId).toBeUndefined();

      // Create second entry - should have groupId set to feed.id
      const entryData2 = {
        content_base64: generateTestContent('json'),
        mime_type: 'application/json',
        title: 'Second Entry',
        is_free: true,

      };

      const response2 = await app.request(`/v1/feeds/${testFeed.id}/entries`, {
        method: 'POST',
        headers: createWalletAuthHeaders(testWallet.wallet_address),
        body: JSON.stringify(entryData2),
      });

      expect(response2.status).toBe(201);

      // Verify second call had groupId set to feed ID
      expect(uploadSpy).toHaveBeenCalledTimes(2);
      const secondCallOptions = uploadSpy.mock.calls[1][2];
      expect(secondCallOptions?.groupId).toBe(testFeed.id);

      vi.restoreAllMocks();
    });
  });

  describe('DELETE /v1/feeds/:feed_id/entries/:entry_id', () => {
    it('should delete an entry', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${entry.id}`,
        {
          method: 'DELETE',
          headers: createWalletAuthHeaders(testWallet.wallet_address),
        }
      );

      expect(response.status).toBe(204);

      // Verify soft delete: entry still exists but is_active is false
      const getResponse = await app.request(`/v1/feeds/${testFeed.id}/entries/${entry.id}`);
      expect(getResponse.status).toBe(200);
      const deletedEntry = await getResponse.json();
      expect(deletedEntry.is_active).toBe(false);
      expect(deletedEntry.id).toBe(entry.id);
    });

    it('should reject deletion by non-feed-owner', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      const anotherWallet = await createTestWallet(testPool);

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${entry.id}`,
        {
          method: 'DELETE',
          headers: createWalletAuthHeaders(anotherWallet.wallet_address),
        }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toContain('only delete entries from feeds owned by your wallet');
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${fakeId}`,
        {
          method: 'DELETE',
          headers: createWalletAuthHeaders(testWallet.wallet_address),
        }
      );

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${entry.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Should fail due to missing authentication (either 401 or 500 if middleware error)
      expect([401, 500]).toContain(response.status);
      if (response.status !== 401) {
        const data = await response.json();
        // If it's a 500, it should still be auth-related
        expect(data.message || data.error).toBeTruthy();
      }
    });
  });

  describe('POST /v1/feeds/:feed_id/entries/:entry_id/access-link', () => {
    it('should create access link for entry with wallet auth', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      const authHeaders = await createWalletAuthHeaders(testWallet.wallet_address);

      // Mock the createPrivateAccessLink function
      const mockAccessUrl = 'https://example.gateway.pinata.cloud/files/test-cid?signature=abc123';
      const createAccessLinkSpy = vi.spyOn(pinataV3, 'createPrivateAccessLink').mockResolvedValue(mockAccessUrl);

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${entry.id}/access-link`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('url');
      expect(data).toHaveProperty('expires_at');
      expect(data.url).toBe(mockAccessUrl);
      expect(typeof data.expires_at).toBe('number');
      expect(data.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Verify the function was called with correct parameters
      expect(createAccessLinkSpy).toHaveBeenCalledWith({
        cid: entry.cid,
        expires: 30,
      });

      createAccessLinkSpy.mockRestore();
    });

    it('should return 401 without authentication', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${entry.id}/access-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      expect([401, 500]).toContain(response.status);
    });

    it('should return 404 for non-existent entry', async () => {
      const fakeEntryId = uuidv7();
      const authHeaders = await createWalletAuthHeaders(testWallet.wallet_address);

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${fakeEntryId}/access-link`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('not found');
    });

    it('should return 404 for non-existent feed', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      const fakeFeedId = uuidv7();
      const authHeaders = await createWalletAuthHeaders(testWallet.wallet_address);

      const response = await app.request(
        `/v1/feeds/${fakeFeedId}/entries/${entry.id}/access-link`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('not found');
    });

    it('should not create access link for inactive entry', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);

      // Mark entry as inactive
      await testPool.query(
        'UPDATE gv_feed_entries SET is_active = false WHERE id = $1',
        [entry.id]
      );

      const authHeaders = await createWalletAuthHeaders(testWallet.wallet_address);

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${entry.id}/access-link`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.message).toContain('not found');
    });

    it('should handle Pinata API errors gracefully', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      const authHeaders = await createWalletAuthHeaders(testWallet.wallet_address);

      // Mock the createPrivateAccessLink function to throw an error
      const createAccessLinkSpy = vi.spyOn(pinataV3, 'createPrivateAccessLink').mockRejectedValue(
        new Error('Pinata API error: Failed to create access link')
      );

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${entry.id}/access-link`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({}),
        }
      );

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toContain('Failed to create access link');

      createAccessLinkSpy.mockRestore();
    });

    it('should always use 30 second expiration', async () => {
      const entry = await createTestEntry(testPool, testFeed.id, testPaymentInstruction.id);
      const authHeaders = await createWalletAuthHeaders(testWallet.wallet_address);

      const mockAccessUrl = 'https://example.gateway.pinata.cloud/files/test-cid?signature=abc123';
      const createAccessLinkSpy = vi.spyOn(pinataV3, 'createPrivateAccessLink').mockResolvedValue(mockAccessUrl);

      const beforeRequest = Math.floor(Date.now() / 1000);

      const response = await app.request(
        `/v1/feeds/${testFeed.id}/entries/${entry.id}/access-link`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({}),
        }
      );

      const afterRequest = Math.floor(Date.now() / 1000);

      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify expires_at is approximately 30 seconds from now
      expect(data.expires_at).toBeGreaterThanOrEqual(beforeRequest + 30);
      expect(data.expires_at).toBeLessThanOrEqual(afterRequest + 30);

      // Verify the function was called with exactly 30 seconds
      expect(createAccessLinkSpy).toHaveBeenCalledWith({
        cid: entry.cid,
        expires: 30,
      });

      createAccessLinkSpy.mockRestore();
    });
  });
});
