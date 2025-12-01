-- PostgreSQL Schema for Decentralized Data Feeds Platform
-- Last Updated: 2025-10-30
--
-- Features:
-- - Multi-chain wallet authentication (Base, Ethereum, Polygon + testnets)
-- - Optional category-based feed organization
-- - Real-time purchase & revenue tracking via database triggers
-- - Payment instructions with multi-network support
-- - Automatic stats maintenance on transaction insert/update/delete

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- WALLETS & AUTHENTICATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS gv_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL, -- Wallet address (Ethereum format: 0x + 40 hex chars)
    wallet_address_network VARCHAR(64) NOT NULL, -- Network: base, base-sepolia, ethereum, ethereum-sepolia, polygon, polygon-amoy
    username VARCHAR(64) UNIQUE,
    picture_url TEXT, -- Profile picture URL
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    CONSTRAINT chk_wallet_address_length CHECK (LENGTH(wallet_address) = 42),
    CONSTRAINT idx_gv_wallets_address_network UNIQUE (wallet_address, wallet_address_network)
);

CREATE INDEX IF NOT EXISTS idx_gv_wallets_wallet ON gv_wallets(wallet_address);

-- =============================================================================
-- CATEGORIES & TAXONOMY
-- =============================================================================

CREATE TABLE IF NOT EXISTS gv_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
);

-- =============================================================================
-- DATA FEEDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS gv_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES gv_wallets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES gv_categories(id) ON DELETE RESTRICT, -- Optional category

    -- Feed metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_cid TEXT,

    -- Settings
    is_active BOOLEAN DEFAULT TRUE,

    -- Stats (automatically maintained by triggers)
    total_entries INTEGER DEFAULT 0, -- Updated by update_feed_entry_count()
    total_purchases INTEGER DEFAULT 0, -- Updated by update_feed_transaction_stats()
    total_revenue BIGINT DEFAULT 0, -- Wei amount, updated by update_feed_transaction_stats() (supports up to ~9.2e18)

    -- Metadata
    tags TEXT[], -- Array of tags for search

    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_gv_feeds_owner ON gv_feeds(owner_id);
CREATE INDEX IF NOT EXISTS idx_gv_feeds_category ON gv_feeds(category_id);
CREATE INDEX IF NOT EXISTS idx_gv_feeds_active ON gv_feeds(is_active);
CREATE INDEX IF NOT EXISTS idx_gv_feeds_tags ON gv_feeds USING GIN(tags);

-- =============================================================================
-- PAYMENT INSTRUCTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_instructions (
    id                    UUID PRIMARY KEY                        NOT NULL DEFAULT gen_random_uuid(),
    user_id               UUID                                    NOT NULL REFERENCES gv_wallets(id),
    payment_requirements  JSONB                                   NOT NULL,
    version               INT   DEFAULT 1                         NOT NULL,
    created_at            BIGINT                                  NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    updated_at            BIGINT                                  NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    deleted_at            BIGINT
);

-- =============================================================================
-- FEED ENTRIES (MESSAGES)
-- =============================================================================

CREATE TABLE IF NOT EXISTS gv_feed_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID NOT NULL REFERENCES gv_feeds(id) ON DELETE CASCADE,

    -- Content
    cid VARCHAR(255) NOT NULL, -- IPFS Content Identifier
    mime_type VARCHAR(50) NOT NULL, -- MIME type
    pinata_upload_id UUID, -- Pinata V3 upload ID

    -- Metadata
    title VARCHAR(500),
    description TEXT,
    metadata TEXT,
    tags TEXT[],

    -- Pricing
    price BIGINT NOT NULL DEFAULT 0, -- Wei/smallest unit amount (microUSDC for USDC)
    asset VARCHAR(10) DEFAULT 'USDC',
    is_free BOOLEAN DEFAULT FALSE,
    expires_at BIGINT, -- When data becomes stale (epoch)

    -- Payment
    piid UUID, --REFERENCES payment_instructions(id) ON DELETE SET NULL, -- payment instruction x402 id

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Stats (automatically maintained by triggers)
    total_purchases INTEGER DEFAULT 0, -- Updated by update_entry_transaction_stats()
    total_revenue BIGINT DEFAULT 0, -- Wei amount, updated by update_entry_transaction_stats() (supports up to ~9.2e18)

    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_gv_feed_entries_feed ON gv_feed_entries(feed_id);
