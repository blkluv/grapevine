import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { pool, currentEpoch } from '../services/db.js';
import {
  WalletSchema,
  CreateWalletSchema,
  WalletStatsSchema,
  ErrorSchema,
  AuthHeadersSchema,
} from '../schemas.js';
import { requireWalletAuth } from '../middleware/walletAuth.js';
import { logger } from '../services/logger.js';

// Type definition for wallet auth context variables
type WalletAuthEnv = {
  Variables: {
    verifiedWallet: string;
    verifiedAt: number;
  };
};

const wallets = new OpenAPIHono<WalletAuthEnv>();

// Apply required wallet authentication middleware to PATCH
wallets.patch('/:wallet_id', requireWalletAuth);

// Get all wallets (paginated)
// const getWalletsRoute = createRoute({
//   method: 'get',
//   path: '/',
//   tags: ['Wallets'],
//   request: {
//     query: PaginationQuerySchema,
//   },
//   responses: {
//     200: {
//       description: 'List of wallets',
//       content: {
//         'application/json': {
//           schema: PaginatedResponseSchema(WalletSchema),
//         },
//       },
//     },
//     500: {
//       description: 'Internal server error',
//       content: {
//         'application/json': {
//           schema: ErrorSchema,
//         },
//       },
//     },
//   },
// });

// wallets.openapi(getWalletsRoute, async (c) => {
//   try {
//     const { page, limit } = c.req.valid('query');
//     const offset = (page - 1) * limit;

//     const countResult = await pool.query('SELECT COUNT(*) FROM gv_wallets');
//     const total = parseInt(countResult.rows[0].count);

//     const result = await pool.query(
//       'SELECT * FROM gv_wallets ORDER BY created_at DESC LIMIT $1 OFFSET $2',
//       [limit, offset]
//     );

//     return c.json({
//       data: result.rows,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//     }, 200);
//   } catch (error) {
//     console.error('Error fetching wallets:', error);
//     return c.json({ error: 'Internal Server Error', message: 'Failed to fetch wallets' }, 500);
//   }
// });

