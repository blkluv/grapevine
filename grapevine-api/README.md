# Grapevine API

RESTful API server for Grapevine - a decentralized data feed platform enabling wallet-based authentication, feed management, and content monetization via x402 Protocol and IPFS.

## Quick Start for External Developers

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose (for PostgreSQL)
- **Pinata Account** - Sign up at [pinata.cloud](https://pinata.cloud) for IPFS storage
- **Coinbase Developer Platform Account** (for x402 payments, optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd grapevine/grapevine-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Configuration

Edit [.env](.env) and configure the following required variables:

```bash
# Database (PostgreSQL via Docker)
DB_URL=postgresql://postgres:password@localhost:5432/grapevine

# Server
PORT=3000
NODE_ENV=development
SERVER_ORIGIN=http://localhost:3000

# Pinata V3 API (Required for IPFS uploads)
V3_UPLOADS_URL=https://uploads.pinata.cloud
V3_UPLOADS_ADMIN_KEY=your_pinata_admin_key
V3_UPLOADS_USER_ID=your_pinata_user_id

# Pinata Gateway (Required for content retrieval)
PINATA_GATEWAY_HOST=your_gateway.mypinata.cloud

# x402 Payment Configuration (Required for monetization)
X402_PAY_TO_ADDRESS=your_wallet_address
X402_NETWORK=base-sepolia  # or 'base' for mainnet
X402_FACILITATOR_URL=https://x402.org/facilitator
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret
```

See [.env.example](.env.example) for all available configuration options.

### Database Setup

```bash
# Start PostgreSQL in Docker
docker compose up -d

# Initialize database schema
./scripts/init-db.sh

# Verify database is running
docker compose ps
```

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

The API will be available at `http://localhost:3000`

### Verify Installation

```bash
# Check API health
curl http://localhost:3000/health

# View API documentation
open http://localhost:3000/v1/docs
```

## API Documentation

### Interactive Documentation

- **Swagger UI**: [http://localhost:3000/v1/docs](http://localhost:3000/v1/docs)
  - Test endpoints directly in your browser
  - View request/response schemas
  - Try authenticated requests

- **OpenAPI Spec**: [http://localhost:3000/v1/openapi.json](http://localhost:3000/v1/openapi.json)
  - Import into Postman, Insomnia, or other API clients
  - Generate client SDKs

### Core Endpoints

**Authentication**
- `POST /v1/auth/nonce` - Get authentication nonce for wallet signing

**Wallets**
- `GET /v1/wallets` - List all wallets (paginated)
- `POST /v1/wallets` - Create new wallet
- `GET /v1/wallets/address/:address` - Get wallet by address

**Categories**
- `GET /v1/categories` - List feed categories
- `GET /v1/categories/:id` - Get category details

**Feeds**
- `GET /v1/feeds` - List feeds (with filters)
- `POST /v1/feeds` - Create feed (requires authentication)
- `GET /v1/feeds/:id` - Get feed details
- `PATCH /v1/feeds/:id` - Update feed (requires ownership)

**Entries**
- `GET /v1/feeds/:feed_id/entries` - List feed entries
- `POST /v1/feeds/:feed_id/entries` - Create entry (requires ownership)
- `GET /v1/feeds/:feed_id/entries/:entry_id` - Get entry details
- `DELETE /v1/feeds/:feed_id/entries/:entry_id` - Delete entry (requires ownership)

**Transactions**
- `GET /v1/transactions` - List your transactions (requires authentication)
- `POST /v1/transactions` - Record transaction (requires authentication)
- `GET /v1/transactions/:id` - Get transaction details

## Authentication

Grapevine uses **wallet-based authentication** with cryptographic signatures. No email or password required.

### Authentication Flow

1. **Request Nonce**
   ```bash
   curl -X POST http://localhost:3000/v1/auth/nonce \
     -H "Content-Type: application/json" \
     -d '{"walletAddress": "0x1234..."}'
   ```

2. **Sign Message** - Use your wallet to sign the message returned in the nonce response

3. **Include Headers** - Add these headers to authenticated requests:
   ```
   x-wallet-address: 0x1234...
   x-signature: 0xabcd...
   x-message: Message that was signed (base64 encoded if multi-line)
   x-timestamp: 1234567890
   ```

See [WALLET_AUTH_GUIDE.md](WALLET_AUTH_GUIDE.md) for detailed implementation guide.

### Protected Endpoints

The following endpoints require authentication:
- Creating feeds (`POST /v1/feeds`)
- Updating/deleting feeds (requires ownership)
- Creating/deleting entries (requires feed ownership)
- All transaction endpoints

## Development

### Project Structure

```
grapevine-api/
├── src/
│   ├── routes/         # API route handlers
│   ├── utils/          # Utility functions
│   ├── schemas.ts      # Zod validation schemas
│   └── server.ts       # Main server file
├── migrations/         # Database migrations
├── scripts/           # Setup and utility scripts
├── test/              # Test files
└── examples/          # Example API usage
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- feeds.test.ts
```

## Key Features

- **Wallet Authentication** - EIP-191 signature verification, no passwords
- **IPFS Storage** - Content addressing via Pinata V3 API
- **x402 Payments** - Crypto-native payment protocol integration
- **OpenAPI Documentation** - Full OpenAPI 3.0 spec with Swagger UI
- **TypeScript** - End-to-end type safety
- **Rate Limiting** - Prevent abuse (configurable per wallet)
- **Flexible Database** - PostgreSQL with connection pooling
- **Redis Support** - Optional distributed caching and rate limiting

## Additional Documentation

- [WALLET_AUTH_GUIDE.md](WALLET_AUTH_GUIDE.md) - Detailed authentication implementation
- [DATABASE.md](DATABASE.md) - Database schema and design
- [PINATA_V3_INTEGRATION.md](PINATA_V3_INTEGRATION.md) - IPFS integration details
- [PAYMENT_INSTRUCTIONS_INTEGRATION.md](PAYMENT_INSTRUCTIONS_INTEGRATION.md) - x402 payment flow
- [CHANGELOG.md](CHANGELOG.md) - Version history and updates

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL container is running
docker compose ps

# View database logs
docker compose logs postgres

# Restart database
docker compose restart postgres
```

### Port Already in Use

```bash
# Change PORT in .env file or use environment variable
PORT=3001 npm run dev
```

### IPFS Upload Failures

- Verify `V3_UPLOADS_ADMIN_KEY` is correct
- Check `V3_UPLOADS_USER_ID` matches your Pinata account
- Ensure you have sufficient Pinata storage quota

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

See [LICENSE](../LICENSE) for license information

