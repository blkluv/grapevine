/**
 * Nonce Store Service
 *
 * Provides storage for authentication nonces with both Redis (production)
 * and in-memory (testing) implementations.
 */

import { logger } from './logger.js';
import { config } from './config.js';

export interface NonceData {
  nonce: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * Interface for nonce storage implementations
 */
export interface INonceStore {
  /**
   * Store a nonce for a wallet address
   * @param walletAddress - Ethereum wallet address (will be lowercased)
   * @param nonce - Generated nonce string
   * @param ttlMs - Time to live in milliseconds
   */
  set(walletAddress: string, nonce: string, ttlMs: number): Promise<void>;

  /**
   * Get a nonce for a wallet address
   * @param walletAddress - Ethereum wallet address (will be lowercased)
   * @returns Nonce data if found and not expired, null otherwise
   */
  get(walletAddress: string): Promise<NonceData | null>;

  /**
   * Delete a nonce for a wallet address
   * @param walletAddress - Ethereum wallet address (will be lowercased)
   */
  delete(walletAddress: string): Promise<void>;

  /**
   * Close/cleanup the store connection
   */
  close(): Promise<void>;
}

/**
 * In-Memory Nonce Store Implementation
 * Used for unit tests and development
 */
export class InMemoryNonceStore implements INonceStore {
  private store = new Map<string, NonceData>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired nonces every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [address, data] of this.store.entries()) {
      if (data.expiresAt < now) {
        this.store.delete(address);
      }
    }
  }

  async set(walletAddress: string, nonce: string, ttlMs: number): Promise<void> {
    const walletAddressLower = walletAddress.toLowerCase();
    const expiresAt = Date.now() + ttlMs;
    this.store.set(walletAddressLower, { nonce, expiresAt });
  }

  async get(walletAddress: string): Promise<NonceData | null> {
    const walletAddressLower = walletAddress.toLowerCase();
    const data = this.store.get(walletAddressLower);

    if (!data) {
      return null;
    }

    // Check if expired
    if (data.expiresAt < Date.now()) {
      this.store.delete(walletAddressLower);
      return null;
    }

    return data;
  }

  async delete(walletAddress: string): Promise<void> {
    const walletAddressLower = walletAddress.toLowerCase();
    this.store.delete(walletAddressLower);
  }

  async close(): Promise<void> {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }

  /**
   * Clear all nonces (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Redis Nonce Store Implementation
 * Used for production with Redis Cluster
 */
export class RedisNonceStore implements INonceStore {
  private client: any; // Redis client from ioredis (Cluster or Redis)
  private readonly keyPrefix = 'nonce:';

  constructor(redisClient: any) {
    this.client = redisClient;
  }

  private getKey(walletAddress: string): string {
    return `${this.keyPrefix}${walletAddress.toLowerCase()}`;
  }

  async set(walletAddress: string, nonce: string, ttlMs: number): Promise<void> {
    const key = this.getKey(walletAddress);
    const expiresAt = Date.now() + ttlMs;
    const data: NonceData = { nonce, expiresAt };

    try {
      // Store with TTL using PX (milliseconds) for more precise expiration
      await this.client.set(key, JSON.stringify(data), 'PX', ttlMs);

      logger.debug('Redis nonce store: Nonce set successfully', {
        walletAddress: walletAddress.toLowerCase(),
        ttlMs,
      });
    } catch (error) {
      logger.error('Redis nonce store: Failed to set nonce', error as Error, {
        walletAddress: walletAddress.toLowerCase(),
      });
      throw error;
    }
  }

  async get(walletAddress: string): Promise<NonceData | null> {
    const key = this.getKey(walletAddress);

    try {
      const value = await this.client.get(key);

      if (!value) {
        logger.debug('Redis nonce store: No nonce found', {
          walletAddress: walletAddress.toLowerCase(),
        });
        return null;
      }

      const data: NonceData = JSON.parse(value);

      // Double-check expiration (Redis TTL should handle this, but be safe)
      if (data.expiresAt < Date.now()) {
        logger.debug('Redis nonce store: Nonce expired, deleting', {
          walletAddress: walletAddress.toLowerCase(),
        });
        await this.delete(walletAddress);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Redis nonce store: Failed to get nonce', error as Error, {
        walletAddress: walletAddress.toLowerCase(),
      });
      throw error;
    }
  }

  async delete(walletAddress: string): Promise<void> {
    const key = this.getKey(walletAddress);

    try {
      await this.client.del(key);
      logger.debug('Redis nonce store: Nonce deleted', {
        walletAddress: walletAddress.toLowerCase(),
      });
    } catch (error) {
      logger.error('Redis nonce store: Failed to delete nonce', error as Error, {
        walletAddress: walletAddress.toLowerCase(),
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    // Don't close the Redis client here - it's managed by the redis service
    // The redis service has its own lifecycle management
    logger.debug('Redis nonce store: close() called (no-op, client managed by redis service)');
  }
}

/**
 * Factory function to create the appropriate nonce store based on environment
 */
export async function createNonceStore(): Promise<INonceStore> {
  const redisClusterUrl = config.redis.clusterUrl;
  const isProduction = config.server.nodeEnv === 'production';
  const isTest = config.server.nodeEnv === 'test' || process.env.VITEST === 'true';

  // Always use in-memory store for tests
  if (isTest) {
    logger.info('Nonce store: Using in-memory store for tests');
    return new InMemoryNonceStore();
  }

  // Use Redis if REDIS_CLUSTER_URL is configured
  if (redisClusterUrl) {
    try {
      // Dynamic import to avoid circular dependencies
      const redisModule = await import('./redis.js');
      const redisClient = redisModule.getRedisClient();

      logger.info('Nonce store: Using Redis cluster store for production', {
        redisHost: redisClusterUrl.split('@')[1]?.split(':')[0] || 'cluster',
      });

      return new RedisNonceStore(redisClient);
    } catch (error) {
      logger.error('Failed to create Redis nonce store, falling back to in-memory', error as Error);
      logger.warn('Nonce store: Falling back to in-memory store');
      return new InMemoryNonceStore();
    }
  }

  // Use in-memory store for development or when Redis is not configured
  logger.info('Nonce store: Using in-memory store for development');
  return new InMemoryNonceStore();
}

// Export singleton instance (use top-level await)
export const nonceStore = await createNonceStore();
