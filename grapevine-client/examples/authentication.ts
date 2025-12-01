import { createGrapevineClient } from "../src/index";

/**
 * Authentication Example
 *
 * This example demonstrates how to authenticate with the Grapevine API
 * using wallet signatures and headers.
 */

async function main() {
  const client = createGrapevineClient({
    baseUrl: "https://grapevine-api.devpinata.cloud",
  });

  // Step 1: Request a nonce for your wallet address
  console.log("Step 1: Requesting authentication nonce...");
  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

  const { data: nonceData, error: nonceError } = await client.POST(
    "/v1/auth/nonce",
    {
      body: {
        wallet_address: walletAddress,
      },
    }
  );

  if (nonceError) {
    console.error("Error requesting nonce:", nonceError);
    return;
  }

  console.log("Nonce received:", nonceData.nonce);
  console.log("Message to sign:", nonceData.message);
  console.log("Expires at:", new Date(nonceData.expiresAt));

  // Step 2: Sign the message with your wallet
  // In a real application, you would use a wallet library like ethers.js or viem
  console.log("\nStep 2: Sign the message with your wallet...");
  console.log("Example with ethers.js:");
  console.log(`
    import { ethers } from 'ethers';

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(nonceData.message);
  `);

  console.log("Example with viem:");
  console.log(`
    import { signMessage } from 'viem/accounts';
    import { privateKeyToAccount } from 'viem/accounts';

    const account = privateKeyToAccount('0x...');
    const signature = await account.signMessage({
      message: nonceData.message,
    });
  `);

  // Step 3: Use the signature in authenticated requests
  console.log("\nStep 3: Use authentication headers in requests...");

  // For this example, we'll use a mock signature
  // In production, this would be the actual signature from your wallet
  const mockSignature = "0xabcd1234..."; // Replace with actual signature

  // Base64 encode the message (required for HTTP headers)
  const encodedMessage = Buffer.from(nonceData.message).toString("base64");

  const authHeaders = {
    "x-wallet-address": walletAddress,
    "x-signature": mockSignature,
    "x-message": encodedMessage,
    "x-timestamp": Math.floor(Date.now() / 1000).toString(),
  };

  console.log("Authentication headers prepared:");
  console.log(authHeaders);

  // Example: Create a feed with authentication
  console.log("\nExample: Creating a feed with authentication...");
  const { data: feed, error: feedError } = await client.POST("/v1/feeds", {
    headers: authHeaders,
    body: {
      owner_id: "your-wallet-uuid",
      category_id: "category-uuid",
      name: "My Authenticated Feed",
      description: "This feed was created with wallet authentication",
      tags: ["authenticated", "example"],
    },
  });

  if (feedError) {
    console.error("Error creating feed:", feedError);
    console.log(
      "\nNote: This will fail with mock signature. Use real wallet signature."
    );
  } else {
    console.log("Feed created successfully:", feed);
  }

  // Example: Update wallet profile
  console.log("\nExample: Updating wallet profile...");
  const { data: wallet, error: walletError } = await client.PATCH(
    "/v1/wallets/{id}",
    {
      headers: authHeaders,
      params: {
        path: {
          id: "your-wallet-uuid",
        },
      },
      body: {
        username: "MyUsername",
      },
    }
  );

  if (walletError) {
    console.error("Error updating wallet:", walletError);
  } else {
    console.log("Wallet updated:", wallet);
  }

  // Example: List your transactions (privacy-filtered)
  console.log("\nExample: Listing your transactions...");
  const { data: transactions, error: txError } = await client.GET(
    "/v1/transactions",
    {
      headers: authHeaders,
      params: {
        query: {
          page: "1",
          limit: "20",
        },
      },
    }
  );

  if (txError) {
    console.error("Error fetching transactions:", txError);
  } else {
    console.log(
      `Found ${transactions.data.length} transactions (yours only)`
    );
    console.log(
      "Privacy: Only transactions where you are sender or receiver are returned"
    );
  }

  // Helper function to create auth headers (reusable)
  console.log("\n=== Reusable Helper Function ===");
  console.log(`
function createAuthHeaders(walletAddress: string, signature: string, message: string) {
  const encodedMessage = Buffer.from(message).toString('base64');

  return {
    'x-wallet-address': walletAddress,
    'x-signature': signature,
    'x-message': encodedMessage,
    'x-timestamp': Math.floor(Date.now() / 1000).toString(),
  };
}

// Usage:
const headers = createAuthHeaders(address, sig, msg);
await client.POST('/v1/feeds', { headers, body: {...} });
  `);
}

main().catch(console.error);
