import pg from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

const { Pool, types } = pg;

// Configure pg to parse BIGINT (type ID 20) as integers instead of strings
// This is safe for our use case since we're storing epoch timestamps which are well within
// JavaScript's Number.MAX_SAFE_INTEGER (9007199254740991)
types.setTypeParser(20, (val: string) => parseInt(val, 10));

// SSL configuration for production databases
// Enable SSL by default in production, disable only if DB_SSL is explicitly set to 'false'
const shouldUseSSL = config.server.nodeEnv === 'production'
  ? config.database.ssl !== false
  : config.database.ssl === true;

const sslConfig = shouldUseSSL
  ? {
      ssl: {
        rejectUnauthorized: config.database.sslRejectUnauthorized,
      },
    }
  : {};

// Default production pool with connection limits
const poolConfig = config.database.url
  ? {
      connectionString: config.database.url,
      max: 50, // Increased from 50 to handle more concurrent requests
      min: 5, // Maintain minimum 5 connections for faster response
      idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
      connectionTimeoutMillis: 10000, 
      // maxLifetimeSeconds: 10000,
      // maxUses: 10,
      // Enable keep-alive to detect broken connections
      // keepAlive: true,
      // keepAliveInitialDelayMillis: 10000,
      // More aggressive connection reaping
      allowExitOnIdle: false,
      ...sslConfig,
    }
  : {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: 50,
      min: 5,
      idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
      connectionTimeoutMillis: 10000,
      // maxLifetimeSeconds: 10000,
      // maxUses: 10,
      // Enable keep-alive to detect broken connections
      // keepAlive: true,
      // keepAliveInitialDelayMillis: 10000,
      allowExitOnIdle: false,
      ...sslConfig,
    };

// Log connection configuration (without sensitive info)
if (process.env.VITEST !== 'true') {
  logger.info('Database connection configuration', {
    host: config.database.url ? '[connection string]' : config.database.host,
    port: config.database.url ? '[connection string]' : config.database.port,
    database: config.database.url ? '[connection string]' : config.database.database,
    maxConnections: 50,
    minConnections: 5,
    connectionTimeout: '60s',
    idleTimeout: '30s',
    statementTimeout: '60s',
    keepAlive: true,
    ssl: shouldUseSSL,
    sslRejectUnauthorized: shouldUseSSL ? config.database.sslRejectUnauthorized : false,
  });
}

let _pool: any = new Pool(poolConfig);

// // Test database connection with retry logic
// async function testConnection(retries = 3, delayMs = 5000): Promise<boolean> {
//   for (let i = 0; i < retries; i++) {
//     try {
//       logger.info(`Testing database connection (attempt ${i + 1}/${retries})...`);
//       const client = await _pool.connect();
//       await client.query('SELECT 1');
//       client.release();
//       logger.info('Database connection successful');
//       return true;
//     } catch (err: any) {
//       logger.error(`Database connection test failed (attempt ${i + 1}/${retries})`, err);
//       if (i < retries - 1) {
//         logger.info(`Retrying in ${delayMs / 1000} seconds...`);
//         await new Promise(resolve => setTimeout(resolve, delayMs));
//       }
//     }
//   }
//   logger.error('Failed to connect to database after all retry attempts');
//   return false;
// }

// // Test database connection (only for production pool)
// if (!process.env.VITEST) {
//   _pool.on('connect', (_client: any) => {
//     logger.debug('Pool: New client connected');
//   });

//   _pool.on('acquire', (_client: any) => {
//     logger.debug('Pool: Client acquired');
//   });

//   _pool.on('release', (_client: any) => {
//     logger.debug('Pool: Client released');
//   });

//   _pool.on('remove', (_client: any) => {
//     logger.debug('Pool: Client removed');
//   });

//   _pool.on('error', (err: Error, _client: any) => {
//     logger.error('Unexpected database pool error', err);
//     // Don't exit on pool errors, just log them
//   });

//   // Log pool stats periodically (every 30 seconds)
//   // Warn if pool is getting exhausted
//   setInterval(() => {
//     const stats = {
//       total: _pool.totalCount,
//       idle: _pool.idleCount,
//       waiting: _pool.waitingCount,
//     };

//     // Calculate pool utilization
//     const utilization = ((stats.total - stats.idle) / 50) * 100;

//     // Log at different levels based on utilization
//     if (utilization > 90 || stats.waiting > 0) {
//       logger.warn('Database pool nearing exhaustion', {
//         ...stats,
//         utilization: `${utilization.toFixed(1)}%`,
//         message: 'Consider increasing max connections or investigating slow queries'
//       });
//     } else if (utilization > 75) {
//       logger.info('Database pool high utilization', {
//         ...stats,
//         utilization: `${utilization.toFixed(1)}%`
//       });
//     } else if (process.env.LOG_LEVEL === 'debug') {
//       logger.debug('Pool stats', stats);
//     }
//   }, 30000);

//   // Test connection on startup (non-blocking)
//   testConnection().catch(err => {
//     logger.error('Initial database connection test failed', err);
//   });
// }

// Export getter/setter for pool to allow injection during tests
export const getPool = () => _pool;
export const setPool = (newPool: any) => {
  _pool = newPool;
};

// Wrap pool query method to add logging
// const originalQuery: any = Pool.prototype.query;
// (Pool.prototype.query as any) = function (this: any, queryTextOrConfig: any, values?: any, callback?: any): any {
//   const startTime = Date.now();
//   const queryText = typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig?.text;
//   const queryValues = values || (typeof queryTextOrConfig === 'object' ? queryTextOrConfig?.values : undefined);

//   // Call original query
//   const result: any = originalQuery.call(this, queryTextOrConfig, values, callback);

//   // If it's a promise (no callback), log after completion
//   if (result && typeof result.then === 'function') {
//     return result.then((res: any) => {
//       const duration = Date.now() - startTime;
//       logger.postgres('query', queryText, queryValues, duration);

//       // Warn on slow queries (> 5 seconds)
//       if (duration > 5000) {
//         logger.warn('Slow query detected', {
//           duration_ms: duration,
//           query: queryText?.substring(0, 200), // Truncate for logging
//           params: queryValues,
//           message: 'Query took longer than 5 seconds'
//         });
//       }

//       return res;
//     }).catch((err: Error) => {
//       const duration = Date.now() - startTime;
//       logger.postgres('query_error', queryText, queryValues, duration);
//       logger.error('PostgreSQL query failed', err, {
//         query: queryText,
//         params: queryValues,
//         duration_ms: duration
//       });
//       throw err;
//     });
//   }

//   return result;
// };

// Export pool for backward compatibility
// export const pool = _pool;
export { _pool as pool };

// Helper function to get current epoch timestamp
export const currentEpoch = (): number => Math.floor(Date.now() / 1000);

// Helper function to convert Date to epoch
export const toEpoch = (date: Date): number => Math.floor(date.getTime() / 1000);

// Helper function to convert epoch to Date
export const fromEpoch = (epoch: number): Date => new Date(epoch * 1000);

export default _pool;
