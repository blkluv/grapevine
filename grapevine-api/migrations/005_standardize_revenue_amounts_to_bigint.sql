-- Migration: Standardize revenue and amount columns to BIGINT
-- Purpose: Ensure consistent handling of wei/smallest unit amounts across all tables
-- Date: 2025-01-11
--
-- This migration changes total_revenue columns from DECIMAL(78, 0) to BIGINT for:
-- - Better performance on aggregations
-- - Consistency with gv_transactions.amount (BIGINT)
-- - Sufficient range for realistic blockchain amounts (up to ~9.2e18)
--
-- BIGINT range: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
-- This supports amounts up to ~9.2 quintillion wei, which is:
-- - ~9.2 billion ETH (18 decimals)
-- - ~9.2 trillion USDC (6 decimals)
--
-- Note: If you need to support amounts beyond this (unlikely for real-world use),
-- you can revert to NUMERIC(78, 0), but performance will be slower.

-- =============================================================================
-- STEP 1: Backup current data (optional but recommended)
-- =============================================================================

-- Uncomment these lines if you want to create backup tables:
-- CREATE TABLE gv_feeds_backup AS SELECT * FROM gv_feeds;
-- CREATE TABLE gv_feed_entries_backup AS SELECT * FROM gv_feed_entries;

-- =============================================================================
-- STEP 2: Update gv_feed_entries table
-- =============================================================================

-- Change total_revenue from DECIMAL(78, 0) to BIGINT
ALTER TABLE gv_feed_entries
  ALTER COLUMN total_revenue TYPE BIGINT USING total_revenue::bigint;

COMMENT ON COLUMN gv_feed_entries.total_revenue IS 'Total revenue in wei/smallest token unit (BIGINT supports up to ~9.2e18)';

-- =============================================================================
-- STEP 3: Update gv_feeds table
-- =============================================================================

-- Change total_revenue from DECIMAL(78, 0) to BIGINT
ALTER TABLE gv_feeds
  ALTER COLUMN total_revenue TYPE BIGINT USING total_revenue::bigint;

COMMENT ON COLUMN gv_feeds.total_revenue IS 'Total revenue in wei/smallest token unit (BIGINT supports up to ~9.2e18)';

-- =============================================================================
-- STEP 4: Update trigger functions to use BIGINT
-- =============================================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_update_entry_transaction_stats ON gv_transactions;
DROP TRIGGER IF EXISTS trigger_update_feed_transaction_stats ON gv_transactions;

-- Recreate trigger function for entry stats with BIGINT
CREATE OR REPLACE FUNCTION update_entry_transaction_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE gv_feed_entries
        SET total_purchases = total_purchases + 1,
            total_revenue = total_revenue + NEW.amount::bigint,
            updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
        WHERE id = NEW.entry_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle amount change
        UPDATE gv_feed_entries
        SET total_revenue = total_revenue - OLD.amount::bigint + NEW.amount::bigint,
            updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
        WHERE id = NEW.entry_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE gv_feed_entries
        SET total_purchases = total_purchases - 1,
            total_revenue = total_revenue - OLD.amount::bigint,
            updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
        WHERE id = OLD.entry_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger function for feed stats with BIGINT
CREATE OR REPLACE FUNCTION update_feed_transaction_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_feed_id UUID;
BEGIN
    -- Get the feed_id from the entry
    IF TG_OP = 'DELETE' THEN
        SELECT feed_id INTO v_feed_id FROM gv_feed_entries WHERE id = OLD.entry_id;
    ELSE
        SELECT feed_id INTO v_feed_id FROM gv_feed_entries WHERE id = NEW.entry_id;
    END IF;

    -- Update feed stats by aggregating from all its entries
    IF v_feed_id IS NOT NULL THEN
        UPDATE gv_feeds
        SET total_purchases = (
                SELECT COALESCE(SUM(total_purchases), 0)
                FROM gv_feed_entries
                WHERE feed_id = v_feed_id
            ),
            total_revenue = (
                SELECT COALESCE(SUM(total_revenue), 0)::bigint
                FROM gv_feed_entries
                WHERE feed_id = v_feed_id
            ),
            updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
        WHERE id = v_feed_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER trigger_update_entry_transaction_stats
