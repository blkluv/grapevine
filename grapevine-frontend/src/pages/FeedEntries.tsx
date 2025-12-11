import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '@/context/PageTitleContext'
import { UploadEntryModal } from '@/components/UploadEntryModal'
import type { CreateEntryInput, Feed } from '@pinata/grapevine-sdk/dist/types'
import { EditFeedDialog } from '@/components/EditFeedDialog'
import { DeleteFeedDialog } from '@/components/DeleteFeedDialog'
import { Button, Pagination } from '@/components/ui'
import { useCreateEntry } from '@/hooks/useCreateEntry'
import { useDeleteFeed } from '@/hooks/useDeleteFeed'
import { useWallet } from '@/context/WalletContext'
import { grapevineApiClient, type GrapevineEntry } from '@/services/grapevineApi'
import { FeedCard, type AnyFeed } from '@/components/FeedCard'
import { EntriesTable } from '@/components/EntriesTable'
import { Loader } from '@/components/ui'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import sdk from '@farcaster/miniapp-sdk'
import { useFarcaster } from '@/context/FarcasterContext'

// Neobrutalism styles
const styles = {
  feedNameLabel: 'px-6 py-3 bg-accent-aqua border-[2px] border-black font-mono font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
  loadingContainer: 'bg-white border-[2px] border-black p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center',
  loadingText: 'mt-4 text-xl font-black uppercase font-mono',
  errorContainer: 'bg-red-100 border-[2px] border-red-600 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6',
  errorTitle: 'text-xl font-black uppercase text-red-800 mb-2 font-mono',
  errorText: 'text-base font-bold font-mono',
}

