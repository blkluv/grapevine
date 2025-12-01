/**
 * Request/Response Logging Middleware
 *
 * Logs all incoming HTTP requests and their responses with structured JSON output.
 */

import { Context, Next } from 'hono';
import { logger } from '../services/logger.js';

export async function requestLogger(c: Context, next: Next) {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const query = c.req.query();
  const headers = Object.fromEntries(c.req.raw.headers.entries());

  // Process request
  await next();

  // Skip logging for health check endpoint
  if (path === '/health') {
    return;
  }

  // Log combined request/response after processing
  const duration = Date.now() - startTime;
  const status = c.res.status;

  logger.info('HTTP', {
    method,
    path,
    status,
    duration_ms: duration,
    query: Object.keys(query).length > 0 ? query : undefined,
    user_agent: headers['user-agent'],
    ip: headers['x-forwarded-for'] || headers['x-real-ip'],
    wallet: headers['x-wallet-address'],
  });
}