CREATE INDEX IF NOT EXISTS idx_gv_feed_entries_cid ON gv_feed_entries(cid);
CREATE INDEX IF NOT EXISTS idx_gv_feed_entries_pinata_upload_id ON gv_feed_entries(pinata_upload_id);
CREATE INDEX IF NOT EXISTS idx_gv_feed_entries_created_at ON gv_feed_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gv_feed_entries_tags ON gv_feed_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_gv_feed_entries_expires ON gv_feed_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_gv_feed_entries_is_active ON gv_feed_entries(is_active);

-- =============================================================================
-- PLATFORM TRANSACTIONS & REVENUE
-- =============================================================================

CREATE TABLE IF NOT EXISTS gv_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    piid UUID, -- REFERENCES payment_instructions(id) ON DELETE SET NULL, -- payment instruction x402 id

    -- Parties (for purchases: payer = buyer, pay_to = provider)
    payer VARCHAR(42) NOT NULL, -- Wallet address (Ethereum format: 0x + 40 hex chars)
    pay_to VARCHAR(42) NOT NULL, -- Wallet address (Ethereum format: 0x + 40 hex chars)

    -- Amounts
    amount BIGINT NOT NULL, -- Total amount paid by buyer in wei/smallest unit
    asset VARCHAR(255) NOT NULL,

    -- Related entities
    entry_id UUID REFERENCES gv_feed_entries(id) ON DELETE SET NULL,

    -- Blockchain
    transaction_hash VARCHAR(66) UNIQUE NOT NULL,

    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
);

-- Partial unique index for purchases only
CREATE UNIQUE INDEX IF NOT EXISTS idx_gv_transactions_unique_purchase ON gv_transactions(entry_id, payer);
CREATE INDEX IF NOT EXISTS idx_gv_transactions_from ON gv_transactions(payer);
CREATE INDEX IF NOT EXISTS idx_gv_transactions_to ON gv_transactions(pay_to);
CREATE INDEX IF NOT EXISTS idx_gv_transactions_entry ON gv_transactions(entry_id);
CREATE INDEX IF NOT EXISTS idx_gv_transactions_hash ON gv_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_gv_transactions_created ON gv_transactions(created_at DESC);

-- =============================================================================
-- ANALYTICS & METRICS
-- =============================================================================

