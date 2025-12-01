-- Migration: Update gv_feed_performance_summary view
-- Date: 2025-10-30
-- Description: Add category_id, category_name, and total_feeds_per_category to feed performance summary view
--
-- This migration adds category information and a count of total feeds per category to the
-- feed performance summary view, providing better context for analyzing feed performance
-- relative to their category.

-- Drop the existing view
DROP VIEW IF EXISTS gv_feed_performance_summary;

-- Recreate the view with new fields
-- Note: Uses from_wallet_address instead of payer (live schema difference)
CREATE OR REPLACE VIEW gv_feed_performance_summary AS
SELECT
    f.id,
    f.name,
    f.category_id,
    c.name as category_name,
    f.total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0) as total_revenue,
    COUNT(DISTINCT t.from_wallet_address) as unique_buyers,
    (SELECT COUNT(*) FROM gv_feeds WHERE category_id = f.category_id) as total_feeds_per_category
FROM gv_feeds f
LEFT JOIN gv_categories c ON f.category_id = c.id
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
GROUP BY f.id, f.name, f.category_id, c.name, f.total_entries;

-- Add comment describing the view
COMMENT ON VIEW gv_feed_performance_summary IS 'Feed performance metrics including category information and competitive landscape (total feeds per category)';
