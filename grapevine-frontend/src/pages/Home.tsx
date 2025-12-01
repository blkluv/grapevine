import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FeedCard } from '@/components/FeedCard'
import { NewsSidebar } from '@/components/NewsSidebar'
import { Button, Loader } from '@/components/ui'
import { useTrending, useMostPopular } from '@/hooks/useLeaderboards'
import { usePageTitle } from '@/context/PageTitleContext'

type TabType = 'trending' | 'popular'

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { setTitle } = usePageTitle()

  // Get tab from URL query param, default to 'trending'
  const activeTab = (searchParams.get('tab') as TabType) || 'trending'

  // Set page title
  useEffect(() => {
    setTitle('Home')
  }, [setTitle])

  // Ensure tab query param is always set on initial load
  useEffect(() => {
    if (!searchParams.get('tab')) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', 'trending')
      setSearchParams(newParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  // Helper to update tab (updates URL, which triggers re-render)
  // Always set the tab query param
  const updateTab = (tab: TabType) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', tab)
    setSearchParams(newParams, { replace: true })
  }

  // Conditionally fetch data only for the active tab
  const { data: trendingData, isLoading: trendingLoading } = useTrending(
    { page_size: '10' },
    { enabled: activeTab === 'trending' }
  )
  const { data: popularData, isLoading: popularLoading } = useMostPopular(
    { page_size: '10', period: 'all' },
    { enabled: activeTab === 'popular' }
  )

  // Extract feeds from leaderboard responses (use SDK types directly)
  const trendingFeeds = trendingData?.data ?? []
  const popularFeeds = popularData?.data ?? []

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - Tabbed Leaderboards */}
        <div className="w-full lg:flex-1">
          <div className="w-full lg:max-w-[80%] mx-auto">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 justify-center">
              <Button
                variant={activeTab === 'trending' ? 'primary' : 'secondary'}
                size="lg"
                onClick={() => updateTab('trending')}
              >
                Trending
              </Button>
              <Button
                variant={activeTab === 'popular' ? 'primary' : 'secondary'}
                size="lg"
                onClick={() => updateTab('popular')}
              >
                Popular
              </Button>
            </div>

            {/* Tab Content - Conditionally render based on active tab */}
            <div key={activeTab}>
              {activeTab === 'trending' && (
                <>
                  {trendingLoading ? (
                    <div className="flex flex-col items-center py-12">
                      <Loader size="xl" />
                      <p className="mt-4 text-lg font-bold uppercase">Loading...</p>
                    </div>
                  ) : trendingFeeds.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-lg font-bold uppercase">No Feeds Found</p>
                    </div>
                  ) : (
                    <div className="space-y-4 flex flex-col items-center">
                      {trendingFeeds.map((feed: any) => (
                        <FeedCard key={feed.id} feed={feed} compact={true} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'popular' && (
                <>
                  {popularLoading ? (
                    <div className="flex flex-col items-center py-12">
                      <Loader size="xl" />
                      <p className="mt-4 text-lg font-bold uppercase">Loading...</p>
                    </div>
                  ) : popularFeeds.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-lg font-bold uppercase">No Feeds Found</p>
                    </div>
                  ) : (
                    <div className="space-y-4 flex flex-col items-center">
                      {popularFeeds.map((feed: any) => (
                        <FeedCard key={feed.id} feed={feed} compact={true} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - GIF & News */}
        <NewsSidebar />
      </div>
    </div>
  )
}
