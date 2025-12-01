import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../services/logger.js';
import { config } from '../services/config.js';

/**
 * Admin Authentication Middleware
 *
 * Verifies Admin API key for server-to-server communication.
 * This middleware checks for the admin-api-key header and validates it
 * against the configured ADMIN_API_KEY environment variable.
 *
 * Expected header:
 * - admin-api-key: The Admin API key for server-to-server auth
 *
 * @returns Middleware that verifies Admin API key
 */
export const requireAdminAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('admin-api-key');

  // Check if API key is provided first (401 for missing credentials)
  if (!apiKey) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Admin API key is required. Please provide admin-api-key header.',
      },
      401
    );
  }

  // Then check if Admin API key is configured (500 for server misconfiguration)
  const configuredKey = config.auth.adminApiKey;
  if (!configuredKey) {
    logger.error('ADMIN_API_KEY is not configured in environment variables');
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Admin authentication is not configured',
      },
      500
    );
  }

  // Verify API key matches
  if (apiKey !== configuredKey) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Invalid Admin API key',
      },
      401
    );
  }

  // Mark request as Admin authenticated
  c.set('adminAuth', true);

  return next();
});
