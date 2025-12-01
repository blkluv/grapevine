# Grapevine

> A monorepo that utilizes x402 to monetize early and exclusive information through data feeds.

## Why Grapevine?

Early access to data often determines success in prediction markets, sports betting, trading, and research. Grapevine was created as a marketplace where data providers can monetize exclusive insights through x402 Protocol while consumers gain access to unqiue information.

## Project Structure

This monorepo contains multiple workspace projects:

```
grapevine/
├── grapevine-api/        # RESTful API Server (Hono + TypeScript + PostgreSQL)
│   ├── src/
│   │   ├── routes/       # API route handlers (auth, feeds, analytics, leaderboards)
│   │   ├── services/     # Business logic and integrations
│   │   ├── middleware/   # Authentication and logging
│   │   ├── utils/        # Validation utilities
│   │   └── schemas.ts    # Zod validation schemas
│   ├── test/             # Comprehensive test suite
│   ├── schema.sql        # Database schema with views and functions
│   └── README.md         # API-specific documentation
├── grapevine-frontend/   # React web application
├── grapevine-client/     # TypeScript SDK
├── grapevine-mcp/        # Model Context Protocol server for Claude Desktop
├── CONTRIBUTING.md       # Contribution guidelines
├── LICENSE               # MIT License
└── README.md             # This file - project overview
```

## Quick Start

```bash
git clone https://github.com/PinataCloud/grapevine.git
cd grapevine
pnpm install
```

**Setup Instructions:**
- [API Setup Guide](grapevine-api/README.md) - Database, environment configuration, and running the server
- [Frontend Setup Guide](grapevine-frontend/README.md) - React application setup and configuration

## How It Works

### 1. Authentication

Wallet-based authentication using EIP-191 signatures. No passwords, no email—just sign a message with your wallet.

```typescript
// Sign authentication message
const message = `Authenticate to Grapevine: ${nonce}`;
const signature = await wallet.signMessage(message);
```

### 2. Create a Feed

Publishers create feeds to organize their content by topic, category, or information type.

```typescript
POST /v1/feeds
{
  "title": "Pre-Market Trading Signals",
  "description": "Alpha signals 30 minutes before market open",
  "category_id": 123,
  "tags": ["trading", "stocks", "alpha"]
}
```

### 3. Publish Entries

Each feed entry contains encrypted content stored on IPFS, with payment instructions for access.

```typescript
POST /v1/entries
{
  "feed_id": 456,
  "content_cid": "QmX...",  // IPFS content identifier
  "price_usdc": "10.00",
  "expires_at": 1700000000,
  "metadata": { "category": "tech-earnings" }
}
```

### 4. Purchase Access

Consumers buy access by completing the on-chain transaction specified in the payment instructions.

```typescript
// Get payment instructions
GET /v1/entries/:id/payment-instructions

// After payment, retrieve content
GET /v1/entries/:id/content
// Returns decrypted IPFS content
```

### 5. Track Reputation

Real-time analytics track feed performance, provider revenue, and consumer activity to build trust.

```typescript
// View feed performance
GET /v1/analytics/feeds/:id

// Check leaderboards
GET /v1/leaderboards/top-revenue?period=7d
GET /v1/leaderboards/trending?period=7d
```

## API Reference

Full API documentation with interactive examples:
- **Swagger UI**: https://api.grapevine.fyi/v1/docs

## Documentation

- [Wallet Authentication Guide](grapevine-api/WALLET_AUTH_GUIDE.md) - EIP-191 signature authentication
- [Pinata Integration](grapevine-api/PINATA_V3_INTEGRATION.md) - IPFS storage setup
- [Payment Instructions](grapevine-api/PAYMENT_INSTRUCTIONS_INTEGRATION.md) - x402 protocol details
- [Database Schema](grapevine-api/schema.sql) - Complete PostgreSQL schema

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License - see [LICENSE](LICENSE) for details

## Links

- [GitHub](https://github.com/PinataCloud/grapevine)
- [Issues](https://github.com/PinataCloud/grapevine/issues)
- [Pinata Cloud](https://pinata.cloud)