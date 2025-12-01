#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFile, mkdir, access } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLIENT_DIR = resolve(__dirname, 'grapevine-client');
const CLIENT_OPENAPI_FILE = resolve(CLIENT_DIR, 'openapi.json');
const CLIENT_TYPES_FILE = resolve(CLIENT_DIR, 'src/types.ts');
const FRONTEND_DIR = resolve(__dirname, 'grapevine-frontend');
const FRONTEND_TYPES_DIR = resolve(FRONTEND_DIR, 'src/types');
const FRONTEND_TYPES_FILE = resolve(FRONTEND_TYPES_DIR, 'api.ts');

function log(message, ...args) {
  console.log(`[sync-types] ${message}`, ...args);
}

function error(message, ...args) {
  console.error(`[sync-types] ERROR: ${message}`, ...args);
}

async function checkOpenApiSpecExists() {
  try {
    await access(CLIENT_OPENAPI_FILE);
    return true;
  } catch {
    return false;
  }
}

async function generateClientTypes() {
  log('Generating client types using openapi-typescript...');

  try {
    execSync('npm run build', {
      cwd: CLIENT_DIR,
      stdio: 'inherit'
    });
    log('Client types generated successfully');
  } catch (err) {
    error('Failed to generate client types:', err.message);
    throw err;
  }
}

async function copyTypesToFrontend() {
  log(`Copying types from ${CLIENT_TYPES_FILE} to ${FRONTEND_TYPES_FILE}...`);

  // Ensure the types directory exists
  await mkdir(FRONTEND_TYPES_DIR, { recursive: true });

  // Read the client types file
  const { readFile } = await import('fs/promises');
  let types = await readFile(CLIENT_TYPES_FILE, 'utf-8');

  // Add a custom header for the frontend
  const header = `/**
 * This file was auto-generated from the grapevine-api OpenAPI spec.
 * Do not make direct changes to this file.
 *
 * To update these types, run: npm run sync-types
 *
 * Last updated: ${new Date().toISOString()}
 */

`;

  // Remove the original auto-generated comment and add our header
  types = types.replace(/^\/\*\*\n \* This file was auto-generated.*?\*\/\n\n/s, '');

  await writeFile(FRONTEND_TYPES_FILE, header + types, 'utf-8');
  log('Types copied successfully');
}

async function main() {
  try {
    log('Starting type synchronization...');

    // Check if openapi.json exists in the client directory
    const specExists = await checkOpenApiSpecExists();
    if (!specExists) {
      error(`OpenAPI spec not found at ${CLIENT_OPENAPI_FILE}`);
      error('Please ensure the grapevine-client/openapi.json file exists.');
      error('You may need to copy it from the grapevine-api or fetch it from the running API.');
      process.exit(1);
    }

    log(`Found OpenAPI spec at ${CLIENT_OPENAPI_FILE}`);

    // Generate client types using openapi-typescript
    await generateClientTypes();

    // Copy types to frontend
    await copyTypesToFrontend();

    log('✓ Type synchronization completed successfully!');
    log(`  Client types: ${CLIENT_TYPES_FILE}`);
    log(`  Frontend types: ${FRONTEND_TYPES_FILE}`);

    process.exit(0);
  } catch (err) {
    error('Type synchronization failed:', err);
    process.exit(1);
  }
}

main();
