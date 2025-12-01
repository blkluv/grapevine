import type { Story } from '@ladle/react';
import { BrowserRouter } from 'react-router-dom';
import { FeedCard } from './FeedCard';
import type { Feed } from '@pinata/grapevine-sdk/dist/types';

// Mock data for the stories
const mockFeeds: Feed[] = [
  {
    id: '123',
    owner_id: 'user_123',
    category_id: 'cat_1',
    name: 'Crypto Prices',
    description: 'Real-time cryptocurrency prices updated every minute with data from multiple exchanges.',
    image_cid: undefined,
    is_active: true,
    total_entries: 1250,
    total_purchases: 42,
    total_revenue: '15000000',
    tags: ['crypto', 'finance', 'bitcoin'],
    created_at: Math.floor((Date.now() - 86400000 * 30) / 1000),
    updated_at: Math.floor(Date.now() / 1000),
    owner_wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
  },
  {
    id: '124',
    owner_id: 'user_124',
    category_id: 'cat_2',
    name: 'Sports Scores',
    description: 'Live scores and updates from major sports leagues including NBA, NFL, and Premier League.',
    image_cid: undefined,
    is_active: true,
    total_entries: 890,
    total_purchases: 28,
    total_revenue: '8500000',
    tags: ['sports', 'live'],
    created_at: Math.floor((Date.now() - 86400000 * 15) / 1000),
    updated_at: Math.floor(Date.now() / 1000),
    owner_wallet_address: '0x5678901234567890abcdef1234567890abcdef12',
  },
  {
    id: '125',
    owner_id: 'user_125',
    category_id: 'cat_3',
    name: 'Weather Updates',
    description: 'Accurate weather forecasts for major cities worldwide, updated hourly.',
    image_cid: undefined,
    is_active: true,
    total_entries: 2100,
    total_purchases: 65,
    total_revenue: '3200000',
    tags: ['weather', 'forecast', 'global'],
    created_at: Math.floor((Date.now() - 86400000 * 60) / 1000),
    updated_at: Math.floor(Date.now() / 1000),
    owner_wallet_address: '0x9012345678901234567890abcdef1234567890ab',
  }
];

export const Default: Story = () => (
  <BrowserRouter>
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Feed Cards</h2>
      <p className="text-gray-600 mb-6">
        Switch themes using the dropdown in the sidebar to see different styles.
      </p>

      {/* Single Card */}
      <div className="mb-12">
        <h3 className="text-lg font-semibold mb-4">Single Card</h3>
        <div className="max-w-3xl">
          <FeedCard feed={mockFeeds[0]} />
        </div>
      </div>

      {/* Multiple Cards Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Card Grid</h3>
        <div className="grid gap-6 max-w-6xl">
          {mockFeeds.map(feed => (
            <FeedCard key={feed.id} feed={feed} />
          ))}
        </div>
      </div>

      {/* Cards with Actions */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold mb-4">Cards with Edit/Delete Actions</h3>
        <div className="max-w-3xl">
          <FeedCard
            feed={mockFeeds[0]}
            showEdit
            showDelete
            onEdit={(feed) => console.log('Edit:', feed)}
            onDelete={(id, name) => console.log('Delete:', id, name)}
          />
        </div>
      </div>
    </div>
  </BrowserRouter>
);

Default.storyName = 'Feed Cards';

