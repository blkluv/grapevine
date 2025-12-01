# Wallet Authentication Guide for Grapevine API

## Overview

This guide explains how to implement secure wallet authentication when users sign in with MetaMask (or other wallets) via Wagmi and create feeds.

## Security Flow: Challenge-Response Pattern

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Browser │                    │ Backend │                    │ MetaMask │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │  1. Request Nonce            │                              │
     ├─────────────────────────────>│                              │
     │     POST /api/v1/auth/nonce  │                              │
     │     { wallet_address }       │                              │
     │                              │                              │
     │  2. Return Nonce & Message   │                              │
     │<─────────────────────────────┤                              │
     │     { nonce, message }       │                              │
     │                              │                              │
     │  3. Request Signature        │                              │
     ├──────────────────────────────┼─────────────────────────────>│
     │     signMessage(message)     │                              │
     │                              │                              │
     │  4. Return Signature         │                              │
     │<─────────────────────────────┼──────────────────────────────┤
     │     { signature }            │                              │
     │                              │                              │
     │  5. Create Feed + Auth       │                              │
     ├─────────────────────────────>│                              │
     │     POST /api/v1/feeds       │                              │
     │     Headers:                 │                              │
     │       x-wallet-address       │                              │
     │       x-signature            │                              │
     │       x-message              │                              │
     │       x-timestamp            │  6. Verify Signature         │
     │     Body: { feed_data }      ├──> (recovers address)        │
     │                              │                              │
     │  7. Feed Created             │                              │
     │<─────────────────────────────┤                              │
     │     { feed }                 │                              │
```

## What the Browser Should Send

When creating a feed, the browser must send authentication via **HTTP headers** and feed data in the request body.

### Required Headers

```http
x-wallet-address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
x-signature: 0x...  (132 character hex string from MetaMask)
x-message: I am signing in to Grapevine at 2025-10-29T19:50:00.000Z with nonce: abc123
x-timestamp: 1730234400  (Unix timestamp in seconds)
```

### Header Descriptions

- **x-wallet-address**: The Ethereum address from the connected wallet
- **x-signature**: The cryptographic signature from MetaMask/wallet (132 hex chars)
- **x-message**: The exact message that was signed (can be base64 encoded if it contains newlines)
- **x-timestamp**: Unix timestamp **in seconds** when the message was signed

### Request Body

```json
{
  "category_id": "uuid-of-category",
  "name": "My Data Feed",
  "description": "Optional description",
  "tags": ["crypto", "news"]
}
```

**Note**: `owner_id` is **not required** - the API automatically determines the owner from the authenticated wallet address and creates the wallet if it doesn't exist.

## Frontend Implementation (Wagmi)

### 1. Install Dependencies

```bash
npm install wagmi viem @tanstack/react-query
```

### 2. Setup Wagmi Config

```typescript
// config/wagmi.ts
import { http, createConfig } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, mainnet],
  connectors: [
    injected(),
    walletConnect({ projectId: 'YOUR_WALLETCONNECT_PROJECT_ID' }),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
})
```

### 3. Connect Wallet Component

```typescript
'use client'
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi'
import { useState } from 'react'

