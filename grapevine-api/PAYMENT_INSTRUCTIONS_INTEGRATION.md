# Payment Instructions Integration Design

## Overview

This document outlines the integration between Grapevine feed entry prices and the Pinata backend's payment instructions system.

## Payment Instructions System Summary

### What Are Payment Instructions?

Payment instructions implement the x402 protocol (HTTP 402 Payment Required) to enable cryptocurrency-based payments for content access. They define the payment terms required to access specific content (CIDs).

### Database Schema

**Table: `payment_instructions`**
```sql
CREATE TABLE public.payment_instructions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name                  VARCHAR(255) NOT NULL,
    description           VARCHAR(255),
    user_id               UUID NOT NULL REFERENCES public.users(id),
    payment_requirements  JSONB NOT NULL,
    version               INT DEFAULT 1 NOT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at            TIMESTAMP
);
```

**Table: `payment_instruction_cids`** (mapping table)
```sql
CREATE TABLE public.payment_instruction_cids (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    payment_instruction_id  UUID NOT NULL REFERENCES public.payment_instructions(id),
    cid                     VARCHAR(255) NOT NULL,
    user_id                 UUID NOT NULL REFERENCES public.users(id),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at              TIMESTAMP
);
```

### API Endpoints

**Base URL:** `https://api.pinata.cloud/v3/x402/payment_instructions`

All endpoints require:
- Authentication: `Authorization: Bearer {jwt_token}` header
- Feature flag: `x402` enabled
- Appropriate permissions (OrgFilesRead or OrgFilesWrite)

