import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { config } from '../services/config.js';
import { getWorkerStatus } from '../workers/expiryWorker.js';
import { logger } from '../services/logger.js';
import auth from './auth.js';
import wallets from './wallets.js';
import categories from './categories.js';
import feeds from './feeds.js';
import entries from './entries.js';
import transactions from './transactions.js';
import leaderboards from './leaderboards.js';

/**
 * Creates and configures the OpenAPI Hono app with all routes and middleware.
 * This function does NOT start the server or establish database connections.
 * It only configures the app structure for use in both server startup and spec generation.
 * @param app - Optional app instance. If not provided, creates a new OpenAPIHono instance.
 */
export function withRoutes(app: OpenAPIHono = new OpenAPIHono()) {

  // Health check
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: Math.floor(Date.now() / 1000),
      version: config.api.version,
      workers: {
        expiry: getWorkerStatus(),
      }
    });
  });

  // API routes
  app.route('/v1/auth', auth);
  app.route('/v1/wallets', wallets);
  app.route('/v1/categories', categories);
  app.route('/v1/feeds', feeds);
  app.route('/v1/feeds', entries); // Entry routes nested under /feeds/{id}/entries
  app.route('/v1/transactions', transactions);
  app.route('/v1/leaderboards', leaderboards);

  // OpenAPI documentation
  app.doc('/v1/openapi.json', {
    openapi: '3.0.0',
    info: {
      version: config.server.version,
      title: 'Grapevine API',
      description: 'Decentralized data feeds platform API for creating, managing, and monetizing content feeds using IPFS storage and x402 micropayments on Base blockchain. Supports both free and paid content with wallet-based authentication.',
    },
    servers: [
      {
        url: config.server.openApiUrl,
        description: `${config.api.version} ${config.server.nodeEnv} grapevine API`,
      },
    ],
    tags: [
      { name: 'Authentication', description: 'Wallet signature authentication endpoints for MetaMask, WalletConnect, and other Web3 wallets' },
      { name: 'Feeds', description: 'Data feed management endpoints including creation, updates, entries, and IPFS content uploads' },
      { name: 'Transactions', description: 'x402 payment transaction endpoints for querying blockchain transaction records' },
      { name: 'Categories', description: 'Pre-defined category taxonomy endpoints for feed organization' },
      { name: 'Wallets', description: 'Wallet profile and statistics endpoints' },
      { name: 'Leaderboards', description: 'Gamification and ranking endpoints for trending feeds, top providers, top buyers, and category statistics' },
    ],
  });

  // Swagger UI
  app.get('/v1/docs', swaggerUI({ url: '/v1/openapi.json' }));

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: c.req.path,
      },
      404
    );
  });

  // Error handler
  app.onError((err, c) => {
    logger.error('Unhandled error', err);

    // If it's an HTTPException, preserve its status code and message
    if ('status' in err && typeof err.status === 'number') {
      return c.json(
        {
          error: err.name || 'Error',
          message: err.message || 'An error occurred',
        },
        err.status as any
      );
    }

    // For other errors, return 500
    return c.json(
      {
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
      },
      500
    );
  });

  return app;
}