export default function FeedEntries() {
  const { feedId } = useParams<{ feedId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { address } = useWallet()
  const { isInMiniApp } = useFarcaster()
  const { setTitle } = usePageTitle()
  const [feed, setFeed] = useState<Feed | null>(null)
  const [entries, setEntries] = useState<GrapevineEntry[]>([])
  const [pagination, setPagination] = useState<{
    page_size: number
    next_page_token: string | null
    has_more: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const createEntry = useCreateEntry()
  const deleteFeed = useDeleteFeed()
  const [editDialogState, setEditDialogState] = useState<{
    isOpen: boolean
    feed: Feed | null
  }>({
    isOpen: false,
    feed: null,
  })
  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean
    feedId: string | null
    feedName: string
  }>({
    isOpen: false,
    feedId: null,
    feedName: '',
  })


  // Pagination state
  const [pageTokens, setPageTokens] = useState<string[]>([]) // Stack of page tokens for back navigation
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      if (!feedId) return

      try {
        setLoading(true)
        const currentPageToken = pageTokens[pageTokens.length - 1]
        const [feedData, entriesData] = await Promise.all([
          grapevineApiClient.getFeed(feedId),
          grapevineApiClient.getEntries(feedId, {
            page_size: '20',
            ...(currentPageToken && { page_token: currentPageToken })
          }),
        ])
        setFeed(feedData as Feed)
        setEntries(entriesData.data || [])
        setPagination(entriesData.pagination)
        setError(null)
        // Set page title
        setTitle(`Feed: ${feedData.name}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [feedId, setTitle, pageTokens])

  const handleUploadEntry = async (data: CreateEntryInput) => {
    if (!feedId) return

    await createEntry.mutateAsync({
      feedId: feedId,
      data,
    })

    // Refresh entries after successful upload - go back to page 1
    setPageTokens([])
    setCurrentPage(1)
    const entriesData = await grapevineApiClient.getEntries(feedId, { page_size: '20' })
    setEntries(entriesData.data || [])
    setPagination(entriesData.pagination)
  }

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

  const handleEditClick = (feedToEdit: AnyFeed) => {
    setEditDialogState({
      isOpen: true,
      feed: feedToEdit as Feed,
    })
  }

  const handleEditClose = () => {
    setEditDialogState({ isOpen: false, feed: null })
  }

  const handleDeleteClick = (feedIdToDelete: string, feedNameToDelete: string) => {
    setDeleteDialogState({
      isOpen: true,
      feedId: feedIdToDelete,
      feedName: feedNameToDelete,
    })
  }

  const handleDeleteConfirm = async () => {
    if (deleteDialogState.feedId) {
      try {
        await deleteFeed.mutateAsync(deleteDialogState.feedId)
        setDeleteDialogState({ isOpen: false, feedId: null, feedName: '' })
        // Navigate back after successful delete
        navigate(backPath)
      } catch (err) {
        console.error('Failed to delete feed:', err)
        // Error is handled by the mutation hook
      }
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogState({ isOpen: false, feedId: null, feedName: '' })
  }


  // Read the 'from' query param to get the full path to return to
  const fromEncoded = searchParams.get('from')
  const backPath = fromEncoded ? decodeURIComponent(fromEncoded) : '/'

  const hasMore = pagination?.has_more || false

  // Check if current user owns the feed
  const isOwner = !!(address && feed?.owner_wallet_address?.toLowerCase() === address.toLowerCase())

  const handleShareToFarcaster = async () => {
    if (!feed) return
    const baseUrl = import.meta.env.VITE_ENV === 'production' ? 'https://grapevine.fyi' : 'https://grapevine.markets'
    const feedUrl = `${baseUrl}/feeds/${feedId}/entries`
    try {
      await sdk.actions.composeCast({
        text: `Check out "${feed.name}" on Grapevine`,
        embeds: [feedUrl],
      })
      trackEvent(AnalyticsEvents.SHARE_FEED_FARCASTER, { feedId: feedId || '' }, address)
    } catch (err) {
      console.log('[FeedEntries] Share failed (not in mini app context):', err)
    }
  }

  // Refetch entries when an entry expires
  const handleEntryExpire = useCallback(async () => {
    if (!feedId) return

    try {
      const currentPageToken = pageTokens[pageTokens.length - 1]
      const entriesData = await grapevineApiClient.getEntries(feedId, {
        page_size: '20',
        ...(currentPageToken && { page_token: currentPageToken })
      })
      setEntries(entriesData.data || [])
      setPagination(entriesData.pagination)
    } catch (err) {
      console.error('Failed to refetch entries:', err)
    }
  }, [feedId, pageTokens])

  return (
    <div>
      {/* Back Button and Feed Title */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <Button
          onClick={() => navigate(backPath)}
          variant="secondary"
          size="lg"
        >
          ← Back
        </Button>
        {!loading && !error && feed && (
          <>
            <div className={styles.feedNameLabel}>
              {feed.name}
            </div>
            {isInMiniApp && (
              <Button
                onClick={handleShareToFarcaster}
                variant="secondary"
                size="lg"
              >
                Share
              </Button>
            )}
          </>
        )}
      </div>

      {/* Feed Card */}
      {!loading && !error && feed && (
        <div className="mb-6">
          <FeedCard
            feed={feed}
            disableNavigation={true}
            compact={true}
            expanded={true}
            showEdit={isOwner}
            showDelete={isOwner}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className={styles.loadingContainer}>
          <Loader size="lg" />
          <p className={styles.loadingText}>Loading Entries...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorTitle}>Error</p>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}

      {/* Entries Table */}
      {!loading && !error && feed && (
        <>
          <EntriesTable
            entries={entries}
            showUploadButton={isOwner}
            onUploadClick={() => setIsUploadModalOpen(true)}
            onEntryClick={(entryId) => navigate(`/feeds/${feedId}/entries/${entryId}?from=${fromEncoded || encodeURIComponent('/')}`)}
            onBuyClick={(entryId) => navigate(`/feeds/${feedId}/entries/${entryId}?from=${fromEncoded || encodeURIComponent('/')}`)}
            onEntryExpire={handleEntryExpire}
          />

          {/* Pagination */}
          {entries.length > 0 && (currentPage > 1 || hasMore) && (
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
        </>
      )}

      {/* Upload Entry Modal */}
      {feedId && (
        <UploadEntryModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          feedId={feedId}
          onUpload={handleUploadEntry}
        />
      )}

      {/* Edit Feed Dialog */}
      <EditFeedDialog
        isOpen={editDialogState.isOpen}
        feed={editDialogState.feed}
        onClose={handleEditClose}
      />

      {/* Delete Feed Dialog */}
      <DeleteFeedDialog
        isOpen={deleteDialogState.isOpen}
        feedName={deleteDialogState.feedName}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteFeed.isPending}
      />

    </div>
  )
}
