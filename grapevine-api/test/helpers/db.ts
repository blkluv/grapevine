import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { join } from 'path';

// PGlite wrapper to match pg.Pool interface for testing
class PGlitePool {
  private db: PGlite;

  constructor(db: PGlite) {
    this.db = db;
  }

  async query(text: string, params?: any[]) {
    const result = await this.db.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rows.length,
      command: '',
      oid: 0,
      fields: result.fields || [],
    };
  }

  async end() {
    await this.db.close();
  }
}

/**
 * Test database connection using PGlite (in-memory PostgreSQL)
 * No external PostgreSQL instance required!
 */
export const createTestPool = async () => {
  // Create in-memory PGlite instance
  const db = new PGlite();

  // Wrap in Pool-like interface
  return new PGlitePool(db);
};

/**
 * Initialize test database with schema
 * Reads and executes the schema.sql file
 * PGlite requires splitting multi-statement SQL into individual queries
 */
export const seedTestDatabase = async (pool: any) => {
  try {
    // Read schema file
    const schemaPath = join(process.cwd(), 'schema.sql');
    let schema = readFileSync(schemaPath, 'utf-8');

    // Remove single-line comments
    schema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Smart split by semicolon, respecting $$ delimited blocks
    const statements: string[] = [];
    let current = '';
    let inDollarQuote = false;

    for (let i = 0; i < schema.length; i++) {
      const char = schema[i];
      const next = schema[i + 1];

      // Check for $$ delimiter
      if (char === '$' && next === '$') {
        inDollarQuote = !inDollarQuote;
        current += '$$';
        i++; // Skip next $
        continue;
      }

      // Split on semicolon only if not in dollar quote
      if (char === ';' && !inDollarQuote) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
        continue;
      }

      current += char;
    }

    // Add last statement if exists
    if (current.trim()) {
      statements.push(current.trim());
    }

    // Execute each statement individually
    for (const statement of statements) {
      // Skip uuid-ossp extension - PGlite has gen_random_uuid() built-in
      if (statement.includes('uuid-ossp')) {
        console.log('  → Skipping uuid-ossp extension (not needed in PGlite)');
        continue;
      }

      await pool.query(statement + ';');
    }

    // Insert free payment instruction for tests (if FREE_PAYMENT_INSTRUCTION_ID is set)
    const freePaymentInstructionId = process.env.FREE_PAYMENT_INSTRUCTION_ID;
    if (freePaymentInstructionId) {
      // Create a dummy wallet for the payment instruction
      const now = Math.floor(Date.now() / 1000);
      await pool.query(`
        INSERT INTO gv_wallets (id, wallet_address, wallet_address_network, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000000', '0x0000000000000000000000000000000000000000', 'base', ${now}, ${now})
        ON CONFLICT DO NOTHING
      `);

      // Create the free payment instruction with the specified ID
      await pool.query(`
        INSERT INTO payment_instructions (id, user_id, payment_requirements, version, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000000', '[]'::jsonb, 1, ${now}, ${now})
        ON CONFLICT DO NOTHING
      `, [freePaymentInstructionId]);

      console.log('✓ Created free payment instruction for tests');
    }

    console.log('✓ Test database seeded successfully');
  } catch (error) {
    console.error('✗ Failed to seed test database:', error);
    throw error;
  }
};

/**
 * Clean all data from test database
 * Truncates all tables in dependency order
 * Preserves the free payment instruction if FREE_PAYMENT_INSTRUCTION_ID is set
 */
export const cleanTestDatabase = async (pool: any) => {
  try {
    const freePaymentInstructionId = process.env.FREE_PAYMENT_INSTRUCTION_ID;
    const systemWalletId = '00000000-0000-0000-0000-000000000000';

    // Delete all data in proper order (respecting foreign key constraints)
    // Start with tables that don't have foreign keys pointing to them
    await pool.query('DELETE FROM gv_transactions');
    await pool.query('DELETE FROM gv_feed_entries');
    await pool.query('DELETE FROM gv_feeds');
    await pool.query('DELETE FROM gv_wallet_stats');
    await pool.query('DELETE FROM gv_categories');

    // Delete ALL payment instructions except the free one
    if (freePaymentInstructionId) {
      await pool.query('DELETE FROM payment_instructions WHERE id != $1', [freePaymentInstructionId]);
    } else {
      // No free payment instruction to preserve - delete all
      await pool.query('DELETE FROM payment_instructions');
    }

    // Delete all wallets except the system wallet
    // This should now work since we've deleted all other payment_instructions
    await pool.query('DELETE FROM gv_wallets WHERE id != $1', [systemWalletId]);
  } catch (error) {
    console.error('✗ Failed to clean test database:', error);
    throw error;
  }
};

/**
 * Close database connection pool
 */
export const closeTestPool = async (pool: any) => {
  await pool.end();
};