AFTER INSERT OR UPDATE OR DELETE ON gv_transactions
FOR EACH ROW
EXECUTE FUNCTION update_entry_transaction_stats();

CREATE TRIGGER trigger_update_feed_transaction_stats
AFTER INSERT OR UPDATE OR DELETE ON gv_transactions
FOR EACH ROW
EXECUTE FUNCTION update_feed_transaction_stats();

-- =============================================================================
-- STEP 5: Recalculate existing stats to ensure accuracy
-- =============================================================================

-- Recalculate entry stats from transactions
UPDATE gv_feed_entries e
SET
    total_purchases = COALESCE(t.purchase_count, 0),
    total_revenue = COALESCE(t.revenue_sum, 0),
    updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
FROM (
    SELECT
        entry_id,
        COUNT(*)::integer as purchase_count,
        SUM(amount)::bigint as revenue_sum
    FROM gv_transactions
    WHERE entry_id IS NOT NULL
    GROUP BY entry_id
) t
WHERE e.id = t.entry_id;

-- Reset entries with no transactions
UPDATE gv_feed_entries
SET
    total_purchases = 0,
    total_revenue = 0,
    updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
WHERE id NOT IN (SELECT DISTINCT entry_id FROM gv_transactions WHERE entry_id IS NOT NULL);

-- Recalculate feed stats by aggregating from entries
UPDATE gv_feeds f
SET
    total_purchases = COALESCE(e.purchase_sum, 0),
    total_revenue = COALESCE(e.revenue_sum, 0),
    updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
FROM (
    SELECT
        feed_id,
        SUM(total_purchases)::integer as purchase_sum,
        SUM(total_revenue)::bigint as revenue_sum
    FROM gv_feed_entries
    GROUP BY feed_id
) e
WHERE f.id = e.feed_id;

-- =============================================================================
-- STEP 6: Update views that reference these columns
-- =============================================================================

-- Recreate gv_top_feeds view (no changes needed, just refresh)
CREATE OR REPLACE VIEW gv_top_feeds AS
SELECT
    f.*,
    u.wallet_address as owner_wallet,
    u.username as owner_username,
    c.name as category_name
FROM gv_feeds f
JOIN gv_wallets u ON f.owner_id = u.id
LEFT JOIN gv_categories c ON f.category_id = c.id
WHERE f.is_active = true
ORDER BY f.total_entries DESC
LIMIT 100;

-- Recreate gv_feed_performance_summary view
CREATE OR REPLACE VIEW gv_feed_performance_summary AS
SELECT
    f.id,
    f.name,
    f.category_id,
    c.name as category_name,
    f.total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::bigint as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    (SELECT COUNT(*) FROM gv_feeds WHERE category_id = f.category_id) as total_feeds_per_category
FROM gv_feeds f
LEFT JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
GROUP BY f.id, f.name, f.category_id, c.name, f.total_entries;

-- Recreate gv_category_stats view
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
    COALESCE(SUM(t.amount), 0)::bigint as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    COALESCE(AVG(t.amount), 0)::bigint as avg_purchase_amount
FROM gv_categories c
LEFT JOIN gv_feeds f ON c.id = f.category_id AND f.is_active = true
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.description, c.icon_url
ORDER BY total_revenue DESC;

-- Recreate leaderboard views with BIGINT
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
    COALESCE(SUM(t.amount), 0)::bigint as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    f.created_at as feed_created_at
FROM gv_feeds f
JOIN gv_wallets u ON f.owner_id = u.id
LEFT JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
WHERE f.is_active = true
GROUP BY f.id, f.name, u.id, u.username, u.wallet_address, c.name, f.total_entries, f.created_at
ORDER BY total_revenue DESC
LIMIT 100;

