import { OpenAPIHono } from '@hono/zod-openapi';
import { withRoutes } from './routes/index.js';
import { config } from './services/config.js';
import { startExpiryWorker, stopExpiryWorker } from './workers/expiryWorker.js';
import { withMiddlewares } from './middleware/index.js';
import { logger } from './services/logger.js';

const openapi = new OpenAPIHono();

// Create app instance and configure it
const app = withRoutes(
  withMiddlewares(openapi)
);

// Start server
const port = config.server.port;

// For Node.js runtime (development and production)
// Check if we're running in Node.js (not Bun or Deno) and not in test mode
const isNode = typeof process !== 'undefined' && process.versions?.node;
const isTest = config.server.nodeEnv === 'test' || process.env.VITEST === 'true';

if (isNode && !isTest) {
  const { serve } = await import('@hono/node-server');

  logger.info(`🚀 Server starting on port ${port}`);
  logger.info(`📚 API Documentation: http://localhost:${port}/v1/docs`);
  logger.info(`📚 OpenAPI endpoint: http://localhost:${port}/v1/openapi.json`);
  logger.info(`🏥 Health check: http://localhost:${port}/health`);

  // Start the expiry worker (optional - can be disabled by setting ENABLE_EXPIRY_WORKER=false)
  const enableExpiryWorker = config.worker.enableExpiryWorker;
  if (enableExpiryWorker) {
    logger.info(`⏰ Starting expiry worker (poll interval: ${config.worker.expiryWorkerPollInterval}ms)`);
    startExpiryWorker();
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  signals.forEach(signal => {
    process.on(signal, () => {
      logger.info(`\nReceived ${signal}, shutting down gracefully...`);
      if (enableExpiryWorker) {
        stopExpiryWorker();
      }
      process.exit(0);
    });
  });

  serve({
    fetch: app.fetch,
    port,
  });
}

// Export app for testing
export { app };

// For Bun/Deno/Cloudflare Workers runtime
export default {
  port,
  fetch: app.fetch,
};
