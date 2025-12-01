# Type Synchronization Script

This script synchronizes TypeScript types from the grapevine-api to the grapevine-frontend, ensuring a single source of truth for API types.

## Overview

The script does the following:
1. Checks that `grapevine-client/openapi.json` exists
2. Generates TypeScript types using `openapi-typescript` in the client
3. Copies the generated types to `grapevine-frontend/src/types/api.ts`

The script uses the existing `openapi.json` file in the grapevine-client directory as the source of truth.

## Usage

Run the script from the project root:

```bash
npm run sync-types
```

Or directly:

```bash
node sync-types.mjs
```

## Prerequisites

- Node.js installed
- `grapevine-client` dependencies installed (for `openapi-typescript`)
- `grapevine-client/openapi.json` exists (should already be in the repository)

## Output

The script generates:
- `grapevine-client/src/types.ts` - Generated from OpenAPI spec
- `grapevine-frontend/src/types/api.ts` - Copy of client types with custom header

## When to Run

Run this script whenever:
- The backend API schema changes
- New endpoints are added
- Request/response types are modified
- After pulling changes that affect the API

## Complete Type Sync Process

When the backend API schema changes, follow these steps:

### Step 1: Update OpenAPI Spec from Running API

First, ensure the grapevine-api is running locally. Check which port it's running on:

```bash
# Check if API is running on default port 3000
curl -s http://localhost:3000/health

# If not, check port 8080
curl -s http://localhost:8080/health
```

Once you've confirmed the API is running, fetch the latest OpenAPI spec:

```bash
# From port 8080 (common alternative)
curl -s http://localhost:8080/v1/openapi.json -o grapevine-client/openapi.json

# Or from port 3000 (default)
curl -s http://localhost:3000/v1/openapi.json -o grapevine-client/openapi.json
```

Alternatively, you can generate types directly in grapevine-client:

```bash
cd grapevine-client
pnpm generate:types
```

This will:
1. Use the existing `openapi.json` in grapevine-client
2. Generate TypeScript types to `src/types.ts`

### Step 2: Sync Types to Frontend

After updating the client types, run the sync script to propagate changes to the frontend:

```bash
npm run sync-types
```

This copies the generated types from `grapevine-client/src/types.ts` to `grapevine-frontend/src/types/api.ts`.

## Troubleshooting

### OpenAPI spec not found
- Ensure `grapevine-client/openapi.json` exists
- Copy it from the grapevine-api or fetch it from the running API

### Type generation fails
- Ensure `grapevine-client/node_modules` is installed
- Run `npm install` in the `grapevine-client` directory
- Check that the OpenAPI spec is valid JSON

### Types don't match
- Ensure you're running the latest version of the client
- Check that the OpenAPI spec endpoint is returning the correct schema
- Verify the client is serving the latest OpenAPI spec