export function WalletAuth() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  async function handleCreateFeed() {
    if (!address || !isConnected) {
      alert('Please connect your wallet first')
      return
    }

    setIsAuthenticating(true)
    try {
      // Step 1: Get nonce from backend
      const nonceResponse = await fetch('/api/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address })
      })
      const { nonce, message } = await nonceResponse.json()

      // Step 2: Sign the message with MetaMask
      const signature = await signMessageAsync({ message })

      // Step 3: Create feed with authentication headers
      const timestamp = Math.floor(Date.now() / 1000) // Unix seconds
      const response = await fetch('/api/v1/feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
          'x-signature': signature,
          'x-message': message,
          'x-timestamp': timestamp.toString(),
        },
        body: JSON.stringify({
          category_id: 'uuid-here',
          name: 'My Feed',
          description: 'A great feed',
          tags: ['crypto'],
        })
      })

      if (response.ok) {
        const feed = await response.json()
        console.log('Feed created!', feed)
      } else {
        const error = await response.json()
        console.error('Failed to create feed:', error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsAuthenticating(false)
    }
  }

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {address}</p>
          <button onClick={disconnect}>Disconnect</button>
          <button onClick={handleCreateFeed} disabled={isAuthenticating}>
            {isAuthenticating ? 'Creating...' : 'Create Feed'}
          </button>
        </div>
      ) : (
        <div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
            >
              Connect {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 4. Alternative: Using Sign-In With Ethereum (SIWE)

Wagmi supports the SIWE standard which is more robust:

```typescript
import { useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'

export function SiweAuth() {
  const { signMessageAsync } = useSignMessage()

  async function signIn() {
    const message = new SiweMessage({
      domain: window.location.host,
      address: address,
      statement: 'Sign in to Grapevine',
      uri: window.location.origin,
      version: '1',
      chainId: 8453, // Base chain ID
      nonce: await getNonce(), // Fetch from backend
    })

    const signature = await signMessageAsync({
      message: message.prepareMessage(),
    })

    // Send to backend for verification
    await fetch('/api/v1/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    })
  }
}
```

## Backend Implementation

### 1. Install Dependencies

```bash
npm install viem
```

### 2. Nonce Endpoint

The nonce endpoint is already implemented in `src/routes/auth.ts`:

```typescript
// POST /v1/auth/nonce
// Generates a unique nonce for the wallet address
// Returns: { nonce, message, expiresAt }
```

Key features:
- Nonces expire after 5 minutes
- One-time use (consumed during verification)
- In-memory storage (use Redis in production)

### 3. Wallet Authentication Middleware

The API uses middleware for authentication (`src/middleware/walletAuth.ts`):

```typescript
import { requireWalletAuth } from '../middleware/walletAuth.js'

// Apply to routes that require authentication
feeds.post('/', requireWalletAuth)
feeds.patch('/:feed_id', requireWalletAuth)
```

The middleware:
1. Extracts auth headers (`x-wallet-address`, `x-signature`, `x-message`, `x-timestamp`)
2. Validates signature format and wallet address format
3. Verifies the signature cryptographically using viem
4. Checks nonce validity and consumes it (one-time use)
5. Verifies timestamp freshness (5 minute window)
6. Sets `verifiedWallet` in context for route handlers

### 4. Protected Route Handler

Route handlers access the verified wallet from context:

```typescript
feeds.openapi(createFeedRoute, async (c) => {
  // Get verified wallet from middleware
  const verifiedWallet = c.get('verifiedWallet')

  // Look up or auto-create wallet in database
  let walletCheck = await pool.query(
    `SELECT id, wallet_address, wallet_address_network
     FROM gv_wallets
     WHERE LOWER(wallet_address) = LOWER($1)`,
    [verifiedWallet]
  )

  // If wallet doesn't exist, create it on base
  if (walletCheck.rows.length === 0) {
    const walletId = uuidv7()
    await pool.query(
      `INSERT INTO gv_wallets (id, wallet_address, wallet_address_network, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [walletId, verifiedWallet, 'base', now, now]
    )
  }

  // Create feed with verified wallet as owner
  // ...
})
```

## Security Considerations

### ✅ What This Prevents

1. **Impersonation**: Users can't claim to own a wallet they don't control
2. **Replay Attacks**: Timestamps ensure signatures can't be reused
3. **Man-in-the-Middle**: Signatures are cryptographically bound to the message
4. **Nonce Reuse**: Each authentication requires a fresh nonce

### ⚠️ Important Notes

1. **HTTPS Only**: Always use HTTPS in production
2. **Nonce Storage**: Use Redis or similar for nonce storage in production (not in-memory Map)
3. **Rate Limiting**: Add rate limiting to prevent nonce abuse
4. **Expiration**: Nonces and signatures should expire after 5 minutes
5. **Chain Verification**: Always verify the wallet is on the correct chain (Base)

## Testing

### Manual Test with curl

```bash
# 1. Get a nonce
curl -X POST http://localhost:3000/v1/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'

# Response: { "nonce": "...", "message": "I am signing...", "expiresAt": 123456789 }

# 2. Sign the message using MetaMask or a signing tool

# 3. Create feed with authentication headers
curl -X POST http://localhost:3000/v1/feeds \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -H "x-signature: 0x..." \
  -H "x-message: I am signing in to Grapevine at 2025-10-30T... with nonce: abc123" \
  -H "x-timestamp: 1730318400" \
  -d '{
    "category_id": "uuid-here",
    "name": "Test Feed",
    "description": "A test feed",
    "tags": ["test"]
  }'
```

### Test Mode

For automated testing, use the test signature `0xDEADBEEF`:

```bash
# In test environment only
curl -X POST http://localhost:3000/v1/feeds \
  -H "x-wallet-address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -H "x-signature: 0xDEADBEEF" \
  -H "x-message: test" \
  -H "x-timestamp: 1730318400" \
  -d '{"category_id": "...", "name": "Test Feed"}'
```

## Next Steps

1. ✅ **viem installed**: Signature verification library
2. ✅ **Auth routes implemented**: Nonce endpoint at `/v1/auth/nonce`
3. ✅ **Middleware implemented**: Header-based authentication
4. **Production readiness**: Use Redis for nonce storage (currently in-memory)
5. **Optional**: Consider full SIWE (Sign-In With Ethereum) standard compliance

## Resources

- [Wagmi Documentation](https://wagmi.sh/)
- [Sign-In With Ethereum](https://docs.login.xyz/)
- [Viem Documentation](https://viem.sh/)
- [EIP-191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
