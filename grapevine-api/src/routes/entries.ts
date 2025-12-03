import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { pool, currentEpoch } from '../services/db.js';
import {
  FeedEntrySchema,
  CreateFeedEntrySchema,
  ErrorSchema,
  CursorPaginationQuerySchema,
  CursorPaginatedResponseSchema,
  AuthHeadersSchema,
  CreateAccessLinkSchema,
  AccessLinkResponseSchema,
} from '../schemas.js';
import { requireWalletAuth } from '../middleware/walletAuth.js';
import { uploadToPinata, createPrivateAccessLink } from '../services/pinataV3.js';
import { logger } from '../services/logger.js';
import { uuidv7 } from 'uuidv7';
import { PaymentInstructionsClient, createEntryPaymentInstruction } from '../services/paymentInstructions.js';
import { config } from '../services/config.js';

// Type definition for wallet auth context variables
type WalletAuthEnv = {
  Variables: {
    verifiedWallet: string;
    verifiedAt: number;
  };
};

const entries = new OpenAPIHono<WalletAuthEnv>();

// Apply body size limit only to POST /:feed_id/entries route (entry creation with content up to 10MB base64)
// entries.post('/:feed_id/entries', bodyLimit({
//   maxSize: 15 * 1024 * 1024, // 15MB (handles 10MB base64 + overhead)
//   onError: (c) => {
//     return c.json(
//       {
//         error: 'Payload Too Large',
//         message: 'Request body exceeds the maximum allowed size of 15MB. Content must be under 10MB when base64 encoded.'
//       },
//       413
//     );
//   }
// }));

entries.post('/:feed_id/entries', requireWalletAuth);
entries.delete('/:feed_id/entries/:entry_id', requireWalletAuth);

