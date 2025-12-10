import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { usePageTitle } from '@/context/PageTitleContext'
import { useTopProviders } from '@/hooks/useLeaderboards'
import { formatWalletAddress } from '@/lib/utils'
import { Loader } from '@/components/ui'

// Neobrutalism styles
const styles = {
  // Title card
  titleCard: 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8',
  titleText: 'font-black text-4xl uppercase text-black mb-4 tracking-tight',
  titleDescription: 'text-black text-base mb-6 font-bold',
  // Seller card
  sellerCard: `
    bg-white
    border-4
    border-black
    shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
    cursor-pointer
    transition-all
    hover:translate-x-[2px]
    hover:translate-y-[2px]
    hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
    active:translate-x-[4px]
    active:translate-y-[4px]
    active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
  `,
  rankBadgeContainer: 'bg-accent-aqua border-b-4 border-black p-4',
  rankBadge: 'bg-black border-4 border-black px-4 py-2 inline-block',
  rankText: 'font-black text-2xl text-white',
  revenueBadge: 'bg-accent-orange border-4 border-black px-4 py-2 inline-block',
  revenueText: 'text-sm font-black text-white uppercase',
  userInfoContainer: 'p-6',
  userName: 'font-black text-xl text-black mb-2 truncate uppercase',
  walletAddress: 'text-sm text-black break-all font-mono font-bold',
  statsRow: 'flex justify-between text-base py-2 border-b-2 border-black last:border-0',
  statsLabel: 'text-black font-bold uppercase text-sm',
  statsValue: 'font-black text-black text-lg',
  viewProfileBadge: 'mt-6 bg-black border-4 border-black text-center py-3 hover:bg-gray-900 transition-colors',
  viewProfileText: 'text-base font-black text-white uppercase tracking-wide',
}

export default function TopSellers() {
  const { setTitle } = usePageTitle()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setTitle('Top Sellers')
  }, [setTitle])

  const { data, isLoading } = useTopProviders({ page_size: '50' })

  const handleCardClick = (walletAddress: string) => {
    // Encode the full current path (pathname + search) so we can return to exact location
    const fullPath = location.pathname + location.search
    const encodedFrom = encodeURIComponent(fullPath)
    navigate(`/user/${walletAddress}?from=${encodedFrom}`)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader size="xl" />
        <p className="font-mono text-lg font-bold uppercase">Loading top sellers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className={styles.titleCard}>
        <h1 className={styles.titleText}>
          TOP SELLERS
        </h1>
        <p className={styles.titleDescription}>
          The highest earning content providers on Grapevine, ranked by total revenue.
        </p>
      </div>

      {/* Sellers Grid */}
      {data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.data.map((seller) => (
            <div
              key={seller.user_id}
              onClick={() => handleCardClick(seller.wallet_address)}
              className={styles.sellerCard}
            >
              {/* Rank Badge */}
              <div className={styles.rankBadgeContainer}>
                <div className="flex items-center justify-between">
                  <div className={styles.rankBadge}>
                    <span className={styles.rankText}>
                      #{seller.rank}
                    </span>
                  </div>
                  <div className={styles.revenueBadge}>
                    <span className={styles.revenueText}>
                      ${(Number(seller.total_revenue) / 1000000).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className={styles.userInfoContainer}>
                <div className="mb-4">
                  <h3 className={styles.userName}>
                    {seller.username || formatWalletAddress(seller.wallet_address)}
                  </h3>
                  <p className={styles.walletAddress}>
                    {formatWalletAddress(seller.wallet_address)}
                  </p>
                </div>

                {/* Stats Rows */}
                <div className="space-y-2 mb-4">
                  <div className={styles.statsRow}>
                    <span className={styles.statsLabel}>Feeds:</span>
                    <span className={styles.statsValue}>{seller.total_feeds}</span>
                  </div>
                  <div className={styles.statsRow}>
                    <span className={styles.statsLabel}>Entries:</span>
                    <span className={styles.statsValue}>{seller.total_entries}</span>
                  </div>
                  <div className={styles.statsRow}>
                    <span className={styles.statsLabel}>Sales:</span>
                    <span className={styles.statsValue}>{seller.total_purchases}</span>
                  </div>
                  <div className={styles.statsRow}>
                    <span className={styles.statsLabel}>Buyers:</span>
                    <span className={styles.statsValue}>{seller.unique_buyers}</span>
                  </div>
                </div>

                {/* View Profile Badge */}
                <div className={styles.viewProfileBadge}>
                  <span className={styles.viewProfileText}>
                    VIEW PROFILE →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
          <div className="font-black text-2xl uppercase text-black mb-2 tracking-tight">
            NO SELLERS FOUND
          </div>
          <p className="text-black font-bold">
            No sellers found.
          </p>
        </div>
      )}
    </div>
  )
}
