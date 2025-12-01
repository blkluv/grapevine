import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { requireAdminAuth } from '../../src/middleware/adminAuth.js';
import { config } from '../../src/services/config.js';

/**
 * Admin Authentication Middleware Tests
 * Tests the admin API key authentication middleware
 */

type AdminAuthEnv = {
  Variables: {
    adminAuth: boolean;
  };
};

describe('Admin Auth Middleware', () => {
  let app: OpenAPIHono<AdminAuthEnv>;

  beforeEach(() => {
    // Create a test app with the middleware
    app = new OpenAPIHono<AdminAuthEnv>();
    app.get('/protected', requireAdminAuth, (c) => {
      return c.json({ message: 'success', adminAuth: c.get('adminAuth') });
    });
  });

  describe('requireAdminAuth middleware', () => {
    it('should allow request with valid admin API key', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          'admin-api-key': 'test-admin-key-12345',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('success');
      expect(data.adminAuth).toBe(true);
    });

    it('should return 401 when admin API key is missing', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {},
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('Admin API key is required');
    });

    it('should return 401 when admin API key is invalid', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          'admin-api-key': 'wrong-key',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain('Invalid Admin API key');
    });

    it('should return 500 when ADMIN_API_KEY is not configured', async () => {
      // Mock config to return undefined for adminApiKey
      const originalAdminApiKey = config.auth.adminApiKey;
      // @ts-ignore - overriding readonly property for test
      config.auth.adminApiKey = undefined;

      const testApp = new OpenAPIHono<AdminAuthEnv>();
      testApp.get('/protected', requireAdminAuth, (c) => {
        return c.json({ message: 'success', adminAuth: c.get('adminAuth') });
      });

      const response = await testApp.request('/protected', {
        method: 'GET',
        headers: {
          'admin-api-key': 'some-key',
        },
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.message).toContain('Admin authentication is not configured');

      // Restore config
      // @ts-ignore - overriding readonly property for test
      config.auth.adminApiKey = originalAdminApiKey;
    });

    it('should set adminAuth to true in context on success', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          'admin-api-key': 'test-admin-key-12345',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.adminAuth).toBe(true);
    });
  });
});