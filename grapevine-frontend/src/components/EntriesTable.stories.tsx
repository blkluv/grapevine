import type { Story } from '@ladle/react'
import { EntriesTable } from './EntriesTable'
import type { GrapevineEntry } from '@/services/grapevineApi'

// Mock entries data
const mockEntries: GrapevineEntry[] = [
  {
    id: 'entry-1',
    feed_id: 'feed-1',
    title: 'Bitcoin Price Analysis Q4 2024',
    description: 'Comprehensive analysis of Bitcoin price movements',
    cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
    mime_type: 'application/pdf',
    is_free: false,
    is_active: true,
    price: '5000000', // 5 USDC (6 decimals)
    asset: 'USDC',
    tags: ['bitcoin', 'analysis', 'crypto'],
    metadata: null,
    pinata_upload_id: null,
    piid: null,
    expires_at: null,
    total_purchases: 10,
    total_revenue: '50000000',
    created_at: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: 'entry-2',
    feed_id: 'feed-1',
    title: 'Weekly Market Report',
    description: 'Weekly summary of crypto market trends',
    cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    mime_type: 'text/markdown',
    is_free: true,
    is_active: true,
    price: '0',
    asset: 'USDC',
    tags: ['market', 'weekly'],
    metadata: null,
    pinata_upload_id: null,
    piid: null,
    expires_at: null,
    total_purchases: 0,
    total_revenue: '0',
    created_at: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: 'entry-3',
    feed_id: 'feed-1',
    title: 'Ethereum Gas Optimization Guide with Extended Title That Should Be Truncated',
    description: 'Learn how to optimize gas fees',
    cid: 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx',
    mime_type: 'application/pdf',
    is_free: false,
    is_active: true,
    price: '2500000', // 2.5 USDC
    asset: 'USDC',
    tags: ['ethereum', 'gas', 'optimization', 'tutorial'],
    metadata: null,
    pinata_upload_id: null,
    piid: null,
    expires_at: null,
    total_purchases: 5,
    total_revenue: '12500000',
    created_at: Math.floor(Date.now() / 1000) - 259200, // 3 days ago
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: 'entry-4',
    feed_id: 'feed-1',
    title: null, // Untitled entry
    description: 'Raw data export',
    cid: 'QmW2WQi7j6c7UgJTarActp7tDNikE4B2qXtFCfLPdsgaTQ',
    mime_type: 'application/json',
    is_free: false,
    is_active: true,
    price: '1000000', // 1 USDC
    asset: 'USDC',
    tags: [],
    metadata: null,
    pinata_upload_id: null,
    piid: null,
    expires_at: null,
    total_purchases: 2,
    total_revenue: '2000000',
    created_at: Math.floor(Date.now() / 1000) - 345600, // 4 days ago
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: 'entry-5',
    feed_id: 'feed-1',
    title: 'DeFi Protocol Comparison',
    description: 'Comparing top DeFi protocols',
    cid: 'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB',
    mime_type: 'image/png',
    is_free: true,
    is_active: true,
    price: '0',
    asset: 'USDC',
    tags: ['defi'],
    metadata: null,
    pinata_upload_id: null,
    piid: null,
    expires_at: null,
    total_purchases: 0,
    total_revenue: '0',
    created_at: Math.floor(Date.now() / 1000) - 432000, // 5 days ago
    updated_at: Math.floor(Date.now() / 1000),
  },
]

// Default story with entries
export const Default: Story = () => (
  <EntriesTable
    entries={mockEntries}
    onEntryClick={(id) => console.log('Entry clicked:', id)}
    onBuyClick={(id) => console.log('Buy clicked:', id)}
  />
)

// With upload button (owner view)
export const WithUploadButton: Story = () => (
  <EntriesTable
    entries={mockEntries}
    showUploadButton={true}
    onUploadClick={() => console.log('Upload clicked')}
    onEntryClick={(id) => console.log('Entry clicked:', id)}
    onBuyClick={(id) => console.log('Buy clicked:', id)}
  />
)

WithUploadButton.storyName = 'Owner View (with Upload)'

// Empty state
export const EmptyState: Story = () => (
  <EntriesTable
    entries={[]}
    showUploadButton={true}
    onUploadClick={() => console.log('Upload clicked')}
  />
)

EmptyState.storyName = 'Empty State'

// Without first row highlight
export const NoHighlight: Story = () => (
  <EntriesTable
    entries={mockEntries}
    highlightFirstRow={false}
    onEntryClick={(id) => console.log('Entry clicked:', id)}
    onBuyClick={(id) => console.log('Buy clicked:', id)}
  />
)

NoHighlight.storyName = 'Without Arrow Highlight'

// Single entry
export const SingleEntry: Story = () => (
  <EntriesTable
    entries={[mockEntries[0]]}
    onEntryClick={(id) => console.log('Entry clicked:', id)}
    onBuyClick={(id) => console.log('Buy clicked:', id)}
  />
)

SingleEntry.storyName = 'Single Entry'