#### Create Payment Instruction
```http
POST /v3/x402/payment_instructions
Content-Type: application/json

{
  "name": "string (required, max 255)",
  "description": "string (optional, max 255)",
  "payment_requirements": [
    {
      "pay_to": "0x... (ethereum address)",
      "network": "base | base-sepolia",
      "asset": "0x... (ERC-20 token address)",
      "max_amount_required": "string (amount in smallest unit)",
      "description": "string (optional)"
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "user_id": "uuid",
  "payment_requirements": [...],
  "version": 1,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Other Endpoints
- `GET /v3/x402/payment_instructions` - List payment instructions
- `GET /v3/x402/payment_instructions/:id` - Get by ID
- `PATCH /v3/x402/payment_instructions/:id` - Update
- `DELETE /v3/x402/payment_instructions/:id` - Soft delete
- `PUT /v3/x402/payment_instructions/:id/cids/:cid` - Map CID to payment instruction
- `DELETE /v3/x402/payment_instructions/:id/cids/:cid` - Unmap CID

### Key Features

1. **Free Access Support**: Empty `payment_requirements` array indicates no payment required
2. **Multi-Network**: Supports Base mainnet and Base Sepolia testnet
3. **ERC-20 Tokens**: Any ERC-20 token can be used as payment asset
4. **Cache Layer**: Uses Cloudflare KV for fast lookups during content requests
5. **Version Control**: Tracks version changes for payment instruction updates
6. **Unique Constraint**: Same user cannot create duplicate payment requirements

---

## Integration Design

### Current Grapevine Schema

```sql
-- gv_feed_entries table has:
CREATE TABLE gv_feed_entries (
    id UUID PRIMARY KEY,
    feed_id UUID REFERENCES gv_feeds(id),
    cid VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    pinata_upload_id UUID,
    title VARCHAR(255),
    tags TEXT[],
    is_free BOOLEAN DEFAULT false,
    piid UUID REFERENCES payment_instructions(id), -- Payment instruction reference
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- gv_transactions already references payment instructions
CREATE TABLE gv_transactions (
    id UUID PRIMARY KEY,
    piid UUID REFERENCES payment_instructions(id),
    from_wallet_address VARCHAR(45) NOT NULL,
    to_wallet_id UUID REFERENCES gv_wallets(id),
    amount INTEGER NOT NULL,
    asset VARCHAR(255) NOT NULL,
    entry_id UUID REFERENCES gv_feed_entries(id),
    transaction_hash VARCHAR(66) UNIQUE NOT NULL,
    created_at BIGINT NOT NULL
);
```

### Integration Approach: USE BACKEND API

**Recommendation: Call the backend API to create payment instructions**

#### Why Use the API (vs Direct DB Insert)?

✅ **Pros:**
- Automatic cache management (critical for x402 protocol performance)
- Built-in validation (ethereum addresses, networks, unique constraints)
- Version control handled automatically
- Proper authentication and authorization
- Error handling and status codes
- Maintainability - changes to backend logic don't break grapevine

❌ **Cons of Direct DB Insert:**
- Must manually update Cloudflare KV cache (complex, error-prone)
- Must implement all validation logic
- Must handle UUID v7 generation
- Bypasses security layers
- Cache inconsistency risk = broken x402 protocol
- Tight coupling to backend database schema

### Implementation Flow

#### When Creating a Paid Feed Entry

```typescript
// 1. User creates feed entry with price information
POST /feeds/:feedId/entries
{
  "cid": "QmXxx...",
  "title": "Premium Content",
  "is_free": false,
  "price": {
    "amount": "1000000",  // 1 USDC (6 decimals)
    "currency": "USDC",
    "network": "base"
  }
}

// 2. Grapevine API workflow:
async function createFeedEntry(feedId: string, data: CreateEntryInput) {
  let piid = null;

  // If not free, create payment instruction
  if (!data.is_free && data.price) {
    // Get feed owner wallet info
    const feed = await getFeed(feedId);
    const owner = await getWallet(feed.owner_id);

    // Get auth token for backend API call
    const backendToken = await getBackendAuthToken(owner.user_id);

    // Create payment instruction via backend API
    const paymentInstruction = await createPaymentInstruction(backendToken, {
      name: `Payment for ${data.title}`,
      description: `Access to feed entry: ${data.title}`,
      payment_requirements: [
        {
          pay_to: owner.wallet_address,
          network: data.price.network,
          asset: getTokenAddress(data.price.currency, data.price.network),
          max_amount_required: data.price.amount,
          description: `${formatAmount(data.price.amount)} ${data.price.currency}`
        }
      ]
    });

    piid = paymentInstruction.id;

    // Map CID to payment instruction
    await mapCidToPaymentInstruction(backendToken, piid, data.cid);
  }

  // Create feed entry with piid
  const entry = await pool.query(
    `INSERT INTO gv_feed_entries (feed_id, cid, title, is_free, piid, ...)
     VALUES ($1, $2, $3, $4, $5, ...)
     RETURNING *`,
    [feedId, data.cid, data.title, data.is_free, piid, ...]
  );

  return entry;
}
```

#### Helper Service: Payment Instructions Client

```typescript
// services/paymentInstructions.ts

interface PaymentRequirement {
  pay_to: string;
  network: 'base' | 'base-sepolia';
  asset: string;
  max_amount_required: string;
  description?: string;
}

interface CreatePaymentInstructionInput {
  name: string;
  description?: string;
  payment_requirements: PaymentRequirement[];
}

export class PaymentInstructionsClient {
  private baseUrl = 'https://api.pinata.cloud/v3/x402/payment_instructions';

  async create(
    authToken: string,
    input: CreatePaymentInstructionInput
  ): Promise<{ id: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Failed to create payment instruction: ${response.statusText}`);
    }

    return response.json();
  }

  async mapCid(
    authToken: string,
    paymentInstructionId: string,
    cid: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${paymentInstructionId}/cids/${cid}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to map CID: ${response.statusText}`);
    }
  }

  async unmapCid(
    authToken: string,
    paymentInstructionId: string,
    cid: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${paymentInstructionId}/cids/${cid}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to unmap CID: ${response.statusText}`);
    }
  }

  async delete(authToken: string, paymentInstructionId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${paymentInstructionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete payment instruction: ${response.statusText}`);
    }
  }
}

