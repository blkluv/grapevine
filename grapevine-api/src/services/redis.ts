/**
 * Redis Service
 *
 * Provides a Redis Cluster client using ioredis for production use.
 * Uses REDIS_CLUSTER_URL environment variable for connection.
 */

import { Redis, Cluster } from 'ioredis';
import { logger } from './logger.js';
import { config } from './config.js';

let redisClient: Redis | Cluster | null = null;

/**
 * Create and configure Redis Cluster client
 * Connects to Redis Cluster using the REDIS_CLUSTER_URL environment variable
 */
export function createRedisClient(): Redis | Cluster {
  const redisClusterUrl = config.redis.clusterUrl;

  if (!redisClusterUrl) {
    throw new Error('REDIS_CLUSTER_URL environment variable is not set');
  }

  try {
    // Parse the cluster URL (format: rediss://host:port or rediss://host:port/db)
    const isSecure = redisClusterUrl.startsWith('rediss://');
    const urlWithoutProtocol = redisClusterUrl.replace(/^rediss?:\/\//, '');
    const [hostPort] = urlWithoutProtocol.split('/');
    const [host, portStr] = hostPort.split(':');
    const port = portStr ? parseInt(portStr, 10) : 6379;

    // For cluster mode, we create a Cluster client
    const client = new Cluster(
      [
        {
          host,
          port,
        },
      ],
      {
        dnsLookup: (address: string, callback: (err: Error | null, address: string) => void) => callback(null, address),
        redisOptions: {
          tls: isSecure
            ? {
                // AWS MemoryDB/ElastiCache requires TLS
                rejectUnauthorized: false,
              }
            : undefined,
          // Set connection timeout
          connectTimeout: 10000,
          maxRetriesPerRequest: 3,
        },
        // Cluster-specific options
        clusterRetryStrategy: (times: number) => {
          const delay = Math.min(times * 100, 3000);
          logger.warn('Redis cluster retry', { attempt: times, delay });
          return delay;
        },
        enableReadyCheck: true,
      }
    );

    // Event handlers
    client.on('connect', () => {
      logger.info('Redis cluster client connecting', {
        host,
        port,
      });
    });

    client.on('ready', () => {
      logger.info('Redis cluster client ready', {
        host,
        port,
      });
    });

    client.on('error', (error) => {
      logger.error('Redis cluster client error', error);
    });

    client.on('close', () => {
      logger.warn('Redis cluster client connection closed');
    });

    client.on('reconnecting', () => {
      logger.info('Redis cluster client reconnecting');
    });

    client.on('node error', (error, node) => {
      logger.error('Redis cluster node error', error, {
        nodeHost: node.options.host,
        nodePort: node.options.port,
      });
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Redis cluster client', error as Error, {
      redisClusterUrl: redisClusterUrl.split('@')[1] || 'unknown', // Hide credentials
    });
    throw error;
  }
}

/**
 * Get or create the singleton Redis client
 */
export function getRedisClient(): Redis | Cluster {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Close the Redis connection
 * Should be called during application shutdown
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis cluster client connection closed gracefully');
      redisClient = null;
    } catch (error) {
      logger.error('Error closing Redis cluster connection', error as Error);
      // Force disconnect if graceful shutdown fails
      if (redisClient) {
        redisClient.disconnect();
      }
      redisClient = null;
    }
  }
}

/**
 * Check if Redis is connected and ready
 */
export function isRedisConnected(): boolean {
  if (!redisClient) {
    return false;
  }

  if (redisClient instanceof Cluster) {
    return redisClient.status === 'ready';
  }

  return redisClient.status === 'ready';
}
