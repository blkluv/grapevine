# Test Infrastructure

Comprehensive testing setup for the Grapevine API with database seeding and API-level tests.

## Structure

```
test/
├── setup.ts              # Global test setup and teardown
├── README.md            # This file
├── helpers/
│   ├── db.ts            # Test database configuration and seeding
│   ├── factories.ts     # Test data factory functions
│   ├── assertions.ts    # Custom assertion helpers
│   └── generators.ts    # Mock data generators
└── api/
    ├── wallets.test.ts  # Wallet API tests
    └── feeds.test.ts    # Feed API tests
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

**That's it!** No PostgreSQL installation or configuration required.

The tests use **PGlite**, an in-memory PostgreSQL database that runs entirely in your Node.js process. This means:
- ✅ **Zero setup** - No external database needed
- ✅ **Super fast** - Tests run in memory
- ✅ **Isolated** - Each test run is completely independent
- ✅ **CI/CD friendly** - Works in any environment without configuration

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests Once (CI Mode)

```bash
npm run test:run
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Interactive UI

```bash
npm run test:ui
```

## Test Database

### Automatic Schema Seeding with PGlite

The test database uses **PGlite** - a lightweight, in-memory PostgreSQL implementation:

1. **Before All Tests**:
   - Creates a fresh PGlite instance in memory
   - Reads `schema.sql` and creates all tables
   - Happens in milliseconds!

2. **After Each Test**:
   - All tables are truncated to ensure test isolation
   - No state carried between tests

3. **After All Tests**:
   - PGlite instance is closed and memory is freed

**Benefits**:
- ✅ **No external database required** - runs entirely in Node.js
- ✅ **Lightning fast** - in-memory operations
- ✅ **Perfect isolation** - each test run is independent
- ✅ **Zero configuration** - works everywhere without setup
- ✅ **CI/CD ready** - no service containers needed

## Helper Functions

### Test Data Factories

Create test data in the database:

```typescript
import { testPool } from '../setup.js';
import { createTestWallet, createTestFeed } from '../helpers/factories.js';

const wallet = await createTestWallet(testPool);
const feed = await createTestFeed(testPool, wallet.id, category.id);
```

Available factories:
- `createTestWallet(pool, overrides?)`
- `createTestCategory(pool, overrides?)`
- `createTestFeed(pool, owner_id, category_id, overrides?)`
- `createTestPaymentInstruction(pool, user_id)`
- `createTestEntry(pool, feed_id, piid, overrides?)`
- `createTestTransaction(pool, payer, pay_to, entry_id, overrides?)`

### Mock Data Generators

Generate mock data without inserting:

```typescript
import { generateMockWallet, generateMockFeed } from '../helpers/generators.js';

const walletData = generateMockWallet();
const feedData = generateMockFeed(ownerId, categoryId);
```

### Custom Assertions

Use custom assertions for common validations:

```typescript
import {
  expectValidUUID,
  expectValidEpochTimestamp,
  expectValidWalletAddress,
  expectPaginatedResponse,
} from '../helpers/assertions.js';

expectValidUUID(wallet.id);
expectValidEpochTimestamp(wallet.created_at);
expectValidWalletAddress(wallet.wallet_address);
expectPaginatedResponse(response, 5); // Expects 5 items
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { testPool } from '../setup.js';
import { createTestWallet } from '../helpers/factories.js';

describe('My Feature', () => {
  let testData: any;

  beforeEach(async () => {
    // Setup: Create test data
    testData = await createTestWallet(testPool);
  });

  it('should do something', async () => {
    // Arrange: Prepare data
    const input = { /* ... */ };

    // Act: Execute the operation
    const result = await testPool.query(
      'SELECT * FROM gv_wallets WHERE id = $1',
      [testData.id]
    );

    // Assert: Verify the result
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].id).toBe(testData.id);
  });
});
```

### Testing API Endpoints

Tests are written at the database level, simulating API operations:

