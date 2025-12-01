import { z } from '@hono/zod-openapi';
import { isValidImageUrl } from './utils/validation.js';

export const WalletAddressNetworkSchema = z.enum([
  'base',
  'base-sepolia',
  'ethereum',
  'ethereum-sepolia',
  'polygon',
  'polygon-amoy'
]);
export const WalletAddress = z.string().length(42).regex(/^0x[0-9a-fA-F]{40}$/);

// =============================================================================
// Base Schemas - Common patterns shared across multiple schemas
// =============================================================================

// Timestamp fields that appear in most entities
export const TimestampsSchema = z.object({
  created_at: z.number().int().positive(),
  updated_at: z.number().int().positive(),
});

// Feed core properties (shared by FeedSchema, TopFeedSchema, LeaderboardTrendingFeedSchema)
export const FeedCoreSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  image_cid: z.string().max(255).nullable(),
  is_active: z.boolean(),
  total_entries: z.number().int().nonnegative(),
  total_purchases: z.number().int().nonnegative(),
  total_revenue: z.string().max(78), // Decimal as string, max ~1e78 wei
  tags: z.array(z.string().min(1).max(50)).max(20).nullable(),
});

// Owner/wallet info commonly displayed with feeds
export const OwnerInfoSchema = z.object({
  owner_wallet: WalletAddress,
  owner_username: z.string().min(3).max(50).nullable(),
  category_name: z.string().min(1).max(255).nullable(),
});

// Leaderboard rank field
export const RankSchema = z.object({
  rank: z.string().transform(Number).pipe(z.number().int().positive()),
});

// User identity fields used in leaderboard schemas
export const UserIdentitySchema = z.object({
  user_id: z.string().uuid(),
  username: z.string().min(3).max(50).nullable(),
  wallet_address: WalletAddress,
});

// Authentication header schema for protected endpoints
export const AuthHeadersSchema = z.object({
  'x-wallet-address': WalletAddress.openapi({
    description: 'Ethereum wallet address (0x prefixed)',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  }),
  'x-signature': z.string().regex(/^0x[0-9a-fA-F]+$/).openapi({
    description: 'Cryptographic signature (hex format)',
    example: '0x...',
  }),
  'x-message': z.string().openapi({
    description: 'The signed message (base64 encoded if it contains newlines)',
    example: 'R3JhcGV2aW5lIEF1dGhlbnRpY2F0aW9u...',
  }),
  'x-timestamp': z.string().openapi({
    description: 'Unix timestamp in seconds',
    example: '1735689600',
  }),
  'x-chain-id': z.string().optional().openapi({
    description: 'Chain ID for network detection (optional). Supported: 8453 (base), 84532 (base-sepolia), 1 (ethereum), 11155111 (ethereum-sepolia), 137 (polygon), 80002 (polygon-amoy)',
    example: '8453',
  }),
});

export const PaymentHeadersSchema = z.object({
  'x-payment': z.string().openapi({
    description: 'X402 Payment header for payment verification',
    example: 'eyJ2ZXJzaW9uIjoxLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsicHJpY2UiOnsicGF5bWVudF9pbnN0cnVjdGlvbjoiMGU2YzI3YjAtY2E3ZS00Y2Y0LTg4ZjItY2E0ZjI3ZjYzNzA0IiwiYW1vdW50IjoiMTAwMDAwMDAwMDAiLCJhc3NldCI6IndlYiIsInBheV90byI6IjB4NzQyZDM1Q2M2NjRDMDA1MzI5MjVhM2I4NDRiYmM5ZTU5NWYwYkViIiwiYXV0aG9yaXphdGlvbiI6eyJ0eXBlIjoiRXZtQXV0aCIsImZyb20iOiIweDg2RjE2QjEwNDhDMjRCMkE3NDU2RkE3QjA3RkE3N0E3IiwidG8iOiIweDc0MmQzNUNjNjY0QzA1MzI5MjVhM2I4NDRiYjljZTdlNTk1ZjBiZWIiLCibm9uY2UiOiIxMjM0NTY3ODkwIn19fX0='
  }),
});

export const AdminAuthHeadersSchema = z.object({
  'admin-api-key': z.string().openapi({
    description: 'Admin API key for server-to-server authentication',
  }),
});

