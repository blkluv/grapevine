-- One-Time SQL Script: Recalculate Feed and Entry Statistics
-- Purpose: Manually recalculate total_entries, total_purchases, and total_revenue
--          for all feeds and entries to ensure data consistency.
-- Usage: Run this script when you need to fix or verify feed statistics
--
-- IMPORTANT: This is a one-time script and should be run manually when needed.
--            It does NOT need to be run as part of regular migrations.

-- =============================================================================
-- Step 1: Recalculate Entry Stats (total_purchases and total_revenue)
-- =============================================================================
-- For each entry, aggregate transaction data to update purchase count and revenue

DO $$
DECLARE
    v_entry_count INTEGER := 0;
    v_feed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Starting Entry Stats Recalculation ===';

    -- Update all entries with aggregated transaction stats
    UPDATE gv_feed_entries e
    SET
        total_purchases = COALESCE(tx_stats.purchase_count, 0),
        total_revenue = COALESCE(tx_stats.revenue_sum, 0)::bigint,
        updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
    FROM (
        SELECT
            entry_id,
            COUNT(*) as purchase_count,
            SUM(amount) as revenue_sum
        FROM gv_transactions
        GROUP BY entry_id
    ) tx_stats
    WHERE e.id = tx_stats.entry_id;

    GET DIAGNOSTICS v_entry_count = ROW_COUNT;
    RAISE NOTICE 'Updated % entries with transaction data', v_entry_count;

    -- Reset entries with no transactions to 0
    UPDATE gv_feed_entries e
    SET
        total_purchases = 0,
        total_revenue = 0,
        updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
    WHERE NOT EXISTS (
        SELECT 1 FROM gv_transactions t WHERE t.entry_id = e.id
    ) AND (e.total_purchases != 0 OR e.total_revenue != 0);

    GET DIAGNOSTICS v_entry_count = ROW_COUNT;
    RAISE NOTICE 'Reset % entries with no transactions', v_entry_count;

    RAISE NOTICE '=== Entry Stats Recalculation Complete ===';
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- Step 2: Recalculate Feed Stats (total_entries, total_purchases, total_revenue)
-- =============================================================================
-- For each feed, aggregate entry data to update all stats

DO $$
DECLARE
    v_feed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Starting Feed Stats Recalculation ===';

    -- Update all feeds with aggregated entry stats
    UPDATE gv_feeds f
    SET
        total_entries = COALESCE(entry_stats.entry_count, 0),
        total_purchases = COALESCE(entry_stats.purchase_sum, 0),
        total_revenue = COALESCE(entry_stats.revenue_sum, 0)::bigint,
        updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
    FROM (
        SELECT
            feed_id,
            COUNT(*) as entry_count,
            SUM(total_purchases) as purchase_sum,
            SUM(total_revenue) as revenue_sum
        FROM gv_feed_entries
        WHERE is_active = true
        GROUP BY feed_id
    ) entry_stats
    WHERE f.id = entry_stats.feed_id;

    GET DIAGNOSTICS v_feed_count = ROW_COUNT;
    RAISE NOTICE 'Updated % feeds with entry data', v_feed_count;

    -- Reset feeds with no active entries to 0
    UPDATE gv_feeds f
    SET
        total_entries = 0,
        total_purchases = 0,
        total_revenue = 0,
        updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
    WHERE NOT EXISTS (
        SELECT 1 FROM gv_feed_entries e
        WHERE e.feed_id = f.id AND e.is_active = true
    ) AND (f.total_entries != 0 OR f.total_purchases != 0 OR f.total_revenue != 0);

    GET DIAGNOSTICS v_feed_count = ROW_COUNT;
    RAISE NOTICE 'Reset % feeds with no active entries', v_feed_count;

    RAISE NOTICE '=== Feed Stats Recalculation Complete ===';
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- Step 3: Verification - Display Summary Statistics
-- =============================================================================
-- Show summary of the recalculation results

DO $$
DECLARE
    v_total_feeds INTEGER;
    v_feeds_with_entries INTEGER;
    v_feeds_without_entries INTEGER;
    v_total_entries INTEGER;
    v_entries_with_transactions INTEGER;
    v_entries_without_transactions INTEGER;
BEGIN
    RAISE NOTICE '=== Verification Summary ===';
    RAISE NOTICE '';

    -- Feed statistics
    SELECT COUNT(*) INTO v_total_feeds FROM gv_feeds WHERE is_active = true;
    SELECT COUNT(*) INTO v_feeds_with_entries FROM gv_feeds WHERE is_active = true AND total_entries > 0;
    SELECT COUNT(*) INTO v_feeds_without_entries FROM gv_feeds WHERE is_active = true AND total_entries = 0;

    RAISE NOTICE 'FEEDS:';
    RAISE NOTICE '  Total active feeds: %', v_total_feeds;
    RAISE NOTICE '  Feeds with entries (>= 1): %', v_feeds_with_entries;
    RAISE NOTICE '  Feeds without entries (0): %', v_feeds_without_entries;
    RAISE NOTICE '';

    -- Entry statistics
    SELECT COUNT(*) INTO v_total_entries FROM gv_feed_entries WHERE is_active = true;
    SELECT COUNT(*) INTO v_entries_with_transactions FROM gv_feed_entries WHERE is_active = true AND total_purchases > 0;
    SELECT COUNT(*) INTO v_entries_without_transactions FROM gv_feed_entries WHERE is_active = true AND total_purchases = 0;

    RAISE NOTICE 'ENTRIES:';
    RAISE NOTICE '  Total active entries: %', v_total_entries;
    RAISE NOTICE '  Entries with transactions (>= 1): %', v_entries_with_transactions;
    RAISE NOTICE '  Entries without transactions (0): %', v_entries_without_transactions;
    RAISE NOTICE '';

    RAISE NOTICE '=== Verification Complete ===';
END $$;

-- =============================================================================
-- NOTES
-- =============================================================================
-- This script can be run multiple times safely - it will always recalculate
-- stats from the source data (transactions and entries).
--
-- After running this script, the following should be true:
-- 1. All entry stats match their transaction counts
-- 2. All feed stats match their aggregated entry counts
-- 3. Feeds with 0 entries will be filtered out by leaderboard endpoints
--
-- To run this script:
--   psql $DB_URL -f migrations/recalculate_feed_stats.sql