```typescript
describe('GET /v1/wallets', () => {
  it('should retrieve paginated list of wallets', async () => {
    // Create test data
    await createTestWallet(testPool);
    await createTestWallet(testPool);

    // Simulate API query
    const result = await testPool.query(
      'SELECT * FROM gv_wallets ORDER BY created_at DESC LIMIT 20 OFFSET 0'
    );

    // Assert
    expect(result.rows.length).toBeGreaterThanOrEqual(2);
  });
});
```

### Testing Constraints and Validation

```typescript
it('should prevent duplicate wallet addresses', async () => {
  const wallet = await createTestWallet(testPool);

  try {
    // Attempt to insert duplicate
    await testPool.query(
      'INSERT INTO gv_wallets (wallet_address, wallet_address_network, created_at, updated_at) VALUES ($1, $2, $3, $4)',
      [wallet.wallet_address, 'ethereum', now, now]
    );

    // Should not reach here
    expect(true).toBe(false);
  } catch (error: any) {
    expect(error.code).toBe('23505'); // Unique constraint violation
    expect(error.constraint).toBe('idx_gv_wallets_address_network');
  }
});
```

## Best Practices

### 1. Test Isolation

- ✅ Each test should be independent
- ✅ Use `beforeEach` to create fresh test data
- ✅ Don't rely on test execution order
- ✅ Database is cleaned after each test automatically

### 2. Descriptive Test Names

```typescript
// Good
it('should prevent duplicate wallet addresses')

// Bad
it('test wallet creation')
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should update wallet username', async () => {
  // Arrange
  const wallet = await createTestWallet(testPool);
  const newUsername = 'updated_user';

  // Act
  const result = await testPool.query(
    'UPDATE gv_wallets SET username = $1 WHERE id = $2 RETURNING *',
    [newUsername, wallet.id]
  );

  // Assert
  expect(result.rows[0].username).toBe(newUsername);
});
```

### 4. Test Both Success and Failure Cases

```typescript
describe('Wallet creation', () => {
  it('should create wallet with valid data', async () => {
    // Test success case
  });

  it('should fail with duplicate address', async () => {
    // Test failure case
  });
});
```

### 5. Use Meaningful Test Data

```typescript
// Good
const walletData = {
  wallet_address: '0x1234567890123456789012345678901234567890',
  wallet_address_network: 'ethereum',
  username: 'alice_trader'
};

// Bad
const walletData = {
  wallet_address: 'abc',
  wallet_address_network: 'test',
  username: 'test'
};
```

## Continuous Integration

For CI environments, ensure:

1. PostgreSQL is installed and running
2. Test database is created
3. Environment variables are set
4. Run tests with `npm run test:run` (no watch mode)

Example GitHub Actions:

```yaml
- name: Setup PostgreSQL
  run: |
    sudo systemctl start postgresql
    sudo -u postgres psql -c "CREATE DATABASE grapevine_test;"

- name: Run tests
  env:
    TEST_DB_NAME: grapevine_test
    DB_USER: postgres
    DB_PASSWORD: postgres
  run: npm run test:run
```

## Troubleshooting

### Test Failures

```bash
# Run single test file
npm test test/api/wallets.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Run with debugging
NODE_OPTIONS='--inspect-brk' npm test
```

### Schema Issues

If tests fail due to schema problems:

```bash
# Verify schema.sql exists and is valid
cat schema.sql

# Tests automatically reload schema on each run
npm test
```

### PGlite Issues

PGlite runs entirely in memory with no external dependencies. If you encounter issues:

1. **Clear node_modules and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check PGlite version**:
   ```bash
   npm list @electric-sql/pglite
   ```

3. **Verify schema compatibility**: PGlite supports standard PostgreSQL syntax. If you see errors, check that your schema uses compatible features.

## Coverage Goals

Target coverage thresholds:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

View coverage report:
```bash
npm run test:coverage
open coverage/index.html
```