// Helper to get ERC-20 token addresses
export function getTokenAddress(currency: string, network: string): string {
  const tokens: Record<string, Record<string, string>> = {
    'USDC': {
      'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
    },
    // Add other tokens as needed
  };

  const address = tokens[currency]?.[network];
  if (!address) {
    throw new Error(`Unknown token ${currency} on network ${network}`);
  }

  return address;
}
```

### Required Environment Variables

```bash
# .env
PINATA_BACKEND_API_URL=https://api.pinata.cloud
PINATA_JWT_TOKEN=eyJ... # Service account token with x402 permissions
```

### Database Changes Needed

None! The `piid` column already exists in both:
- `gv_feed_entries.piid` - Links entry to payment instruction
- `gv_transactions.piid` - Links transaction to payment instruction

### Error Handling

```typescript
try {
  const paymentInstruction = await paymentInstructionsClient.create(token, input);
} catch (error) {
  // Common errors:
  // - 401 Unauthorized: Invalid or expired token
  // - 403 Forbidden: x402 feature not enabled or insufficient permissions
  // - 409 Conflict: Duplicate payment_requirements for user
  // - 400 Bad Request: Invalid input (address format, network, etc.)

  console.error('Failed to create payment instruction:', error);

  // Decide: Should we fail the entire entry creation or continue with piid=null?
  // Option 1: Fail the entry creation
  throw new Error('Cannot create paid entry: payment instruction creation failed');

  // Option 2: Create as free entry instead
  console.warn('Creating entry as free due to payment instruction error');
  piid = null;
  is_free = true;
}
```

---

## Testing Considerations

### Unit Tests

1. **Mock the Payment Instructions API**
```typescript
// test/mocks/paymentInstructions.ts
export const mockPaymentInstructionsClient = {
  create: vi.fn().mockResolvedValue({ id: 'test-uuid' }),
  mapCid: vi.fn().mockResolvedValue(undefined),
  unmapCid: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined)
};
```

2. **Test Entry Creation**
```typescript
describe('createFeedEntry', () => {
  it('should create payment instruction for paid entries', async () => {
    const entry = await createFeedEntry(feedId, {
      cid: 'QmTest',
      title: 'Paid Content',
      is_free: false,
      price: {
        amount: '1000000',
        currency: 'USDC',
        network: 'base'
      }
    });

    expect(mockPaymentInstructionsClient.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        name: expect.stringContaining('Paid Content'),
        payment_requirements: expect.arrayContaining([
          expect.objectContaining({
            network: 'base',
            max_amount_required: '1000000'
          })
        ])
      })
    );

    expect(entry.piid).toBe('test-uuid');
  });

  it('should not create payment instruction for free entries', async () => {
    const entry = await createFeedEntry(feedId, {
      cid: 'QmTest',
      title: 'Free Content',
      is_free: true
    });

    expect(mockPaymentInstructionsClient.create).not.toHaveBeenCalled();
    expect(entry.piid).toBeNull();
  });
});
```

### Integration Tests

Use the actual backend API in staging/test environment:

```typescript
describe('Payment Instructions Integration', () => {
  it('should create real payment instruction and map CID', async () => {
    // Use test credentials
    const testToken = process.env.TEST_PINATA_JWT_TOKEN;

    const client = new PaymentInstructionsClient();
    const pi = await client.create(testToken, {
      name: 'Integration Test',
      payment_requirements: [{
        pay_to: TEST_WALLET_ADDRESS,
        network: 'base-sepolia',
        asset: USDC_BASE_SEPOLIA_ADDRESS,
        max_amount_required: '1000000'
      }]
    });

    expect(pi.id).toBeDefined();

    // Cleanup
    await client.delete(testToken, pi.id);
  });
});
```

---

## Deployment Checklist

- [ ] Add `PINATA_JWT_TOKEN` to environment variables
- [ ] Verify x402 feature flag is enabled for service account
- [ ] Implement `PaymentInstructionsClient` service
- [ ] Add token address mapping helper
- [ ] Update feed entry creation endpoint
- [ ] Add error handling and logging
- [ ] Write unit tests with mocks
- [ ] Write integration tests (optional, requires test account)
- [ ] Update API documentation
- [ ] Test in staging environment
- [ ] Monitor error rates after deployment

---

## Future Enhancements

1. **Payment Instruction Caching**: Cache created payment instructions to avoid duplicate API calls for same price
2. **Batch CID Mapping**: Map multiple CIDs to same payment instruction if they share the same price
3. **Dynamic Pricing**: Support updating entry prices by creating new payment instructions and unmapping old ones
4. **Multi-Currency**: Support multiple payment options for same content
5. **Payment Verification Webhooks**: Subscribe to payment events from backend to update transaction records

---

## References

- Backend Code: `/Users/lucas/repos/pinata/backend/services/galactus/`
- x402 Protocol: HTTP 402 Payment Required standard
- Grapevine Schema: `grapevine-api/schema.sql`
- Current piid Usage: `gv_feed_entries.piid`, `gv_transactions.piid`
