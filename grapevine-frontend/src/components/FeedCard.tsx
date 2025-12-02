import { useNavigate, useLocation } from 'react-router-dom'
import type { Feed, TrendingFeed, PopularFeed } from '@pinata/grapevine-sdk/dist/types'
import { cn } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import { useWallet } from '@/context/WalletContext'
import robot1 from '@/assets/img/robots/1.avif'
import robot2 from '@/assets/img/robots/2.avif'
import robot3 from '@/assets/img/robots/3.avif'
import robot4 from '@/assets/img/robots/4.avif'
import robot5 from '@/assets/img/robots/5.avif'
import robot6 from '@/assets/img/robots/6.avif'
import robot7 from '@/assets/img/robots/7.avif'
import robot8 from '@/assets/img/robots/8.avif'

const ROBOT_IMAGES = [robot1, robot2, robot3, robot4, robot5, robot6, robot7, robot8]

// Union type for all feed variants
export type AnyFeed = Feed | TrendingFeed | PopularFeed

// Helper to get feed name (PopularFeed uses 'feed' field, others use 'name')
function getFeedName(feed: AnyFeed): string {
  if ('name' in feed && feed.name) return feed.name
  if ('feed' in feed) return (feed as PopularFeed).feed
  return 'Untitled'
}

// Helper to get owner wallet address (Feed uses owner_wallet_address, leaderboard types use owner_wallet)
function getOwnerWallet(feed: AnyFeed): string | undefined {
  if ('owner_wallet_address' in feed) return feed.owner_wallet_address
  if ('owner_wallet' in feed) return feed.owner_wallet
  return undefined
}

// Helper to get total purchases (some types return string, others number)
function getTotalPurchases(feed: AnyFeed): number | undefined {
  const purchases = feed.total_purchases
  if (purchases === undefined) return undefined
  return typeof purchases === 'string' ? parseInt(purchases) : purchases
}

interface NeoBrutalistFeedCardProps {
  feed: AnyFeed
  onDelete?: (feedId: string, feedName: string) => void
  onEdit?: (feed: AnyFeed) => void
  showDelete?: boolean
  showEdit?: boolean
  disableNavigation?: boolean
  compact?: boolean
  expanded?: boolean // When true, removes aspect-square and shows full description
}

const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY

// Helper function to get a consistent random robot image for a feed
function getRandomRobotImage(feedId: string | undefined): string {
  const safeId = feedId || ''
  const hash = safeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = hash % ROBOT_IMAGES.length
  return ROBOT_IMAGES[index]
}

export function FeedCard({
  feed,
  onDelete,
  onEdit,
  showDelete = false,
  showEdit = false,
  disableNavigation = false,
  compact = false,
  expanded = false
}: NeoBrutalistFeedCardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { address } = useWallet()

  // Get derived values from different feed type variants
  const feedName = getFeedName(feed)
  const ownerWallet = getOwnerWallet(feed)
  const totalPurchases = getTotalPurchases(feed)
  const isOwnedByCurrentUser = !!(address && ownerWallet?.toLowerCase() === address.toLowerCase())

  // Construct image URL from image_cid
  const imageUrl = feed.image_cid
    ? `https://${PINATA_GATEWAY}/files/${feed.image_cid}?img-height=600`
    : getRandomRobotImage(feed.id)

  const handleCardClick = () => {
    if (!disableNavigation) {
      const fullPath = location.pathname + location.search
      const encodedFrom = encodeURIComponent(fullPath)
      navigate(`/feeds/${feed.id}/entries?from=${encodedFrom}`)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(feed.id, feedName)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(feed)
    }
  }

  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (ownerWallet) {
      const fullPath = location.pathname + location.search
      const encodedFrom = encodeURIComponent(fullPath)
      navigate(`/user/${ownerWallet}?from=${encodedFrom}`)
    }
  }

  // Remove aspect-square when expanded or when action buttons are shown
  const hasActionButtons = showEdit || showDelete

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'w-full bg-white flex flex-col overflow-hidden',
        !expanded && !hasActionButtons && 'aspect-square',
        !disableNavigation ? 'cursor-pointer' : '',
        'hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform',
        compact && 'max-w-sm mx-auto'
      )}
      style={{
        border: '2px solid black',
        borderRight: '8px solid black',
        borderBottom: '8px solid black',
        maxWidth: '500px',
      }}
    >
      {/* Top section: Image - use fixed height when expanded/has buttons, percentage otherwise */}
      <div
        className={cn(
          'w-full flex items-center justify-center',
          expanded || hasActionButtons ? 'h-48 md:h-64' : 'h-[55%] md:h-[72%]'
        )}
        style={{
          paddingLeft: '8%',
          paddingRight: '8%',
          paddingTop: '4%',
          paddingBottom: '4%',
          backgroundColor: 'rgba(255, 107, 53, 0.8)',
          borderBottom: '4px solid black',
        }}
      >
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${imageUrl})`,
            border: '2px solid black',
          }}
        />
      </div>

      {/* Bottom section: Content - more space on mobile */}
      <div className={cn(
        'flex-1 flex flex-col justify-center text-center px-4 py-3 md:px-3 md:py-2 bg-white',
        !expanded && 'overflow-hidden'
      )}>
        {/* Feed name */}
        <h2 className={cn(
          'font-mono text-sm lg:text-base font-black uppercase tracking-tight text-black mb-1.5 md:mb-1 w-full',
          !expanded && 'overflow-hidden text-ellipsis whitespace-nowrap'
        )}>
          {feedName}
        </h2>

        {/* Description */}
        {feed.description && (
          <p className={cn(
            'font-mono text-sm text-black mb-1.5 md:mb-1 w-full',
            !expanded && 'overflow-hidden text-ellipsis whitespace-nowrap'
          )}>
            {feed.description}
          </p>
        )}

        {/* Stats row */}
        <div className="font-mono text-xs text-black uppercase font-bold flex items-center justify-center gap-2 mb-1.5 md:mb-1">
          <span>{feed.total_entries} ENTRIES</span>
          {totalPurchases !== undefined && (
            <span>• {totalPurchases} SOLD</span>
          )}
        </div>

        {/* Revenue */}
        {feed.total_revenue !== undefined && (
          <div className="bg-[#00f0ff] text-black px-2 py-1 text-xs font-black uppercase border-2 border-black mb-1 inline-block">
            REVENUE: ${(Number(feed.total_revenue) / 1000000).toFixed(2)}
          </div>
        )}

        {/* Creator */}
        {ownerWallet && (
          <div
            onClick={isOwnedByCurrentUser ? undefined : handleAddressClick}
            className={cn(
              'font-mono text-xs text-black uppercase font-bold px-1',
              !isOwnedByCurrentUser && 'hover:bg-black hover:text-white transition-colors cursor-pointer'
            )}
          >
            BY {isOwnedByCurrentUser ? 'YOU' : `${ownerWallet.slice(0, 6)}...${ownerWallet.slice(-4)}`}
          </div>
        )}

        {/* Action buttons (edit/delete) - only show if needed */}
        {(showEdit || showDelete) && (
          <div className="flex gap-2 mt-2 justify-center">
            {showEdit && onEdit && (
              <button
                onClick={handleEdit}
                className="font-mono text-xs font-black uppercase px-3 py-1.5 bg-white border-2 border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Pencil size={14} />
                EDIT
              </button>
            )}
            {showDelete && onDelete && (
              <button
                onClick={handleDelete}
                className="font-mono text-xs font-black uppercase px-3 py-1.5 bg-white border-2 border-black hover:bg-red-500 hover:border-red-500 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                DELETE
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
