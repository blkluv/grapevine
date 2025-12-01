import { expect } from 'vitest';

/**
 * Custom assertion helpers for tests
 */

export const expectValidUUID = (uuid: string) => {
  // Accept any UUID version (v1-v7), not just v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(uuidRegex.test(uuid)).toBe(true);
};

export const expectValidEpochTimestamp = (timestamp: number) => {
  const now = Math.floor(Date.now() / 1000);
  expect(timestamp).toBeGreaterThan(1700000000); // After 2023
  expect(timestamp).toBeLessThanOrEqual(now + 10); // Within 10 seconds of now
};

export const expectValidWalletAddress = (address: string) => {
  expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  expect(address.length).toBe(42);
};

export const expectValidTransactionHash = (hash: string) => {
  expect(hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
  expect(hash.length).toBe(66);
};

export const expectCursorPaginatedResponse = (response: any, expectedItemCount?: number) => {
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('pagination');
  expect(Array.isArray(response.data)).toBe(true);
  expect(response.pagination).toHaveProperty('page_size');
  expect(response.pagination).toHaveProperty('next_page_token');
  expect(response.pagination).toHaveProperty('has_more');
  expect(typeof response.pagination.has_more).toBe('boolean');

  if (expectedItemCount !== undefined) {
    expect(response.data.length).toBe(expectedItemCount);
  }
};

export const expectValidCID = (cid: string) => {
  // IPFS CID validation - starts with Qm for v0 or bafy for v1
  expect(cid).toMatch(/^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[0-9a-z]{52,})/);
};

export const expectValidMimeType = (mimeType: string) => {
  expect(mimeType).toMatch(/^[a-zA-Z]+\/[a-zA-Z0-9\-\+\.]+$/);
};