// Get feed entries (cursor-based pagination)
const getFeedEntriesRoute = createRoute({
  method: 'get',
  path: '/{feed_id}/entries',
  tags: ['Feeds'],
  summary: 'List feed entries',
  description: 'Retrieve a cursor-paginated list of all entries (messages) published to a specific feed, with optional filtering by free/paid status. Only returns active entries (is_active=true). Results are ordered by ID DESC (newest first).',
  request: {
    params: z.object({
      feed_id: z.string().uuid(),
    }),
    query: CursorPaginationQuerySchema.extend({
      is_free: z.enum(['true', 'false']).optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of feed entries with cursor pagination',
      content: {
        'application/json': {
          schema: CursorPaginatedResponseSchema(FeedEntrySchema),
        },
      },
    },
    404: {
      description: 'Feed not found',
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

entries.openapi(getFeedEntriesRoute, async (c) => {
  try {
    const { feed_id } = c.req.valid('param');
    const { page_size, page_token, is_free } = c.req.valid('query');

    // Check if feed exists
    const feedCheck = await pool.query('SELECT id FROM gv_feeds WHERE id = $1', [feed_id]);
    if (feedCheck.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Feed not found' }, 404);
    }

    let whereClause = 'WHERE e.feed_id = $1';
    const params: any[] = [feed_id];
    let paramIndex = 2;

    // Add page_token condition
    if (page_token) {
      whereClause += ` AND e.id < $${paramIndex++}`;
      params.push(page_token);
    }

    if (is_free !== undefined) {
      whereClause += ` AND e.is_free = $${paramIndex++}`;
      params.push(is_free === 'true');
    }

    // Always filter by is_active = true (only show active entries)
    whereClause += ` AND e.is_active = $${paramIndex++}`;
    params.push(true);

    // Fetch one extra to determine if there are more results
    params.push(page_size + 1);
    const result = await pool.query(
      `SELECT
        e.id, e.feed_id, e.cid, e.mime_type, e.pinata_upload_id,
        e.title, e.description, e.metadata, e.tags,
        e.price, e.asset, e.is_free, e.expires_at, e.piid,
        e.is_active,
        e.total_purchases, e.total_revenue::text,
        e.created_at, e.updated_at
       FROM gv_feed_entries e
       ${whereClause}
       ORDER BY e.id DESC
       LIMIT $${paramIndex}`,
      params
    );

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
    logger.error('Failed to fetch feed entries', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch feed entries' }, 500);
  }
});

// Create entry in feed
const createFeedEntryRoute = createRoute({
  method: 'post',
  path: '/{feed_id}/entries',
  tags: ['Feeds'],
  summary: 'Create feed entry',
  description: 'Publish a new entry (message) to a specific feed. Content is provided as base64 and uploaded to IPFS via Pinata. Automatically creates payment instructions (paid or free) and enforces maximum entry limit per feed. Requires wallet authentication and feed ownership verification.',
  request: {
    headers: AuthHeadersSchema,
    params: z.object({
      feed_id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateFeedEntrySchema.omit({ feed_id: true }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Entry created',
      content: {
        'application/json': {
          schema: FeedEntrySchema,
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
    401: {
      description: 'Unauthorized - signature verification failed',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - wallet does not own this feed or maximum entry limit reached',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Feed not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    409: {
      description: 'Conflict - entry with this CID already exists',
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

entries.openapi(createFeedEntryRoute, async (c) => {
  const startTime = performance.now();

  try {
    const { feed_id } = c.req.valid('param');
    logger.info('Entry creation: params validated', { feed_id, elapsed: performance.now() - startTime });

    // Manually parse body to handle large payloads without hanging
    let body: any;
    try {
      const rawBody = await c.req.text();
      logger.info('Entry creation: body read complete', { feed_id, bodyLength: rawBody.length, elapsed: performance.now() - startTime });

      body = JSON.parse(rawBody);

      // Validate against schema
      const validationResult = CreateFeedEntrySchema.omit({ feed_id: true }).safeParse(body);
      if (!validationResult.success) {
        logger.warn('Entry creation: schema validation failed', { feed_id, errors: validationResult.error.issues, elapsed: performance.now() - startTime });
        return c.json({
          error: 'Bad Request',
          message: 'Invalid request body',
          details: validationResult.error.issues
        }, 400);
      }
      body = validationResult.data;
    } catch (parseError: any) {
      logger.error('Entry creation: body parsing failed', parseError, {
        feed_id: c.req.param('feed_id'),
        elapsed: Date.now() - startTime
      });
      return c.json({
        error: 'Bad Request',
        message: 'Invalid JSON in request body'
      }, 400);
    }

    const now = currentEpoch();

    // Get verified wallet from middleware
    const verifiedWallet = c.get('verifiedWallet');

    // Check if feed exists and get owner wallet
    const feedCheck = await pool.query(
      `SELECT f.id, f.name, w.wallet_address
       FROM gv_feeds f
       JOIN gv_wallets w ON f.owner_id = w.id
       WHERE f.id = $1`,
      [feed_id]
    );

    if (feedCheck.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Feed not found' }, 404);
    }

    const feed = feedCheck.rows[0];

    // Verify that the authenticated wallet matches the feed owner's wallet
    if (verifiedWallet.toLowerCase() !== feed.wallet_address.toLowerCase()) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You can only create entries in feeds owned by your wallet'
        },
        403
      );
    }

    // Check if feed has reached the maximum number of entries
    const entryCountResult = await pool.query(
      `SELECT COUNT(*) as entry_count FROM gv_feed_entries WHERE feed_id = $1`,
      [feed_id]
    );
    const entryCount = parseInt(entryCountResult.rows[0].entry_count);

    if (entryCount >= config.limits.maxEntriesPerFeed) {
      return c.json(
        {
          error: 'Forbidden',
          message: `Maximum entry limit reached. This feed cannot have more than ${config.limits.maxEntriesPerFeed} entries.`
        },
        403
      );
    }

    // Upload content to Pinata V3 and get CID
    let uploadResult;
    try {
      uploadResult = await uploadToPinata(body.content_base64, body.mime_type, {
        name: body.title || `grapevine-entry-${feed_id}`,
        acceptDuplicates: false,
        keyvalues: {
          feed_id,
        },
      });
    } catch (uploadError: any) {
      logger.error('Pinata upload failed', uploadError, {
        feed_id,
        mime_type: body.mime_type,
      });
      return c.json(
        {
          error: 'Upload Failed',
          message: `Failed to upload content to IPFS: ${uploadError.message}`
        },
        500
      );
    }

    const cidCheck = await pool.query(
      'SELECT id, feed_id FROM gv_feed_entries WHERE cid = $1',
      [uploadResult.data.cid]
    );

    if (cidCheck.rows.length > 0) {
      const existingEntry = cidCheck.rows[0];
      return c.json(
        {
          error: 'Conflict',
          message: `An entry with this content (CID: ${uploadResult.data.cid}) already exists`,
          existing_entry_id: existingEntry.id,
          existing_feed_id: existingEntry.feed_id,
        },
        409
      );
    }

    // Generate UUIDv7 (time-ordered) for the entry
    const entry_id = uuidv7();

    // Handle payment instruction creation (server-side only, never accept from client)
    let piid: string | null = null;
    let price: string | null = null;

    try {
      const paymentClient = new PaymentInstructionsClient();

      if (!body.is_free && body.price) {
        // Create paid payment instruction with price requirements
        const { piid: createdPiid, price: createdPrice } = await createEntryPaymentInstruction(
          paymentClient,
          body.title || `Entry in ${feed.name}`,
          feed.wallet_address,
          uploadResult.data.cid,
          body.price
        );
        piid = createdPiid;
        price = createdPrice;

        logger.info('Created paid payment instruction for entry', {
          entry_id,
          piid,
          amount: body.price.amount,
          currency: body.price.currency,
          network: body.price.network,
        });
      } else {
        // Use existing free payment instruction from environment and map the CID
        if (!config.payment.freePaymentInstructionId) {
          return c.json({ error: 'Internal Server Error', message: 'Free payment instruction not configured' }, 500);
        }
        piid = config.payment.freePaymentInstructionId;
        price = '0'; // Set price to 0 for free entries

        // Map the CID to the free payment instruction
        await paymentClient.mapCid(piid, uploadResult.data.cid);

        logger.info('Mapped CID to free payment instruction for entry', {
          entry_id,
          piid,
          cid: uploadResult.data.cid,
        });
      }
    } catch (paymentError: any) {
      logger.error('Failed to create payment instruction', paymentError, {
        entry_id,
        feed_id,
        is_free: body.is_free,
        price: body.price,
      });

      // For paid entries, fail the request if payment instruction creation fails
      // For free entries, we can continue since the free PIID mapping failed
      if (!body.is_free && body.price) {
        return c.json(
          {
            error: 'Payment Instruction Failed',
            message: `Failed to create payment instruction: ${paymentError.message}`
          },
          500
        );
      }

      // For free entries, log and continue without payment instruction
      logger.warn('Continuing free entry creation without payment instruction due to error');
      price = '0'; // Ensure price is set to 0 for free entries even if mapping failed
    }

    // Insert entry into database with the CID and upload ID from Pinata
    const result = await pool.query(
      `INSERT INTO gv_feed_entries
       (id, feed_id, cid, mime_type, pinata_upload_id, title, description, metadata, tags, is_free, expires_at, piid, price, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        entry_id,
        feed_id,
        uploadResult.data.cid,
        body.mime_type,
        uploadResult.data.id,
        body.title || null,
        body.description || null,
        body.metadata || null,
        body.tags || null,
        body.is_free,
        body.expires_at || null,
        piid,
        body.is_free ? 0 : price || null,
        now,
        now,
      ]
    );

    return c.json(result.rows[0], 201);
  } catch (error: any) {
    logger.error('Failed to create entry', error);
    if (error.code === '23503') {
      // Foreign key constraint violation
      return c.json({ error: 'Bad Request', message: 'Invalid reference to feed or payment instruction' }, 400);
    }
    return c.json({ error: 'Internal Server Error', message: 'Failed to create entry' }, 500);
  }
});

// Get single entry from feed
const getFeedEntryRoute = createRoute({
  method: 'get',
  path: '/{feed_id}/entries/{entry_id}',
  tags: ['Feeds'],
  summary: 'Get feed entry by ID',
  description: 'Retrieve detailed information about a specific entry within a feed, including its IPFS CID, metadata, pricing, and statistics',
  request: {
    params: z.object({
      feed_id: z.string().uuid(),
      entry_id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Feed entry details',
      content: {
        'application/json': {
          schema: FeedEntrySchema,
        },
      },
    },
    404: {
      description: 'Feed or entry not found',
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

entries.openapi(getFeedEntryRoute, async (c) => {
  try {
    const { feed_id, entry_id } = c.req.valid('param');

    const result = await pool.query(
      `SELECT
        id, feed_id, cid, mime_type, pinata_upload_id,
        title, description, metadata, tags,
        price, asset, is_free, expires_at, piid,
        is_active,
        total_purchases, total_revenue::text,
        created_at, updated_at
       FROM gv_feed_entries
       WHERE id = $1 AND feed_id = $2`,
      [entry_id, feed_id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Entry not found' }, 404);
    }

    return c.json(result.rows[0], 200);
  } catch (error: any) {
    logger.error('Failed to fetch entry', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch entry' }, 500);
  }
});

// Delete entry from feed
const deleteFeedEntryRoute = createRoute({
  method: 'delete',
  path: '/{feed_id}/entries/{entry_id}',
  tags: ['Feeds'],
  summary: 'Delete feed entry',
  description: 'Soft delete an entry from a feed by setting is_active to false. The entry record and IPFS content remain in the system but the entry will no longer appear in feed listings. Requires wallet authentication and feed ownership verification.',
  request: {
    headers: AuthHeadersSchema,
    params: z.object({
      feed_id: z.string().uuid(),
      entry_id: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: 'Entry deleted',
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
      description: 'Forbidden - wallet does not own this feed',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Feed or entry not found',
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

entries.openapi(deleteFeedEntryRoute, async (c) => {
  try {
    const { feed_id, entry_id } = c.req.valid('param');

    // Get verified wallet from middleware
    const verifiedWallet = c.get('verifiedWallet');

    // Check that the entry exists and get the feed owner
    const entryCheck = await pool.query(
      `SELECT e.id, w.wallet_address
       FROM gv_feed_entries e
       JOIN gv_feeds f ON e.feed_id = f.id
       JOIN gv_wallets w ON f.owner_id = w.id
       WHERE e.id = $1 AND e.feed_id = $2`,
      [entry_id, feed_id]
    );

    if (entryCheck.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Entry not found' }, 404);
    }

    const entry = entryCheck.rows[0];

    // Verify that the authenticated wallet matches the feed owner's wallet
    if (verifiedWallet.toLowerCase() !== entry.wallet_address.toLowerCase()) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'You can only delete entries from feeds owned by your wallet'
        },
        403
      );
    }

    // Soft delete: set is_active to false instead of deleting the record
    const result = await pool.query(
      'UPDATE gv_feed_entries SET is_active = false, updated_at = $1 WHERE id = $2 AND feed_id = $3 RETURNING id',
      [currentEpoch(), entry_id, feed_id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Entry not found' }, 404);
    }

    return c.body(null, 204);
  } catch (error: any) {
    logger.error('Failed to delete entry', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to delete entry' }, 500);
  }
});

// =============================================================================
// POST /feeds/{feed_id}/entries/{entry_id}/access-link - Create access link for private entry
// =============================================================================
const createEntryAccessLinkRoute = createRoute({
  method: 'post',
  path: '/{feed_id}/entries/{entry_id}/access-link',
  tags: ['Feeds'],
  summary: 'Create private access link for entry',
  description: 'Creates a time-limited presigned URL for accessing a private feed entry. Requires wallet signature authentication. Access is granted if the user is the feed owner, if the entry is free, or if the user has purchased the entry.',
  request: {
    headers: AuthHeadersSchema,
    params: z.object({
      feed_id: z.string().uuid().openapi({
        description: 'Feed UUID',
      }),
      entry_id: z.string().uuid().openapi({
        description: 'Entry UUID',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateAccessLinkSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Access link created successfully',
      content: {
        'application/json': {
          schema: AccessLinkResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - wallet signature verification failed',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - user must have purchased the entry',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Entry not found',
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

// Apply wallet authentication middleware
entries.post('/:feed_id/entries/:entry_id/access-link', requireWalletAuth);

entries.openapi(createEntryAccessLinkRoute, async (c) => {
  try {
    const verifiedWallet = c.get('verifiedWallet');
    const { feed_id, entry_id } = c.req.valid('param');

    // Get entry CID, is_free status, and verify feed ownership
    const entryResult = await pool.query(
      `SELECT e.cid, e.is_free, w.wallet_address
       FROM gv_feed_entries e
       JOIN gv_feeds f ON e.feed_id = f.id
       JOIN gv_wallets w ON f.owner_id = w.id
       WHERE e.id = $1 AND e.feed_id = $2 AND e.is_active = true`,
      [entry_id, feed_id]
    );

    if (entryResult.rows.length === 0) {
      return c.json(
        {
          error: 'Not Found',
          message: 'Entry not found',
        },
        404
      );
    }

    const entry = entryResult.rows[0];
    const isOwner = verifiedWallet.toLowerCase() === entry.wallet_address.toLowerCase();

    if (!isOwner) {
      if (!entry.is_free) {
        // Check if user has purchased this entry
        const purchaseCheck = await pool.query(
          `SELECT id FROM gv_transactions
           WHERE entry_id = $1 AND payer = $2`,
          [entry_id, verifiedWallet]
        );

        if (purchaseCheck.rows.length === 0) {
          return c.json(
            {
              error: 'Forbidden',
              message: 'You must purchase this entry to access it',
            },
            403
          );
        }
      }
    }

    const cid = entry.cid;
    const expires = 30; // Always 30 seconds
    const expiresAt = Math.floor(Date.now() / 1000) + expires;

    logger.info('Creating private access link', {
      wallet: verifiedWallet,
      feed_id,
      entry_id,
      cid,
      expires,
    });

    // Create presigned access link
    const accessUrl = await createPrivateAccessLink({
      cid,
      expires,
    });

    return c.json(
      {
        url: accessUrl,
        expires_at: expiresAt,
      },
      200
    );
  } catch (error: any) {
    logger.error('Error creating access link', error as Error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: error?.message || 'Failed to create access link',
      },
      500
    );
  }
});

export default entries;
