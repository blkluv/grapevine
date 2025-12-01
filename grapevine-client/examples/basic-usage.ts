import { createGrapevineClient } from "../src/index";

async function main() {
  // Create a client instance
  const client = createGrapevineClient({
    baseUrl: "https://grapevine-api.devpinata.cloud",
  });

  // Example authentication headers (required for protected endpoints)
  const authHeaders = {
    "x-wallet-address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "x-signature": "0xabcd...", // Your wallet signature
    "x-message": "R3JhcGV2aW5lIEF1dGhlbnRpY2F0aW9u...", // Base64 encoded signed message
    "x-timestamp": "1735689600",
  };

  // Example 1: Get wallet by ID (public endpoint - no auth required)
  console.log("Fetching wallet...");
  const { data: wallet, error: walletError } = await client.GET(
    "/v1/wallets/{id}",
    {
      params: {
        path: {
          id: "some-wallet-uuid",
        },
      },
    }
  );

  if (walletError) {
    console.error("Error fetching wallet:", walletError);
  } else {
    console.log("Wallet:", wallet);
  }

  // Example 2: List categories
  console.log("\nFetching categories...");
  const { data: categories, error: categoriesError } = await client.GET(
    "/v1/categories",
    {
      params: {
        query: {
          page: "1",
          limit: "10",
          is_active: "true",
        },
      },
    }
  );

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  } else {
    console.log(`Found ${categories.data.length} categories`);
    console.log(categories);
  }

  // Example 3: List feeds (public endpoint - no auth required)
  console.log("\nFetching feeds...");
  const { data: feeds, error: feedsError } = await client.GET("/v1/feeds", {
    params: {
      query: {
        page: "1",
        limit: "10",
        is_active: "true",
      },
    },
  });

  if (feedsError) {
    console.error("Error fetching feeds:", feedsError);
  } else {
    console.log(`Found ${feeds.data.length} feeds`);
    console.log(feeds);
  }

  // Example 4: Create a feed (protected endpoint - requires authentication)
  console.log("\nCreating feed...");
  const { data: newFeed, error: createError } = await client.POST("/v1/feeds", {
    headers: authHeaders,
    body: {
      owner_id: "wallet-uuid",
      category_id: "category-uuid",
      name: "My Data Feed",
      description: "A feed for sharing predictions",
      tags: ["crypto", "defi"],
    },
  });

  if (createError) {
    console.error("Error creating feed:", createError);
  } else {
    console.log("Feed created:", newFeed);
  }

  // Example 5: Update a feed (protected endpoint - requires authentication)
  console.log("\nUpdating feed...");
  const { data: updatedFeed, error: updateError } = await client.PATCH(
    "/v1/feeds/{feed_id}",
    {
      headers: authHeaders,
      params: {
        path: {
          id: "feed-uuid",
        },
      },
      body: {
        name: "Updated Feed Name",
        description: "Updated description",
      },
    }
  );

  if (updateError) {
    console.error("Error updating feed:", updateError);
  } else {
    console.log("Feed updated:", updatedFeed);
  }

  // Example 6: List transactions (protected - filtered by authenticated user)
  console.log("\nFetching transactions...");
  const { data: transactions, error: txError } = await client.GET(
    "/v1/transactions",
    {
      headers: authHeaders,
      params: {
        query: {
          page: "1",
          limit: "10",
        },
      },
    }
  );

  if (txError) {
    console.error("Error fetching transactions:", txError);
  } else {
    console.log(`Found ${transactions.data.length} transactions`);
    console.log("Note: Only shows transactions where you are sender or receiver");
  }

  // Example 7: Create transaction (protected endpoint)
  console.log("\nCreating transaction...");
  const { data: newTx, error: createTxError } = await client.POST(
    "/v1/transactions",
    {
      headers: authHeaders,
      body: {
        transaction_type: "purchase",
        from_user_id: "buyer-uuid",
        to_user_id: "seller-uuid",
        amount: "1000000000000000000", // 1 ETH in wei
        asset: "BASE_ETH",
        transaction_hash: "0x" + "0".repeat(64),
      },
    }
  );

  if (createTxError) {
    console.error("Error creating transaction:", createTxError);
  } else {
    console.log("Transaction created:", newTx);
  }
}

main().catch(console.error);
