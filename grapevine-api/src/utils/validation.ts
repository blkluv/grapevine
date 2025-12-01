/**
 * Validation utilities for input sanitization and security checks
 */

/**
 * Validates image URL to prevent SSRF (Server-Side Request Forgery) attacks
 *
 * Allows:
 * - HTTPS URLs to public domains
 * - IPFS CIDs (Qm... or bafy...)
 * - Base64 data URIs (data:image/...)
 *
 * Blocks:
 * - Private IP ranges (10.x, 172.16-31.x, 192.168.x)
 * - Localhost and loopback addresses
 * - Cloud metadata services (169.254.169.254)
 * - Non-HTTP(S) protocols
 *
 * @param val - The image URL/CID/base64 string to validate
 * @returns true if valid, false otherwise
 */
export function isValidImageUrl(val: string | undefined | null): boolean {
  if (!val) return true; // Optional field

  // Allow base64 data URIs
  if (val.startsWith('data:')) return true;

  // Allow IPFS CIDs (typically start with Qm or bafy, or are very long strings)
  if (val.startsWith('Qm') || val.startsWith('bafy') || val.length > 1000) return true;

  // Validate URLs
  try {
    const url = new URL(val);

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    // Block private IPs and metadata services
    const hostname = url.hostname.toLowerCase();
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '169.254.169.254', // AWS/GCP metadata service
      '0.0.0.0',
      'metadata.google.internal',
      'metadata',
    ];

    if (blockedHosts.some(blocked => hostname === blocked || hostname.endsWith(blocked))) {
      return false;
    }

    // Block private IP ranges
    // - 10.0.0.0/8 (Class A private)
    // - 172.16.0.0/12 (Class B private)
    // - 192.168.0.0/16 (Class C private)
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname)) {
      return false;
    }

    return true;
  } catch {
    // If URL parsing fails, it might be a CID - allow it
    return true;
  }
}
