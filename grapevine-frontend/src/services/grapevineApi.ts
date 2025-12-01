import type { paths } from '../types/api';

// Import resource APIs
import { authApi } from './api/auth';
import { walletsApi } from './api/wallets';
import { categoriesApi } from './api/categories';
import { feedsApi } from './api/feeds';
import { entriesApi } from './api/entries';
import { transactionsApi } from './api/transactions';
import { leaderboardsApi } from './api/leaderboards';

// Re-export all resource APIs
export { authApi, walletsApi, categoriesApi, feedsApi, entriesApi, transactionsApi, leaderboardsApi };

// Re-export client utilities
export { getClient, getBackendUrl } from './api/client';

// Re-export types from resource files
export type { CreateFeedInput, UpdateFeedInput } from './api/feeds';
export type { CreateEntryInput } from './api/entries';
export type { CreateTransactionInput } from './api/transactions';

// Export types from generated OpenAPI spec for convenience
export type GrapevineCategory = NonNullable<paths['/v1/categories/{category_id}']['get']['responses']['200']['content']['application/json']>;
export type GrapevineFeed = NonNullable<paths['/v1/feeds/{feed_id}']['get']['responses']['200']['content']['application/json']>;

// Base entry type from OpenAPI
type GrapevineEntryBase = NonNullable<paths['/v1/feeds/{feed_id}/entries/{entry_id}']['get']['responses']['200']['content']['application/json']>;

// Extended entry type with additional fields from the API response
// Note: price and asset are not in the OpenAPI spec but are returned by the actual API
export type GrapevineEntry = GrapevineEntryBase & {
  price?: string;
  asset?: string;
};

export type GrapevineWallet = NonNullable<paths['/v1/wallets/{wallet_id}']['get']['responses']['200']['content']['application/json']>;
export type GrapevineWalletStats = NonNullable<paths['/v1/wallets/{wallet_id}/stats']['get']['responses']['200']['content']['application/json']>;
export type GrapevineTransaction = NonNullable<paths['/v1/transactions/{id}']['get']['responses']['200']['content']['application/json']>;

// Legacy exports for backward compatibility
export type CreateGrapevineFeedInput = NonNullable<paths['/v1/feeds']['post']['requestBody']>['content']['application/json'];
export type CreateGrapevineEntryInput = NonNullable<paths['/v1/feeds/{feed_id}/entries']['post']['requestBody']>['content']['application/json'];

// Grapevine API Client with type-safe methods (backward compatibility wrapper)
class GrapevineApiClient {
  // Authentication
  getNonce = authApi.getNonce;

  // Categories
  getCategories = categoriesApi.getCategories;
  getCategory = categoriesApi.getCategory;

  // Feeds
  createFeed = feedsApi.createFeed;
  getFeeds = feedsApi.getFeeds;
  getFeed = feedsApi.getFeed;
  updateFeed = feedsApi.updateFeed;
  deleteFeed = feedsApi.deleteFeed;

  // Entries
  createEntry = entriesApi.createEntry;
  getEntries = entriesApi.getEntries;
  getEntry = entriesApi.getEntry;
  deleteEntry = entriesApi.deleteEntry;
  getEntryAccessLink = entriesApi.getAccessLink;

  // Wallets
  getWallet = walletsApi.getWallet;
  getWalletByAddress = walletsApi.getWalletByAddress;
  getWalletStats = walletsApi.getWalletStats;
  updateWallet = walletsApi.updateWallet;

  // Transactions
  getTransactions = transactionsApi.getTransactions;
  getTransaction = transactionsApi.getTransaction;
  getTransactionByHash = transactionsApi.getTransactionByHash;
  createTransaction = transactionsApi.createTransaction;

  // Leaderboards
  getRecentEntries = leaderboardsApi.getRecentEntries;
  getTopFeeds = leaderboardsApi.getTopFeeds;
  getTopRevenue = leaderboardsApi.getTopRevenue;
  getTopProviders = leaderboardsApi.getTopProviders;
  getTopBuyers = leaderboardsApi.getTopBuyers;
  getTrending = leaderboardsApi.getTrending;
  getMostPopular = leaderboardsApi.getMostPopular;
  getCategoryStats = leaderboardsApi.getCategoryStats;
}

export const grapevineApiClient = new GrapevineApiClient();
