-- Migration 008: Remove Unused Database Views
-- Date: 2025-11-11
-- Description: Removes database views that are not used by the application.
--              All leaderboard endpoints use dynamic queries with time period filtering
--              instead of pre-computed views, making these views redundant.

-- =============================================================================
-- BACKGROUND
-- =============================================================================
-- The application has evolved to use dynamic queries for leaderboards because:
-- 1. Need to support flexible time period filtering (1d, 7d, 30d, all)
-- 2. Views can't handle dynamic WHERE clauses efficiently
-- 3. Dynamic queries are more maintainable and testable
--
-- The following views are defined in schema.sql but NOT used in the codebase:
-- - gv_leaderboard_top_revenue
-- - gv_leaderboard_top_providers
-- - gv_leaderboard_top_buyers
-- - gv_leaderboard_most_popular
-- - gv_feed_performance_summary
--
-- Views still in use (will NOT be dropped):
-- - gv_top_feeds (used by /v1/leaderboards/top-feeds)
-- - gv_recent_entries (used by /v1/leaderboards/recent-entries)
-- - gv_leaderboard_trending_feeds (used by /v1/leaderboards/trending)
-- - gv_category_stats (used by /v1/leaderboards/category-stats)

-- =============================================================================
-- VERIFICATION (run before migration)
-- =============================================================================
-- Verify these views are not used in the codebase:
-- grep -r "gv_leaderboard_top_revenue\|gv_leaderboard_top_providers\|gv_leaderboard_top_buyers\|gv_leaderboard_most_popular\|gv_feed_performance_summary" src/ test/
-- (Should return no results)

-- =============================================================================
-- DROP UNUSED VIEWS
-- =============================================================================

-- Drop unused leaderboard views
DROP VIEW IF EXISTS gv_leaderboard_top_revenue CASCADE;
DROP VIEW IF EXISTS gv_leaderboard_top_providers CASCADE;
DROP VIEW IF EXISTS gv_leaderboard_top_buyers CASCADE;
DROP VIEW IF EXISTS gv_leaderboard_most_popular CASCADE;

-- Drop unused performance summary view
DROP VIEW IF EXISTS gv_feed_performance_summary CASCADE;

-- =============================================================================
-- VERIFICATION (run after migration)
-- =============================================================================
-- Verify only used views remain:
-- SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE 'gv_%';
--
-- Expected output (4 views):
-- - gv_top_feeds
-- - gv_recent_entries
-- - gv_leaderboard_trending_feeds
-- - gv_category_stats

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- If you need to restore these views, they are defined in schema.sql at:
-- - Lines 318-341: gv_leaderboard_top_revenue
-- - Lines 343-364: gv_leaderboard_top_providers
-- - Lines 366-383: gv_leaderboard_top_buyers
-- - Lines 420-446: gv_leaderboard_most_popular
-- - Lines 274-290: gv_feed_performance_summary

-- =============================================================================
-- NOTES
-- =============================================================================
-- After this migration, schema.sql should be updated to:
-- 1. Remove or comment out the dropped view definitions
-- 2. Add a note explaining why they were removed
-- 3. Document that leaderboards use dynamic queries instead
