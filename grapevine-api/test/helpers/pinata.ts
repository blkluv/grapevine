/**
 * Pinata V3 test helpers
 * Utilities for working with Pinata uploads in tests
 */

/**
 * Generate a mock CID for testing
 */
export function generateMockCid(): string {
  return `Qm${Math.random().toString(36).substring(2, 44).padEnd(44, '0')}`;
}

/**
 * Convert string to base64 for testing
 */
export function stringToBase64(content: string): string {
  return Buffer.from(content).toString('base64');
}

/**
 * Convert object to base64 JSON for testing
 */
export function objectToBase64(obj: any): string {
  return stringToBase64(JSON.stringify(obj));
}

/**
 * Generate test content in base64 format
 */
export function generateTestContent(type: 'text' | 'json' = 'json'): string {
  if (type === 'text') {
    return stringToBase64(`Test content ${Math.random().toString(36).substring(7)}`);
  }

  return objectToBase64({
    message: `Test message ${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    data: { test: true },
  });
}

/**
 * Mock Pinata upload response
 */
export function createMockUploadResponse(cid?: string) {
  return {
    id: crypto.randomUUID(),
    cid: cid || generateMockCid(),
    name: `test-file-${Date.now()}`,
    size: 1024,
    mime_type: 'application/json',
    network: 'public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    vectorized: false,
  };
}
