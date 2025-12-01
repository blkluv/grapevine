import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { pool } from '../services/db.js';
import {
  LeaderboardTopRevenueSchema,
  LeaderboardTopProviderSchema,
  LeaderboardTopBuyerSchema,
  LeaderboardTrendingFeedSchema,
  LeaderboardMostPopularSchema,
  TopFeedSchema,
  RecentEntrySchema,
  TimePeriodSchema,
  CategoryStatsSchema,
  ErrorSchema,
} from '../schemas.js';
import { logger } from '../services/logger.js';

const leaderboards = new OpenAPIHono();

// Helper function to get time filter based on period
function getTimeFilter(period: string): string {
  const now = Math.floor(Date.now() / 1000);
  switch (period) {
    case '1d':
      return `AND t.created_at >= ${now - 86400}`;
    case '7d':
      return `AND t.created_at >= ${now - 604800}`;
    case '30d':
      return `AND t.created_at >= ${now - 2592000}`;
    case 'all':
    default:
      return '';
  }
}

// Leaderboard: Recent entries across all feeds
const getRecentEntriesRoute = createRoute({
  method: 'get',
  path: '/recent-entries',
  tags: ['Leaderboards'],
  summary: 'Get recent entries',
  description: 'Retrieve most recent feed entries across all active feeds with cursor-based pagination. Uses the gv_recent_entries view ordered by entry ID DESC.',
  request: {
    query: z.object({
      page_size: z.string().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
      page_token: z.string().optional(), // Cursor for pagination (entry ID)
    }),
  },
  responses: {
    200: {
      description: 'List of recent entries with pagination',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(RecentEntrySchema),
            pagination: z.object({
              page_size: z.number().int(),
              next_page_token: z.string().nullable(),
              has_more: z.boolean(),
            }),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

leaderboards.openapi(getRecentEntriesRoute, async (c) => {
  try {
    const { page_size, page_token } = c.req.valid('query');

    let query: string;
    let params: any[];

    if (page_token) {
      // Cursor-based pagination: get entries older than the cursor
      query = `SELECT * FROM gv_recent_entries WHERE id < $1 ORDER BY id DESC LIMIT $2`;
      params = [page_token, page_size + 1]; // Fetch one extra to check if there are more
    } else {
      // No cursor: get the most recent entries
      query = `SELECT * FROM gv_recent_entries ORDER BY id DESC LIMIT $1`;
      params = [page_size + 1];
    }

    const result = await pool.query(query, params);
    const hasMore = result.rows.length > page_size;
    const data = hasMore ? result.rows.slice(0, page_size) : result.rows;
    const nextPageToken = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return c.json({
      data,
      pagination: {
        page_size,
        next_page_token: nextPageToken,
        has_more: hasMore,
      },
    }, 200);
  } catch (error: any) {
    logger.error('Failed to fetch recent entries', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch recent entries' }, 500);
  }
});

// Leaderboard: Top feeds by entry count
const getTopFeedsRoute = createRoute({
  method: 'get',
  path: '/top-feeds',
  tags: ['Leaderboards'],
  summary: 'Get top feeds by entry count',
  description: 'Retrieve top feeds ranked by total entry count (up to 100 results). Uses the gv_top_feeds view which includes all active feeds ordered by total_entries DESC.',
  request: {
    query: z.object({
      page_size: z.string().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
    }),
  },
  responses: {
    200: {
      description: 'List of top feeds',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(TopFeedSchema),
          }),
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

leaderboards.openapi(getTopFeedsRoute, async (c) => {
  try {
    const { page_size } = c.req.valid('query');
    const result = await pool.query(
      `SELECT * FROM gv_top_feeds LIMIT $1`,
      [page_size]
    );

    return c.json({
      data: result.rows,
    }, 200);
  } catch (error: any) {
    logger.error('Failed to fetch top feeds', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch top feeds' }, 500);
  }
});

// Leaderboard: Top revenue generating feeds
const getLeaderboardTopRevenueRoute = createRoute({
  method: 'get',
  path: '/top-revenue',
  tags: ['Leaderboards'],
  summary: 'Get top revenue feeds',
  description: 'Retrieve leaderboard of feeds ranked by total revenue (up to 100 results) using dynamic query with flexible time period filtering: 1d (last day), 7d (last 7 days), 30d (last 30 days), or all (all time). Includes transaction data joined from gv_transactions.',
  request: {
    query: z.object({
      page_size: z.string().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
      period: TimePeriodSchema.optional(),
    }),
  },
  responses: {
    200: {
      description: 'Top revenue feeds leaderboard',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(LeaderboardTopRevenueSchema),
            period: z.string(),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

leaderboards.openapi(getLeaderboardTopRevenueRoute, async (c) => {
  try {
    const { page_size, period = 'all' } = c.req.valid('query');
    const timeFilter = getTimeFilter(period);

    const result = await pool.query(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) as rank,
        f.id,
        f.name,
        u.id as owner_id,
        u.username as owner_username,
        u.wallet_address as owner_wallet,
        f.category_id,
        c.name as category_name,
        f.description,
        f.image_cid,
        f.is_active,
        f.tags,
        f.total_entries,
        COUNT(DISTINCT t.id) as total_purchases,
        COALESCE(SUM(t.amount), 0) as total_revenue,
        COUNT(DISTINCT t.payer) as unique_buyers,
        f.created_at,
        f.updated_at
      FROM gv_feeds f
      JOIN gv_wallets u ON f.owner_id = u.id
      LEFT JOIN gv_categories c ON f.category_id = c.id
      LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
      LEFT JOIN gv_transactions t ON fe.id = t.entry_id ${timeFilter}
      WHERE f.is_active = true
      GROUP BY f.id, f.name, u.id, u.username, u.wallet_address, f.category_id, c.name, f.description, f.image_cid, f.is_active, f.tags, f.total_entries, f.created_at, f.updated_at
      ORDER BY total_revenue DESC
      LIMIT $1`,
      [page_size]
    );

    return c.json({
      data: result.rows,
      period,
    }, 200);
  } catch (error: any) {
    logger.error('Failed to fetch top revenue leaderboard', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch top revenue leaderboard' }, 500);
  }
});

// Leaderboard: Top providers
const getLeaderboardTopProvidersRoute = createRoute({
  method: 'get',
  path: '/top-providers',
  tags: ['Leaderboards'],
  summary: 'Get top providers by revenue',
  description: 'Retrieve leaderboard of providers (feed owners) ranked by total revenue across all their feeds (up to 100 results) using dynamic query with flexible time period filtering: 1d, 7d, 30d, or all. Aggregates data from all feeds owned by each wallet.',
  request: {
    query: z.object({
      page_size: z.string().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
      period: TimePeriodSchema.optional(),
    }),
  },
  responses: {
    200: {
      description: 'Top providers leaderboard',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(LeaderboardTopProviderSchema),
            period: z.string(),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

leaderboards.openapi(getLeaderboardTopProvidersRoute, async (c) => {
  try {
    const { page_size, period = 'all' } = c.req.valid('query');
    const timeFilter = getTimeFilter(period);

    const result = await pool.query(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) as rank,
        u.id as user_id,
        u.username,
        u.wallet_address,
        COUNT(DISTINCT f.id) as total_feeds,
        COUNT(DISTINCT fe.id) as total_entries,
        COUNT(DISTINCT t.id) as total_purchases,
        COALESCE(SUM(t.amount), 0) as total_revenue,
        COUNT(DISTINCT t.payer) as unique_buyers,
        u.created_at as joined_at
      FROM gv_wallets u
      JOIN gv_feeds f ON u.id = f.owner_id
      LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
      LEFT JOIN gv_transactions t ON fe.id = t.entry_id ${timeFilter}
      WHERE f.is_active = true
      GROUP BY u.id, u.username, u.wallet_address, u.created_at
      HAVING COUNT(DISTINCT f.id) > 0
      ORDER BY total_revenue DESC
      LIMIT $1`,
      [page_size]
    );

    return c.json({
      data: result.rows,
      period,
    }, 200);
  } catch (error: any) {
    logger.error('Failed to fetch top providers leaderboard', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch top providers leaderboard' }, 500);
  }
});

// Leaderboard: Top buyers
const getLeaderboardTopBuyersRoute = createRoute({
  method: 'get',
  path: '/top-buyers',
  tags: ['Leaderboards'],
  summary: 'Get top buyers by purchase count',
  description: 'Retrieve leaderboard of most active buyers ranked by total purchase count (up to 100 results) using dynamic query with flexible time period filtering: 1d, 7d, 30d, or all. Joins wallet data with transaction records to calculate buyer statistics.',
  request: {
    query: z.object({
      page_size: z.string().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
      period: TimePeriodSchema.optional(),
    }),
  },
  responses: {
    200: {
      description: 'Top buyers leaderboard',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(LeaderboardTopBuyerSchema),
            period: z.string(),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

leaderboards.openapi(getLeaderboardTopBuyersRoute, async (c) => {
  try {
    const { page_size, period = 'all' } = c.req.valid('query');
    const timeFilter = getTimeFilter(period);

    const result = await pool.query(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT t.id) DESC) as rank,
        u.id as user_id,
        u.username,
        u.wallet_address,
        COUNT(DISTINCT t.id) as total_purchases,
        COALESCE(SUM(t.amount), 0) as total_spent,
        COUNT(DISTINCT t.entry_id) as unique_entries_purchased,
        COUNT(DISTINCT fe.feed_id) as unique_feeds_purchased_from,
        u.created_at as joined_at
      FROM gv_wallets u
      JOIN gv_transactions t ON u.wallet_address = t.payer ${timeFilter}
      JOIN gv_feed_entries fe ON t.entry_id = fe.id
      GROUP BY u.id, u.username, u.wallet_address, u.created_at
      ORDER BY total_purchases DESC
      LIMIT $1`,
      [page_size]
    );

    return c.json({
      data: result.rows,
      period,
    }, 200);
  } catch (error: any) {
    logger.error('Failed to fetch top buyers leaderboard', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch top buyers leaderboard' }, 500);
  }
});

// Leaderboard: Trending feeds (last 7 days)
const getLeaderboardTrendingRoute = createRoute({
  method: 'get',
  path: '/trending',
  tags: ['Leaderboards'],
  summary: 'Get trending feeds',
  description: 'Retrieve trending feeds based on revenue velocity in the last 7 days (up to 50 results). Uses the gv_leaderboard_trending_feeds view which calculates trending score from recent transaction activity.',
  request: {
    query: z.object({
      page_size: z.string().default('20').transform(Number).pipe(z.number().int().positive().max(50)),
    }),
  },
  responses: {
    200: {
      description: 'Trending feeds leaderboard',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(LeaderboardTrendingFeedSchema),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

leaderboards.openapi(getLeaderboardTrendingRoute, async (c) => {
  try {
    const { page_size } = c.req.valid('query');
    const result = await pool.query(
      `SELECT * FROM gv_leaderboard_trending_feeds LIMIT $1`,
      [page_size]
    );

    return c.json({
      data: result.rows,
    }, 200);
  } catch (error: any) {
    logger.error('Failed to fetch trending leaderboard', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch trending leaderboard' }, 500);
  }
});

// Leaderboard: Most popular feeds by purchase count
const getLeaderboardMostPopularRoute = createRoute({
  method: 'get',
  path: '/most-popular',
  tags: ['Leaderboards'],
  summary: 'Get most popular feeds',
  description: 'Retrieve most popular feeds ranked by total purchase count (up to 100 results) using dynamic query with flexible time period filtering: 1d, 7d, 30d, or all. Only includes feeds with at least 1 entry and at least 1 purchase. Calculates average revenue per purchase.',
  request: {
    query: z.object({
      page_size: z.string().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
      period: TimePeriodSchema.optional(),
    }),
  },
  responses: {
    200: {
      description: 'Most popular feeds leaderboard',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(LeaderboardMostPopularSchema),
            period: z.string(),
          }),
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

leaderboards.openapi(getLeaderboardMostPopularRoute, async (c) => {
  try {
    const { page_size, period = 'all' } = c.req.valid('query');
    const timeFilter = getTimeFilter(period);

    const result = await pool.query(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT t.id) DESC) as rank,
        f.id,
        f.name,
        f.owner_id,
        u.username as owner_username,
        u.wallet_address as owner_wallet,
        f.category_id,
        c.name as category_name,
        f.description,
        f.image_cid,
        f.is_active,
        f.tags,
        f.total_entries,
        COUNT(DISTINCT t.id) as total_purchases,
        COALESCE(SUM(t.amount), 0) as total_revenue,
        COUNT(DISTINCT t.payer) as unique_buyers,
        ROUND(COALESCE(SUM(t.amount), 0) / NULLIF(COUNT(DISTINCT t.id), 0), 2) as avg_revenue_per_purchase,
        f.created_at,
        f.updated_at
      FROM gv_feeds f
      JOIN gv_wallets u ON f.owner_id = u.id
      LEFT JOIN gv_categories c ON f.category_id = c.id
      LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
      LEFT JOIN gv_transactions t ON fe.id = t.entry_id ${timeFilter}
      WHERE f.is_active = true AND f.total_entries >= 1
      GROUP BY f.id, f.name, f.owner_id, u.username, u.wallet_address, f.category_id, c.name, f.description, f.image_cid, f.is_active, f.tags, f.total_entries, f.created_at, f.updated_at
      HAVING COUNT(DISTINCT t.id) > 0
      ORDER BY total_purchases DESC
      LIMIT $1`,
      [page_size]
    );

    return c.json({
      data: result.rows,
      period,
    }, 200);
  } catch (error: any) {
    logger.error('Failed to fetch most popular leaderboard', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch most popular leaderboard' }, 500);
  }
});

// Leaderboard: Category statistics
const getCategoryStatsRoute = createRoute({
  method: 'get',
  path: '/category-stats',
  tags: ['Leaderboards'],
  summary: 'Get category statistics',
  description: 'Retrieve comprehensive statistics for all categories, including total feeds, providers, entries, purchases, revenue, and unique buyers. Uses the gv_category_stats view ordered by total revenue DESC.',
  responses: {
    200: {
      description: 'List of category statistics ordered by total revenue descending',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(CategoryStatsSchema),
          }),
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

leaderboards.openapi(getCategoryStatsRoute, async (c) => {
  try {
    const result = await pool.query('SELECT * FROM gv_category_stats');

    return c.json({
      data: result.rows,
    }, 200);
  } catch (error: any) {
    logger.error('Failed to fetch category stats', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch category stats' }, 500);
  }
});

export default leaderboards;
