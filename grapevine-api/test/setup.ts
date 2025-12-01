import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { seedTestDatabase, cleanTestDatabase, closeTestPool, createTestPool } from './helpers/db.js';
import { setPool } from '../src/services/db.js';

// Mock the x402-hono payment middleware to bypass payment checks in tests
// This allows tests to focus on business logic without dealing with payment verification
vi.mock('x402-hono', () => {
  return {
    paymentMiddleware: () => {
      // Return a middleware that simply calls next() without any payment checks
      return async (_c: any, next: () => Promise<void>) => {
        await next();
      };
    },
  };
});

/**
 * Global test setup and teardown
 * This file is automatically loaded by Vitest before running tests
 * Uses PGlite for in-memory PostgreSQL - no external database required!
 */

let testPool: any;

// Setup: Run once before all tests
beforeAll(async () => {
  console.log('\n🧪 Setting up test environment with PGlite (in-memory PostgreSQL)...\n');

  // Create in-memory test database connection
  testPool = await createTestPool();

  // Inject test pool into the application
  setPool(testPool);

  // Seed database with schema
  await seedTestDatabase(testPool);

  console.log('✓ Test environment ready (using PGlite)\n');
}, 30000); // 30 second timeout for database setup

// Cleanup: Run after each test to ensure isolation
afterEach(async () => {
  if (testPool) {
    await cleanTestDatabase(testPool);
  }
});

// Teardown: Run once after all tests
afterAll(async () => {
  console.log('\n🧹 Cleaning up test environment...\n');

  if (testPool) {
    await closeTestPool(testPool);
  }

  console.log('✓ Test environment cleaned up\n');
});

// Export pool for use in tests
export { testPool };
