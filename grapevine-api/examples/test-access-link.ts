/**
 * One-time test script for createPrivateAccessLink
 *
 * Usage:
 *   1. Set environment variables:
 *      - PINATA_JWT_TOKEN=your_jwt_token
 *      - PINATA_GATEWAY_HOST=your_gateway_host (e.g., mygateway.mypinata.cloud)
 *      - PINATA_BACKEND_API_URL=https://api.pinata.cloud/v3 (optional, defaults to this)
 *   2. Run: npx tsx test-access-link.ts <CID>
 */

import { createPrivateAccessLink } from '../src/services/pinataV3.js';
import { config } from '../src/services/config.js';

async function testAccessLink() {
  // Get CID from command line argument
  const cid = process.argv[2];

  if (!cid) {
    console.error('❌ Error: CID is required');
    console.log('\nUsage: npx tsx test-access-link.ts <CID> [expires_in_seconds] [gateway]');
    console.log('\nExample: npx tsx test-access-link.ts QmXxx 60 mygateway.mypinata.cloud');
    process.exit(1);
  }

  // Optional arguments
  const expiresIn = process.argv[3] ? parseInt(process.argv[3]) : 30;
  const gateway = process.argv[4] || config.pinata.gateway;

  // Display configuration
  console.log('🔧 Configuration:');
  console.log(`   JWT Token: ${config.pinata.jwtToken ? '✓ Set (' + config.pinata.jwtToken.substring(0, 10) + '...)' : '✗ Not set'}`);
  console.log(`   Gateway: ${gateway || '✗ Not set'}`);
  console.log(`   Endpoint URL: ${config.pinata.backendApiUrl || 'https://api.devpinata.cloud/v3 (default)'}`);
  console.log(`   CID: ${cid}`);
  console.log(`   Expires in: ${expiresIn} seconds`);
  console.log('');

  // Validate required environment variables
  if (!config.pinata.jwtToken) {
    console.error('❌ Error: PINATA_JWT_TOKEN environment variable is not set');
    process.exit(1);
  }

  if (!gateway) {
    console.error('❌ Error: PINATA_GATEWAY_HOST environment variable is not set and not provided as argument');
    process.exit(1);
  }

  try {
    console.log('🚀 Creating private access link...\n');

    const presignedUrl = await createPrivateAccessLink({
      cid,
      expires: expiresIn,
      gateway,
    });

    console.log('✅ Success! Private access link created:\n');
    console.log(`   ${presignedUrl}\n`);
    console.log(`⏱️  This link will expire in ${expiresIn} seconds\n`);

    // Test the link by fetching it
    console.log('🧪 Testing the link by fetching it...\n');
    const response = await fetch(presignedUrl);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      console.log('✅ Link is accessible!');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Content-Length: ${contentLength} bytes`);

      // Show first few bytes if it's text
      if (contentType?.includes('text') || contentType?.includes('json')) {
        const text = await response.text();
        const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
        console.log(`\n   Preview:\n   ${preview}`);
      }
    } else {
      console.log(`⚠️  Link returned non-OK status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
    }

  } catch (error: any) {
    console.error('❌ Error creating private access link:');
    console.error(`   ${error.message}\n`);

    if (error.cause) {
      console.error('   Cause:', error.cause);
    }

    process.exit(1);
  }
}

// Run the test
testAccessLink();