-- NOTE: gv_feed_analytics table is currently unused by the API
-- Analytics are calculated dynamically from views and aggregated queries
-- This table can be used in the future for pre-computed time-series analytics
--
-- CREATE TABLE IF NOT EXISTS gv_feed_analytics (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     feed_id UUID NOT NULL REFERENCES gv_feeds(id) ON DELETE CASCADE,
--
--     -- Time period
--     period_start BIGINT NOT NULL,
--     period_end BIGINT NOT NULL,
--     period_type VARCHAR(20) NOT NULL, -- hourly, daily, weekly, monthly
--
--     -- Metrics
--     entries_published INTEGER DEFAULT 0,
--     total_views INTEGER DEFAULT 0,
--     total_purchases INTEGER DEFAULT 0,
--     total_revenue DECIMAL(18, 8) DEFAULT 0,
--
--     created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
--
--     UNIQUE(feed_id, period_start, period_type)
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_gv_feed_analytics_feed ON gv_feed_analytics(feed_id);
-- CREATE INDEX IF NOT EXISTS idx_gv_feed_analytics_period ON gv_feed_analytics(period_start DESC);
-- CREATE INDEX IF NOT EXISTS idx_gv_feed_analytics_type ON gv_feed_analytics(period_type);
-- COMMENT ON TABLE gv_feed_analytics IS 'Time-series metrics for feeds';

-- =============================================================================
-- USER STATS (Gamification)
-- =============================================================================

-- User stats (cached for quick leaderboard access)
CREATE TABLE IF NOT EXISTS gv_wallet_stats (
    wallet_id UUID PRIMARY KEY REFERENCES gv_wallets(id) ON DELETE CASCADE,

    -- Provider stats
    total_feeds_created INTEGER DEFAULT 0,
    total_entries_published INTEGER DEFAULT 0,
    total_revenue_earned DECIMAL(18, 8) DEFAULT 0,
    total_items_sold INTEGER DEFAULT 0,
    unique_buyers_count INTEGER DEFAULT 0,

    -- Buyer stats
    total_purchases_made INTEGER DEFAULT 0,
    total_amount_spent DECIMAL(18, 8) DEFAULT 0,
    unique_feeds_purchased_from INTEGER DEFAULT 0,

    -- Rankings
    revenue_rank INTEGER,
    purchases_rank INTEGER,

    last_calculated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_gv_wallet_stats_revenue ON gv_wallet_stats(total_revenue_earned DESC);
CREATE INDEX IF NOT EXISTS idx_gv_wallet_stats_purchases ON gv_wallet_stats(total_purchases_made DESC);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Top feeds by entry count
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

-- Recent entries
CREATE OR REPLACE VIEW gv_recent_entries AS
SELECT
    fe.*,
    f.name as feed_name,
    f.owner_id as feed_owner_id,
    u.wallet_address as owner_wallet,
    c.name as category_name
FROM gv_feed_entries fe
JOIN gv_feeds f ON fe.feed_id = f.id
JOIN gv_wallets u ON f.owner_id = u.id
JOIN gv_categories c ON f.category_id = c.id
ORDER BY fe.created_at DESC
LIMIT 100;

-- NOTE: gv_feed_performance_summary view was removed in migration 008
-- It was not used by the application. Feed performance data is calculated
-- dynamically when needed or cached in the gv_feeds table (total_entries,
-- total_purchases, total_revenue).

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

-- =============================================================================
-- LEADERBOARD VIEWS (Gamification)
-- =============================================================================
-- NOTE: Most leaderboard endpoints use dynamic queries instead of views
-- to support flexible time period filtering (1d, 7d, 30d, all).
-- See: src/routes/leaderboards.ts
--
-- The following views were removed in migration 008:
-- - gv_leaderboard_top_revenue (dynamic query used instead)
-- - gv_leaderboard_top_providers (dynamic query used instead)
-- - gv_leaderboard_top_buyers (dynamic query used instead)
-- - gv_leaderboard_most_popular (dynamic query used instead)

-- Trending feeds (most revenue in last 7 days)
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
-- TRIGGERS
-- =============================================================================

-- Update feed stats when new entry is added
CREATE OR REPLACE FUNCTION update_feed_entry_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE gv_feeds
    SET total_entries = total_entries + 1,
        updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
    WHERE id = NEW.feed_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feed_entry_count
AFTER INSERT ON gv_feed_entries
FOR EACH ROW
EXECUTE FUNCTION update_feed_entry_count();

-- Update timestamp on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON gv_wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feeds_updated_at BEFORE UPDATE ON gv_feeds
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON gv_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update entry stats when transaction is added/updated/deleted
-- Maintains real-time purchase count and revenue totals per entry
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

CREATE TRIGGER trigger_update_entry_transaction_stats
AFTER INSERT OR UPDATE OR DELETE ON gv_transactions
FOR EACH ROW
EXECUTE FUNCTION update_entry_transaction_stats();

-- Update feed stats when transaction is added/updated/deleted
-- Aggregates purchase counts and revenue from all entries in the feed
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

CREATE TRIGGER trigger_update_feed_transaction_stats
AFTER INSERT OR UPDATE OR DELETE ON gv_transactions
FOR EACH ROW
EXECUTE FUNCTION update_feed_transaction_stats();

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================================

-- Insert root categories
INSERT INTO gv_categories (name, description) VALUES
    ('Finance', 'Financial markets and economic indicators'),
    ('Sports', 'Athletic competitions and sporting events'),
    ('Business', 'Corporate earnings reports and financial results'),
    ('Tech', 'Technology news and AI developments'),
    ('Politics', 'Political events, elections, and policy'),
    ('Crypto', 'Blockchain, crypto markets, and Web3'),
    ('Games', 'Video games, esports, and gaming industry news');

-- =============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================================================

-- Check if user has access to entry
CREATE OR REPLACE FUNCTION wallet_has_access_to_entry(
    p_wallet_id UUID,
    p_entry_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := FALSE;
BEGIN
    -- Check if entry is free
    IF EXISTS (SELECT 1 FROM gv_feed_entries WHERE id = p_entry_id AND is_free = true) THEN
        RETURN TRUE;
    END IF;

    -- Check if user purchased entry
    IF EXISTS (
        SELECT 1
        FROM gv_transactions t
        JOIN gv_wallets w ON t.payer = w.wallet_address
        WHERE t.entry_id = p_entry_id AND w.id = p_wallet_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check if user owns the feed
    IF EXISTS (
        SELECT 1
        FROM gv_feed_entries fe
        JOIN gv_feeds f ON fe.feed_id = f.id
        WHERE fe.id = p_entry_id AND f.owner_id = p_wallet_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Update wallet stats (call this periodically or on relevant events)
CREATE OR REPLACE FUNCTION update_wallet_stats(p_wallet_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO gv_wallet_stats (
        wallet_id,
        total_feeds_created,
        total_entries_published,
        total_revenue_earned,
        total_items_sold,
        unique_buyers_count,
        total_purchases_made,
        total_amount_spent,
        unique_feeds_purchased_from,
        last_calculated_at
    )
    SELECT
        p_wallet_id,
        -- Provider stats
        COALESCE((SELECT COUNT(*) FROM gv_feeds WHERE owner_id = p_wallet_id), 0),
        COALESCE((SELECT COUNT(*) FROM gv_feed_entries fe JOIN gv_feeds f ON fe.feed_id = f.id WHERE f.owner_id = p_wallet_id), 0),
        COALESCE((SELECT SUM(t.amount) FROM gv_transactions t JOIN gv_feed_entries fe ON t.entry_id = fe.id JOIN gv_feeds f ON fe.feed_id = f.id WHERE f.owner_id = p_wallet_id), 0),
        COALESCE((SELECT COUNT(*) FROM gv_transactions t JOIN gv_feed_entries fe ON t.entry_id = fe.id JOIN gv_feeds f ON fe.feed_id = f.id WHERE f.owner_id = p_wallet_id), 0),
        COALESCE((SELECT COUNT(DISTINCT t.payer) FROM gv_transactions t JOIN gv_feed_entries fe ON t.entry_id = fe.id JOIN gv_feeds f ON fe.feed_id = f.id WHERE f.owner_id = p_wallet_id), 0),
        -- Buyer stats
        COALESCE((SELECT COUNT(*) FROM gv_transactions t JOIN gv_wallets w ON t.payer = w.wallet_address WHERE w.id = p_wallet_id), 0),
        COALESCE((SELECT SUM(amount) FROM gv_transactions t JOIN gv_wallets w ON t.payer = w.wallet_address WHERE w.id = p_wallet_id), 0),
        COALESCE((SELECT COUNT(DISTINCT fe.feed_id) FROM gv_transactions t JOIN gv_wallets w ON t.payer = w.wallet_address JOIN gv_feed_entries fe ON t.entry_id = fe.id WHERE w.id = p_wallet_id), 0),
        EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT
    ON CONFLICT (wallet_id) DO UPDATE SET
        total_feeds_created = EXCLUDED.total_feeds_created,
        total_entries_published = EXCLUDED.total_entries_published,
        total_revenue_earned = EXCLUDED.total_revenue_earned,
        total_items_sold = EXCLUDED.total_items_sold,
        unique_buyers_count = EXCLUDED.unique_buyers_count,
        total_purchases_made = EXCLUDED.total_purchases_made,
        total_amount_spent = EXCLUDED.total_amount_spent,
        unique_feeds_purchased_from = EXCLUDED.unique_feeds_purchased_from,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update wallet stats after transaction insert
CREATE OR REPLACE FUNCTION update_wallet_stats_after_transaction()
RETURNS TRIGGER AS $$
DECLARE
    payer_wallet_id UUID;
    payee_wallet_id UUID;
BEGIN
    -- Get wallet IDs for payer and payee
    SELECT id INTO payer_wallet_id FROM gv_wallets WHERE wallet_address = NEW.payer;
    SELECT id INTO payee_wallet_id FROM gv_wallets WHERE wallet_address = NEW.pay_to;

    -- Update stats for payer wallet if it exists
    IF payer_wallet_id IS NOT NULL THEN
        PERFORM update_wallet_stats(payer_wallet_id);
    END IF;

    -- Update stats for payee wallet if it exists
    IF payee_wallet_id IS NOT NULL THEN
        PERFORM update_wallet_stats(payee_wallet_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update wallet stats after transaction insert
DROP TRIGGER IF EXISTS trigger_update_wallet_stats ON gv_transactions;
CREATE TRIGGER trigger_update_wallet_stats
    AFTER INSERT ON gv_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_stats_after_transaction();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE gv_wallets IS 'Platform wallets - providers and consumers';
COMMENT ON TABLE gv_categories IS 'Hierarchical taxonomy for data feeds';
COMMENT ON TABLE gv_feeds IS 'Data feed containers - each has own smart contract';
COMMENT ON TABLE gv_feed_entries IS 'Individual data entries (messages) published to feeds';
COMMENT ON TABLE gv_transactions IS 'All blockchain transactions - purchases, withdrawals, etc. Purchases follow buy once, see message once model';
COMMENT ON TABLE gv_wallet_stats IS 'Cached wallet statistics for leaderboards and performance';
