#!/usr/bin/env node
/**
 * Full Database Schema Analysis Tool
 * Comprehensive comparison between live database and schema.sql
 *
 * Usage:
 *   node full_schema_analysis.mjs
 */

import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function getDbConnection() {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    log('ERROR: DB_URL environment variable not set', 'red');
    log('Please set DB_URL in your .env file or environment', 'red');
    process.exit(1);
  }

  return new Pool({ connectionString: dbUrl });
}

async function getAllTables(pool) {
  const result = await pool.query(`
    SELECT
      table_name,
      table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'gv_%' OR table_name = 'payment_instructions'
    ORDER BY table_name;
  `);
  return result.rows;
}

async function getTableColumns(pool, tableName) {
  const result = await pool.query(`
    SELECT
      column_name,
      data_type,
      character_maximum_length,
      column_default,
      is_nullable,
      udt_name
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position;
  `, [tableName]);
  return result.rows;
}

async function getTableIndexes(pool, tableName) {
  const result = await pool.query(`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = $1
    AND schemaname = 'public'
    ORDER BY indexname;
  `, [tableName]);
  return result.rows;
}

async function getTableConstraints(pool, tableName) {
  const result = await pool.query(`
    SELECT
      constraint_name,
      constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = $1
    AND table_schema = 'public'
    ORDER BY constraint_name;
  `, [tableName]);
  return result.rows;
}

async function getAllViews(pool) {
  const result = await pool.query(`
    SELECT
      table_name as view_name,
      view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name LIKE 'gv_%'
    ORDER BY table_name;
  `);
  return result.rows;
}