CREATE OR REPLACE VIEW gv_leaderboard_top_providers AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) as rank,
    u.id as user_id,
    u.username,
    u.wallet_address,
    COUNT(DISTINCT f.id) as total_feeds,
    COUNT(DISTINCT fe.id) as total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::bigint as total_revenue,
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

CREATE OR REPLACE VIEW gv_leaderboard_top_buyers AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT t.id) DESC) as rank,
    u.id as user_id,
    u.username,
    u.wallet_address,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::bigint as total_spent,
    COUNT(DISTINCT t.entry_id) as unique_entries_purchased,
    COUNT(DISTINCT fe.feed_id) as unique_feeds_purchased_from,
    u.created_at as joined_at
FROM gv_wallets u
JOIN gv_transactions t ON u.wallet_address = t.payer
JOIN gv_feed_entries fe ON t.entry_id = fe.id
GROUP BY u.id, u.username, u.wallet_address, u.created_at
ORDER BY total_purchases DESC
LIMIT 100;

CREATE OR REPLACE VIEW gv_leaderboard_trending_feeds AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) as rank,
    f.id as feed_id,
    f.name as feed_name,
    u.username as owner_username,
    u.wallet_address as owner_wallet,
    c.name as category_name,
    COUNT(DISTINCT t.id) as purchases_last_7d,
    COALESCE(SUM(t.amount), 0)::bigint as revenue_last_7d,
    COUNT(DISTINCT t.payer) as unique_buyers_last_7d
FROM gv_feeds f
JOIN gv_wallets u ON f.owner_id = u.id
LEFT JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
    AND t.created_at >= EXTRACT(EPOCH FROM CURRENT_TIMESTAMP - INTERVAL '7 days')::BIGINT
WHERE f.is_active = true
GROUP BY f.id, f.name, u.username, u.wallet_address, c.name
HAVING COUNT(DISTINCT t.id) > 0
ORDER BY revenue_last_7d DESC
LIMIT 50;

CREATE OR REPLACE VIEW gv_leaderboard_most_popular AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT t.id) DESC) as rank,
    f.id as feed_id,
    f.name as feed_name,
    u.username as owner_username,
    c.name as category_name,
    f.total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0)::bigint as total_revenue,
    COUNT(DISTINCT t.payer) as unique_buyers,
    CASE
        WHEN COUNT(DISTINCT t.id) > 0
        THEN (COALESCE(SUM(t.amount), 0) / COUNT(DISTINCT t.id))::bigint
        ELSE 0
    END as avg_revenue_per_purchase
FROM gv_feeds f
JOIN gv_wallets u ON f.owner_id = u.id
LEFT JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
WHERE f.is_active = true
GROUP BY f.id, f.name, u.username, c.name, f.total_entries
HAVING COUNT(DISTINCT t.id) > 0
ORDER BY total_purchases DESC
LIMIT 100;

-- =============================================================================
-- STEP 7: Verification queries
-- =============================================================================

-- Uncomment to verify the migration:

-- Check column types
-- SELECT
--     table_name,
--     column_name,
--     data_type,
--     numeric_precision,
--     numeric_scale
-- FROM information_schema.columns
-- WHERE table_name IN ('gv_feeds', 'gv_feed_entries', 'gv_transactions')
--     AND column_name IN ('total_revenue', 'amount', 'price')
-- ORDER BY table_name, column_name;

-- Check trigger existence
-- SELECT
--     trigger_name,
--     event_manipulation,
--     event_object_table,
--     action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE '%transaction_stats%';

-- Check sample revenue values
-- SELECT
--     id,
--     name,
--     total_purchases,
--     total_revenue,
--     pg_typeof(total_revenue) as revenue_type
-- FROM gv_feeds
-- WHERE total_revenue > 0
-- LIMIT 5;

-- =============================================================================
-- Migration complete!
-- =============================================================================

-- Add comment to track migration
COMMENT ON TABLE gv_feeds IS 'Data feed containers - Migration 005: Changed total_revenue to BIGINT (2025-01-11)';
COMMENT ON TABLE gv_feed_entries IS 'Individual data entries (messages) published to feeds - Migration 005: Changed total_revenue to BIGINT (2025-01-11)';
