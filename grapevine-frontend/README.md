# Grapevine Frontend

Frontend application for Grapevine, an x402 experiment that enables users to easily upload files, generate endpoints for them, and charge for access using the x402 protocol.

## What is Grapevine?

Grapevine is a decentralized data feeds platform built on the x402 protocol. It allows content creators to monetize their files by creating paid endpoints that users can access through micropayments.

### Core Concepts

**Feeds**: A collection of similar files grouped together. Each feed has an owner (wallet address) and can contain multiple entries.

**Entries**: Individual files within a feed. Each entry can have its own price and metadata.

**x402 Protocol**: A payment protocol that enables pay-per-request access to resources through cryptographic authorization of transfers.

## Architecture

### Authentication System

Grapevine uses two authentication methods:

#### 1. Nonce-Based Authentication

Used for all mutation operations (POST, PUT, PATCH, DELETE) to prove wallet ownership.

**How it works**:
1. User attempts a protected operation
2. Backend generates a unique nonce with a short TTL (time-to-live, typically a few minutes)
3. User signs the nonce with their wallet
4. Backend verifies the signature to authenticate the user
5. The wallet that signed the nonce is considered the owner of created resources (feeds, entries)

**Used for**: Creating, updating, and deleting feeds/entries, and accessing signed URLs for purchased content.

#### 2. x402 Payment Authentication

Used for paid endpoints where payment itself serves as authentication.

**How it works**:
1. User creates a feed or entry with a price
2. User signs an x402 payload (authorization of transfer)
3. Backend validator verifies the payment
4. If payment is valid, the backend assumes wallet ownership and allows the operation

**Used for**: Posting feeds and entries (payment to platform), and accessing paid content.

### Content Access System

Grapevine provides two ways to access paid content:

#### Direct x402 Purchase (First-time access)

1. User selects an entry they want to access
2. User pays the price set by the owner via x402
3. Resource is fetched directly through x402
4. Content is displayed in the browser
5. Purchase is recorded in the backend

#### Signed URL Access (Repeat access)

1. User requests content they've already purchased
2. Backend validates the user has a previous purchase record
3. Backend generates a signed URL with time-limited access to the file
4. User receives the file without paying again
5. No x402 transaction is required

**Smart Abstraction**: The SDK automatically determines which method to use. First-time purchases use x402, subsequent access uses the signed URL endpoint (protected by nonce-based auth).

### API Design

**Free Operations** (No authentication):
- Most GET requests (browsing feeds, viewing metadata, etc.)

**Nonce-Authenticated Operations**:
- POST, PUT, PATCH, DELETE on feeds and entries
- Accessing signed URLs for purchased content

**x402-Authenticated Operations**:
- Initial paid content access
- Creating paid feeds/entries (payment to platform)

### SDK Integration

All API interactions are managed through the Grapevine SDK, which abstracts:
- Nonce generation and signing
- x402 payment flows
- Purchase tracking and signed URL retrieval
- Authentication header management

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4 with Neobrutalism design system
- **Authentication**: Privy (wallet management) + Wagmi (message signing)
- **State Management**: React Query (TanStack Query)
- **API Client**: openapi-fetch with auto-generated types
- **Blockchain**: Base Mainnet (8453), Base Sepolia (84532)
- **Payment Protocol**: x402

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (package manager)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```bash
# Privy authentication
VITE_PRIVY_APP_ID=your_privy_app_id

# Backend API
VITE_GRAPEVINE_BACKEND_URL=https://api.grapevine.markets

# Farcaster mini app (optional)
VITE_FARCASTER_MANIFEST_ID=your_manifest_id
```

### Development

```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Sync API types from backend OpenAPI spec
pnpm run sync-types
```

## Project Structure

```
src/
├── components/        # UI components (Button, Card, FeedCard, etc.)
│   └── ui/           # Reusable design system components
├── pages/            # Route pages (Home, Feeds, FeedEntries, etc.)
├── hooks/            # React Query hooks (useGrapevineFeeds, useCreateFeed, etc.)
├── services/         # API clients
│   ├── grapevineApi.ts    # Main API wrapper
│   ├── auth.ts            # Authentication utilities
│   └── api/              # Organized endpoints by resource
├── context/          # React contexts (WalletContext, WebampContext)
├── lib/              # Utils (wagmi config, theme, utils)
└── types/            # TypeScript types (api.ts - auto-generated from OpenAPI)
```

## Key Features

- **Wallet-based authentication** with Privy and Wagmi
- **Nonce-based signing** for secure mutations
- **x402 payment integration** for content monetization
- **Smart purchase tracking** to avoid duplicate payments
- **Signed URL generation** for secure file access
- **Farcaster mini app support** with auto-login
- **Type-safe API client** with auto-generated types from OpenAPI spec
- **Neobrutalism design system** with bold, high-contrast UI

## Documentation

For detailed development instructions and best practices, see:
- `CLAUDE.md` - Development guide and architecture overview
- `src/types/api.ts` - Auto-generated API types (single source of truth)
- `src/components/ui/` - Design system component implementations

## Contributing

This is an experimental project exploring the x402 protocol for content monetization. Contributions are welcome!

## License

[Add your license here]