async function getViewColumns(pool, viewName) {
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position;
  `, [viewName]);
  return result.rows;
}

function parseSchemaFile(schemaContent) {
  const tables = new Map();
  const views = new Map();

  // Extract table definitions
  const tableRegex = /CREATE TABLE[^(]*\(([^;]*)\);/gs;
  let match;

  while ((match = tableRegex.exec(schemaContent)) !== null) {
    const tableDef = match[0];
    const tableNameMatch = tableDef.match(/CREATE TABLE[^(]*\s+(\w+)/);
    if (tableNameMatch) {
      tables.set(tableNameMatch[1], tableDef);
    }
  }

  // Extract view definitions
  const viewRegex = /CREATE (?:OR REPLACE )?VIEW\s+(\w+)\s+AS\s+SELECT([^;]*);/gs;
  while ((match = viewRegex.exec(schemaContent)) !== null) {
    views.set(match[1], match[0]);
  }

  return { tables, views };
}

async function analyzeSchema() {
  log('\n' + '='.repeat(100), 'bright');
  log('COMPREHENSIVE DATABASE SCHEMA ANALYSIS', 'bright');
  log('='.repeat(100) + '\n', 'bright');

  const pool = getDbConnection();
  const differences = [];

  try {
    // Read schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const schemaSpec = parseSchemaFile(schemaContent);

    log('1. ANALYZING TABLES', 'cyan');
    log('-'.repeat(100), 'bright');

    const liveTables = await getAllTables(pool);
    const baseTables = liveTables.filter(t => t.table_type === 'BASE TABLE');

    for (const table of baseTables) {
      const tableName = table.table_name;
      log(`\n📊 Table: ${tableName}`, 'blue');

      // Get live columns
      const liveColumns = await getTableColumns(pool, tableName);
      log(`   Columns: ${liveColumns.length}`, 'green');

      // Show column details
      for (const col of liveColumns) {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const type = col.character_maximum_length
          ? `${col.data_type}(${col.character_maximum_length})`
          : col.data_type;
        console.log(`     - ${col.column_name}: ${type} ${nullable}`);
      }

      // Get indexes
      const indexes = await getTableIndexes(pool, tableName);
      if (indexes.length > 0) {
        log(`   Indexes: ${indexes.length}`, 'green');
        for (const idx of indexes) {
          console.log(`     - ${idx.indexname}`);
        }
      }

      // Get constraints
      const constraints = await getTableConstraints(pool, tableName);
      if (constraints.length > 0) {
        log(`   Constraints: ${constraints.length}`, 'green');
        for (const con of constraints) {
          console.log(`     - ${con.constraint_name} (${con.constraint_type})`);
        }
      }

      // Check if table exists in schema.sql
      if (!schemaSpec.tables.has(tableName)) {
        differences.push({
          type: 'missing_in_schema',
          object: 'table',
          name: tableName,
          message: `Table ${tableName} exists in live DB but not in schema.sql`
        });
        log(`   ⚠️  WARNING: Table not found in schema.sql`, 'yellow');
      }
    }

    log('\n\n2. ANALYZING VIEWS', 'cyan');
    log('-'.repeat(100), 'bright');

    const liveViews = await getAllViews(pool);

    for (const view of liveViews) {
      const viewName = view.view_name;
      log(`\n👁️  View: ${viewName}`, 'blue');

      const columns = await getViewColumns(pool, viewName);
      log(`   Columns: ${columns.length}`, 'green');

      for (const col of columns) {
        console.log(`     - ${col.column_name}: ${col.data_type}`);
      }

      // Check if view exists in schema.sql
      if (!schemaSpec.views.has(viewName)) {
        differences.push({
          type: 'missing_in_schema',
          object: 'view',
          name: viewName,
          message: `View ${viewName} exists in live DB but not in schema.sql`
        });
        log(`   ⚠️  WARNING: View not found in schema.sql`, 'yellow');
      }
    }

    // Compare schema.sql vs live
    log('\n\n3. SCHEMA.SQL vs LIVE DATABASE', 'cyan');
    log('-'.repeat(100), 'bright');

    const liveTableNames = new Set(baseTables.map(t => t.table_name));
    const liveViewNames = new Set(liveViews.map(v => v.view_name));

    log('\nTables in schema.sql but not in live DB:', 'yellow');
    let foundMissing = false;
    for (const tableName of schemaSpec.tables.keys()) {
      if (!liveTableNames.has(tableName)) {
        log(`   - ${tableName}`, 'red');
        foundMissing = true;
        differences.push({
          type: 'missing_in_live',
          object: 'table',
          name: tableName,
          message: `Table ${tableName} defined in schema.sql but not in live DB`
        });
      }
    }
    if (!foundMissing) {
      log('   None', 'green');
    }

    log('\nViews in schema.sql but not in live DB:', 'yellow');
    foundMissing = false;
    for (const viewName of schemaSpec.views.keys()) {
      if (!liveViewNames.has(viewName)) {
        log(`   - ${viewName}`, 'red');
        foundMissing = true;
        differences.push({
          type: 'missing_in_live',
          object: 'view',
          name: viewName,
          message: `View ${viewName} defined in schema.sql but not in live DB`
        });
      }
    }
    if (!foundMissing) {
      log('   None', 'green');
    }

    // Summary
    log('\n\n4. SUMMARY', 'cyan');
    log('='.repeat(100), 'bright');
    log(`\nLive Database:`, 'bright');
    log(`   Tables: ${baseTables.length}`, 'green');
    log(`   Views: ${liveViews.length}`, 'green');
    log(`\nschema.sql:`, 'bright');
    log(`   Tables: ${schemaSpec.tables.size}`, 'green');
    log(`   Views: ${schemaSpec.views.size}`, 'green');

    if (differences.length > 0) {
      log(`\n⚠️  Found ${differences.length} differences:`, 'yellow');
      for (const diff of differences) {
        log(`   - ${diff.message}`, diff.type === 'missing_in_live' ? 'red' : 'yellow');
      }
    } else {
      log('\n✓ Schema is in sync!', 'green');
    }

    log('\n' + '='.repeat(100), 'bright');
    log('ANALYSIS COMPLETE', 'bright');
    log('='.repeat(100) + '\n', 'bright');

    return differences;

  } catch (error) {
    log(`\nERROR: ${error.message}`, 'red');
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    const differences = await analyzeSchema();

    if (differences.length > 0) {
      log('\nGenerating migration recommendations...', 'cyan');
      log('See migrations/README.md for migration workflow', 'blue');
    }
  } catch (error) {
    log(`\nFailed: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
