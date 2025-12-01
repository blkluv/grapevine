-- =============================================================================
-- One-time script to sync wallet stats for all existing wallets
-- =============================================================================
-- This script updates wallet statistics for all wallets in the system
-- Run this once to populate/sync the gv_wallet_stats table
-- =============================================================================

DO $$
DECLARE
    wallet_record RECORD;
    total_wallets INTEGER;
    processed_count INTEGER := 0;
BEGIN
    -- Get total count of wallets
    SELECT COUNT(*) INTO total_wallets FROM gv_wallets;

    RAISE NOTICE 'Starting wallet stats sync for % wallets...', total_wallets;

    -- Loop through all wallets and update their stats
    FOR wallet_record IN
        SELECT id, wallet_address FROM gv_wallets
    LOOP
        -- Update stats for this wallet
        PERFORM update_wallet_stats(wallet_record.id);

        processed_count := processed_count + 1;

        -- Log progress every 100 wallets
        IF processed_count % 100 = 0 THEN
            RAISE NOTICE 'Processed % / % wallets...', processed_count, total_wallets;
        END IF;
    END LOOP;

    RAISE NOTICE 'Wallet stats sync complete! Processed % wallets.', processed_count;
END $$;

-- Verify results
SELECT
    COUNT(*) as total_stats_records,
    COUNT(DISTINCT wallet_id) as unique_wallets,
    MAX(last_calculated_at) as latest_calculation,
    MIN(last_calculated_at) as earliest_calculation
FROM gv_wallet_stats;