// Wallet schemas
export const WalletSchema = TimestampsSchema.extend({
  id: z.string().uuid(),
  wallet_address: z.string().length(42).regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address format'),
  wallet_address_network: WalletAddressNetworkSchema,
  username: z.string().min(3).max(50).nullable(),
  picture_url: z.string().max(2048).nullable().refine(isValidImageUrl, {
    message: 'Invalid image URL: only HTTPS URLs to public resources, IPFS CIDs, or base64 data are allowed',
  }),
});

export const CreateWalletSchema = z.object({
  wallet_address: z.string().length(42).regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address format'),
  wallet_address_network: WalletAddressNetworkSchema,
  username: z.string().min(3).max(50).optional(),
});

// Category schemas
export const CategorySchema = TimestampsSchema.extend({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable(),
  icon_url: z.string().url().max(2048).nullable(),
  is_active: z.boolean(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  icon_url: z.string().url().max(2048).optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  icon_url: z.string().url().max(2048).optional(),
  is_active: z.boolean().optional(),
});

// Feed schemas
export const FeedSchema = FeedCoreSchema.merge(TimestampsSchema).extend({
  owner_wallet_address: WalletAddress,
});

export const CreateFeedSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  image_url: z.string().max(52428800).optional().refine(isValidImageUrl, {
    message: 'Invalid image URL: only HTTPS URLs to public resources, IPFS CIDs, or base64 data are allowed',
  }), // Can be URL, IPFS CID, or base64 (max 50MB base64)
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

export const UpdateFeedSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  image_cid: z.string().max(255).optional(),
  is_active: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

// Payment Instruction schemas
export const PaymentInstructionSchema = TimestampsSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  payment_requirements: z.record(z.string(), z.any()),
  version: z.number().int().nonnegative(),
  deleted_at: z.number().int().positive().nullable(),
});

export const CreatePaymentInstructionSchema = z.object({
  user_id: z.string().uuid(),
  payment_requirements: z.record(z.string(), z.any()),
});

// Feed Entry schemas
export const FeedEntrySchema = TimestampsSchema.extend({
  id: z.string().uuid(),
  feed_id: z.string().uuid(),
  cid: z.string().min(1).max(255),
  mime_type: z.string().min(3).max(50),
  pinata_upload_id: z.string().uuid().nullable(),
  title: z.string().min(1).max(500).nullable(),
  description: z.string().max(10000).nullable(),
  metadata: z.string().max(10000).nullable(),
  tags: z.array(z.string().min(1).max(50)).max(20).nullable(),
  is_free: z.boolean(),
  expires_at: z.number().int().positive().nullable(),
  piid: z.string().uuid().nullable(),
  is_active: z.boolean(),
  total_purchases: z.number().int().nonnegative(),
  total_revenue: z.string().max(78), // Decimal as string, max ~1e78 wei
});

export const CreateFeedEntrySchema = z.object({
  feed_id: z.string().uuid(),
  content_base64: z.string().min(1).max(52428800), // Max 50MB base64 (matching bodyLimit)
  mime_type: z.string().min(3).max(50),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  metadata: z.string().max(10000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  is_free: z.boolean().default(false),
  expires_at: z.number().int().positive().optional(),
  price: z.object({
    amount: z.string().regex(/^\d+$/).min(1).max(78), // Max ~1e78 wei
    currency: z.string().min(1).max(10),
    network: WalletAddressNetworkSchema,
  }).optional(), // If provided and is_free=false, will create payment instruction
});

// Transaction schemas
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  piid: z.string().uuid().nullable(),
  payer: WalletAddress,
  pay_to: WalletAddress,
  amount: z.string().max(20), // BIGINT as string (up to ~9.2e18)
  asset: z.string().min(1).max(255),
  entry_id: z.string().uuid().nullable(),
  transaction_hash: z.string().length(66).regex(/^0x[0-9a-fA-F]{64}$/),
  created_at: z.number().int().positive(),
});

const RequestLogDataSchema = z.object({
  method: z.string().max(10).optional(),
  url: z.string().max(2048).optional(),
  pathname: z.string().max(2048).optional(),
  hostname: z.string().max(255).optional(),
  search: z.string().max(2048).optional(),
  user_agent: z.string().max(500).nullable().optional(),
  forwarded_for: z.string().max(255).nullable().optional(),
  real_ip: z.string().max(45).nullable().optional(), // IPv6 max length
  referer: z.string().max(2048).nullable().optional(),
}).optional();

