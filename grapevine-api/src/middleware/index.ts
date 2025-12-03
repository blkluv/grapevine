import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { requestLogger } from '../middleware/requestLogger.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { config } from '../services/config.js';
import { logger } from '../services/logger.js';

export function withMiddlewares(app: OpenAPIHono) {

  // Middleware
  app.use('*', requestLogger);

  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['*'], // Allow all headers to handle various client libraries
      exposeHeaders: [
        'Content-Type',
        'x-payment-required',
        'x-payment-instruction',
        'www-authenticate',
      ],
      maxAge: 86400, // 24 hours
    })
  );

  // Rate limiting: 100 requests per second per IP
  app.use('*', rateLimit({
    windowMs: 10000, // 10 second
    max: 100, // 100 requests per 10s
  }));


  logger.info('[x402] Configuring payment middleware for feeds', {
    payToAddress: config.x402.payToAddress,
    network: config.x402.network,
    feedCreationPrice: config.x402.feedCreationPrice,
    facilitatorUrl: config.x402.facilitatorUrl,
  });

  app.use('/v1/feeds', bodyLimit({
    maxSize: 50 * 1024 * 1024, // 50MB
    onError: (c) => {
      logger.warn('[bodyLimit] Feed creation body size exceeded', {
        path: c.req.path,
        timestamp: Date.now()
      });
      return c.json({
        error: 'Payload Too Large',
        message: 'Request body exceeds maximum size of 50MB'
      }, 413);
    }
  }));

  app.use('/v1/feeds/:feed_id/entries', async (c, next) => {
    logger.debug('[bodyLimit] Processing /v1/feeds/:feed_id/entries', {
      path: c.req.path,
      method: c.req.method,
      timestamp: Date.now()
    });
    await next();
    logger.debug('[bodyLimit] Completed /v1/feeds/:feed_id/entries', {
      path: c.req.path,
      method: c.req.method,
      timestamp: Date.now()
    });
  });

  app.use('/v1/feeds/:feed_id/entries', bodyLimit({
    maxSize: 50 * 1024 * 1024, // 50MB
    onError: (c) => {
      logger.warn('[bodyLimit] Entry creation body size exceeded', {
        path: c.req.path,
        timestamp: Date.now()
      });
      return c.json({
        error: 'Payload Too Large',
        message: 'Request body exceeds maximum size of 50MB'
      }, 413);
    }
  }));

  // Payment middleware for feed creation (COMMENTED OUT - using wallet auth instead)
  // app.post('/v1/feeds', paymentMiddlewareWithPayer(
  //   config.x402.payToAddress as `0x${string}`,
  //   {
  //     "/v1/feeds": {
  //       price: config.x402.feedCreationPrice,
  //       network: config.x402.network as 'base' | 'base-sepolia',
  //       config: { description: "Create a new feed on Grapevine" }
  //     }
  //   },
  //   facilitator
  // ));

  // Payment middleware for entry creation (COMMENTED OUT - using wallet auth instead)
  // app.post('/v1/feeds/:feed_id/entries', paymentMiddlewareWithPayer(
  //   config.x402.payToAddress as `0x${string}`,
  //   {
  //     "/v1/feeds/*/entries": {
  //       price: config.x402.entryCreationPrice,
  //       network: config.x402.network as 'base' | 'base-sepolia',
  //       config: { description: "Create a new entry in a feed on Grapevine" }
  //     }
  //   },
  //   facilitator
  // ));

  return app;
}