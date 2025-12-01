# Database Migrations

This directory contains database migration scripts for the Grapevine API.

## Migration Files

### 002_update_feed_performance_summary_view.sql

**Date**: 2025-10-30

**Description**: Updates the `gv_feed_performance_summary` view to include category information and competitive landscape metrics.

**Changes**:
- Adds `category_id` (UUID) - The category the feed belongs to
- Adds `category_name` (string) - Human-readable category name
- Adds `total_feeds_per_category` (integer) - Count of all feeds in the same category

**Purpose**: Provides better context for analyzing feed performance relative to their category and understanding the competitive landscape.

## Running Migrations

### Prerequisites

1. Ensure `DB_URL` is set in your `.env` file:
   ```
   DB_URL=postgresql://user:password@host:port/database
   ```

2. Install Node.js dependencies (already done if you've set up the project)

### Analyze Current Schema

To analyze the current database schema without making changes:

```bash
node migrations/analyze_and_migrate.mjs --analyze
```

This will:
- Check if the view exists
- Display current view definition and columns
- Identify missing columns that the migration will add
- Verify dependent tables exist

### Run Migration

To execute a migration:

```bash
node migrations/analyze_and_migrate.mjs --migrate
```

### Analyze and Migrate

To analyze first, then confirm before migrating:

```bash
node migrations/analyze_and_migrate.mjs --both
```

This will show the analysis, then prompt you to confirm before running the migration.

## Migration Script Features

The `analyze_and_migrate.mjs` script provides:

- **Schema Analysis**: Compares current database schema against expected schema
- **Colored Output**: Green for success, red for errors, yellow for warnings
- **Verification**: Automatically verifies the migration after execution
- **Safety**: Shows the migration SQL before executing
- **Error Handling**: Rolls back on errors

## Schema Differences

### Live Database vs. schema.sql

The live database has some column name differences from `schema.sql`:

**gv_transactions table**:
- Live DB uses: `from_wallet_address`, `to_wallet_id`
- schema.sql uses: `payer`, `pay_to`

Migrations are written to work with the live database schema.

## Creating Migration Scripts

**IMPORTANT**: Every time a database schema change is made, you MUST create a corresponding migration script.

### When to Create a Migration

Create a migration script whenever you:
- Add, modify, or remove tables
- Add, modify, or remove columns
- Add, modify, or remove indexes
- Create, update, or drop views
- Create, update, or drop functions/triggers
- Change column types or constraints
- Add or modify foreign keys

### Migration Naming Convention

Use sequential numbering with descriptive names:
```
XXX_descriptive_name.sql
```

Examples:
- `006_filter_feeds_min_entries.sql`
- `007_add_user_preferences_table.sql`
- `008_update_category_stats_view.sql`

### Migration File Template

```sql
-- Migration XXX: Brief description of what this migration does
-- Date: YYYY-MM-DD
-- Description: Detailed explanation of the changes and their purpose

-- =============================================================================
-- Section 1: First set of changes (e.g., Table modifications)
-- =============================================================================
-- Describe what this section does

-- SQL statements here

-- =============================================================================
-- Section 2: Second set of changes (e.g., View updates)
-- =============================================================================
-- Describe what this section does

-- SQL statements here

-- =============================================================================
-- NOTES
-- =============================================================================
-- Any important notes about:
-- - Related code changes
-- - Breaking changes
-- - Performance considerations
-- - Dependencies
```

### Steps to Create a Migration

1. **Make your changes** to `schema.sql` first
2. **Create a new migration file** with the next sequential number
3. **Document the changes** with clear comments
4. **Include all related changes** in a single migration when they're interdependent
5. **Test locally** before committing
6. **Update this README** if adding new migration patterns or conventions

## Migration Workflow

1. **Develop locally** using the test database (PGlite)
2. **Update schema.sql** with your changes
3. **Create migration file** in `migrations/` directory (numbered sequentially)
4. **Test migration** against a development database first
5. **Run analysis** on production database
6. **Execute migration** on production during maintenance window
7. **Verify** the migration completed successfully

## Best Practices

- Always analyze before migrating
- Test migrations on a development database first
- Back up production database before migrations
- Run migrations during low-traffic periods
- Keep migration files small and focused
- Document what changed and why
- Never modify old migration files (create new ones for fixes)

## Rollback

To rollback a migration, you'll need to:

1. Manually write a rollback SQL script
2. Test it on development first
3. Execute carefully on production

Example rollback for 002:

```sql
-- Rollback: Restore original gv_feed_performance_summary view
DROP VIEW IF EXISTS gv_feed_performance_summary;
CREATE OR REPLACE VIEW gv_feed_performance_summary AS
SELECT
    f.id,
    f.name,
    f.total_entries,
    COUNT(DISTINCT t.id) as total_purchases,
    COALESCE(SUM(t.amount), 0) as total_revenue,
    COUNT(DISTINCT t.from_wallet_address) as unique_buyers
FROM gv_feeds f
LEFT JOIN gv_feed_entries fe ON f.id = fe.feed_id
LEFT JOIN gv_transactions t ON fe.id = t.entry_id
GROUP BY f.id, f.name, f.total_entries;
```

## Troubleshooting

### "DB_URL environment variable not set"

Make sure `.env` file exists and contains `DB_URL`. You may need to export it:

```bash
export $(cat .env | xargs)
node migrations/analyze_and_migrate.mjs --analyze
```

### "column t.payer does not exist"

This indicates a schema mismatch. The live database uses different column names. Migrations should use the live schema column names (e.g., `from_wallet_address` instead of `payer`).

### Connection errors

- Verify database is running and accessible
- Check firewall rules
- Confirm database credentials are correct
- Ensure network connectivity to database host