// Response Log Data Schema
const ResponseLogDataSchema = z.object({
  status: z.number().int().min(100).max(599).optional(), // HTTP status codes
  headers: z.record(z.string(), z.any()).optional(),
  size: z.number().int().nonnegative().nullable().optional(),
  duration: z.number().nonnegative().nullable().optional(), // milliseconds
  cached: z.boolean().optional(),
  error: z.string().max(1000).nullable().optional(),
}).nullable().optional();

const LocationLogDataSchema = z.object({
  colo: z.string().max(10).optional(), // Cloudflare colo code
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  asn: z.number().int().positive().optional(),
  as_organization: z.string().max(255).optional(),
}).nullable().optional();

const X402LogDataSchema = z.object({
  verified: z.boolean().optional(),
  settled: z.boolean().optional(),
  scheme: z.string().max(50).optional(),
  network: z.string().max(50).optional(),
  payer: z.string().length(42).regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  asset: z.string().max(255).optional(),
  transaction: z.string().length(66).regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  x402_version: z.union([z.string().max(50), z.number()]).optional(), // Accept both string and number
  payment_instruction_id: z.string().uuid().optional(),
  pay_to: z.string().length(42).regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  amount: z.union([z.number(), z.string()]).optional(), // Accept both number (new) and string (old)
  paymentInstructionId: z.string().uuid().optional(),
  payTo: z.string().length(42).regex(/^0x[0-9a-fA-F]{40}$/).optional(),
}).nullable().optional();

// Create Transaction Schema (LogData structure) - supports both snake_case (new) and camelCase (old) for backward compatibility
export const CreateTransactionSchema = z.array(z.object({
  timestamp: z.number().int().positive(),
  root_cid: z.string().max(255).nullable().optional(),
  location_data: LocationLogDataSchema.optional(),
  x402_data: X402LogDataSchema.optional(),
  request: RequestLogDataSchema,
  response: ResponseLogDataSchema,
}));

// Feed Analytics schemas
export const FeedAnalyticsSchema = z.object({
  id: z.string().uuid(),
  feed_id: z.string().uuid(),
  period_start: z.number().int().positive(),
  period_end: z.number().int().positive(),
  period_type: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  entries_published: z.number().int().nonnegative(),
  total_views: z.number().int().nonnegative(),
  total_purchases: z.number().int().nonnegative(),
  total_revenue: z.string().max(78), // Decimal as string, max ~1e78 wei
  created_at: z.number().int().positive(),
});

// Wallet Stats schemas
export const WalletStatsSchema = TimestampsSchema.extend({
  wallet_id: z.string().uuid(),
  total_feeds_created: z.number().int().nonnegative(),
  total_entries_published: z.number().int().nonnegative(),
  total_revenue_earned: z.string().max(78), // Decimal as string, max ~1e78 wei
  total_items_sold: z.number().int().nonnegative(),
  unique_buyers_count: z.number().int().nonnegative(),
  total_purchases_made: z.number().int().nonnegative(),
  total_amount_spent: z.string().max(78), // Decimal as string, max ~1e78 wei
  unique_feeds_purchased_from: z.number().int().nonnegative(),
  revenue_rank: z.number().int().positive().nullable(),
  purchases_rank: z.number().int().positive().nullable(),
  last_calculated_at: z.number().int().positive(),
});

// Pagination schemas - Token/Cursor-based
export const CursorPaginationQuerySchema = z.object({
  page_size: z.string().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
  page_token: z.string().optional(), // Opaque cursor token for pagination
});

export const CursorPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page_size: z.number().int(),
      next_page_token: z.string().nullable(),
      has_more: z.boolean(),
    }),
  });

// Error schemas
export const ErrorSchema = z.object({
  error: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  details: z.any().optional(),
});

// Success message schema
export const SuccessMessageSchema = z.object({
  message: z.string().min(1).max(500),
  data: z.any().optional(),
});

// Time period schema for leaderboards
export const TimePeriodSchema = z.enum(['1d', '7d', '30d', 'all']).default('all');

// Analytics schemas (from views)
export const TopFeedSchema = FeedCoreSchema.merge(TimestampsSchema).merge(OwnerInfoSchema);

