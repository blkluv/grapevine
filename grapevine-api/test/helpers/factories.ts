import { Pool } from 'pg';

/**
 * Test data factory functions
 * These functions create test data in the database
 */

export const createTestWallet = async (
  pool: Pool,
  overrides?: Partial<{
    wallet_address: string;
    wallet_address_network: string;
    username: string;
  }>
) => {
  const now = Math.floor(Date.now() / 1000);
  const defaults = {
    wallet_address: `0x${Math.random().toString(16).substring(2).padEnd(40, '0').substring(0, 40)}`,
    wallet_address_network: 'base-sepolia', // Changed to 'base' as only Base chain wallets can create feeds
    username: `testuser_${Math.random().toString(36).substring(7)}`,
  };

  const data = { ...defaults, ...overrides };

  const result = await pool.query(
    `INSERT INTO gv_wallets (wallet_address, wallet_address_network, username, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.wallet_address, data.wallet_address_network, data.username, now, now]
  );

  return result.rows[0];
};

export const createTestCategory = async (
  pool: Pool,
  overrides?: Partial<{
    name: string;
    description: string;
    icon_url: string;
  }>
) => {
  const now = Math.floor(Date.now() / 1000);
  const defaults = {
    name: `Test Category ${Math.random().toString(36).substring(7)}`,
    description: 'Test category description',
    icon_url: null,
  };

  const data = { ...defaults, ...overrides };

  const result = await pool.query(
    `INSERT INTO gv_categories (name, description, icon_url, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.description, data.icon_url, now, now]
  );

  return result.rows[0];
};

export const createTestFeed = async (
  pool: Pool,
  owner_id: string,
  category_id: string,
  overrides?: Partial<{
    name: string;
    description: string;
    tags: string[];
  }>
) => {
  const now = Math.floor(Date.now() / 1000);
  const defaults = {
    name: `Test Feed ${Math.random().toString(36).substring(7)}`,
    description: 'Test feed description',
    tags: ['test', 'demo'],
  };

  const data = { ...defaults, ...overrides };

  const result = await pool.query(
    `INSERT INTO gv_feeds (owner_id, category_id, name, description, tags, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [owner_id, category_id, data.name, data.description, data.tags, now, now]
  );

  return result.rows[0];
};

export const createTestPaymentInstruction = async (pool: Pool, piid: string, user_id: string) => {
  const now = Math.floor(Date.now() / 1000);

  const result = await pool.query(
    `INSERT INTO payment_instructions (id, user_id, payment_requirements, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [piid, user_id, { amount: '10.00', currency: 'USDC' }, 1, now, now]
  );

  return result.rows[0];
};

export const createTestEntry = async (
  pool: Pool,
  feed_id: string,
  piid: string,
  overrides?: Partial<{
    cid: string;
    mime_type: string;
    pinata_upload_id: string;
    title: string;
    is_free: boolean;
    tags: string[];
  }>
) => {
  const now = Math.floor(Date.now() / 1000);
  const defaults = {
    cid: `Qm${Math.random().toString(36).substring(2, 44)}`,
    mime_type: 'application/json',
    pinata_upload_id: null,
    title: `Test Entry ${Math.random().toString(36).substring(7)}`,
    is_free: false,
    tags: ['test'],
  };

  const data = { ...defaults, ...overrides };

  const result = await pool.query(
    `INSERT INTO gv_feed_entries (feed_id, cid, mime_type, pinata_upload_id, title, tags, is_free, piid, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [feed_id, data.cid, data.mime_type, data.pinata_upload_id, data.title, data.tags, data.is_free, piid, now, now]
  );

  return result.rows[0];
};

export const createTestTransaction = async (
  pool: Pool,
  payer: string,
  pay_to: string,
  entry_id: string,
  overrides?: Partial<{
    amount: number;
    asset: string;
    transaction_hash: string;
    piid: string;
  }>
) => {
  const now = Math.floor(Date.now() / 1000);
  const defaults = {
    amount: 1000,
    asset: 'USDC',
    transaction_hash: `0x${Math.random().toString(36).substring(2).padEnd(64, '0')}`,
    piid: null,
  };

  const data = { ...defaults, ...overrides };

  const result = await pool.query(
    `INSERT INTO gv_transactions (payer, pay_to, amount, asset, entry_id, transaction_hash, piid, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payer,
      pay_to,
      data.amount,
      data.asset,
      entry_id,
      data.transaction_hash,
      data.piid,
      now,
    ]
  );

  return result.rows[0];
};
