/**
 * Pinata V3 Uploads Service
 * Handles file uploads to Pinata's V3 API using form data
 */

import { uuidv7 } from 'uuidv7';
import { logger } from './logger.js';
import { config } from './config.js';

/**
 * Validate that a string is a valid IPFS CID
 * Supports CIDv0 (Qm...) and CIDv1 (b...)
 * @param cid - The CID string to validate
 * @returns true if valid, false otherwise
 */
export function isValidCID(cid: string): boolean {
  if (!cid || typeof cid !== 'string') {
    return false;
  }

  // CIDv0: Base58-encoded multihash starting with "Qm"
  // Length is typically 46 characters
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

  // CIDv1: Multibase-encoded (usually base32 starting with "b")
  // Can also start with other multibase prefixes
  const cidV1Regex = /^b[a-z2-7]{58,}$/i;

  // Also accept other CIDv1 formats (base58btc with "z", base32 with "b", etc.)
  const cidV1GeneralRegex = /^[zZbBfFuUmM][1-9A-HJ-NP-Za-km-z]{20,}$/;

  return cidV0Regex.test(cid) || cidV1Regex.test(cid) || cidV1GeneralRegex.test(cid);
}

/**
 * Extract CID and path from an IPFS URL
 * Supports URLs like:
 * - https://gateway.pinata.cloud/ipfs/QmXxx
 * - https://gateway.pinata.cloud/ipfs/QmXxx/folder/image.png
 * - ipfs://QmXxx
 * - ipfs://QmXxx/folder/image.png
 * - /ipfs/QmXxx
 * - /ipfs/QmXxx/folder/image.png
 * @param url - The URL to extract CID and path from
 * @returns The full IPFS path (CID + subpath) if found and valid, null otherwise
 */
export function extractCIDFromURL(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Match patterns like /ipfs/CID/path or ipfs://CID/path or https://gateway/ipfs/CID/path
  // Capture the CID and any path after it
  const ipfsPattern = /(?:\/ipfs\/|ipfs:\/\/)([a-zA-Z0-9]+)(\/[^\s?#]*)?/;
  const match = url.match(ipfsPattern);

  if (match && match[1]) {
    const cid = match[1];
    const subpath = match[2] || ''; // Capture any path after the CID

    // Validate that it's a proper CID
    if (isValidCID(cid)) {
      // Return CID with subpath if present
      return cid + subpath;
    }
  }

  return null;
}

/**
 * Check if a string is base64 encoded
 * @param str - The string to check
 * @returns true if it looks like base64, false otherwise
 */
export function isBase64(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Base64 strings should only contain A-Z, a-z, 0-9, +, /, and = (padding)
  // And typically are quite long
  const base64Regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;

  // Check if it matches base64 pattern and is reasonably long
  // (to avoid false positives with short strings)
  return base64Regex.test(str) && str.length > 100;
}

interface PinataV3Config {
  uploadsUrl: string;
  adminKey: string;
  userId: string;
  groupName?: string;
}

type UploadResponse = {
  data: {
    id: string;
    group_id: string;
    cid: string;
    name: string;
    size: number;
    mime_type: string;
    network: string;
    created_at: string;
    updated_at: string;
    vectorized: boolean;
  }
}

type GroupResponse = {
  data: {
    id: string;
    name: string;
    is_public: boolean;
    network: string;
    created_at: string;
    updated_at: string;
  }
}

interface UploadOptions {
  name?: string;
  groupId?: string;
  groupName?: string;
  acceptDuplicates?: boolean;
  keyvalues?: Record<string, string>;
  streamable?: boolean;
  network?: 'public' | 'private'; // Network type (defaults to 'private')
}

/**
 * Get Pinata V3 configuration from environment variables
 */
export function getPinataV3Config(): PinataV3Config {
  const uploadsUrl = config.pinata.uploadsUrl;
  const adminKey = config.pinata.uploadsAdminKey;
  const userId = config.pinata.uploadsUserId;

  if (!uploadsUrl || !adminKey || !userId) {
    throw new Error('Missing required Pinata V3 environment variables: V3_UPLOADS_URL, V3_UPLOADS_ADMIN_KEY, V3_UPLOADS_USER_ID');
  }

  return { uploadsUrl, adminKey, userId };
}

/**
 * Create a Pinata group for organizing uploads
 * Uses PUT endpoint which creates if doesn't exist or returns existing
 * @param config - Pinata configuration
 * @param groupName - Name of the group to create
 * @returns Group ID
 */
export async function createGroup(config: PinataV3Config, groupName: string): Promise<string> {
  try {
    // Generate a UUIDv7 (time-ordered) for the group
    const groupId = uuidv7();
    const requestBody = {
      id: groupId,
      name: groupName,
      is_public: false,
    };

    logger.debug('Creating Pinata group', {
      group_id: groupId,
      group_name: groupName,
      request_body: requestBody,
    });

    const response = await fetch(`${config.uploadsUrl}/v3/groups`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'admin-key': config.adminKey,
        'x-pinata-user-id': config.userId,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Pinata group creation failed', undefined, {
        status: response.status,
        error: errorText,
        group_name: groupName,
        request_body: requestBody,
      });
      throw new Error(`Failed to create/get Pinata group (${response.status}): ${errorText}`);
    }

    const body = await response.json() as GroupResponse;
    if(!body.data?.id) {
      throw new Error(`Invalid group ID received from Pinata: ${body.data?.id || 'undefined'}`);
    }

    return body.data.id;
  } catch (error: any) {
    logger.error('Error creating Pinata group', error, {
      group_name: groupName,
    });
    throw new Error(`Failed to create Pinata group: ${error.message}`);
  }
}

