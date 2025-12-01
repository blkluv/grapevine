import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { rateLimit } from '../../src/middleware/rateLimit.js';

describe('Rate Limit Middleware', () => {
  let app: OpenAPIHono;

  beforeEach(() => {
    app = new OpenAPIHono();

    // Apply rate limit middleware with a small window for testing
    // Use skipFailingRequests: true to enable rate limiting even in test mode
    app.use('*', rateLimit({
      windowMs: 1000, // 1 second window
      max: 3, // Max 3 requests per window
      skipFailingRequests: true, // Force rate limiting to work in test mode
    }));

    // Test route
    app.get('/test', (c) => {
      return c.json({ message: 'success' });
    });
  });

  it('should allow requests within rate limit', async () => {
    const response1 = await app.request('/test');
    expect(response1.status).toBe(200);
    expect(response1.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(response1.headers.get('X-RateLimit-Remaining')).toBe('2');

    const response2 = await app.request('/test');
    expect(response2.status).toBe(200);
    expect(response2.headers.get('X-RateLimit-Remaining')).toBe('1');

    const response3 = await app.request('/test');
    expect(response3.status).toBe(200);
    expect(response3.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('should block requests exceeding rate limit', async () => {
    // Make 3 requests (at the limit)
    await app.request('/test');
    await app.request('/test');
    await app.request('/test');

    // 4th request should be blocked
    const response = await app.request('/test');
    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data.error).toBe('Too Many Requests');
    expect(data.message).toContain('Rate limit exceeded');
    expect(data.retryAfter).toBeDefined();

    // Check rate limit headers
    expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toBeDefined();
  });

  it('should reset rate limit after window expires', async () => {
    // Make 3 requests to hit the limit
    await app.request('/test');
    await app.request('/test');
    await app.request('/test');

    // 4th request should be blocked
    const blockedResponse = await app.request('/test');
    expect(blockedResponse.status).toBe(429);

    // Wait for window to reset (1 second + a bit of buffer)
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should be able to make requests again
    const response = await app.request('/test');
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('2');
  });

  it('should track different IPs separately', async () => {
    // Make 3 requests from one IP
    await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    // 4th request from same IP should be blocked
    const blockedResponse = await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    expect(blockedResponse.status).toBe(429);

    // But request from different IP should succeed
    const response = await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.1.2' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('2');
  });

  it('should handle x-real-ip header', async () => {
    const response = await app.request('/test', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
  });

  it('should handle cf-connecting-ip header (Cloudflare)', async () => {
    const response = await app.request('/test', {
      headers: { 'cf-connecting-ip': '203.0.113.1' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
  });

  it('should include reset timestamp in headers', async () => {
    const response = await app.request('/test');
    expect(response.status).toBe(200);

    const resetHeader = response.headers.get('X-RateLimit-Reset');
    expect(resetHeader).toBeDefined();

    // Should be a valid ISO date string
    const resetDate = new Date(resetHeader!);
    expect(resetDate.getTime()).toBeGreaterThan(Date.now());
  });
});
