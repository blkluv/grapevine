-- Migration: Convert amount and price fields to BIGINT
-- Date: 2025-11-05
-- Description: Converts the 'amount' field in gv_transactions and 'price' field in gv_feed_entries to BIGINT
--              to properly handle large cryptocurrency values. Also updates all dependent views.

-- =============================================================================
-- STEP 1: Drop all dependent views that reference the amount field
-- =============================================================================
-- Note: We need to drop views before altering column types because PostgreSQL
-- doesn't allow altering columns that are used in views.

DROP VIEW IF EXISTS gv_leaderboard_most_popular CASCADE;
DROP VIEW IF EXISTS gv_leaderboard_trending_feeds CASCADE;
DROP VIEW IF EXISTS gv_leaderboard_top_buyers CASCADE;
DROP VIEW IF EXISTS gv_leaderboard_top_providers CASCADE;
DROP VIEW IF EXISTS gv_leaderboard_top_revenue CASCADE;
DROP VIEW IF EXISTS gv_category_stats CASCADE;
DROP VIEW IF EXISTS gv_feed_performance_summary CASCADE;

-- =============================================================================
-- STEP 2: Alter the column types
-- =============================================================================

-- Note: In the current schema, these fields are already BIGINT, but this migration
-- ensures consistency and handles any edge cases where they might have been different.
-- If the columns are already BIGINT, these commands will complete quickly.

-- Check if we need to alter gv_transactions.amount to BIGINT
DO $$
DECLARE
    v_current_type TEXT;
BEGIN
    -- Get the current data type
    SELECT data_type INTO v_current_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'gv_transactions'
    AND column_name = 'amount';

    RAISE NOTICE 'Current type of gv_transactions.amount: %', v_current_type;

    -- Only alter if not already BIGINT
    IF v_current_type IS NOT NULL AND v_current_type != 'bigint' THEN
        ALTER TABLE gv_transactions ALTER COLUMN amount TYPE BIGINT USING amount::BIGINT;
        RAISE NOTICE 'Converted gv_transactions.amount from % to BIGINT', v_current_type;
    ELSIF v_current_type = 'bigint' THEN
        RAISE NOTICE 'gv_transactions.amount is already BIGINT';
    ELSE
        RAISE WARNING 'Could not find gv_transactions.amount column';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error converting gv_transactions.amount: %', SQLERRM;
END $$;

-- Check if we need to alter gv_feed_entries.price to BIGINT
DO $$
DECLARE
    v_current_type TEXT;
BEGIN
    -- Get the current data type
    SELECT data_type INTO v_current_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'gv_feed_entries'
    AND column_name = 'price';

    RAISE NOTICE 'Current type of gv_feed_entries.price: %', v_current_type;

    -- Only alter if not already BIGINT
    IF v_current_type IS NOT NULL AND v_current_type != 'bigint' THEN
        ALTER TABLE gv_feed_entries ALTER COLUMN price TYPE BIGINT USING price::BIGINT;
        RAISE NOTICE 'Converted gv_feed_entries.price from % to BIGINT', v_current_type;
    ELSIF v_current_type = 'bigint' THEN
        RAISE NOTICE 'gv_feed_entries.price is already BIGINT';
    ELSE
        RAISE WARNING 'Could not find gv_feed_entries.price column';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error converting gv_feed_entries.price: %', SQLERRM;
END $$;

-- =============================================================================
-- STEP 3: Recreate all views with proper BIGINT handling
-- =============================================================================

-- Feed performance summary
CREATE OR REPLACE VIEW gv_feed_performance_summary AS
SELECT
    f.id,
    f.name,
    f.category_id,
    c.name as category_name,
    f.total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::BIGINT as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    (SELECT COUNT(*) FROM gv_feeds WHERE category_id = f.category_id) as total_feeds_per_category
FROM gv_feeds f
LEFT JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
GROUP BY f.id, f.name, f.category_id, c.name, f.total_entries;

-- Category statistics summary
CREATE OR REPLACE VIEW gv_category_stats AS
SELECT
    c.id as category_id,
    c.name as category_name,
    c.description as category_description,
    c.icon_url as category_icon_url,
    COUNT(DISTINCT f.id) as total_feeds,
    COUNT(DISTINCT f.owner_id) as total_providers,
    COALESCE(SUM(f.total_entries), 0) as total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::BIGINT as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    COALESCE(AVG(t.amount), 0)::BIGINT as avg_purchase_amount
FROM gv_categories c
LEFT JOIN gv_feeds f ON c.id = f.category_id AND f.is_active = true
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.description, c.icon_url
ORDER BY total_revenue DESC;

-- Top revenue generating feeds leaderboard
CREATE OR REPLACE VIEW gv_leaderboard_top_revenue AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) as rank,
    f.id as feed_id,
    f.name as feed_name,
    u.id as owner_id,
    u.username as owner_username,
    u.wallet_address as owner_wallet,
    c.name as category_name,
    f.total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::BIGINT as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    f.created_at as feed_created_at
