# Grapevine Client

A type-safe TypeScript client for the Grapevine API - a Decentralized Data Feeds Platform.

## Installation

```bash
npm install grapevine-client
```

## Usage

### Creating a Client

```typescript
import { createGrapevineClient } from "grapevine-client";

// Create client with default local server
const client = createGrapevineClient();

// Or specify a custom base URL
const client = createGrapevineClient({
  baseUrl: "https://grapevine-api.devpinata.cloud",
  headers: {
    // Add custom headers if needed
    Authorization: "Bearer your-token",
  },
});
```

### Making Requests

The client provides full type safety for all API endpoints:

#### Wallets

```typescript
// List wallets
const { data, error } = await client.GET("/v1/wallets", {
  params: {
    query: {
      page: "1",
      limit: "20",
    },
  },
});

// Create a wallet
const { data, error } = await client.POST("/v1/wallets", {
  body: {
    wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    wallet_address_network: "ethereum",
    username: "alice",
  },
});

// Get wallet by ID
const { data, error } = await client.GET("/v1/wallets/{id}", {
  params: {
    path: {
      id: "wallet-uuid",
    },
  },
});

// Get wallet by address
const { data, error } = await client.GET("/v1/wallets/address/{address}", {
  params: {
    path: {
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    },
  },
});

// Update wallet
const { data, error } = await client.PATCH("/v1/wallets/{id}", {
  params: {
    path: {
      id: "wallet-uuid",
    },
  },
  body: {
    username: "new-username",
  },
});
```

#### Categories

```typescript
// List categories
const { data, error } = await client.GET("/v1/categories", {
  params: {
    query: {
      page: "1",
      limit: "20",
      is_active: "true",
      search: "tech",
    },
  },
});

// Get category by ID
const { data, error } = await client.GET("/v1/categories/{id}", {
  params: {
    path: {
      id: "category-uuid",
    },
  },
});
```

#### Feeds

```typescript
// List feeds
const { data, error } = await client.GET("/v1/feeds", {
  params: {
    query: {
      page: "1",
      limit: "20",
      owner_id: "owner-uuid",
      category: "category-uuid",
      is_active: "true",
    },
  },
});

// Create a feed
const { data, error } = await client.POST("/v1/feeds", {
  body: {
    owner_id: "owner-uuid",
    category_id: "category-uuid",
    name: "My Feed",
    description: "Feed description",
    tags: ["tag1", "tag2"],
    is_active: true,
    access_cost: 1000000,
    expiration_seconds: 86400,
  },
});

// Get feed by ID
const { data, error } = await client.GET("/v1/feeds/{feed_id}", {
  params: {
    path: {
      id: "feed-uuid",
    },
  },
});

// Update feed
const { data, error } = await client.PATCH("/v1/feeds/{feed_id}", {
  params: {
    path: {
      id: "feed-uuid",
    },
  },
  body: {
    name: "Updated Feed Name",
    description: "Updated description",
  },
});

// Delete feed
const { data, error } = await client.DELETE("/v1/feeds/{feed_id}", {
  params: {
    path: {
      id: "feed-uuid",
    },
  },
});
```

#### Feed Entries

```typescript
// List feed entries
const { data, error } = await client.GET("/v1/feeds/{feed_id}/entries", {
  params: {
    path: {
      id: "feed-uuid",
    },
    query: {
      page: "1",
      limit: "20",
    },
  },
});

// Create feed entry
const { data, error } = await client.POST("/v1/feeds/{feed_id}/entries", {
  params: {
    path: {
      id: "feed-uuid",
    },
  },
  body: {
    cid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
  },
});

// Get entry by ID
const { data, error } = await client.GET(
  "/v1/feeds/{feedId}/entries/{entry_id}",
  {
    params: {
      path: {
        feedId: "feed-uuid",
        entryId: "entry-uuid",
      },
    },
  }
);

// Delete entry
const { data, error } = await client.DELETE(
  "/v1/feeds/{feedId}/entries/{entry_id}",
  {
    params: {
      path: {
        feedId: "feed-uuid",
        entryId: "entry-uuid",
      },
    },
  }
);
```

#### Transactions

```typescript
// List transactions
const { data, error } = await client.GET("/v1/transactions", {
  params: {
    query: {
      page: "1",
      limit: "20",
      wallet_id: "wallet-uuid",
      type: "purchase",
    },
  },
});

// Create transaction
const { data, error } = await client.POST("/v1/transactions", {
  body: {
    wallet_id: "wallet-uuid",
    amount: 1000000,
    type: "purchase",
    tx_hash: "0x123...",
    metadata: {
      feed_id: "feed-uuid",
    },
  },
});

// Get transaction by ID
const { data, error } = await client.GET("/v1/transactions/{id}", {
  params: {
    path: {
      id: "transaction-uuid",
    },
  },
});
```

### Error Handling

```typescript
const { data, error } = await client.GET("/v1/wallets/{id}", {
  params: {
    path: {
      id: "invalid-id",
    },
  },
});

if (error) {
  console.error("Error:", error);
  // Handle error
} else {
  console.log("Success:", data);
  // Use data
}
```

## Type Safety

The client provides full type safety through generated TypeScript types from the OpenAPI specification. All request parameters, request bodies, and response types are fully typed.

## Development

### Regenerate Types

When the API specification changes, regenerate the types:

```bash
npm run generate:types
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## License

UNLICENSED
