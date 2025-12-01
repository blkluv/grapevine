import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { pool } from '../services/db.js';
import {
  CategorySchema,
  ErrorSchema,
  CursorPaginationQuerySchema,
  CursorPaginatedResponseSchema,
} from '../schemas.js';
import { logger } from '../services/logger.js';

const categories = new OpenAPIHono();

// Get all categories (cursor-based pagination)
const getCategoriesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Categories'],
  summary: 'List categories',
  description: 'Retrieve a cursor-paginated list of all categories with optional filtering by active status and search term. Results are ordered by name ASC (alphabetically). Categories are pre-defined in the system and cannot be created via API.',
  request: {
    query: CursorPaginationQuerySchema.extend({
      is_active: z.enum(['true', 'false']).optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of categories with cursor pagination',
      content: {
        'application/json': {
          schema: CursorPaginatedResponseSchema(CategorySchema),
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

categories.openapi(getCategoriesRoute, async (c) => {
  try {
    const { page_size, page_token, is_active, search } = c.req.valid('query');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Add page_token condition (categories with name lexicographically greater than page_token category's name)
    if (page_token) {
      whereClause += ` AND name > (SELECT name FROM gv_categories WHERE id = $${paramIndex++})`;
      params.push(page_token);
    }

    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
    }

    if (search) {
      // Escape special ILIKE characters (%, _, \) to prevent pattern injection
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&');
      whereClause += ` AND (name ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
      params.push(`%${sanitizedSearch}%`, `%${sanitizedSearch}%`);
    }

    // Fetch one extra to determine if there are more results
    params.push(page_size + 1);
    const result = await pool.query(
      `SELECT * FROM gv_categories ${whereClause} ORDER BY name ASC LIMIT $${paramIndex}`,
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
  } catch (error) {
    logger.error('Error fetching categories', error as Error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch categories' }, 500);
  }
});

// Get category by ID
const getCategoryRoute = createRoute({
  method: 'get',
  path: '/{category_id}',
  tags: ['Categories'],
  summary: 'Get category by ID',
  description: 'Retrieve detailed information about a specific category by its unique identifier',
  request: {
    params: z.object({
      category_id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Category details',
      content: {
        'application/json': {
          schema: CategorySchema,
        },
      },
    },
    404: {
      description: 'Category not found',
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

categories.openapi(getCategoryRoute, async (c) => {
  try {
    const { category_id } = c.req.valid('param');
    const result = await pool.query('SELECT * FROM gv_categories WHERE id = $1', [category_id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Category not found' }, 404);
    }

    return c.json(result.rows[0], 200);
  } catch (error) {
    logger.error('Error fetching category', error as Error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to fetch category' }, 500);
  }
});

// =============================================================================
// DISABLED: Create, Update, and Delete endpoints
// Categories are seeded from the database and should not be modified via API
// =============================================================================

/*
// Create category
const createCategoryRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Categories'],
  description: 'Create a new category with a name, optional description, and icon URL',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCategorySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Category created',
      content: {
        'application/json': {
          schema: CategorySchema,
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

categories.openapi(createCategoryRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const now = currentEpoch();

    const result = await pool.query(
      `INSERT INTO gv_categories (name, description, icon_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        body.name,
        body.description || null,
        body.icon_url || null,
        now,
        now,
      ]
    );

    return c.json(result.rows[0], 201);
  } catch (error: any) {
    logger.error('Error creating category', error as Error);
    if (error.code === '23505') {
      // Unique constraint violation
      return c.json({ error: 'Bad Request', message: 'Category with this name already exists' }, 400);
    }
    return c.json({ error: 'Internal Server Error', message: 'Failed to create category' }, 500);
  }
});

// Update category
const updateCategoryRoute = createRoute({
  method: 'patch',
  path: '/{category_id}',
  tags: ['Categories'],
  description: 'Update the properties of an existing category including name, description, icon URL, and active status',
  request: {
    params: z.object({
      category_id: z.string().uuid(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateCategorySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Category updated',
      content: {
        'application/json': {
          schema: CategorySchema,
        },
      },
    },
    400: {
      description: 'Bad request - no fields to update',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Category not found',
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

categories.openapi(updateCategoryRoute, async (c) => {
  try {
    const { category_id } = c.req.valid('param');
    const body = c.req.valid('json');
    const now = currentEpoch();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.icon_url !== undefined) {
      updates.push(`icon_url = $${paramIndex++}`);
      values.push(body.icon_url);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }

    if (updates.length === 0) {
      return c.json({ error: 'Bad Request', message: 'No fields to update' }, 400);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    values.push(category_id);

    const result = await pool.query(
      `UPDATE gv_categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Category not found' }, 404);
    }

    return c.json(result.rows[0], 200);
  } catch (error) {
    logger.error('Error updating category', error as Error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to update category' }, 500);
  }
});

// Delete category
const deleteCategoryRoute = createRoute({
  method: 'delete',
  path: '/{category_id}',
  tags: ['Categories'],
  description: 'Permanently delete a category (only allowed if no feeds are using this category)',
  request: {
    params: z.object({
      category_id: z.string().uuid(),
    }),
  },
  responses: {
    204: {
      description: 'Category deleted',
    },
    400: {
      description: 'Cannot delete category with existing feeds',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'Category not found',
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

categories.openapi(deleteCategoryRoute, async (c) => {
  try {
    const { category_id } = c.req.valid('param');

    // Check if any feeds are using this category
    const feedCheck = await pool.query(
      'SELECT COUNT(*) FROM gv_feeds WHERE category_id = $1',
      [category_id]
    );

    if (parseInt(feedCheck.rows[0].count) > 0) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Cannot delete category with existing feeds. Please reassign or delete feeds first.'
        },
        400
      );
    }

    const result = await pool.query('DELETE FROM gv_categories WHERE id = $1 RETURNING id', [category_id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Not Found', message: 'Category not found' }, 404);
    }

    return c.body(null, 204);
  } catch (error) {
    logger.error('Error deleting category', error as Error);
    return c.json({ error: 'Internal Server Error', message: 'Failed to delete category' }, 500);
  }
});
*/

export default categories;
