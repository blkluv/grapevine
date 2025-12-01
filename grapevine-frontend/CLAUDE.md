# Grapevine Frontend - Claude Code Instructions

## Critical Rules
**NEVER run git commands** - Do not use git commands via Bash tool under any circumstances.

## Build Commands
**ALWAYS suppress warnings when running builds** to reduce token usage. Use this pattern:
```bash
pnpm run build 2>&1 | grep -E "(error|Error|✓|built|vite)" | head -20
```
This filters out verbose rollup/privy warnings and only shows errors and success messages.

## Package Manager
**CRITICAL**: This project uses **pnpm** as the package manager.
- Always use `pnpm install`, `pnpm run dev`, `pnpm run build`, etc.

## Project Overview
Frontend for Grapevine, an x402 experiment for monetizing file access through paid endpoints.
- **Backend dev API**: https://api.grapevine.markets
- **Backend prod API**: https://api.grapevine.fyi
- **Stack**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Auth**: Privy (wallet management) + Wagmi (message signing)
- **State**: React Query (TanStack Query)
- **Chains**: Base Mainnet (8453), Base Sepolia (84532)
- **Farcaster**: App works as both web app and Farcaster mini app with auto-login

### Core Concepts
- **Feeds**: Collections of files owned by a wallet address
- **Entries**: Individual files within a feed, each with its own price
- **x402 Protocol**: Payment protocol for pay-per-request resource access

### Authentication Methods

**1. Nonce-Based Auth** (POST/PUT/PATCH/DELETE operations):
- User signs a time-limited nonce to prove wallet ownership
- Used for: Creating/updating/deleting feeds and entries, accessing signed URLs for purchased content
- Wallet that signs becomes owner of the resource

**2. x402 Payment Auth** (Paid endpoints):
- Payment itself serves as authentication
- Used for: Posting feeds/entries (platform fee), accessing paid content
- Valid payment proves wallet ownership

### Content Access Patterns

**First-time purchase**: Direct x402 payment → fetch resource → record purchase
**Repeat access**: Validate purchase history → return signed URL (no x402 required)

SDK automatically chooses the correct method based on purchase history.

---

## Design System

