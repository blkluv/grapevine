#!/usr/bin/env node
/**
 * Grapevine API x402 Payment Example
 *
 * This script demonstrates how to use x402 payments with the Grapevine API:
 * 1. Create a feed (with automatic x402 payment)
 * 2. Create an entry in that feed (with automatic x402 payment)
 */

import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVER = process.env.TEST_SERVER || 'https://api.grapevine.fyi';
const CHAIN = process.env.TEST_CHAIN || 'base';
const PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY;
const MAX_PAYMENT = BigInt(process.env.TEST_MAX_PAYMENT || '1000000'); // $1.00 USDC

if (!PRIVATE_KEY) {
  console.error('❌ Error: BUYER_PRIVATE_KEY not found in .env file');
  process.exit(1);
}

// ============================================================================
// SETUP
// ============================================================================

console.log('🚀 Grapevine x402 Payment Example');
console.log(`Server: ${SERVER} | Chain: ${CHAIN}\n`);

// Create wallet from private key
const account = privateKeyToAccount(
  PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
);

// Wrap fetch with x402 payment capability
// This automatically handles 402 Payment Required responses
const fetchWithPayment = wrapFetchWithPayment(fetch, account, MAX_PAYMENT);

// ============================================================================
// STEP 1: CREATE A FEED
// ============================================================================

async function createFeed() {
  console.log('━'.repeat(60));
  console.log('STEP 1: Create Feed');
  console.log('━'.repeat(60));

  const feedData = {
    name: `Demo Feed ${Date.now()}`,
    description: 'Example feed created with x402 payments',
    tags: ['demo', 'x402'],
  };

  const response = await fetchWithPayment(`${SERVER}/v1/feeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create feed: ${response.status} ${await response.text()}`);
  }

  const feed = await response.json();
  console.log(`✅ Feed created: ${feed.id}\n`);

  return feed;
}

// ============================================================================
// STEP 2: CREATE AN ENTRY IN THE FEED
// ============================================================================

async function createEntry(feedId) {
  console.log('━'.repeat(60));
  console.log('STEP 2: Create Entry (using Feed ID from Step 1)');
  console.log('━'.repeat(60));

  // Prepare content (base64 encoded)
  const content = `Example entry created at ${new Date().toISOString()}`;
  const contentBase64 = Buffer.from(content).toString('base64');

  const entryData = {
    content_base64: contentBase64,
    mime_type: 'text/plain',
    title: `Demo Entry ${Date.now()}`,
    description: 'Example entry with x402 payment',
    tags: ['demo', 'x402'],
    is_free: true, // Free entry (no payment required)
  };

  const response = await fetchWithPayment(
    `${SERVER}/v1/feeds/${feedId}/entries`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create entry: ${response.status} ${await response.text()}`);
  }

  const entry = await response.json();
  console.log(`✅ Entry created: ${entry.id}`);
  console.log(`   IPFS CID: ${entry.cid}\n`);

  return entry;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Step 1: Create a feed (x402 payment handled automatically)
    const feed = await createFeed();

    // Step 2: Create an entry using the feed ID from step 1
    const entry = await createEntry(feed.id);

    // Summary
    console.log('━'.repeat(60));
    console.log('✅ SUCCESS');
    console.log('━'.repeat(60));
    console.log(`Feed:  ${SERVER}/v1/feeds/${feed.id}`);
    console.log(`Entry: ${SERVER}/v1/feeds/${feed.id}/entries/${entry.id}`);
    console.log(`IPFS:  ipfs://${entry.cid}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();
