import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { usePageTitle } from '@/context/PageTitleContext'
import { FeedCard } from '@/components/FeedCard'
import { Button, Loader } from '@/components/ui'
import { useCategory } from '@/hooks/useCategories'
import { useGrapevineFeeds } from '@/hooks/useGrapevineFeeds'
import { cn } from '@/lib/utils'

const themeStyles = {
  default: {
    backButton: '', // Use Button defaults
    errorContainer: 'bg-red-100 border-4 border-red-600 p-6 shadow-[6px_6px_0px_0px_#000] mb-8',
    errorTitle: 'text-lg font-bold uppercase text-red-800',
    loadingContainer: 'bg-white border-4 border-black p-12 shadow-[8px_8px_0px_0px_#000] text-center',
    loadingText: 'mt-4 text-xl font-bold uppercase',
    description: 'mb-8 text-center text-lg',
    feedCount: 'mt-8 text-center text-lg font-bold uppercase',
  },
  modern: {
    backButton: 'hover:bg-gray-800',
    errorContainer: 'bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-8 backdrop-blur-sm',
    errorTitle: 'text-lg font-semibold text-red-400',
    loadingContainer: 'bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center backdrop-blur-sm',
    loadingText: 'mt-4 text-xl font-medium text-gray-300',
    description: 'mb-8 text-center text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto',
    feedCount: 'mt-8 text-center text-sm font-medium text-gray-500 uppercase tracking-wider',
  }
}

export default function Category() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setTitle } = usePageTitle()

  // Theme detection
  const [currentTheme, setCurrentTheme] = React.useState('default')
  
  React.useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme') || 'default'
      setCurrentTheme(theme)
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const styles = currentTheme === 'modern' ? themeStyles.modern : themeStyles.default

  // Fetch category details
  const { data: category, isLoading: categoryLoading, error: categoryError } = useCategory(id!)

  // Set page title when category loads
  useEffect(() => {
    if (category) {
      setTitle((category as any)?.name || 'Category')
    }
  }, [category, setTitle])

  // Fetch feeds for this category
  const { data: feedsData, isLoading: feedsLoading } = useGrapevineFeeds({
    category: id,
    page_size: 50,
  })
  const feeds = feedsData?.feeds || []

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <Button
          onClick={() => navigate('/')}
          variant={currentTheme === 'modern' ? 'ghost' : 'secondary'}
          className={styles.backButton}
        >
          ← Back to Home
        </Button>
      </div>

      {/* Category Description */}
      {categoryLoading ? (
        <div className="mb-8 text-center">
          <Loader size="md" />
        </div>
      ) : categoryError ? (
        <div className={styles.errorContainer}>
          <p className={styles.errorTitle}>Category Not Found</p>
        </div>
      ) : (
        <>
          {(category as any)?.description && (
            <div className={styles.description}>
              {(category as any).description}
            </div>
          )}
        </>
      )}

      {/* Feeds Grid */}
      {feedsLoading ? (
        <div className={styles.loadingContainer}>
          <Loader size="lg" />
          <p className={styles.loadingText}>Loading Feeds...</p>
        </div>
      ) : feeds.length === 0 ? (
        <div className={styles.loadingContainer}>
          <p className={styles.loadingText}>No Feeds Found</p>
          <p className={cn("mt-2", currentTheme === 'modern' ? "text-gray-400" : "text-lg")}>
            No feeds in this category yet.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
            {feeds.map((feed) => (
              <FeedCard key={feed.id} feed={feed} showCopyLink={true} />
            ))}
          </div>

          {/* Feed Count */}
          <div className={styles.feedCount}>
            {currentTheme === 'modern' ? (
               <span>Showing {feeds.length} Feed{feeds.length !== 1 ? 's' : ''}</span>
            ) : (
               <p>Showing {feeds.length} Feed{feeds.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
