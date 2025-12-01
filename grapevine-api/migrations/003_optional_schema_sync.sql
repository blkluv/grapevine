-- Migration 003: Optional Schema.sql Sync (DOCUMENTATION ONLY)
-- Date: 2025-10-30
-- Type: Documentation Update
-- Status: OPTIONAL - Live database already has correct schema
--
-- This migration is provided for documentation purposes only.
-- DO NOT run this against production - it already has the correct schema.
-- This is for syncing local schema.sql file to match production.

-- ============================================================================
-- INFORMATIONAL: Current State
-- ============================================================================
-- The live production database already has:
--   - from_wallet_address (not payer)
--   - to_wallet_id (not pay_to)
--   - Correct payment_instructions structure
--
-- This script is for updating local development schema.sql file only.

-- ============================================================================
-- If applying to a LOCAL database created from old schema.sql:
-- ============================================================================

-- Step 1: Update gv_transactions table to match production
-- WARNING: Only run this on LOCAL development databases, never on production!

-- Add the new to_wallet_id column
ALTER TABLE gv_transactions
  ADD COLUMN IF NOT EXISTS to_wallet_id UUID REFERENCES gv_wallets(id) ON DELETE SET NULL;

-- Rename payer to from_wallet_address
ALTER TABLE gv_transactions
  RENAME COLUMN payer TO from_wallet_address;

-- Extend from_wallet_address to varchar(45) to match production
ALTER TABLE gv_transactions
  ALTER COLUMN from_wallet_address TYPE VARCHAR(45);

-- Drop the old pay_to column if it exists
-- NOTE: Data migration would be needed here if this were a real migration
ALTER TABLE gv_transactions
  DROP COLUMN IF EXISTS pay_to;

-- Update indexes to use new column names
DROP INDEX IF EXISTS idx_gv_transactions_from;
CREATE INDEX IF NOT EXISTS idx_gv_transactions_from_wallet
  ON gv_transactions(from_wallet_address);

DROP INDEX IF EXISTS idx_gv_transactions_to;
CREATE INDEX IF NOT EXISTS idx_gv_transactions_to_wallet
  ON gv_transactions(to_wallet_id);

-- Remove unique constraint on payer+entry if it exists
DROP INDEX IF EXISTS idx_gv_transactions_unique_purchase;

-- Step 2: Update payment_instructions to match production
-- WARNING: Only run this on LOCAL development databases!

-- Update timestamp columns if they're bigint
DO $$
BEGIN
  -- Check if created_at is bigint, convert to timestamp if so
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_instructions'
    AND column_name = 'created_at'
    AND data_type = 'bigint'
  ) THEN
    -- Convert bigint epoch to timestamp
    ALTER TABLE payment_instructions
      ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE
      USING to_timestamp(created_at);

    ALTER TABLE payment_instructions
      ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE
      USING to_timestamp(updated_at);

    ALTER TABLE payment_instructions
      ALTER COLUMN deleted_at TYPE TIMESTAMP WITHOUT TIME ZONE
      USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at) ELSE NULL END;
  END IF;
END $$;

-- Add name and description columns if they don't exist
ALTER TABLE payment_instructions
  ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE payment_instructions
  ADD COLUMN IF NOT EXISTS description VARCHAR(255);

-- Update NOT NULL constraint on name after adding data
-- In production, these fields are populated
UPDATE payment_instructions
SET name = COALESCE(name, 'Payment Instruction ' || id::text)
WHERE name IS NULL;

ALTER TABLE payment_instructions
  ALTER COLUMN name SET NOT NULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify gv_transactions structure
SELECT
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'gv_transactions'
ORDER BY ordinal_position;

-- Verify payment_instructions structure
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_instructions'
ORDER BY ordinal_position;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

-- 1. This migration is OPTIONAL and for LOCAL databases only
-- 2. Production already has the correct schema - DO NOT apply there
-- 3. All views automatically work with new column names
-- 4. API code already uses production column names
-- 5. Tests work with both schemas (use mocks)

-- To verify your database matches production:
-- Run: node migrations/full_schema_analysis.mjs