FROM gv_feeds f
JOIN gv_wallets u ON f.owner_id = u.id
JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
WHERE f.is_active = true
GROUP BY f.id, f.name, u.id, u.username, u.wallet_address, c.name, f.total_entries, f.created_at
ORDER BY total_revenue DESC
LIMIT 100;

-- Top providers by total revenue across all their feeds
CREATE OR REPLACE VIEW gv_leaderboard_top_providers AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) as rank,
    u.id as user_id,
    u.username,
    u.wallet_address,
    COUNT(DISTINCT f.id) as total_feeds,
    COUNT(DISTINCT fe.id) as total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::BIGINT as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    u.created_at as joined_at
FROM gv_wallets u
JOIN gv_feeds f ON u.id = f.owner_id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
WHERE f.is_active = true
GROUP BY u.id, u.username, u.wallet_address, u.created_at
HAVING COUNT(DISTINCT f.id) > 0
ORDER BY total_revenue DESC
LIMIT 100;

-- Most active buyers leaderboard
CREATE OR REPLACE VIEW gv_leaderboard_top_buyers AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT t.id) DESC) as rank,
    u.id as user_id,
    u.username,
    u.wallet_address,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::BIGINT as total_spent,
    COUNT(DISTINCT t.entry_id) as unique_entries_purchased,
    COUNT(DISTINCT fe.feed_id) as unique_feeds_purchased_from,
    u.created_at as joined_at
FROM gv_wallets u
JOIN gv_transactions t ON u.wallet_address = t.payer
JOIN gv_feed_entries fe ON t.entry_id = fe.id
GROUP BY u.id, u.username, u.wallet_address, u.created_at
ORDER BY total_purchases DESC
LIMIT 100;

-- Trending feeds (most revenue in last 7 days)
CREATE OR REPLACE VIEW gv_leaderboard_trending_feeds AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) as rank,
    f.id as feed_id,
    f.name as feed_name,
    u.username as owner_username,
    u.wallet_address as owner_wallet,
    c.name as category_name,
    COUNT(DISTINCT t.id) as purchases_last_7d,
    COALESCE(SUM(t.amount), 0)::BIGINT as revenue_last_7d,
    COUNT(DISTINCT t.payer) as unique_buyers_last_7d
FROM gv_feeds f
JOIN gv_wallets u ON f.owner_id = u.id
JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
    AND t.created_at >= EXTRACT(EPOCH FROM CURRENT_TIMESTAMP - INTERVAL '7 days')::BIGINT
WHERE f.is_active = true
GROUP BY f.id, f.name, u.username, u.wallet_address, c.name
HAVING COUNT(DISTINCT t.id) > 0
ORDER BY revenue_last_7d DESC
LIMIT 50;

-- Most popular feeds by purchase count
CREATE OR REPLACE VIEW gv_leaderboard_most_popular AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT t.id) DESC) as rank,
    f.id as feed_id,
    f.name as feed_name,
    u.username as owner_username,
    c.name as category_name,
    f.total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::BIGINT as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    CASE
        WHEN COUNT(DISTINCT t.id) > 0 THEN
            ROUND(COALESCE(SUM(t.amount), 0)::NUMERIC / COUNT(DISTINCT t.id), 2)
        ELSE 0
    END as avg_revenue_per_purchase
FROM gv_feeds f
JOIN gv_wallets u ON f.owner_id = u.id
JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
WHERE f.is_active = true
GROUP BY f.id, f.name, u.username, c.name, f.total_entries
HAVING COUNT(DISTINCT t.id) > 0
ORDER BY total_purchases DESC
LIMIT 100;

-- =============================================================================
-- STEP 4: Verify the migration
-- =============================================================================

-- Check column types
DO $$
DECLARE
    v_transactions_amount_type TEXT;
    v_feed_entries_price_type TEXT;
BEGIN
    -- Check gv_transactions.amount
    SELECT data_type INTO v_transactions_amount_type
    FROM information_schema.columns
    WHERE table_name = 'gv_transactions'
      AND column_name = 'amount';

    -- Check gv_feed_entries.price
    SELECT data_type INTO v_feed_entries_price_type
    FROM information_schema.columns
    WHERE table_name = 'gv_feed_entries'
      AND column_name = 'price';

    -- Report results
    RAISE NOTICE 'gv_transactions.amount type: %', v_transactions_amount_type;
    RAISE NOTICE 'gv_feed_entries.price type: %', v_feed_entries_price_type;

    -- Verify they are BIGINT
    IF v_transactions_amount_type != 'bigint' THEN
        RAISE EXCEPTION 'gv_transactions.amount is not BIGINT: %', v_transactions_amount_type;
    END IF;

    IF v_feed_entries_price_type != 'bigint' THEN
        RAISE EXCEPTION 'gv_feed_entries.price is not BIGINT: %', v_feed_entries_price_type;
    END IF;

    RAISE NOTICE 'Migration completed successfully! All amount fields are now BIGINT.';
END $$;
