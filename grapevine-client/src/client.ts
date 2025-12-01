import createClient from "openapi-fetch";
import type { paths } from "./types";

export interface GrapevineClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

/**
 * Creates a type-safe client for the Grapevine API
 *
 * @param options - Configuration options for the client
 * @returns A type-safe API client
 *
 * @example
 * ```typescript
 * const client = createGrapevineClient({
 *   baseUrl: "https://grapevine-api.devpinata.cloud"
 * });
 *
 * // List all wallets
 * const { data, error } = await client.GET("/v1/wallets", {
 *   params: { query: { page: "1", limit: "20" } }
 * });
 * ```
 */
export function createGrapevineClient(options: GrapevineClientOptions = {}) {
  const { baseUrl = "http://localhost:3000", headers = {} } = options;

  return createClient<paths>({
    baseUrl,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export type GrapevineClient = ReturnType<typeof createGrapevineClient>;