export const RecentEntrySchema = TimestampsSchema.extend({
  id: z.string().uuid(),
  feed_id: z.string().uuid(),
  cid: z.string().min(1).max(255),
  mime_type: z.string().min(3).max(50),
  pinata_upload_id: z.string().uuid().nullable(),
  title: z.string().min(1).max(500).nullable(),
  description: z.string().max(10000).nullable(),
  metadata: z.string().max(10000).nullable(),
  tags: z.array(z.string().min(1).max(50)).max(20).nullable(),
  price: z.string().max(78),
  asset: z.string().min(1).max(10),
  is_free: z.boolean(),
  expires_at: z.number().int().positive().nullable(),
  piid: z.string().uuid().nullable(),
  feed_name: z.string().min(1).max(255),
  feed_owner_id: z.string().uuid(),
  owner_wallet: WalletAddress,
  category_name: z.string().min(1).max(255),
});

export const CategoryStatsSchema = z.object({
  category_id: z.string().uuid(),
  category_name: z.string().min(1).max(255),
  category_description: z.string().max(1000).nullable(),
  category_icon_url: z.string().url().max(2048).nullable(),
  total_feeds: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_providers: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_entries: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_purchases: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_revenue: z.string().max(78),
  unique_buyers: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  avg_purchase_amount: z.string().max(78),
});

export const LeaderboardTopRevenueSchema = z.object({
  rank: z.string().transform(Number).pipe(z.number().int().positive()),
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  owner_id: z.string().uuid(),
  owner_username: z.string().min(3).max(50).nullable(),
  owner_wallet: WalletAddress,
  category_id: z.string().uuid().nullable(),
  category_name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  image_cid: z.string().max(255).nullable(),
  is_active: z.boolean(),
  tags: z.array(z.string().min(1).max(50)).max(20).nullable(),
  total_entries: z.number().int().nonnegative(),
  total_purchases: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_revenue: z.string().max(78),
  unique_buyers: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  created_at: z.number().int().positive(),
  updated_at: z.number().int().positive(),
});

export const LeaderboardTopProviderSchema = RankSchema.merge(UserIdentitySchema).extend({
  total_feeds: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_entries: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_purchases: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_revenue: z.string().max(78),
  unique_buyers: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  joined_at: z.number().int().positive(),
});

export const LeaderboardTopBuyerSchema = RankSchema.merge(UserIdentitySchema).extend({
  total_purchases: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_spent: z.string().max(78),
  unique_entries_purchased: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  unique_feeds_purchased_from: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  joined_at: z.number().int().positive(),
});

// Note: Explicitly defined instead of using .merge() for proper OpenAPI spec generation
export const LeaderboardTrendingFeedSchema = z.object({
  // Rank
  rank: z.string().transform(Number).pipe(z.number().int().positive()),
  // Feed core properties (from FeedCoreSchema)
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  image_cid: z.string().max(255).nullable(),
  is_active: z.boolean(),
  total_entries: z.number().int().nonnegative(),
  total_purchases: z.number().int().nonnegative(),
  total_revenue: z.string().max(78),
  tags: z.array(z.string().min(1).max(50)).max(20).nullable(),
  // Timestamps
  created_at: z.number().int().positive(),
  updated_at: z.number().int().positive(),
  // Owner info
  owner_wallet: WalletAddress,
  owner_username: z.string().min(3).max(50).nullable(),
  category_name: z.string().min(1).max(255).nullable(),
  // 7-day metrics
  purchases_last_7d: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  revenue_last_7d: z.string().max(78),
  unique_buyers_last_7d: z.string().transform(Number).pipe(z.number().int().nonnegative()),
});

export const LeaderboardMostPopularSchema = z.object({
  rank: z.string().transform(Number).pipe(z.number().int().positive()),
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  owner_id: z.string().uuid(),
  owner_username: z.string().min(3).max(50).nullable(),
  owner_wallet: WalletAddress,
  category_id: z.string().uuid().nullable(),
  category_name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  image_cid: z.string().max(255).nullable(),
  is_active: z.boolean(),
  tags: z.array(z.string().min(1).max(50)).max(20).nullable(),
  total_entries: z.number().int().nonnegative(),
  total_purchases: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  total_revenue: z.string().max(78),
  unique_buyers: z.string().transform(Number).pipe(z.number().int().nonnegative()),
  avg_revenue_per_purchase: z.string().max(78).nullable(),
  created_at: z.number().int().positive(),
  updated_at: z.number().int().positive(),
});

// Access Link schemas
export const CreateAccessLinkSchema = z.object({});

export const AccessLinkResponseSchema = z.object({
  url: z.string().url().openapi({
    description: 'Presigned URL for private file access',
  }),
  expires_at: z.number().int().positive().openapi({
    description: 'Unix timestamp when the link expires',
  }),
});
