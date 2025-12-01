# Basic Test Script

A simple Node.js script to test the Grapevine API by creating a feed and an entry.

## Usage

### Default (Production + Base Mainnet)

```bash
npm test
# or
node basic-test.js
```

This will:
1. Connect to `https://grapevine-api.pinata.cloud` (production)
2. Use `base` mainnet for payments
3. Create a test feed
4. Create a test entry in that feed

### Testing Different Environments

#### Development Server + Base Sepolia

```bash
TEST_SERVER=https://testnet-api.grapevine.fyi TEST_CHAIN=base-sepolia npm test
```

#### Local Server + Base Sepolia

```bash
TEST_SERVER=http://localhost:8080 TEST_CHAIN=base-sepolia npm test
```

## Environment Variables

Configure in `.env` or pass as environment variables:

### Required

- `BUYER_PRIVATE_KEY` - Your wallet private key (with or without 0x prefix)

### Optional

- `TEST_SERVER` - API server URL (default: `https://api.grapevine.fyi`)
  - Production: `https://api.grapevine.fyi`
  - Development: `https://testnet-api.grapevine.fyi`
  - Local: `http://localhost:8080`

- `TEST_CHAIN` - Blockchain network (default: `base`)
  - Mainnet: `base`
  - Testnet: `base-sepolia`

- `TEST_MAX_PAYMENT` - Max payment in USDC base units (default: `1000000` = $1.00)

## Example .env

```env
# Required
BUYER_PRIVATE_KEY=your_private_key_here

# Optional overrides (example shows dev server)
TEST_SERVER=https://testnet-api.grapevine.fyi
TEST_CHAIN=base-sepolia
TEST_MAX_PAYMENT=1000000
```

## What It Does

1. **Initialize Wallet** - Creates a viem account from your private key
2. **Setup x402 Payment** - Wraps fetch with automatic payment handling
3. **Create Feed** - POSTs to `/v1/feeds` with test data
4. **Create Entry** - POSTs to `/v1/feeds/{id}/entries` with test content
5. **Display Results** - Shows feed ID, entry ID, and IPFS CID

## Output Example

```
============================================================
🚀 Grapevine API Basic Test
============================================================
Server: https://api.grapevine.fyi
Chain: base
✅ Payment client initialized

============================================================
📝 Step 1: Creating Feed
============================================================
Feed data: {
  "name": "Test Feed 1699999999999",
  "description": "Automated test feed created by basic-test.js",
  "tags": ["test", "automated"]
}
✅ Feed created with ID: 019a6fae-b10b-7e75-8b75-bc4931ef61de
Feed details: {
  "id": "019a6fae-b10b-7e75-8b75-bc4931ef61de",
  "name": "Test Feed 1699999999999",
  "owner_id": "...",
  "created_at": 1699999999
}

============================================================
📄 Step 2: Creating Entry in Feed
============================================================
Entry data: {
  "title": "Test Entry 1699999999999",
  "mime_type": "text/plain",
  "is_free": true
}
✅ Entry created with ID: 019a6fb5-38e2-7efb-8ca8-67bab64b701c
Entry details: {
  "id": "019a6fb5-38e2-7efb-8ca8-67bab64b701c",
  "feed_id": "019a6fae-b10b-7e75-8b75-bc4931ef61de",
  "cid": "bafkreiabup7pcuzwxfebp4vwb2evt3ludtd6lkvoza27ccflsryh2neckq",
  "title": "Test Entry 1699999999999",
  "is_free": true,
  "created_at": 1699999999
}

============================================================
✅ Test Complete - All operations successful!
============================================================
Feed ID: 019a6fae-b10b-7e75-8b75-bc4931ef61de
Entry ID: 019a6fb5-38e2-7efb-8ca8-67bab64b701c
Content CID: bafkreiabup7pcuzwxfebp4vwb2evt3ludtd6lkvoza27ccflsryh2neckq

You can now:
- View feed: https://api.grapevine.fyi/v1/feeds/019a6fae-b10b-7e75-8b75-bc4931ef61de
- View entry: https://api.grapevine.fyi/v1/feeds/019a6fae-b10b-7e75-8b75-bc4931ef61de/entries/019a6fb5-38e2-7efb-8ca8-67bab64b701c
- Access content via IPFS: ipfs://bafkreiabup7pcuzwxfebp4vwb2evt3ludtd6lkvoza27ccflsryh2neckq
```

## Troubleshooting

### Payment Failed

- Check wallet has sufficient ETH for gas fees
- Check wallet has sufficient USDC for payments
- Verify correct chain is set (base vs base-sepolia)

### Server Connection Error

- Verify server URL is correct and accessible
- For local testing, ensure `grapevine-api` is running
- Check firewall/network settings

### Private Key Error

- Ensure `BUYER_PRIVATE_KEY` is set in `.env`
- Private key can be with or without `0x` prefix
- Never commit `.env` to git

## Notes

- The script creates a **free entry** by default (`is_free: true`)
- Content is base64-encoded text
- x402 payments are handled automatically by `x402-fetch`
- Each run creates new feed and entry with timestamps in names