### Neobrutalism Theme
This project uses a **neobrutalism** design aesthetic:
- **Bold black borders** (4px) with hard shadows
- **White backgrounds** with high contrast
- **Monospace fonts** (font-mono) for text
- **Uppercase text** for labels and headings
- **No rounded corners** - all sharp edges
- **Accent colors**: Cyan (#00f0ff), Orange (#ff6b35), Yellow (#ffff00)

### CSS Variables
All theme variables defined in `src/index.css` under `:root` and `[data-theme="neobrutalism"]`.

### UI Components (`src/components/ui/`)
Import from: `import { Button, Card, Badge, OriginalDialog } from '@/components/ui';`

**Button**: Uses `.neobrutalism-button` class with `variant` and `size` data attributes
**Card**: White background with black borders and shadows
**OriginalDialog**: Modal with cyan title bar and neobrutalism styling

### Typography
- **Font**: Arial, Helvetica, sans-serif (font-mono)
- **Weight**: Bold (700) for body, Black (900) for headings
- **Style**: Uppercase for labels, normal case for content

### Layout
- **Container**: `max-w-7xl mx-auto px-6`
- **Shadows**: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` pattern
- **Borders**: `border-4 border-black`

---

## Architecture

### File Structure
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
│       ├── feeds.ts
│       ├── entries.ts
│       ├── categories.ts
│       ├── wallets.ts
│       └── ...
├── context/          # React contexts (WalletContext, WebampContext)
├── lib/              # Utils (wagmi config, theme, utils)
└── types/            # TypeScript types (api.ts - auto-generated from OpenAPI)
```

### API Client (`src/services/grapevineApi.ts`)
Type-safe client using `openapi-fetch` with auto-generated types from OpenAPI spec.

**Auth Headers**: `x-wallet-address`, `x-signature`, `x-message`, `x-timestamp`, `x-chain-id`

### API Authentication

**Free Operations** (No auth):
- Most GET requests (browsing feeds, viewing metadata)

**Nonce-Auth Required**:
- POST, PUT, PATCH, DELETE on feeds/entries
- Accessing signed URLs for purchased content

**x402-Auth Required**:
- Initial paid content access
- Creating paid feeds/entries (platform fee)

### Nonce-Based Auth Flow

1. User connects wallet (Privy modal)
2. User attempts protected operation
3. Hook calls `useWallet().signRequest(method, endpoint)`
4. API called: `POST /v1/auth/nonce` with wallet address
5. Backend returns message string to sign (short TTL)
6. Wagmi signs message via wallet (free, no gas)
7. Signature + headers sent to operation endpoint
8. Backend verifies signature and processes request
9. Signing wallet becomes owner of created resources

**WalletContext API** (`src/context/WalletContext.tsx`):
```typescript
const {
  isConnected,    // boolean
  address,        // string | null
  chain,          // Chain | null
  connect,        // () => void
  disconnect,     // () => void
  signRequest,    // (method, endpoint) => Promise<SignaturePayload>
} = useWallet();
```

### Hooks (`src/hooks/`)
All hooks use React Query and abstract authentication:
- `useGrapevineFeeds()` - Fetch feeds (no auth)
- `useCreateFeed()` - Create feed (nonce auth)
- `useUpdateFeed()` - Update feed (nonce auth)
- `useDeleteFeed()` - Delete feed (nonce auth)
- `useCreateEntry()` - Create entry (nonce auth or x402)
- `useCategories()` - Fetch categories (no auth)
- `useLeaderboards()` - Fetch leaderboards (no auth)

**Usage**:
```typescript
const { data: feeds, isLoading } = useGrapevineFeeds();
const createFeed = useCreateFeed();

// Mutations handle nonce-based auth internally
await createFeed.mutateAsync({ name, description, category_id });
```

**SDK abstracts**:
- Nonce generation and signing
- x402 payment flows
- Purchase tracking (first-time vs repeat access)
- Signed URL retrieval for purchased content

---

## Key Files

**Entry Point**: `src/main.tsx` - Provider hierarchy (QueryClient → Privy → Wagmi → Wallet → Webamp)
**Routing**: `src/App.tsx` - React Router configuration
**Styles**: `src/index.css` - Global styles + @theme colors
**Config**:
- `src/lib/wagmi.ts` - Wagmi config for Base chains + Farcaster connector
- `.env` - `VITE_PRIVY_APP_ID`, `VITE_GRAPEVINE_BACKEND_URL`, `VITE_FARCASTER_MANIFEST_ID`

### Farcaster Integration

**Auto-Login**: `src/components/FarcasterAutoLogin.tsx` - Detects Farcaster mini app context and auto-connects wallet
**Connector**: Wagmi's Farcaster connector in `src/lib/wagmi.ts` provides EIP-1193 provider from Farcaster SDK
**Manifest**: `/.well-known/farcaster.json` must redirect to hosted manifest (handled by vite.config.ts proxy in dev)

---

## Common Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm run dev

# Build for production
pnpm run build

# Sync types from backend OpenAPI spec
pnpm run sync-types
```

---

## Best Practices

**DO**:
- Use `@/components/ui` components (Button, Card, DialogContainer, Badge)
- Edit colors in `src/index.css` @theme block
- Use Tailwind spacing scale (multiples of 4px)
- Ensure text sits on solid surfaces (white cards/dialogs)
- Check wallet connection before mutations
- Handle signature rejection gracefully

**DON'T**:
- Hardcode colors (use @theme tokens: `bg-win95-btn-primary`)
- Edit `tailwind.config.js` for colors (use @theme in index.css)
- Put text directly on wallpaper
- Create inline button/dialog styles
- Use camelCase in class names (use hyphens)
- Skip focus states

---

## Environment Variables

```bash
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_GRAPEVINE_BACKEND_URL=https://grapevine-api.devpinata.cloud
VITE_FARCASTER_MANIFEST_ID=your_manifest_id  # For Farcaster mini app
```

## Quick Reference

### Import Components
```typescript
import { Button, Card, CardHeader, CardTitle, Badge, DialogContainer } from '@/components/ui';
import { useWallet } from '@/context/WalletContext';
import { feedsApi } from '@/services/grapevineApi';
```

### Button Usage
```tsx
<Button variant="primary" size="md">Create</Button>
<Button variant="danger" size="sm" loading>Delete</Button>
```

### Card Usage
```tsx
<Card variant="default" padding="md">
  <CardHeader>
    <CardTitle>{feed.name}</CardTitle>
  </CardHeader>
  <CardBody>Content here</CardBody>
</Card>
```

### Dialog Usage
```tsx
<DialogContainer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create Feed"
  maxWidth="xl"
>
  <div className="p-6 bg-white">
    Content here
  </div>
</DialogContainer>
```

---

## Additional Documentation

For more details, see:
- `README.md` - Project README
- Design tokens defined in `src/index.css`
- Component implementations in `src/components/ui/`
