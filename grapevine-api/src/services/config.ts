import { config as dotenvConfig } from 'dotenv';
import pkg from '../../package.json' with { type: 'json' };

dotenvConfig();

/**
 * Parse PostgreSQL connection string into components
 * Format: postgresql://user:password@host:port/database
 */
function parseConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1), // Remove leading slash
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  } catch (error) {
    console.error('Failed to parse DB_URL connection string:', error);
    throw new Error('Invalid DB_URL format. Expected: postgresql://user:password@host:port/database');
  }
}

// Parse DB_URL if provided, otherwise use individual DB_* variables or defaults
const dbUrl = process.env.DB_URL;
const parsedConnection = dbUrl ? parseConnectionString(dbUrl) : null;

export const config = {
  database: {
    // If DB_URL is provided, use parsed components; otherwise fall back to DATABASE_URL or individual variables
    url: process.env.DATABASE_URL || dbUrl,
    host: parsedConnection?.host || process.env.DB_HOST || 'localhost',
    port: parsedConnection?.port || parseInt(process.env.DB_PORT || '5432'),
    database: parsedConnection?.database || process.env.DB_NAME || 'grapevine',
    user: parsedConnection?.user || process.env.DB_USER || 'postgres',
    password: parsedConnection?.password || process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  },
  server: {
    openApiUrl: process.env.SERVER_ORIGIN || 'http://localhost:3000',
    origin: process.env.SERVER_ORIGIN || 'http://localhost',
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    version: pkg.version,
  },
  api: {
    version: process.env.API_VERSION || 'v1',
  },
  auth: {
    adminApiKey: process.env.ADMIN_API_KEY,
  },
  redis: {
    clusterUrl: process.env.REDIS_CLUSTER_URL,
  },
  pinata: {
    jwtToken: process.env.PINATA_JWT_TOKEN,
    backendApiUrl: process.env.PINATA_BACKEND_API_URL,
    uploadsUrl: process.env.V3_UPLOADS_URL,
    uploadsAdminKey: process.env.V3_UPLOADS_ADMIN_KEY,
    uploadsUserId: process.env.V3_UPLOADS_USER_ID,
    uploadsGroupId: process.env.V3_UPLOADS_GROUP_ID,
    gateway: process.env.PINATA_GATEWAY_HOST,
  },
  payment: {
    freePaymentInstructionId: process.env.FREE_PAYMENT_INSTRUCTION_ID,
  },
  limits: {
    maxFeedsPerWallet: parseInt(process.env.MAX_FEEDS_PER_WALLET || '10000'),
    maxEntriesPerFeed: parseInt(process.env.MAX_ENTRIES_PER_FEED || '10000'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  worker: {
    enableExpiryWorker: process.env.ENABLE_EXPIRY_WORKER === 'true',
    expiryWorkerPollInterval: parseInt(process.env.EXPIRY_WORKER_POLL_INTERVAL || '60000'),
    expiryWorkerBatchSize: parseInt(process.env.EXPIRY_WORKER_BATCH_SIZE || '100'),
    expiryWorkerTimeout: parseInt(process.env.EXPIRY_WORKER_TIMEOUT || '5000'),
  },
  x402: {
    payToAddress: process.env.X402_PAY_TO_ADDRESS || '',
    network: process.env.X402_NETWORK || 'base-sepolia',
    facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    feedCreationPrice: process.env.X402_FEED_CREATION_PRICE || "$0.99",
    entryCreationPrice: process.env.X402_ENTRY_CREATION_PRICE || "$0.10",
  },
};
