import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidCID, extractCIDFromURL, createPrivateAccessLink } from '../../src/services/pinataV3.js';
import { config } from '../../src/services/config.js';

/**
 * Tests for Pinata V3 service utilities
 */

describe('Pinata V3 Service', () => {
  describe('isValidCID', () => {
    it('should validate CIDv0 format (Qm...)', () => {
      const validCIDv0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      expect(isValidCID(validCIDv0)).toBe(true);
    });

    it('should validate another CIDv0 format', () => {
      const validCIDv0 = 'QmRgutAxd8t7oGkSm4wmeuByG6M51wcTso6cubDdQtuEfL';
      expect(isValidCID(validCIDv0)).toBe(true);
    });

    it('should validate CIDv1 base32 format (b...)', () => {
      const validCIDv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      expect(isValidCID(validCIDv1)).toBe(true);
    });

    it('should validate CIDv1 base58 format (z...)', () => {
      const validCIDv1Base58 = 'zdj7WhuEjrB52m1BisYCtmjH1hSKa7yZ3jEZ9JcXaFRD51wVz';
      expect(isValidCID(validCIDv1Base58)).toBe(true);
    });

    it('should reject invalid CID with wrong prefix', () => {
      const invalidCID = 'Xm1234567890123456789012345678901234567890123';
      expect(isValidCID(invalidCID)).toBe(false);
    });

    it('should reject CIDv0 with incorrect length', () => {
      const invalidCID = 'QmShortCID';
      expect(isValidCID(invalidCID)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidCID('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidCID(null as any)).toBe(false);
      expect(isValidCID(undefined as any)).toBe(false);
    });

    it('should reject non-string types', () => {
      expect(isValidCID(123 as any)).toBe(false);
      expect(isValidCID({} as any)).toBe(false);
      expect(isValidCID([] as any)).toBe(false);
    });

    it('should reject CID with invalid characters', () => {
      const invalidCID = 'Qm!!!invalidchars!!!1234567890123456789012';
      expect(isValidCID(invalidCID)).toBe(false);
    });

    it('should reject random strings', () => {
      expect(isValidCID('not-a-cid')).toBe(false);
      expect(isValidCID('random string')).toBe(false);
      expect(isValidCID('1234567890')).toBe(false);
    });
  });

  describe('extractCIDFromURL', () => {
    const validCIDv0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    const validCIDv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

    describe('Basic CID extraction without paths', () => {
      it('should extract CIDv0 from IPFS gateway URL', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}`;
        expect(extractCIDFromURL(url)).toBe(validCIDv0);
      });

      it('should extract CIDv1 from IPFS gateway URL', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv1}`;
        expect(extractCIDFromURL(url)).toBe(validCIDv1);
      });

      it('should extract CID from ipfs:// protocol', () => {
        const url = `ipfs://${validCIDv0}`;
        expect(extractCIDFromURL(url)).toBe(validCIDv0);
      });

      it('should extract CID from relative /ipfs/ path', () => {
        const url = `/ipfs/${validCIDv0}`;
        expect(extractCIDFromURL(url)).toBe(validCIDv0);
      });

      it('should extract CID from different gateway domains', () => {
        const urls = [
          `https://ipfs.io/ipfs/${validCIDv0}`,
          `https://cloudflare-ipfs.com/ipfs/${validCIDv0}`,
          `https://dweb.link/ipfs/${validCIDv0}`,
        ];
        urls.forEach(url => {
          expect(extractCIDFromURL(url)).toBe(validCIDv0);
        });
      });
    });

    describe('CID extraction with folder paths', () => {
      it('should extract CID with single folder path', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/images`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/images`);
      });

      it('should extract CID with nested folder path', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/folder/subfolder`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/folder/subfolder`);
      });

      it('should extract CID with file path', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/folder/image.png`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/folder/image.png`);
      });

      it('should extract CID with deep nested path', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/a/b/c/d/image.jpg`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/a/b/c/d/image.jpg`);
      });

      it('should extract CIDv1 with folder path', () => {
        const url = `https://ipfs.io/ipfs/${validCIDv1}/images/photo.png`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv1}/images/photo.png`);
      });

      it('should extract CID with path from ipfs:// protocol', () => {
        const url = `ipfs://${validCIDv0}/folder/file.txt`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/folder/file.txt`);
      });

      it('should extract CID with path from relative /ipfs/ path', () => {
        const url = `/ipfs/${validCIDv0}/assets/logo.svg`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/assets/logo.svg`);
      });

      it('should handle paths with special characters in filenames', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/folder/my-file_v2.png`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/folder/my-file_v2.png`);
      });

      it('should handle paths with spaces encoded as %20', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/my%20folder/my%20image.png`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/my%20folder/my%20image.png`);
      });
    });

    describe('URL query parameters and fragments', () => {
      it('should extract CID and ignore query parameters', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}?filename=test.png`;
        expect(extractCIDFromURL(url)).toBe(validCIDv0);
      });

      it('should extract CID with path and ignore query parameters', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/folder/image.png?download=true`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/folder/image.png`);
      });

      it('should extract CID and ignore URL fragments', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}#section`;
        expect(extractCIDFromURL(url)).toBe(validCIDv0);
      });

      it('should extract CID with path and ignore both query and fragment', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/folder/image.png?size=large#preview`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/folder/image.png`);
      });
    });

    describe('Invalid inputs', () => {
      it('should return null for invalid CID in URL', () => {
        const url = 'https://gateway.pinata.cloud/ipfs/InvalidCID123';
        expect(extractCIDFromURL(url)).toBe(null);
      });

      it('should return null for URL without /ipfs/ or ipfs://', () => {
        const url = `https://example.com/${validCIDv0}`;
        expect(extractCIDFromURL(url)).toBe(null);
      });

      it('should return null for empty string', () => {
        expect(extractCIDFromURL('')).toBe(null);
      });

      it('should return null for null/undefined', () => {
        expect(extractCIDFromURL(null as any)).toBe(null);
        expect(extractCIDFromURL(undefined as any)).toBe(null);
      });

      it('should return null for non-string types', () => {
        expect(extractCIDFromURL(123 as any)).toBe(null);
        expect(extractCIDFromURL({} as any)).toBe(null);
        expect(extractCIDFromURL([] as any)).toBe(null);
      });

      it('should return null for random strings', () => {
        expect(extractCIDFromURL('not-an-ipfs-url')).toBe(null);
        expect(extractCIDFromURL('random string')).toBe(null);
      });

      it('should return null for URL with invalid CID format in path', () => {
        const url = 'https://gateway.pinata.cloud/ipfs/Qm123/folder/image.png'; // Too short CID
        expect(extractCIDFromURL(url)).toBe(null);
      });
    });

    describe('Edge cases', () => {
      it('should handle trailing slashes', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}/`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/`);
      });

      it('should handle multiple slashes in path', () => {
        const url = `https://gateway.pinata.cloud/ipfs/${validCIDv0}//folder//file.png`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}//folder//file.png`);
      });

      it('should extract from URL with port number', () => {
        const url = `https://gateway.pinata.cloud:8080/ipfs/${validCIDv0}/image.png`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/image.png`);
      });

      it('should handle localhost URLs', () => {
        const url = `http://localhost:8080/ipfs/${validCIDv0}/test.json`;
        expect(extractCIDFromURL(url)).toBe(`${validCIDv0}/test.json`);
      });
    });
  });

  describe('createPrivateAccessLink', () => {
    const originalFetch = global.fetch;
    const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

    beforeEach(() => {
      // Mock config values for tests
      vi.spyOn(config.pinata, 'jwtToken', 'get').mockReturnValue('test-jwt-token');
      vi.spyOn(config.pinata, 'gateway', 'get').mockReturnValue('test-gateway.pinata.cloud');
      vi.spyOn(config.pinata, 'backendApiUrl', 'get').mockReturnValue('https://test-api.pinata.cloud');
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should create a private access link successfully', async () => {
      const mockAccessUrl = 'https://test-gateway.pinata.cloud/files/test-cid?signature=abc123&expires=1234567890';
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: mockAccessUrl }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await createPrivateAccessLink({
        cid: testCid,
        expires: 30,
      });

      expect(result).toBe(mockAccessUrl);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://test-api.pinata.cloud/v3/files/private/download_link');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-jwt-token');

      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.url).toBe('https://test-gateway.pinata.cloud/files/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      expect(requestBody.method).toBe('GET');
      expect(requestBody.expires).toBe(30);
      expect(requestBody.date).toBeGreaterThan(0);
    });

    it('should use default expiration of 30 seconds', async () => {
      const mockAccessUrl = 'https://test-gateway.pinata.cloud/files/test-cid?signature=abc123';
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: mockAccessUrl }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await createPrivateAccessLink({ cid: testCid });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.expires).toBe(30);
    });

    it('should use custom expiration when provided', async () => {
      const mockAccessUrl = 'https://test-gateway.pinata.cloud/files/test-cid?signature=abc123';
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: mockAccessUrl }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await createPrivateAccessLink({
        cid: testCid,
        expires: 3600,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.expires).toBe(3600);
    });

    it('should use custom gateway when provided', async () => {
      const customGateway = 'custom-gateway.example.com';
      const mockAccessUrl = 'https://custom-gateway.example.com/files/test-cid?signature=abc123';
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: mockAccessUrl }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await createPrivateAccessLink({
        cid: testCid,
        gateway: customGateway,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.url).toBe('https://custom-gateway.example.com/files/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
    });

    it('should handle gateway URLs with https:// prefix', async () => {
      const customGateway = 'https://custom-gateway.example.com';
      const mockAccessUrl = 'https://custom-gateway.example.com/files/test-cid?signature=abc123';
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: mockAccessUrl }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await createPrivateAccessLink({
        cid: testCid,
        gateway: customGateway,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.url).toBe('https://custom-gateway.example.com/files/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
    });

    it('should throw error when PINATA_JWT_TOKEN is missing', async () => {
      // Mock config to return undefined for jwtToken
      vi.spyOn(config.pinata, 'jwtToken', 'get').mockReturnValue(undefined);

      await expect(
        createPrivateAccessLink({ cid: testCid })
      ).rejects.toThrow('PINATA_JWT_TOKEN environment variable is required');
    });

    it('should throw error when PINATA_GATEWAY is missing', async () => {
      // Mock config to return undefined for gateway
      vi.spyOn(config.pinata, 'gateway', 'get').mockReturnValue(undefined);

      await expect(
        createPrivateAccessLink({ cid: testCid })
      ).rejects.toThrow('PINATA_GATEWAY environment variable is required');
    });

    it('should handle API errors with status code', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: async () => 'Unauthorized: Invalid JWT token',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        createPrivateAccessLink({ cid: testCid })
      ).rejects.toThrow('Failed to create private access link (401): Unauthorized: Invalid JWT token');
    });

    it('should handle API errors with 500 status', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        createPrivateAccessLink({ cid: testCid })
      ).rejects.toThrow('Failed to create private access link (500): Internal Server Error');
    });

    it('should handle invalid response format (missing data)', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({}), // Missing 'data' field
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        createPrivateAccessLink({ cid: testCid })
      ).rejects.toThrow('Invalid response from Pinata');
    });

    it('should handle invalid response format (null data)', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: null }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        createPrivateAccessLink({ cid: testCid })
      ).rejects.toThrow('Invalid response from Pinata');
    });

    it('should throw if endpoint URL is not configured', async () => {
      // Override the backendApiUrl mock to return undefined
      vi.spyOn(config.pinata, 'backendApiUrl', 'get').mockReturnValue(undefined);

      const fn = async () => await createPrivateAccessLink({ cid: testCid });

      expect(fn).rejects.toThrowError(/PINATA_BACKEND_API_URL environment variable is required/);
    });

    it('should correctly format timestamp as unix epoch seconds', async () => {
      const beforeTest = Math.floor(Date.now() / 1000);

      const mockAccessUrl = 'https://test-gateway.pinata.cloud/files/test-cid?signature=abc123';
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: mockAccessUrl }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await createPrivateAccessLink({ cid: testCid, expires: 60 });

      const afterTest = Math.floor(Date.now() / 1000);
      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Verify date is unix timestamp in seconds (not milliseconds)
      expect(requestBody.date).toBeGreaterThanOrEqual(beforeTest);
      expect(requestBody.date).toBeLessThanOrEqual(afterTest);
      expect(requestBody.date.toString().length).toBeLessThanOrEqual(11); // Unix timestamp in seconds is ~10-11 digits
    });
  });
});
