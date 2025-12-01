import { Context, Next } from 'hono';
import { config } from '../services/config.js';

interface RateLimitStore {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
// Key: IP address, Value: { count, resetAt }
const store = new Map<string, RateLimitStore>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of store.entries()) {
    if (data.resetAt < now) {
      store.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  skipFailingRequests?: boolean; // Skip rate limiting even in test mode (for testing the middleware itself)
}

/**
 * Rate limiting middleware
 * Limits requests per IP address within a time window
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, skipFailingRequests = false } = options;

  return async (c: Context, next: Next) => {
    // Skip rate limiting for health check endpoint
    const path = new URL(c.req.url).pathname;
    if (path === '/health') {
      await next();
      return;
    }

    // Skip rate limiting in test environment (unless explicitly testing the middleware)
    if (!skipFailingRequests && (config.server.nodeEnv === 'test' || process.env.VITEST === 'true')) {
      await next();
      return;
    }

    // Get client IP from various headers (for proxy support)
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      c.req.header('cf-connecting-ip') || // Cloudflare
      'unknown';

    const now = Date.now();
    const record = store.get(ip);

    if (!record || record.resetAt < now) {
      // Create new record or reset expired one
      store.set(ip, {
        count: 1,
        resetAt: now + windowMs,
      });

      // Set rate limit headers
      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', (max - 1).toString());
      c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      await next();
      return;
    }

    if (record.count >= max) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);

      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
      c.header('Retry-After', retryAfter.toString());

      return c.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        429
      );
    }

    // Increment count
    record.count += 1;

    // Set rate limit headers
    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', (max - record.count).toString());
    c.header('X-RateLimit-Reset', new Date(record.resetAt).toISOString());

    await next();
  };
}
