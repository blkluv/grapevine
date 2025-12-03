import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import { pool, currentEpoch } from '../services/db.js';
import {
  FeedSchema,
  CreateFeedSchema,
  UpdateFeedSchema,
  ErrorSchema,
  CursorPaginationQuerySchema,
  CursorPaginatedResponseSchema,
  AuthHeadersSchema,
} from '../schemas.js';
import { requireWalletAuth } from '../middleware/walletAuth.js';
import { createGroup, getPinataV3Config, extractCIDFromURL, isValidCID, isBase64, uploadToPinata, fetchAndUploadImage } from '../services/pinataV3.js';
import { logger } from '../services/logger.js';
import { config } from '../services/config.js';
import { uuidv7 } from 'uuidv7';

// Type definition for wallet auth context variables
type WalletAuthEnv = {
  Variables: {
    verifiedWallet: string;
    verifiedNetwork: string;
    verifiedAt: number;
  };
};

const feeds = new OpenAPIHono<WalletAuthEnv>();

feeds.post('/', requireWalletAuth);
feeds.patch('/:feed_id', requireWalletAuth);
feeds.delete('/:feed_id', requireWalletAuth);

// Get all feeds (cursor-based pagination)
const getFeedsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Feeds'],
  summary: 'List feeds',
  description: 'Retrieve a cursor-paginated list of data feeds with optional filtering by owner, category, tags, entry count, age, and active status. Defaults to showing only active feeds. Results are ordered by created_at DESC (newest first).',
  request: {
    query: CursorPaginationQuerySchema.extend({
      owner_id: z.string().uuid().optional(),
      category: z.string().uuid().optional(),
      tags: z.string().optional(), // Comma-separated list
      min_entries: z.string().regex(/^\d+$/).default('1').optional().transform(val => val ? parseInt(val) : 1),
      min_age: z.string().regex(/^\d+$/).optional().transform(val => val ? parseInt(val) : undefined), // Epoch timestamp
      max_age: z.string().regex(/^\d+$/).optional().transform(val => val ? parseInt(val) : undefined), // Epoch timestamp
      is_active: z.enum(['true', 'false']).optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of feeds with cursor pagination',
      content: {
        'application/json': {
          schema: CursorPaginatedResponseSchema(FeedSchema),
        },
      },
    },
    400: {
      description: 'Bad request - invalid query parameters',
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

feeds.openapi(getFeedsRoute, async (c) => {
  try {
    const { page_size, page_token, owner_id, category, tags, min_entries, min_age, max_age, is_active } = c.req.valid('query');

    let whereClause = 'WHERE 1=1';
    let paramIndex = 1;

    // Default to filtering active feeds only
    const activeFilter = is_active !== undefined ? is_active === 'true' : true;
    const params: any[] = [];

    // Add page_token condition (feeds with created_at older than page_token feed)
    if (page_token) {
      whereClause += ` AND f.id < $${paramIndex++}`;
      params.push(page_token);
    }

    if (owner_id) {
      whereClause += ` AND f.owner_id = $${paramIndex++}`;
      params.push(owner_id);
    }
    if (category) {
      whereClause += ` AND f.category_id = $${paramIndex++}`;
      params.push(category);
    }
    if (tags) {
      // Support comma-separated tags - match any tag in the list
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

      // Validate tag list constraints (max 20 tags, each max 50 chars)
      if (tagList.length > 20) {
        return c.json(
          { error: 'Bad Request', message: 'Maximum 20 tags allowed in filter' },
          400
        );
      }

      const invalidTag = tagList.find(tag => tag.length > 50);
      if (invalidTag) {
        return c.json(
          { error: 'Bad Request', message: `Tag exceeds maximum length of 50 characters: "${invalidTag.substring(0, 50)}..."` },
          400
        );
      }

      if (tagList.length > 0) {
        whereClause += ` AND f.tags && $${paramIndex++}::text[]`;
        params.push(tagList);
      }
    }
    if (min_age !== undefined) {
      // Feed created_at must be <= min_age (older than min_age)
      whereClause += ` AND f.created_at <= $${paramIndex++}`;
      params.push(min_age);
    }
    if (max_age !== undefined) {
      // Feed created_at must be >= max_age (newer than max_age)
      whereClause += ` AND f.created_at >= $${paramIndex++}`;
      params.push(max_age);
    }
    if (min_entries !== undefined) {
      whereClause += ` AND f.total_entries >= $${paramIndex++}`;
      params.push(min_entries);
    }

    // Always filter by is_active (defaults to true)
    whereClause += ` AND f.is_active = $${paramIndex++}`;
    params.push(activeFilter);

    // Build query with optional entry count filter, always join with wallets for owner_wallet_address
    let fromClause = `FROM gv_feeds f
      INNER JOIN gv_wallets w ON f.owner_id = w.id`;
    let havingClause = '';

    // For the main query, select feed columns, wallet address, and stats from columns
    const selectClause = `SELECT
      f.id, f.owner_id, f.category_id, f.name, f.description, f.image_cid,
      f.is_active, f.total_entries, f.total_purchases, f.total_revenue::text,
      f.tags, f.created_at, f.updated_at,
      w.wallet_address as owner_wallet_address`;

    // Fetch one extra to determine if there are more results
    params.push(page_size + 1);
    const dataQuery = `${selectClause} ${fromClause} ${whereClause}${havingClause} ORDER BY f.created_at DESC LIMIT $${paramIndex}`;

    const result = await pool.query(dataQuery, params);

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
    logger.error('Failed to fetch feeds', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch feeds' }, 500);
  }
});

// Get feed by ID
const getFeedRoute = createRoute({
  method: 'get',
  path: '/{feed_id}',
  tags: ['Feeds'],
  summary: 'Get feed by ID',
  description: 'Retrieve detailed information about a specific data feed by its unique identifier, including statistics, owner wallet address, and metadata',
  request: {
    params: z.object({
      feed_id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Feed details',
      content: {
        'application/json': {
          schema: FeedSchema,
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

feeds.openapi(getFeedRoute, async (c) => {
  try {
    const { feed_id } = c.req.valid('param');
    const result = await pool.query(
      `SELECT
        f.id, f.owner_id, f.category_id, f.name, f.description, f.image_cid,
        f.is_active, f.total_entries, f.total_purchases, f.total_revenue::text,
        f.tags, f.created_at, f.updated_at,
        w.wallet_address as owner_wallet_address
       FROM gv_feeds f
       INNER JOIN gv_wallets w ON f.owner_id = w.id
       WHERE f.id = $1`,
      [feed_id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Feed not found' }, 404);
    }

    return c.json(result.rows[0], 200);
  } catch (error: any) {
    logger.error('Failed to fetch feed', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch feed' }, 500);
  }
});

// Apply 10MB body limit only to POST / route for base64 image uploads
// feeds.post('/', bodyLimit({
//   maxSize: 10 * 1024 * 1024, // 10MB for base64 images
//   onError: (c) => {
//     return c.json(
//       {
//         error: 'Payload Too Large',
//         message: 'Request body exceeds the maximum allowed size of 10MB. Images must be under 10MB when base64 encoded.'
//       },
//       413
//     );
//   }
// }));

// Create feed
const createFeedRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Feeds'],
  summary: 'Create feed',
  description: 'Create a new data feed with specified category, name, description, tags, and optional image. Creates a Pinata storage group using the group ID as the feed ID. The authenticated wallet becomes the feed owner and is automatically created on Base network if it does not exist. Existing wallets must be on Base chain. Enforces maximum feed limit per wallet. Requires wallet authentication via x-auth headers.',
  request: {
    headers: AuthHeadersSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateFeedSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Feed created with database-generated UUID',
      content: {
        'application/json': {
          schema: FeedSchema,
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
      description: 'Forbidden - maximum feed limit reached or invalid wallet network',
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
    503: {
      description: 'Service unavailable - failed to create storage group',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

feeds.openapi(createFeedRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const now = currentEpoch();

    logger.info('Feed creation request received', {
      feed_name: body.name,
      has_image: !!body.image_url,
      category_id: body.category_id,
      headers: {
        'x-payment': c.req.header('x-payment') ? 'present' : 'missing',
        'content-type': c.req.header('content-type'),
      },
    });

    // Get verified wallet from middleware (required by requireWalletAuth)
    const verifiedWallet = c.get('verifiedWallet');
    const verifiedNetwork = c.get('verifiedNetwork') || 'base'; // Get detected network from middleware

    logger.info('Verified wallet from middleware', {
      verifiedWallet,
      verifiedNetwork,
      contextKeys: Object.keys(c.var),
    });

    if (!verifiedWallet) {
      logger.error('No verified wallet in context - payment middleware may have failed');
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Wallet verification failed. Please ensure payment is authorized.'
        },
        401
      );
    }

    // Look up the wallet ID from the verified wallet address
    logger.info('Looking up wallet in database', { verifiedWallet });

    let walletCheck = await pool.query(
      `SELECT id, wallet_address, wallet_address_network
       FROM gv_wallets
       WHERE LOWER(wallet_address) = LOWER($1)`,
      [verifiedWallet]
    );

    logger.info('Wallet lookup result', {
      found: walletCheck.rows.length > 0,
      wallet: walletCheck.rows[0] || null,
    });

    let wallet;

    // If wallet doesn't exist, create it automatically with the detected network
    if (walletCheck.rows.length === 0) {
      logger.info('Auto-creating wallet for feed creation', {
        wallet_address: verifiedWallet,
        network: verifiedNetwork,
      });

      // Generate UUIDv7 (time-ordered) for the wallet
      const walletId = uuidv7();

      const createWalletResult = await pool.query(
        `INSERT INTO gv_wallets (id, wallet_address, wallet_address_network, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [walletId, verifiedWallet, verifiedNetwork, now, now]
      );

      wallet = createWalletResult.rows[0];
    } else {
      wallet = walletCheck.rows[0];

      // Validate that existing wallet is on Base chain
      if (wallet.wallet_address_network.toLowerCase() !== 'base' && wallet.wallet_address_network.toLowerCase() !== 'base-sepolia') {
        return c.json(
          {
            error: 'Bad Request',
            message: `Invalid wallet network: expected 'base' or 'base-sepolia', got '${wallet.wallet_address_network}'. Only Base chain wallets can create feeds.`
          },
          400
        );
      }
    }

    // Use the authenticated wallet's ID as the owner_id
    const ownerId = wallet.id;

    // Check if wallet has reached the maximum number of feeds
    const feedCountResult = await pool.query(
      `SELECT COUNT(*) as feed_count FROM gv_feeds WHERE owner_id = $1`,
      [ownerId]
    );
    const feedCount = parseInt(feedCountResult.rows[0].feed_count);

    if (feedCount >= config.limits.maxFeedsPerWallet) {
      return c.json(
        {
          error: 'Forbidden',
          message: `Maximum feed limit reached. You cannot create more than ${config.limits.maxFeedsPerWallet} feeds per wallet.`
        },
        403
      );
    }

    // Validate category_id if provided
    if (body.category_id) {
      const categoryCheck = await pool.query(
        'SELECT id FROM gv_categories WHERE id = $1 AND is_active = true',
        [body.category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return c.json(
          {
            error: 'Bad Request',
            message: 'Invalid category_id. Category does not exist or is not active.'
          },
          400
        );
      }
    }

    // Create Pinata group first and use its ID as the feed ID
    logger.info('Creating Pinata group for feed', { feed_name: body.name });

    let feed_id: string;
    try {
      const config = getPinataV3Config();
      // Create a group using the feed name as the group name
      feed_id = await createGroup(config, body.name);
      logger.pinataOperation('group_created', {
        group_id: feed_id,
        feed_name: body.name,
      });
      logger.info('Pinata group created successfully', { feed_id });
    } catch (groupError: any) {
      logger.error('Failed to create Pinata group', groupError, {
        feed_name: body.name,
        error_message: groupError.message,
        error_stack: groupError.stack,
      });
      return c.json(
        {
          error: 'Service Unavailable',
          message: 'Failed to create storage group for feed. Please try again.'
        },
        503
      );
    }

    // Process image_url to get CID
    let image_cid: string | null = null;
    if (body.image_url) {
      logger.info('Processing image for feed', {
        image_length: body.image_url.length,
        is_base64: body.image_url.startsWith('data:') || body.image_url.length > 1000,
      });

      const imageInput = body.image_url.trim();

      // Hardcoded group pfp in dev -> we need to use an env variable when migrating to prod
      const FEED_PFP_GROUP_ID = config.pinata.uploadsGroupId;

      if (!FEED_PFP_GROUP_ID) {
        return c.json(
          {
            error: 'Service Unavailable',
            message: 'No group ID registered.'
          },
          503
        );
      }

      // Case 1: Check if it's already a valid CID
      if (isValidCID(imageInput)) {
        image_cid = imageInput;
        logger.info('Using provided CID directly', { cid: image_cid });
      }
      // Case 2: Check if it's an IPFS URL containing a CID
      else if (imageInput.includes('/ipfs/') || imageInput.startsWith('ipfs://')) {
        const extractedCid = extractCIDFromURL(imageInput);
        if (extractedCid) {
          image_cid = extractedCid;
          logger.info('Extracted CID from IPFS URL', {
            url: imageInput,
            cid: image_cid,
          });
        } else {
          logger.warn('Invalid CID in IPFS URL', { url: imageInput });
          return c.json(
            {
              error: 'Bad Request',
              message: 'Invalid IPFS CID in URL'
            },
            400
          );
        }
      }
      // Case 3: Check if it's base64 encoded image data
      else if (isBase64(imageInput)) {
        try {
          logger.info('Uploading base64 pfp image to Pinata', {
            feed_name: body.name,
            group_id: FEED_PFP_GROUP_ID,
          });

          // Upload to dedicated feed profile pictures group
          // Use 'public' network so pfp images are publicly accessible
          const uploadResult = await uploadToPinata(imageInput, 'image/jpeg', {
            name: `feed-pfp-${body.name}`,
            groupId: FEED_PFP_GROUP_ID,
            acceptDuplicates: false,
            network: 'public',
          });

          image_cid = uploadResult.data.cid;
          logger.info('Base64 pfp image uploaded to Pinata', {
            cid: image_cid,
            upload_id: uploadResult.data.id,
            group_id: FEED_PFP_GROUP_ID,
          });
        } catch (uploadError: any) {
          logger.error('Failed to upload base64 pfp image', uploadError, {
            feed_name: body.name,
          });
          return c.json(
            {
              error: 'Upload Failed',
              message: `Failed to upload image: ${uploadError.message}`
            },
            500
          );
        }
      }
      // Case 4: It's an external URL (imageflip, etc.) - fetch and upload
      else {
        try {
          logger.info('Fetching and uploading external pfp image', {
            url: imageInput,
            feed_name: body.name,
            group_id: FEED_PFP_GROUP_ID,
          });

          // Upload to dedicated feed profile pictures group
          // Use 'public' network so pfp images are publicly accessible
          const uploadResult = await fetchAndUploadImage(imageInput, {
            name: `feed-pfp-${body.name}`,
            groupId: FEED_PFP_GROUP_ID,
            acceptDuplicates: false,
            network: 'public',
          });

          image_cid = uploadResult.data.cid;
          logger.info('External pfp image uploaded to Pinata', {
            original_url: imageInput,
            cid: image_cid,
            upload_id: uploadResult.data.id,
            group_id: FEED_PFP_GROUP_ID,
          });
        } catch (fetchError: any) {
          logger.error('Failed to fetch and upload external pfp image', fetchError, {
            url: imageInput,
            feed_name: body.name,
          });
          return c.json(
            {
              error: 'Upload Failed',
              message: `Failed to fetch and upload image: ${fetchError.message}`
            },
            500
          );
        }
      }
    }

    // Insert feed with the Pinata group ID as the feed ID
    logger.info('Inserting feed into database', {
      feed_id,
      ownerId,
      category_id: body.category_id || null,
      feed_name: body.name,
      has_image_cid: !!image_cid,
    });

    const result = await pool.query(
      `INSERT INTO gv_feeds (id, owner_id, category_id, name, description, image_cid, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        feed_id,
        ownerId,
        body.category_id || null,
        body.name,
        body.description || null,
        image_cid,
        body.tags || null,
        now,
        now,
      ]
    );

    logger.info('Feed created successfully', { feed_id });

    // Add wallet address to response
    const feed = result.rows[0];
    feed.owner_wallet_address = wallet.wallet_address;

    return c.json(feed, 201);
  } catch (error: any) {
    logger.error('Failed to create feed - caught exception', error, {
      error_message: error.message,
      error_code: error.code,
      error_stack: error.stack,
    });
    if (error.code === '23503') {
      // Foreign key violation
      return c.json(
        { error: 'Bad Request', message: 'Invalid category_id' },
        400
      );
    }
    return c.json({ error: 'Internal Server Error', message: 'Failed to create feed' }, 500);
  }
});

// Update feed
const updateFeedRoute = createRoute({
  method: 'patch',
  path: '/{feed_id}',
  tags: ['Feeds'],
  summary: 'Update feed',
  description: 'Update the properties of an existing feed including category, name, description, image_cid, active status, and tags. Requires wallet authentication and feed ownership verification via x-auth headers.',
  request: {
    headers: AuthHeadersSchema,
    params: z.object({
      feed_id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateFeedSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Feed updated',
      content: {
        'application/json': {
          schema: FeedSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - invalid category_id',
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
      description: 'Forbidden - wallet does not own this feed',
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

feeds.openapi(updateFeedRoute, async (c) => {
  try {
    const { feed_id } = c.req.valid('param');
    const body = c.req.valid('json');
    const now = currentEpoch();

    // Get verified wallet from middleware (required by requireWalletAuth)
    const verifiedWallet = c.get('verifiedWallet');

    // Check that the feed exists and get its owner
    const feedCheck = await pool.query(
      `SELECT f.id, f.owner_id, w.wallet_address, w.wallet_address_network
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
          message: 'You can only update feeds owned by your wallet'
        },
        403
      );
    }

    // Validate category_id if provided
    if (body.category_id !== undefined) {
      const categoryCheck = await pool.query(
        'SELECT id FROM gv_categories WHERE id = $1 AND is_active = true',
        [body.category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return c.json(
          {
            error: 'Bad Request',
            message: 'Invalid category_id. Category does not exist or is not active.'
          },
          400
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.category_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      values.push(body.category_id);
    }
    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.image_cid !== undefined) {
      updates.push(`image_cid = $${paramIndex++}`);
      values.push(body.image_cid);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }
    if (body.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(body.tags);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    values.push(feed_id);

    await pool.query(
      `UPDATE gv_feeds SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Fetch updated feed with wallet address
    const feedWithWallet = await pool.query(
      `SELECT f.*, w.wallet_address as owner_wallet_address
       FROM gv_feeds f
       INNER JOIN gv_wallets w ON f.owner_id = w.id
       WHERE f.id = $1`,
      [feed_id]
    );

    return c.json(feedWithWallet.rows[0], 200);
  } catch (error: any) {
    logger.error('Failed to update feed', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to update feed' }, 500);
  }
});

// Delete feed
const deleteFeedRoute = createRoute({
  method: 'delete',
  path: '/{feed_id}',
  tags: ['Feeds'],
  summary: 'Delete feed',
  description: 'Soft delete a feed and all its associated entries by setting is_active to false. The feed and entry records remain in the system but will no longer appear in active feed listings. Requires wallet authentication and feed ownership verification.',
  request: {
    headers: AuthHeadersSchema,
    params: z.object({
      feed_id: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: 'Feed deleted',
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

feeds.openapi(deleteFeedRoute, async (c) => {
  try {
    const { feed_id } = c.req.valid('param');
    const now = currentEpoch();

    // Get verified wallet from middleware
    const verifiedWallet = c.get('verifiedWallet');

    // Check that the feed exists and get the owner
    const feedCheck = await pool.query(
      `SELECT f.id, w.wallet_address
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
          message: 'You can only delete feeds owned by your wallet'
        },
        403
      );
    }

    // Soft delete the feed
    const result = await pool.query(
      'UPDATE gv_feeds SET is_active = false, updated_at = $1 WHERE id = $2 RETURNING id',
      [now, feed_id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Feed not found' }, 404);
    }

    // Also soft delete all associated feed entries
    await pool.query(
      'UPDATE gv_feed_entries SET is_active = false, updated_at = $1 WHERE feed_id = $2',
      [now, feed_id]
    );

    return c.body(null, 204);
  } catch (error: any) {
    logger.error('Failed to delete feed', error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to delete feed' }, 500);
  }
});

export default feeds;
