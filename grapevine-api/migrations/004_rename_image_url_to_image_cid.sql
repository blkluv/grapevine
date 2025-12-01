-- Migration: Rename image_url to image_cid in gv_feeds table
-- This migration renames the image_url column to image_cid to better reflect
-- that we're storing IPFS CIDs instead of URLs

-- Rename the column (skip if already done)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'gv_feeds' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE gv_feeds RENAME COLUMN image_url TO image_cid;
    END IF;
END $$;

-- Drop and recreate the gv_top_feeds view to use the new column name
DROP VIEW IF EXISTS gv_top_feeds;
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
