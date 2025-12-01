#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the .env file in the same directory as this script
dotenv.config({ path: join(__dirname, '.env') });

// Supported chains
const CHAINS = {
  'base': {
    name: 'Base Mainnet',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
  },
  'base-sepolia': {
    name: 'Base Sepolia Testnet',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
  },
};

// Predefined server configurations
// Claude will choose which server to use based on context
const SERVERS = {
  local: {
    name: 'Local Development Server',
    url: 'http://localhost:8080',
    description: 'Local Grapevine API running on port 8080. Use for local testing and development.',
  },
  dev: {
    name: 'Development Server',
    url: 'https://api.grapevine.markets',
    description: 'Grapevine development/staging server on testnet. Use for testing against the dev environment.',
  },
  prod: {
    name: 'Production Server',
    url: 'https://api.grapevine.fyi',
    description: 'Grapevine production server. Use for real production operations.',
  },
};

// Create viem account from private key
function createBuyerAccount() {
  const privateKey = process.env.BUYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('BUYER_PRIVATE_KEY not found in environment variables');
  }
  // Handle both with and without 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  return privateKeyToAccount(formattedKey);
}

// Create MCP server
const server = new Server(
  {
    name: 'grapevine-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_servers',
        description: 'List all available Grapevine servers (local, dev, prod)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_chains',
        description: 'List all supported blockchain networks (base, base-sepolia)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_wallet_info',
        description: 'Get information about the configured buyer wallet for a specific chain',
        inputSchema: {
          type: 'object',
          properties: {
            chain: {
              type: 'string',
              description: 'Chain to check: base (mainnet, real funds) or base-sepolia (testnet, test funds)',
              enum: ['base', 'base-sepolia'],
              default: 'base-sepolia',
            },
          },
          required: ['chain'],
        },
      },
      {
        name: 'discover_resource',
        description: 'Discover x402 protected resources on a Grapevine server (triggers 402 response to see payment requirements)',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server key (local, dev, prod) or custom URL',
            },
            path: {
              type: 'string',
              description: 'API endpoint path (e.g., /v1/feeds)',
            },
            method: {
              type: 'string',
              description: 'HTTP method',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
              default: 'GET',
            },
          },
          required: ['server', 'path'],
        },
      },
      {
        name: 'call_api',
        description: 'Make an authenticated API call to a Grapevine endpoint with x402 payment support',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server: local (localhost:8080), dev (testnet-api.grapevine.fyi), prod (api.grapevine.fyi)',
              enum: ['local', 'dev', 'prod'],
            },
            path: {
              type: 'string',
              description: 'API endpoint path (e.g., /v1/feeds)',
            },
            method: {
              type: 'string',
              description: 'HTTP method',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
              default: 'GET',
            },
            body: {
              type: 'string',
              description: 'Request body (JSON string for POST/PUT/PATCH requests)',
            },
            chain: {
              type: 'string',
              description: 'Blockchain network for payment: base (mainnet, real funds) or base-sepolia (testnet, test funds). Choose based on server environment.',
              enum: ['base', 'base-sepolia'],
            },
          },
          required: ['server', 'path', 'chain'],
        },
      },
      {
        name: 'get_feeds',
        description: 'Get all feeds from Grapevine API with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server: local (localhost:8080), dev (testnet-api.grapevine.fyi), or prod (api.grapevine.fyi)',
              enum: ['local', 'dev', 'prod'],
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page',
              default: 20,
            },
            owner_id: {
              type: 'string',
              description: 'Filter by owner UUID',
            },
            category: {
              type: 'string',
              description: 'Filter by category UUID',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags to filter by',
            },
            chain: {
              type: 'string',
              description: 'Blockchain network for payment: base (mainnet) or base-sepolia (testnet). Match to server environment.',
              enum: ['base', 'base-sepolia'],
            },
          },
          required: ['server', 'chain'],
        },
      },
      {
        name: 'create_feed',
        description: 'Create a new feed on Grapevine API (requires x402 payment)',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server: local (localhost:8080), dev (testnet-api.grapevine.fyi), or prod (api.grapevine.fyi)',
              enum: ['local', 'dev', 'prod'],
            },
            name: {
              type: 'string',
              description: 'Feed name',
            },
            description: {
              type: 'string',
              description: 'Feed description',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tags',
            },
            category_id: {
              type: 'string',
              description: 'Category UUID',
            },
            chain: {
              type: 'string',
              description: 'Blockchain network for payment: base (mainnet) or base-sepolia (testnet). Match to server environment.',
              enum: ['base', 'base-sepolia'],
            },
          },
          required: ['server', 'name', 'description', 'chain'],
        },
      },
      {
        name: 'get_categories',
        description: 'Get all categories from Grapevine API',
        inputSchema: {
          type: 'object',
          properties: {
            server: {
              type: 'string',
              description: 'Server: local (localhost:8080), dev (testnet-api.grapevine.fyi), or prod (api.grapevine.fyi)',
              enum: ['local', 'dev', 'prod'],
            },
            chain: {
              type: 'string',
              description: 'Blockchain network for payment: base (mainnet) or base-sepolia (testnet). Match to server environment.',
              enum: ['base', 'base-sepolia'],
            },
          },
          required: ['server', 'chain'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_servers': {
        const serverList = Object.entries(SERVERS).map(([key, config]) => ({
          key,
          name: config.name,
          url: config.url,
          description: config.description,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(serverList, null, 2),
            },
          ],
        };
      }

      case 'list_chains': {
        const chainList = Object.entries(CHAINS).map(([key, config]) => ({
          key,
          name: config.name,
          chainId: config.chainId,
          rpcUrl: config.rpcUrl,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(chainList, null, 2),
            },
          ],
        };
      }

      case 'get_wallet_info': {
        try {
          const account = createBuyerAccount();
          const chain = args.chain;
          const chainInfo = CHAINS[chain];

          if (!chainInfo) {
            throw new Error(`Unknown chain: ${chain}. Use: base, base-sepolia`);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  address: account.address,
                  chain: chainInfo.name,
                  chainId: chainInfo.chainId,
                  status: 'configured',
                  note: `Ensure this wallet has ${chainInfo.name} ETH (gas) and USDC (payment)`,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: error.message,
                  status: 'not configured',
                  note: 'Set BUYER_PRIVATE_KEY in .env file',
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'discover_resource': {
        const serverKey = args.server;
        const path = args.path;
        const method = args.method || 'GET';

        // Resolve server URL
        let serverUrl;
        if (SERVERS[serverKey]) {
          serverUrl = SERVERS[serverKey].url;
        } else if (serverKey.startsWith('http')) {
          serverUrl = serverKey;
        } else {
          throw new Error(`Unknown server: ${serverKey}. Use: local, dev, prod, or provide a full URL`);
        }

        const fullUrl = `${serverUrl}${path}`;

        // Make request without payment to trigger 402
        const response = await fetch(fullUrl, { method });

        if (response.status === 402) {
          const paymentInfo = {
            status: 402,
            message: 'Payment Required',
            resource: fullUrl,
            method,
            headers: {},
          };

          // Extract payment-related headers
          const headersToCopy = [
            'x-payment-required',
            'x-payment-amount',
            'x-payment-currency',
            'x-payment-address',
            'www-authenticate',
          ];

          headersToCopy.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
              paymentInfo.headers[header] = value;
            }
          });

          // Try to parse WWW-Authenticate header for more details
          const wwwAuth = response.headers.get('www-authenticate');
          if (wwwAuth) {
            try {
              const challengeMatch = wwwAuth.match(/x402\s+(.+)/i);
              if (challengeMatch) {
                const params = {};
                challengeMatch[1].split(',').forEach(pair => {
                  const [key, value] = pair.trim().split('=');
                  params[key] = value?.replace(/^"|"$/g, '');
                });
                paymentInfo.paymentDetails = params;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(paymentInfo, null, 2),
              },
            ],
          };
        } else if (response.ok) {
          const body = await response.text();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  message: 'Resource is publicly accessible (no payment required)',
                  resource: fullUrl,
                  method,
                  body: body.substring(0, 500) + (body.length > 500 ? '...' : ''),
                }, null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  statusText: response.statusText,
                  resource: fullUrl,
                  method,
                  error: 'Unexpected response',
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'call_api': {
        const serverKey = args.server;
        const path = args.path;
        const method = args.method || 'GET';
        const body = args.body;
        const chain = args.chain;

        // Validate chain
        if (!CHAINS[chain]) {
          throw new Error(`Unknown chain: ${chain}. Use: base, base-sepolia`);
        }

        // Resolve server URL
        let serverUrl;
        if (SERVERS[serverKey]) {
          serverUrl = SERVERS[serverKey].url;
        } else if (serverKey.startsWith('http')) {
          serverUrl = serverKey;
        } else {
          throw new Error(`Unknown server: ${serverKey}. Use: local, dev, prod, or provide a full URL`);
        }

        const fullUrl = `${serverUrl}${path}`;

        // Create account and wrap fetch with payment capability
        const account = createBuyerAccount();
        const maxPaymentAmount = BigInt(1_000_000); // $1.00 USDC
        const fetchWithPayment = wrapFetchWithPayment(fetch, account, maxPaymentAmount);

        // Prepare request options
        const options = {
          method,
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          options.headers = {
            'Content-Type': 'application/json',
          };
          options.body = body;
        }

        // Make payment and fetch resource
        const response = await fetchWithPayment(fullUrl, options);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          let responseBody;

          if (contentType?.includes('application/json')) {
            responseBody = await response.json();
          } else {
            responseBody = await response.text();
          }

          // Extract payment info from headers
          const paymentFrom = response.headers.get('x-payment-from') ||
                            response.headers.get('x-x402-address');
          const paymentResponse = response.headers.get('x-payment-response');

          const result = {
            status: response.status,
            statusText: response.statusText,
            resource: fullUrl,
            method,
            chain: CHAINS[chain].name,
            payment: {
              from: paymentFrom,
              details: paymentResponse,
            },
            data: responseBody,
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } else if (response.status === 402) {
          const errorBody = await response.text();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 402,
                  message: 'Payment failed or rejected',
                  resource: fullUrl,
                  method,
                  chain: CHAINS[chain].name,
                  error: errorBody,
                  note: `Check wallet balance (${CHAINS[chain].name} ETH + USDC) and transaction validity`,
                }, null, 2),
              },
            ],
            isError: true,
          };
        } else {
          const errorBody = await response.text();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  statusText: response.statusText,
                  resource: fullUrl,
                  method,
                  error: errorBody,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'get_feeds': {
        const serverKey = args.server;
        const chain = args.chain;

        if (!SERVERS[serverKey]) {
          throw new Error(`Unknown server: ${serverKey}. Use: local, dev, prod`);
        }

        const serverUrl = SERVERS[serverKey].url;
        const queryParams = new URLSearchParams();

        if (args.page_size) queryParams.append('page_size', args.page_size.toString());
        if (args.owner_id) queryParams.append('owner_id', args.owner_id);
        if (args.category) queryParams.append('category', args.category);
        if (args.tags) queryParams.append('tags', args.tags);

        const path = `/v1/feeds${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const fullUrl = `${serverUrl}${path}`;

        // Create account and wrap fetch
        const account = createBuyerAccount();
        const maxPaymentAmount = BigInt(1_000_000);
        const fetchWithPayment = wrapFetchWithPayment(fetch, account, maxPaymentAmount);

        const response = await fetchWithPayment(fullUrl);

        if (response.ok) {
          const data = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  server: serverKey,
                  chain: CHAINS[chain].name,
                  data,
                }, null, 2),
              },
            ],
          };
        } else {
          const errorBody = await response.text();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  statusText: response.statusText,
                  error: errorBody,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'create_feed': {
        const serverKey = args.server;
        const chain = args.chain;

        if (!SERVERS[serverKey]) {
          throw new Error(`Unknown server: ${serverKey}. Use: local, dev, prod`);
        }

        const serverUrl = SERVERS[serverKey].url;
        const path = '/v1/feeds';
        const fullUrl = `${serverUrl}${path}`;

        const feedData = {
          name: args.name,
          description: args.description,
          tags: args.tags || [],
        };

        if (args.category_id) {
          feedData.category_id = args.category_id;
        }

        // Create account and wrap fetch
        const account = createBuyerAccount();
        const maxPaymentAmount = BigInt(1_000_000);
        const fetchWithPayment = wrapFetchWithPayment(fetch, account, maxPaymentAmount);

        const response = await fetchWithPayment(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedData),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  server: serverKey,
                  chain: CHAINS[chain].name,
                  message: 'Feed created successfully',
                  data,
                }, null, 2),
              },
            ],
          };
        } else {
          const errorBody = await response.text();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  statusText: response.statusText,
                  error: errorBody,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      case 'get_categories': {
        const serverKey = args.server;
        const chain = args.chain;

        if (!SERVERS[serverKey]) {
          throw new Error(`Unknown server: ${serverKey}. Use: local, dev, prod`);
        }

        const serverUrl = SERVERS[serverKey].url;
        const path = '/v1/categories';
        const fullUrl = `${serverUrl}${path}`;

        // Create account and wrap fetch
        const account = createBuyerAccount();
        const maxPaymentAmount = BigInt(1_000_000);
        const fetchWithPayment = wrapFetchWithPayment(fetch, account, maxPaymentAmount);

        const response = await fetchWithPayment(fullUrl);

        if (response.ok) {
          const data = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  server: serverKey,
                  chain: CHAINS[chain].name,
                  data,
                }, null, 2),
              },
            ],
          };
        } else {
          const errorBody = await response.text();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: response.status,
                  statusText: response.statusText,
                  error: errorBody,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            stack: error.stack,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Grapevine MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
