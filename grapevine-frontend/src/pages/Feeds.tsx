import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePageTitle } from '@/context/PageTitleContext'
import { CreateFeedDialog } from '@/components/CreateFeedDialog'
import { FeedCard } from '@/components/FeedCard'
import { Button, Pagination, Loader } from '@/components/ui'
import { useWallet } from '@/context/WalletContext'
import { useGrapevineFeeds } from '@/hooks/useGrapevineFeeds'
import { useWalletByAddress } from '@/hooks/useWalletByAddress'
import { useTrending, useMostPopular } from '@/hooks/useLeaderboards'

// Filter type for URL query params - extensible for future filters
type FeedFilters = {
  view?: 'all' | 'trending' | 'popular' | 'my'
  category?: string
  // Future filters can be added here:
  // tags?: string
  // minEntries?: string
  // search?: string
}

export default function Feeds() {
  const { isConnected, address, connect } = useWallet()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { setTitle } = usePageTitle()

  // Pagination state
  const [pageTokens, setPageTokens] = useState<string[]>([]) // Stack of page tokens for back navigation
  const [currentPage, setCurrentPage] = useState(1)

  // Set page title
  useEffect(() => {
    setTitle('Feeds')
  }, [setTitle])


  // Fetch wallet info to get wallet_id
  const { data: walletData, isLoading: walletLoading } = useWalletByAddress(address)
  const walletId = walletData?.id

  // Derive filters directly from URL params (single source of truth)
  const filters: FeedFilters = {
    view: (searchParams.get('view') as 'all' | 'trending' | 'popular' | 'my') || 'all',
    category: searchParams.get('category') || undefined,
  }

  // Fetch trending and popular feeds
  const { data: trendingData, isLoading: trendingLoading } = useTrending(
    { page_size: '10' },
    { enabled: filters.view === 'trending' }
  )
  const { data: popularData, isLoading: popularLoading } = useMostPopular(
    { page_size: '10', period: 'all' },
    { enabled: filters.view === 'popular' }
  )

  const trendingFeeds = trendingData?.data ?? []
  const popularFeeds = popularData?.data ?? []

  // Reset pagination when filters change
  useEffect(() => {
    setPageTokens([])
    setCurrentPage(1)
  }, [filters.view, filters.category])

  // Helper to update filters (updates URL, which triggers re-render)
  const updateFilters = (updates: Partial<FeedFilters>) => {
    const newParams = new URLSearchParams(searchParams)

    // Apply updates
    const newView = updates.view ?? filters.view
    const newCategory = updates.category ?? filters.category

    // Set or remove view param
    if (newView && newView !== 'all') {
      newParams.set('view', newView)
    } else {
      newParams.delete('view')
    }

    // Set or remove category param
    if (newCategory) {
      newParams.set('category', newCategory)
    } else {
      newParams.delete('category')
    }

    setSearchParams(newParams, { replace: true })
  }

  // Compute API params based on filters
  const showMyFeeds = filters.view === 'my'
  const showAllFeeds = filters.view === 'all'
  const showTrending = filters.view === 'trending'
  const showPopular = filters.view === 'popular'
  const currentPageToken = pageTokens[pageTokens.length - 1]

  // For "My Feeds", we need a valid wallet ID to query
  // If wallet isn't registered yet (no walletId), we skip the query and show empty state
  // min_entries: 0 is required to include feeds with zero entries
  const feedQueryParams = {
    page_size: 20,
    ...(currentPageToken && { page_token: currentPageToken }),
    ...(showMyFeeds && walletId && { owner_id: walletId, minEntries: 0 }),
    ...(filters.category && { category: filters.category }),
  }

  // Skip query if:
  // - Viewing "My Feeds" and still loading wallet data
  // - Viewing "My Feeds" and wallet isn't registered (no walletId)
  // - Viewing trending or popular (use leaderboard hooks instead)
  const shouldSkipMyFeedsQuery = showMyFeeds && (walletLoading || !walletId)
  const shouldSkipAllFeedsQuery = showTrending || showPopular

  // Fetch feeds from the real API (only for 'all' and 'my' views)
  const { data, isLoading: loading, error: queryError } = useGrapevineFeeds({
    ...feedQueryParams,
  }, {
    enabled: !shouldSkipMyFeedsQuery && !shouldSkipAllFeedsQuery,
  })

  console.log("feeds data", data)
  const feeds = data?.feeds || []
  const pagination = data?.pagination
  const hasMore = pagination?.has_more || false
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to fetch feeds') : null

  // Pagination handlers
  const handleNextPage = () => {
    if (pagination?.next_page_token) {
      setPageTokens([...pageTokens, pagination.next_page_token])
      setCurrentPage(currentPage + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setPageTokens(pageTokens.slice(0, -1))
      setCurrentPage(currentPage - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePageChange = (page: number) => {
    // For now, only allow going to adjacent pages
    // Full page jumping would require keeping track of all page tokens
    if (page === currentPage + 1 && pagination?.next_page_token) {
      handleNextPage()
    } else if (page === currentPage - 1) {
      handlePreviousPage()
    }
  }

  return (
    <div>
      {/* Create Button or Connect Wallet */}
      <div className="flex flex-col items-end mb-4">
        {isConnected ? (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            variant="primary"
            size="lg"
            title="Create a new feed"
          >
            + Create Feed
          </Button>
        ) : (
          <>
            <Button
              onClick={connect}
              variant="primary"
              size="lg"
              title="Connect your wallet to create feeds"
            >
              Connect Wallet
            </Button>
            <p className="mt-2 text-sm text-gray-600">
              Connect wallet to start creating feeds
            </p>
          </>
        )}
      </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-8">
            <Button
              onClick={() => updateFilters({ view: 'all' })}
              variant={showAllFeeds ? 'primary' : 'secondary'}
              size="lg"
            >
              All Feeds
            </Button>
            <Button
              onClick={() => updateFilters({ view: 'trending' })}
              variant={showTrending ? 'primary' : 'secondary'}
              size="lg"
            >
              Trending
            </Button>
            <Button
              onClick={() => updateFilters({ view: 'popular' })}
              variant={showPopular ? 'primary' : 'secondary'}
              size="lg"
            >
              Popular
            </Button>
            {isConnected && (
              <Button
                onClick={() => updateFilters({ view: 'my' })}
                variant={showMyFeeds ? 'primary' : 'secondary'}
                size="lg"
                className="ml-auto"
              >
                My Feeds
              </Button>
            )}
          </div>

          {/* Trending View */}
          {showTrending && (
            <>
              {trendingLoading ? (
                <div className="bg-white border-4 border-black p-12 shadow-[8px_8px_0px_0px_#000] text-center">
                  <Loader size="lg" />
                  <p className="mt-4 text-xl font-bold uppercase">Loading Trending...</p>
                </div>
              ) : trendingFeeds.length === 0 ? (
                <div className="bg-white border-4 border-black p-12 shadow-[8px_8px_0px_0px_#000] text-center">
                  <p className="text-xl font-bold uppercase">No Trending Feeds</p>
                </div>
              ) : (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
                  {trendingFeeds.map((feed: any) => (
                    <FeedCard key={feed.id} feed={feed} compact={true} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Popular View */}
          {showPopular && (
            <>
              {popularLoading ? (
                <div className="bg-white border-4 border-black p-12 shadow-[8px_8px_0px_0px_#000] text-center">
                  <Loader size="lg" />
                  <p className="mt-4 text-xl font-bold uppercase">Loading Popular...</p>
                </div>
              ) : popularFeeds.length === 0 ? (
                <div className="bg-white border-4 border-black p-12 shadow-[8px_8px_0px_0px_#000] text-center">
                  <p className="text-xl font-bold uppercase">No Popular Feeds</p>
                </div>
              ) : (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
                  {popularFeeds.map((feed: any) => (
                    <FeedCard key={feed.id} feed={feed} compact={true} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* All Feeds / My Feeds Loading State */}
          {(showAllFeeds || showMyFeeds) && (loading || (showMyFeeds && walletLoading)) && (
            <div className="bg-white border-4 border-black p-12 shadow-[8px_8px_0px_0px_#000] text-center">
              <Loader size="lg" />
              <p className="mt-4 text-xl font-bold uppercase">Loading Feeds...</p>
            </div>
          )}

          {/* Empty state for unregistered wallet viewing "My Feeds" */}
          {showMyFeeds && !walletLoading && !walletId && (
            <div className="bg-white border-4 border-black p-12 shadow-[8px_8px_0px_0px_#000] text-center">
              <p className="text-xl font-bold uppercase">No Feeds Yet</p>
              <p className="mt-2 text-lg">
                You haven't created any feeds yet. Click 'Create Feed' to get started!
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !shouldSkipMyFeedsQuery && !shouldSkipAllFeedsQuery && (
            <div className="bg-red-100 border-4 border-red-600 p-8 shadow-[8px_8px_0px_0px_#000] mb-6">
              <p className="text-xl font-bold uppercase text-red-800 mb-2">Error</p>
              <p className="text-lg">{error}</p>
            </div>
          )}

          {/* All Feeds / My Feeds Grid */}
          {(showAllFeeds || showMyFeeds) && !loading && !walletLoading && !error && !shouldSkipMyFeedsQuery && (
            <div>
              {feeds.length === 0 ? (
                <div className="bg-white border-4 border-black p-12 shadow-[8px_8px_0px_0px_#000] text-center">
                  <p className="text-xl font-bold uppercase">
                    {showMyFeeds ? 'No Feeds Yet' : 'No Feeds Found'}
                  </p>
                  <p className="mt-2 text-lg">
                    {showMyFeeds
                      ? "You haven't created any feeds yet. Click 'Create Feed' to get started!"
                      : 'No feeds match your current filters.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
                  {feeds.map((feed) => (
                      <FeedCard
                        key={feed.id}
                        feed={feed}
                        compact={true}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pagination (only for All Feeds / My Feeds) */}
          {(showAllFeeds || showMyFeeds) && !loading && !walletLoading && !error && !shouldSkipMyFeedsQuery && feeds.length > 0 && (currentPage > 1 || hasMore) && (
            <Pagination
              currentPage={currentPage}
              totalPages={currentPage + (hasMore ? 1 : 0)}
              hasMore={hasMore}
              onPageChange={handlePageChange}
              onNext={handleNextPage}
              onPrevious={handlePreviousPage}
              loading={loading}
            />
          )}

      {/* Create Feed Dialog */}
      <CreateFeedDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  )
}