// Get wallet by ID
const getWalletRoute = createRoute({
  method: 'get',
  path: '/{wallet_id}',
  tags: ['Wallets'],
  summary: 'Get wallet by ID',
  description: 'Retrieve detailed information about a specific wallet by its unique identifier',
  request: {
    params: z.object({
      wallet_id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Wallet details',
      content: {
        'application/json': {
          schema: WalletSchema,
        },
      },
    },
    404: {
      description: 'Wallet not found',
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

wallets.openapi(getWalletRoute, async (c) => {
  try {
    const { wallet_id } = c.req.valid('param');
    const result = await pool.query('SELECT * FROM gv_wallets WHERE id = $1', [wallet_id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Wallet not found' }, 404);
    }

    return c.json(result.rows[0], 200);
  } catch (error) {
    logger.error('Error fetching wallet', error as Error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch wallet' }, 500);
  }
});

// Get wallet by address
const getWalletByAddressRoute = createRoute({
  method: 'get',
  path: '/address/{address}',
  tags: ['Wallets'],
  summary: 'Get wallet by address',
  description: 'Retrieve detailed information about a specific wallet by its Ethereum wallet address (0x-prefixed, 42 characters)',
  request: {
    params: z.object({
      address: z.string().length(42),
    }),
  },
  responses: {
    200: {
      description: 'Wallet details',
      content: {
        'application/json': {
          schema: WalletSchema,
        },
      },
    },
    404: {
      description: 'Wallet not found',
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

wallets.openapi(getWalletByAddressRoute, async (c) => {
  try {
    const { address } = c.req.valid('param');
    const result = await pool.query('SELECT * FROM gv_wallets WHERE LOWER(wallet_address) = LOWER($1)', [
      address,
    ]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Wallet not found' }, 404);
    }

    return c.json(result.rows[0], 200);
  } catch (error) {
    logger.error('Error fetching wallet by address', error as Error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch wallet' }, 500);
  }
});

// // Create wallet
// const createWalletRoute = createRoute({
//   method: 'post',
//   path: '/',
//   tags: ['Wallets'],
//   request: {
//     body: {
//       content: {
//         'application/json': {
//           schema: CreateWalletSchema,
//         },
//       },
//     },
//   },
//   responses: {
//     201: {
//       description: 'Wallet created',
//       content: {
//         'application/json': {
//           schema: WalletSchema,
//         },
//       },
//     },
//     400: {
//       description: 'Bad request',
//       content: {
//         'application/json': {
//           schema: ErrorSchema,
//         },
//       },
//     },
//     500: {
//       description: 'Internal server error',
//       content: {
//         'application/json': {
//           schema: ErrorSchema,
//         },
//       },
//     },
//   },
// });

// wallets.openapi(createWalletRoute, async (c) => {
//   try {
//     const body = c.req.valid('json');
//     const now = currentEpoch();

//     const result = await pool.query(
//       `INSERT INTO gv_wallets (wallet_address, wallet_address_network, username, created_at, updated_at)
//        VALUES ($1, $2, $3, $4, $5)
//        RETURNING *`,
//       [body.wallet_address, body.wallet_address_network, body.username || null, now, now]
//     );

//     return c.json(result.rows[0], 201);
//   } catch (error: any) {
//     console.error('Error creating wallet:', error);
//     if (error.code === '23505') {
//       // Unique violation
//       return c.json(
//         { error: 'Conflict', message: 'Wallet address already exists' },
//         400
//       );
//     }
//     return c.json({ error: 'Internal Server Error', message: 'Failed to create wallet' }, 500);
//   }
// });

// Update wallet
const updateWalletRoute = createRoute({
  method: 'patch',
  path: '/{wallet_id}',
  tags: ['Wallets'],
  summary: 'Update wallet',
  description: 'Update wallet properties including username and picture_url. Users can only update their own wallet. Requires wallet authentication via x-auth headers.',
  request: {
    headers: AuthHeadersSchema,
    params: z.object({
      wallet_id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            username: z.string().max(50).optional(),
            picture_url: z.string().url().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Wallet updated',
      content: {
        'application/json': {
          schema: WalletSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - signature verification failed',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - you can only update your own wallet',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Wallet not found',
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

wallets.openapi(updateWalletRoute, async (c) => {
  try {
    const { wallet_id } = c.req.valid('param');
    const body = c.req.valid('json');
    const now = currentEpoch();

    // Get verified wallet from middleware
    const verifiedWallet = c.get('verifiedWallet');

    // Check that the wallet exists and get its address
    const walletCheck = await pool.query(
      'SELECT wallet_address FROM gv_wallets WHERE id = $1',
      [wallet_id]
    );

    if (walletCheck.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Wallet not found' }, 404);
    }

    const wallet = walletCheck.rows[0];

    // Verify that the authenticated wallet matches the wallet being updated
    if (verifiedWallet.toLowerCase() !== wallet.wallet_address.toLowerCase()) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You can only update your own wallet'
        },
        403
      );
    }

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(body.username);
    }

    if (body.picture_url !== undefined) {
      updates.push(`picture_url = $${paramIndex++}`);
      values.push(body.picture_url);
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(now);

    // Add wallet_id as the last parameter
    values.push(wallet_id);

    const result = await pool.query(
      `UPDATE gv_wallets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return c.json(result.rows[0], 200);
  } catch (error) {
    logger.error('Error updating wallet', error as Error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to update wallet' }, 500);
  }
});

// Get wallet stats by wallet ID
const getWalletStatsRoute = createRoute({
  method: 'get',
  path: '/{wallet_id}/stats',
  tags: ['Wallets'],
  description: 'Retrieve comprehensive statistics for a specific wallet including provider and buyer metrics',
  request: {
    params: z.object({
      wallet_id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Wallet statistics',
      content: {
        'application/json': {
          schema: WalletStatsSchema,
        },
      },
    },
    404: {
      description: 'Wallet stats not found',
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

wallets.openapi(getWalletStatsRoute, async (c) => {
  try {
    const { wallet_id } = c.req.valid('param');
    const result = await pool.query(
      `SELECT
        wallet_id, total_feeds_created, total_entries_published,
        total_revenue_earned::text,
        total_items_sold, unique_buyers_count, total_purchases_made,
        total_amount_spent::text,
        unique_feeds_purchased_from, revenue_rank, purchases_rank,
        last_calculated_at, created_at, updated_at
       FROM gv_wallet_stats
       WHERE wallet_id = $1`,
      [wallet_id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Wallet stats not found' }, 404);
    }

    return c.json(result.rows[0], 200);
  } catch (error: any) {
    logger.error('Failed to fetch wallet stats', error as Error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch wallet stats' }, 500);
  }
});

export default wallets;
