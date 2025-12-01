import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { pool, currentEpoch } from '../services/db.js';
import {
  TransactionSchema,
  CreateTransactionSchema,
  ErrorSchema,
  CursorPaginationQuerySchema,
  CursorPaginatedResponseSchema,
  AdminAuthHeadersSchema,
  WalletAddress,
} from '../schemas.js';
import { uuidv7 } from 'uuidv7';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { logger } from '../services/logger.js';

// Create transactions router
const transactions = new OpenAPIHono();

// Apply admin authentication middleware to POST route
transactions.post('/', requireAdminAuth);


// =============================================================================
// GET /transactions - Get all transactions (cursor-based pagination)
// =============================================================================
const getTransactionsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Transactions'],
  summary: 'List transactions',
  description: 'Retrieve a cursor-paginated list of transactions with optional filtering by payer, pay_to, or entry_id. Results are ordered by ID DESC (newest first). Public endpoint - no authentication required.',
  request: {
    query: CursorPaginationQuerySchema.extend({
      payer: WalletAddress.optional().openapi({
        description: 'Filter by payer wallet address',
        example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      }),
      pay_to: WalletAddress.optional().openapi({
        description: 'Filter by pay_to wallet address',
        example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      }),
      entry_id: z.string().uuid().optional().openapi({
        description: 'Filter by feed entry ID',
      }),
    }),
  },
  responses: {
    200: {
      description: 'List of transactions with cursor pagination',
      content: {
        'application/json': {
          schema: CursorPaginatedResponseSchema(TransactionSchema),
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

transactions.openapi(getTransactionsRoute, async (c) => {
  try {
    const { page_size, page_token, payer, pay_to, entry_id } = c.req.valid('query');

    // Build WHERE clause with optional filters
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Add page_token condition
    if (page_token) {
      whereClauses.push(`id < $${paramIndex++}`);
      params.push(page_token);
    }

    // Apply optional filters
    if (payer) {
      whereClauses.push(`payer = $${paramIndex++}`);
      params.push(payer);
    }
    if (pay_to) {
      whereClauses.push(`pay_to = $${paramIndex++}`);
      params.push(pay_to);
    }
    if (entry_id) {
      whereClauses.push(`entry_id = $${paramIndex++}`);
      params.push(entry_id);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Fetch one extra to determine if there are more results
    params.push(page_size + 1);
    const result = await pool.query(
      `SELECT
        id, piid, payer, pay_to,
        amount::text,
        asset, entry_id, transaction_hash, created_at
       FROM gv_transactions
       ${whereClause}
       ORDER BY id DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = result.rows.length > page_size;
    const data = hasMore ? result.rows.slice(0, page_size) : result.rows;
    const nextPageToken = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return c.json(
      {
        data,
        pagination: {
          page_size,
          next_page_token: nextPageToken,
          has_more: hasMore,
        },
      },
      200
    );
  } catch (error) {
    logger.error('Error fetching transactions', error as Error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch transactions',
      },
      500
    );
  }
});

// =============================================================================
// GET /transactions/{id} - Get transaction by ID
// =============================================================================
const getTransactionRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Transactions'],
  summary: 'Get transaction by ID',
  description: 'Retrieve a specific transaction by its UUID. Public endpoint - no authentication required.',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        description: 'Transaction UUID',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Transaction details',
      content: {
        'application/json': {
          schema: TransactionSchema,
        },
      },
    },
    404: {
      description: 'Transaction not found',
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

transactions.openapi(getTransactionRoute, async (c) => {
  try {
    const { id } = c.req.valid('param');

    const result = await pool.query(
      `SELECT
        id, piid, payer, pay_to,
        amount::text,
        asset, entry_id, transaction_hash, created_at
       FROM gv_transactions
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return c.json(
        { error: 'Not Found', message: 'Transaction not found' },
        404
      );
    }

    return c.json(result.rows[0], 200);
  } catch (error) {
    logger.error('Error fetching transaction', error as Error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch transaction',
      },
      500
    );
  }
});

// =============================================================================
// GET /transactions/hash/{hash} - Get transaction by hash
// =============================================================================
const getTransactionByHashRoute = createRoute({
  method: 'get',
  path: '/hash/{hash}',
  tags: ['Transactions'],
  summary: 'Get transaction by hash',
  description: 'Retrieve a transaction by its blockchain transaction hash (0x-prefixed, 66 characters). Public endpoint - no authentication required.',
  request: {
    params: z.object({
      hash: z.string().length(66).openapi({
        description: 'Blockchain transaction hash (66 characters with 0x prefix)',
        example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Transaction details',
      content: {
        'application/json': {
          schema: TransactionSchema,
        },
      },
    },
    404: {
      description: 'Transaction not found',
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

transactions.openapi(getTransactionByHashRoute, async (c) => {
  try {
    const { hash } = c.req.valid('param');

    const result = await pool.query(
      `SELECT
        id, piid, payer, pay_to,
        amount::text,
        asset, entry_id, transaction_hash, created_at
       FROM gv_transactions
       WHERE transaction_hash = $1`,
      [hash]
    );

    if (result.rows.length === 0) {
      return c.json(
        { error: 'Not Found', message: 'Transaction not found' },
        404
      );
    }

    return c.json(result.rows[0], 200);
  } catch (error) {
    logger.error('Error fetching transaction by hash', error as Error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch transaction',
      },
      500
    );
  }
});

// =============================================================================
// POST /transactions - Create transaction
// =============================================================================
const createTransactionRoute = createRoute({
  method: 'post',
  middleware: requireAdminAuth,
  path: '/',
  tags: ['Transactions'],
  summary: 'Create transactions (bulk insert)',
  description: 'Creates x402 transaction records in bulk. Accepts array of transaction log data from x402 payment events. Automatically resolves entry_id from CID, validates all fields, and filters to only settled transactions. Requires admin authentication via admin-api-key header.',
  request: {
    headers: AdminAuthHeadersSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateTransactionSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Transactions created',
      content: {
        'application/json': {
          schema: z.object({
            created: z.number().int(),
            transactions: z.array(TransactionSchema),
          }),
        },
      },
    },
    204: {
      description: 'No Content - no x402_data present or no valid settled transactions to create',
    },
    400: {
      description: 'Bad request - validation error',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - admin API key verification failed',
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

transactions.openapi(createTransactionRoute, async (c) => {
  try {
    const bodies = c.req.valid('json');
    const now = currentEpoch();

    // Support both old (camelCase) and new (snake_case) field names for backward compatibility
    const validBodies = bodies.filter((body: any) => body.x402_data);

    if (validBodies.length === 0) {
      return new Response(null, { status: 204 });
    }

    const errors: string[] = [];
    const validTransactions: any[] = [];

    for (let i = 0; i < validBodies.length; i++) {
      const body = validBodies[i];
      // Support both snake_case (new) and camelCase (old) for backward compatibility
      const x402_data = body.x402_data;
      const root_cid = body.root_cid;

      if (!x402_data || !x402_data.settled) continue;

      const payer = x402_data.payer;
      const payTo = x402_data.pay_to; // Support both formats
      const amount = x402_data.amount;
      const asset = x402_data.asset;
      const transaction_hash = x402_data.transaction;
      const piid = x402_data.payment_instruction_id || null; // Support both formats

      if (!payer || !amount || !asset || !transaction_hash || !payTo || !piid) {
        errors.push(`Transaction ${i}: Missing required fields (payer, amount, asset, transaction, pay_to, or piid)`);
        continue;
      }

      if (!/^0x[0-9a-fA-F]{40}$/.test(payer)) {
        errors.push(`Transaction ${i}: Invalid payer wallet address format`);
        continue;
      }

      if (payTo && !/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
        errors.push(`Transaction ${i}: Invalid pay_to wallet address format`);
        continue;
      }

      if (!/^0x[0-9a-fA-F]{64}$/.test(transaction_hash)) {
        errors.push(`Transaction ${i}: Invalid transaction hash format`);
        continue;
      }

      // Validate amount - handle both number (new format) and string (old format)
      // Maximum value: 1 million ETH (reasonable upper bound to prevent overflow)
      const MAX_WEI = BigInt('1000000000000000000000000'); // 1,000,000 ETH in wei
      let amountBigInt: bigint;
      try {
        amountBigInt = BigInt(amount);
        if (amountBigInt < 0n) {
          errors.push(`Transaction ${i}: Invalid amount - must be a non-negative integer (wei)`);
          continue;
        }
        if (amountBigInt > MAX_WEI) {
          errors.push(`Transaction ${i}: Invalid amount - exceeds maximum allowed value (1,000,000 ETH)`);
          continue;
        }
      } catch (error) {
        errors.push(`Transaction ${i}: Invalid amount format - must be a valid integer`);
        continue;
      }

      validTransactions.push({
        id: uuidv7(),
        piid,
        payer,
        pay_to: payTo,
        amount: amountBigInt.toString(), // Convert to string for PostgreSQL BIGINT
        asset,
        root_cid,
        transaction_hash,
        created_at: now,
      });
    }

    // If there are validation errors for any transactions, log them
    if (errors.length > 0) {
      logger.warn(`Validation errors creating ${validTransactions.length} transactions:`, errors);
    }

    // If no valid settled transactions to create, return no content
    if (validTransactions.length === 0) {
      return new Response(null, { status: 204 });
    }

    // Build the bulk insert query with CTE to resolve CIDs to entry IDs
    // This avoids N individual queries for each CID lookup
    const values: any[] = [];
    const valueRows: string[] = [];
    let paramIndex = 1;

    for (const txn of validTransactions) {
      valueRows.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
      );
      values.push(
        txn.id,
        txn.piid,
        txn.payer,
        txn.pay_to,
        txn.amount,
        txn.asset,
        txn.root_cid,
        txn.transaction_hash,
        txn.created_at
      );
      paramIndex += 9;
    }

    // Use a CTE to join with gv_feed_entries and resolve entry_id from root_cid
    const bulkInsertQuery = `
      WITH txn_data AS (
        SELECT * FROM (VALUES ${valueRows.join(', ')})
        AS t(id, piid, payer, pay_to, amount, asset, root_cid, transaction_hash, created_at)
      )
      INSERT INTO gv_transactions
        (id, piid, payer, pay_to, amount, asset, entry_id, transaction_hash, created_at)
      SELECT
        td.id::uuid,
        td.piid::uuid,
        td.payer,
        td.pay_to,
        td.amount::bigint,
        td.asset,
        fe.id AS entry_id,
        td.transaction_hash,
        td.created_at::bigint
      FROM txn_data td
      LEFT JOIN gv_feed_entries fe ON fe.cid = td.root_cid
      RETURNING *
    `;

    const result = await pool.query(bulkInsertQuery, values);

    return c.json(
      {
        created: result.rows.length,
        transactions: result.rows,
      },
      201
    );
  } catch (error: any) {
    logger.error('Error creating bulk transactions', error as Error);

    // Handle specific database errors
    if (error.code === '23503') {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Invalid piid - referenced payment instruction does not exist',
        },
        400
      );
    }
    if (error.code === '23505') {
      return c.json(
        {
          error: 'Conflict',
          message: 'One or more transaction hashes already exist',
        },
        409
      );
    }

    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to create transactions',
      },
      500
    );
  }
});

export default transactions;