/**
 * Upload a file to Pinata V3 from base64 content
 * @param contentBase64 - Base64 encoded file content
 * @param mimeType - MIME type of the file
 * @param options - Additional upload options
 * @returns Upload response with CID
 */
export async function uploadToPinata(
  contentBase64: string,
  mimeType: string,
  options: UploadOptions = {}
): Promise<UploadResponse> {
  const config = getPinataV3Config();

  // Decode base64 to Buffer
  const buffer = Buffer.from(contentBase64, 'base64');

  // Create form data
  const formData = new FormData();

  // Create a Blob from the buffer with the correct MIME type
  const blob = new Blob([buffer], { type: mimeType });

  // Add file to form data
  formData.append('file', blob, options.name || 'file');

  // Set network (defaults to 'private')
  formData.append('network', options.network || 'private');

  // Add optional fields
  if (options.groupId) {
    formData.append('group_id', options.groupId);
  }
  if (options.acceptDuplicates !== undefined) {
    formData.append('accept_duplicates', options.acceptDuplicates.toString());
  }
  if (options.keyvalues) {
    formData.append('keyvalues', JSON.stringify(options.keyvalues));
  }
  if (options.streamable !== undefined) {
    formData.append('streamable', options.streamable.toString());
  }

  // Make the upload request
  const response = await fetch(`${config.uploadsUrl}/v3/files`, {
    method: 'POST',
    headers: {
      'admin-key': config.adminKey,
      'x-pinata-user-id': config.userId,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Pinata upload failed', undefined, {
      url: `${config.uploadsUrl}/v3/files`,
      status: response.status,
      error: errorText,
      formDataKeys: Array.from(formData.keys()),
    });
    throw new Error(`Pinata upload failed (${response.status}): ${errorText}`);
  }

  const res = await response.json() as UploadResponse;

  // Validate that the response contains a valid CID
  if (!res?.data?.cid || !isValidCID(res?.data.cid)) {
    throw new Error(`Invalid CID received from Pinata: ${res?.data.cid || 'undefined'}`);
  }

  return res;
}

/**
 * Upload multiple files to Pinata V3
 * @param files - Array of files to upload
 * @returns Array of upload responses
 */
export async function uploadMultipleToPinata(
  files: Array<{ contentBase64: string; mimeType: string; options?: UploadOptions }>
): Promise<UploadResponse[]> {
  const uploadPromises = files.map(file =>
    uploadToPinata(file.contentBase64, file.mimeType, file.options)
  );

  return Promise.all(uploadPromises);
}

/**
 * Fetch an image from a URL and upload it to Pinata
 * @param imageUrl - The URL of the image to fetch
 * @param options - Upload options
 * @returns Upload response with CID
 */
export async function fetchAndUploadImage(
  imageUrl: string,
  options: UploadOptions = {}
): Promise<UploadResponse> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL (${response.status}): ${response.statusText}`);
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Validate that it's an image
    if (!contentType.startsWith('image/')) {
      throw new Error(`URL does not point to an image. Content-Type: ${contentType}`);
    }

    // Convert to buffer and then to base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Upload to Pinata
    return await uploadToPinata(base64, contentType, options);
  } catch (error: any) {
    logger.error('Failed to fetch and upload image', error, {
      image_url: imageUrl,
    });
    throw new Error(`Failed to fetch and upload image: ${error.message}`);
  }
}

export interface AccessLinkOptions {
  cid: string;
  expires?: number; // Expiration time in seconds
  gateway?: string;
}

interface AccessLinkResponse {
  data: string; // The presigned URL
}

/**
 * Create a presigned access link for private file retrieval
 * This allows temporary access to private files without exposing credentials
 * @param options - Options for the access link (CID, expiration, gateway)
 * @returns Presigned URL for downloading private files
 */
export async function createPrivateAccessLink(
  options: AccessLinkOptions
): Promise<string> {
  const jwtToken = config.pinata.jwtToken;
  const gateway = options.gateway || config.pinata.gateway;

  if (!jwtToken) {
    throw new Error('PINATA_JWT_TOKEN environment variable is required');
  }

  if (!gateway) {
    throw new Error('PINATA_GATEWAY environment variable is required');
  }

  const baseUrl = gateway.startsWith('https://') ? gateway : `https://${gateway}`;
  const fileUrl = `${baseUrl}/files/${options.cid}`;

  const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const expiresIn = options.expires || 30; // Default 30 seconds

  const requestBody = {
    url: fileUrl,
    date: now,
    expires: expiresIn,
    method: 'GET',
  };

  logger.debug('Creating private access link', {
    request_body: requestBody,
    cid: options.cid,
  });

  const endpoint = config.pinata.backendApiUrl;
  if (!endpoint) {
    throw new Error(`PINATA_BACKEND_API_URL environment variable is required`);
  }

  const response = await fetch(`${endpoint}/v3/files/private/download_link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Private access link creation failed', undefined, {
      status: response.status,
      error: errorText,
      request_body: requestBody,
    });
    throw new Error(`Failed to create private access link (${response.status}): ${errorText}`);
  }

  const result = await response.json() as AccessLinkResponse;

  if (!result?.data) {
    throw new Error(`Invalid response from Pinata: ${JSON.stringify(result)}`);
  }

  return result.data;
}
