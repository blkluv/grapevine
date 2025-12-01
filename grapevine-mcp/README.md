# Grapevine MCP Server

MCP (Model Context Protocol) server for interacting with Grapevine API using x402 payments. This server enables Claude Desktop to discover, interact with, and make payments to Grapevine API endpoints across multiple environments and blockchain networks.

**Claude decides which server and chain to use** based on the context of your conversation. You only need to provide your wallet private key.

## Features

- **Intelligent Environment Selection**: Claude chooses between local, dev, or prod based on your needs
- **Smart Chain Selection**: Claude selects Base Mainnet or Base Sepolia based on the environment
- **x402 Payment Integration**: Automatic micropayments using USDC
- **Comprehensive API Tools**: Access feeds, categories, and other Grapevine endpoints
- **Discovery Mode**: Explore payment requirements before making requests
- **Zero Configuration**: Only requires wallet private key

## Installation

1. Install dependencies:
```bash
cd grapevine-mcp
pnpm install
```

**Note:** You may see peer dependency warnings for `react`, `@tanstack/react-query`, etc. These are expected and can be safely ignored - the MCP server runs in Node.js and doesn't use React.

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Add your wallet private key to `.env`:
```
BUYER_PRIVATE_KEY=your_private_key_here
```

## Configuration

### Environment Variables

**Only one environment variable is required:**

- `BUYER_PRIVATE_KEY` (required): Your wallet private key (with or without 0x prefix)

That's it! Claude will intelligently select the server and chain based on your conversation context.

### Available Environments

Claude can connect to any of these servers based on your needs:

- **local**: `http://localhost:8080` - For local development and testing
- **dev**: `https://testnet-api.grapevine.fyi` - For development/staging testing on testnet
- **prod**: `https://api.grapevine.fyi` - For production operations

### Available Chains

Claude will choose the appropriate chain:

- **base-sepolia**: Base Sepolia Testnet (Chain ID: 84532) - For testing with testnet funds
- **base**: Base Mainnet (Chain ID: 8453) - For production with real funds

**Recommended pairing:**
- `local` + `base-sepolia` (development)
- `dev` + `base-sepolia` (staging)
- `prod` + `base` (production)

## Claude Desktop Integration

Add this server to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "grapevine": {
      "command": "node",
      "args": ["/absolute/path/to/grapevine-mcp/index.js"]
    }
  }
}
```

**Important:** Replace `/absolute/path/to/grapevine-mcp/index.js` with the actual path. For example:
- macOS: `/Users/yourname/Documents/projects/grapevine/grapevine-mcp/index.js`
- Windows: `C:\\Users\\yourname\\Documents\\projects\\grapevine\\grapevine-mcp\\index.js`

The server will automatically read your `BUYER_PRIVATE_KEY` from the `.env` file in the `grapevine-mcp` directory.

Restart Claude Desktop after updating the configuration.

## Available Tools

### Server & Chain Management

- **list_servers**: List all available Grapevine servers
- **list_chains**: List all supported blockchain networks
- **get_wallet_info**: Get wallet address and balance requirements

### API Discovery

- **discover_resource**: Discover x402 payment requirements for any endpoint

### API Calls

- **call_api**: Make authenticated API calls to any Grapevine endpoint
- **get_feeds**: Retrieve feeds with optional filtering
- **create_feed**: Create a new feed (requires payment)
- **get_categories**: Retrieve all categories

## Usage Examples

### In Claude Desktop

**Check wallet configuration:**
```
Can you check my Grapevine wallet info?
```

**List available servers:**
```
What Grapevine servers are available?
```

**Get feeds (Claude chooses server/chain):**
```
Get all feeds from Grapevine
```
or be specific:
```
Get feeds from the dev server
```

**Create a new feed:**
```
Create a new feed on the local server with name "AI News" and description "Latest AI developments"
```

**Discover payment requirements:**
```
What are the payment requirements for creating a feed?
```

**Let Claude decide everything:**
```
I want to test the Grapevine API, can you show me some feeds?
```

Claude will:
1. Ask clarifying questions if needed (which environment?)
2. Choose appropriate server and chain
3. Make the request with automatic x402 payment

## Payment Flow

1. **Initial Request**: MCP server makes request to Grapevine endpoint
2. **402 Response**: Server responds with payment requirements (price, address, chain)
3. **Automatic Payment**: x402-fetch automatically creates and signs payment transaction
4. **Retry with Proof**: Request retried with payment proof in `X-Payment` header
5. **Access Granted**: Server validates payment and returns requested resource

## Wallet Requirements

Your wallet needs:

- **Base Sepolia** (testnet):
  - ETH for gas fees ([Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia))
  - USDC for payments (testnet USDC from faucet)

- **Base Mainnet** (production):
  - ETH for gas fees
  - USDC for payments (real USDC)

## Security

- Store your private key in `.env` file (already in `.gitignore`, never commit to git)
- The `.env` file stays local and is never uploaded to Claude or any server
- Use a dedicated wallet for testing/development
- Consider using a hardware wallet or key management service for production
- Never put your private key directly in `claude_desktop_config.json`

## Troubleshooting

### Payment Failed (402 after payment)

- Check wallet has sufficient ETH for gas
- Check wallet has sufficient USDC for payment
- Verify correct chain is selected
- Check private key format in `.env`

### Server Connection Error

- Verify server URL is correct and accessible
- Check firewall/network settings
- For local server, ensure `grapevine-api` is running

### MCP Server Not Found in Claude Desktop

- Verify absolute path in `claude_desktop_config.json`
- Restart Claude Desktop after config changes
- Check server logs in Claude Desktop developer tools

## Testing

### Basic API Test Script

A standalone test script is included to verify the Grapevine API works correctly:

```bash
# Test production (base mainnet) - default
npm test

# Test development (base sepolia)
TEST_SERVER=https://testnet-api.grapevine.fyi TEST_CHAIN=base-sepolia npm test

# Test local (base sepolia)
TEST_SERVER=http://localhost:8080 TEST_CHAIN=base-sepolia npm test
```

Default production URL is `https://api.grapevine.fyi`.

The test script will:
1. Create a test feed
2. Create a test entry in that feed
3. Display the results with feed ID, entry ID, and IPFS CID

See [TEST.md](./TEST.md) for detailed documentation.

## Development

Run the MCP server directly for testing:

```bash
node index.js
```

The MCP server communicates via stdio, so it should be run through the MCP protocol (Claude Desktop) for normal operation.

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `x402-fetch`: Automatic x402 payment handling
- `viem`: Ethereum wallet and transaction library
- `dotenv`: Environment variable management

## License

MIT
