import { track } from '@vercel/analytics'

/**
 * Track a custom event with Vercel Analytics
 * Automatically includes the wallet address if available
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>,
  walletAddress?: string | null
) {
  track(eventName, {
    ...properties,
    wallet: walletAddress || 'anonymous',
  })
}

// Event names as constants for consistency
export const AnalyticsEvents = {
  CREATE_FEED: 'create_feed',
  CREATE_ENTRY: 'create_entry',
  BUY_RESOURCE: 'buy_resource',
  VIEW_PURCHASED_RESOURCE: 'view_purchased_resource',
  VIEW_OWN_RESOURCE: 'view_own_resource',
  MUSIC_PLAYER_PLAY: 'music_player_play',
  MUSIC_PLAYER_PAUSE: 'music_player_pause',
  SHARE_FEED_FARCASTER: 'share_feed_farcaster',
  SHARE_ENTRY_FARCASTER: 'share_entry_farcaster',
  COPY_LINK: 'copy_link',
} as const
