-- Migration 006: Filter leaderboard views to only show feeds with minimum 1 entry
-- Date: 2025-11-11
-- Description: Updates gv_top_feeds and gv_leaderboard_trending_feeds views to filter out
--              feeds with zero entries, ensuring leaderboards only display feeds with content.

-- =============================================================================
-- Update gv_top_feeds view
-- =============================================================================
-- Add filter for total_entries >= 1 to only show feeds with at least one entry
CREATE OR REPLACE VIEW gv_top_feeds AS
SELECT
    f.*,
    u.wallet_address as owner_wallet,
    u.username as owner_username,
    c.name as category_name
FROM gv_feeds f
JOIN gv_wallets u ON f.owner_id = u.id
LEFT JOIN gv_categories c ON f.category_id = c.id
WHERE f.is_active = true AND f.total_entries >= 1
ORDER BY f.total_entries DESC
LIMIT 100;

-- =============================================================================
-- Update gv_leaderboard_trending_feeds view
-- =============================================================================
-- Add filter for total_entries >= 1 to only show feeds with at least one entry
-- Also add all feed properties (id, owner_id, category_id, description, image_cid,
-- is_active, total_entries, total_purchases, total_revenue, tags, created_at,
-- updated_at) to match the structure of gv_top_feeds
CREATE OR REPLACE VIEW gv_leaderboard_trending_feeds AS
SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) as rank,
    f.id,
    f.owner_id,
    f.category_id,
    f.name,
    f.description,
    f.image_cid,
    f.is_active,
    f.total_entries,
    f.total_purchases,
    f.total_revenue,
    f.tags,
    f.created_at,
    f.updated_at,
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
WHERE f.is_active = true AND f.total_entries >= 1
GROUP BY f.id, f.owner_id, f.category_id, f.name, f.description, f.image_cid, f.is_active, f.total_entries, f.total_purchases, f.total_revenue, f.tags, f.created_at, f.updated_at, u.username, u.wallet_address, c.name
HAVING COUNT(DISTINCT t.id) > 0
ORDER BY revenue_last_7d DESC
LIMIT 50;

-- =============================================================================
-- NOTES
-- =============================================================================
-- The most-popular endpoint uses a dynamic query (not a view) and has been
-- updated directly in the application code at:
-- grapevine-api/src/routes/leaderboards.ts (line 495)
--
-- This ensures all three leaderboard endpoints (top-feeds, trending, most-popular)
-- consistently filter feeds to only show those with at least 1 entry.
