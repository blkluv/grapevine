import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '@/context/PageTitleContext'
import { useWalletByAddress /*, useWalletStats */ } from '@/hooks/useWalletByAddress'
import { useUserFeeds } from '@/hooks/useUserFeeds'
import { useDeleteFeed } from '@/hooks/useDeleteFeed'
import { useWallet } from '@/context/WalletContext'
import { FeedCard, type AnyFeed } from '@/components/FeedCard'
import { EditFeedDialog } from '@/components/EditFeedDialog'
import { DeleteFeedDialog } from '@/components/DeleteFeedDialog'
import { Button, Pagination, Loader } from '@/components/ui'
import { formatWalletAddress } from '@/lib/utils'
import type { Feed } from '@pinata/grapevine-sdk/dist/types'

const themeStyles = {
  default: {
    backButtonVariant: 'secondary',
    userInfoCard: 'bg-white border-3 border-[var(--text)] shadow-[6px_6px_0px_0px_#000] p-6',
    userName: 'font-mono text-3xl font-bold mb-2 text-[var(--btn-primary-dark)] break-all',
    walletLabel: 'text-[var(--text)] font-mono text-sm mb-3',
    walletValue: 'text-[var(--btn-primary-dark)] break-all font-mono text-sm mb-3',
    networkBadge: 'inline-block bg-[var(--btn-warning)] text-[var(--text)] px-3 py-1 border-2 border-[var(--text)] font-mono text-xs font-bold',
    sectionTitle: 'font-mono text-2xl font-bold text-[var(--btn-primary-dark)]',
    emptyStateCard: 'bg-white border-3 border-[var(--text)] shadow-[6px_6px_0px_0px_#000] p-12 text-center',
    emptyStateTitle: 'font-mono text-xl text-[var(--text)] mb-2',
    emptyStateText: 'font-serif text-[var(--text)]',
    loadingContainer: 'flex flex-col items-center justify-center min-h-[60vh] gap-4',
    loadingText: 'font-mono text-lg',
    errorCard: 'bg-[var(--btn-danger)] text-white px-6 py-4 border-3 border-[var(--text)] font-mono',
    errorTitle: 'text-xl font-bold mb-2',
  },
  modern: {
    backButtonVariant: 'ghost',
    userInfoCard: 'bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg p-8',
    userName: 'text-3xl font-bold mb-2 text-gray-100 break-all bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text',
    walletLabel: 'text-gray-500 text-sm mb-3 mr-2 font-medium',
    walletValue: 'text-blue-400 break-all text-sm mb-3 font-mono bg-blue-500/10 px-2 py-1 rounded',
    networkBadge: 'inline-block bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20 rounded-full text-xs font-semibold uppercase tracking-wide',
    sectionTitle: 'text-2xl font-bold text-gray-100 mb-6',
    emptyStateCard: 'bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center shadow-lg',
    emptyStateTitle: 'text-xl font-bold text-gray-300 mb-2',
    emptyStateText: 'text-gray-500',
    loadingContainer: 'flex flex-col items-center justify-center min-h-[60vh] gap-4',
    loadingText: 'text-gray-400 font-medium animate-pulse',
    errorCard: 'bg-red-900/20 text-red-400 px-6 py-4 border border-red-500/30 rounded-xl backdrop-blur-sm',
    errorTitle: 'text-xl font-bold mb-2',
  }
}

export default function UserProfile() {
  const { walletAddress } = useParams<{ walletAddress: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setTitle } = usePageTitle()
  const { address } = useWallet()
  const deleteFeed = useDeleteFeed()
  const [currentTheme, setCurrentTheme] = useState('default')

  // Pagination state
  const [pageTokens, setPageTokens] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Theme detection
  useEffect(() => {
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

  const themeKey = ['modern', 'win95'].includes(currentTheme) ? currentTheme : 'default'
  // Fallback to default styles if specific theme styles aren't defined (e.g. win95 uses default for now or add win95 specific)
  // For this specific task, we focus on modern vs default.
  const styles = themeStyles[themeKey === 'modern' ? 'modern' : 'default']

  // Edit and Delete dialog state
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

  // Read the 'from' query param to get the full path to return to
  const fromEncoded = searchParams.get('from')
  const backPath = fromEncoded ? decodeURIComponent(fromEncoded) : '/'

  // Fetch wallet info
  const {
    data: walletData,
    isLoading: isLoadingWallet,
    error: walletError
  } = useWalletByAddress(walletAddress)

  // Fetch wallet stats
  // const {
  //   data: statsData,
  //   isLoading: isLoadingStats
  // } = useWalletStats(walletData?.wallet_address)

  // Fetch user's feeds
  const currentPageToken = pageTokens[currentPage - 2]
  const {
    data: feedsData,
    isLoading: isLoadingFeeds
  } = useUserFeeds(walletData?.id, {
    page_size: 20,
    page_token: currentPageToken,
  })

  // Set page title
  useEffect(() => {
    if (walletData?.username) {
      setTitle(`${walletData.username}'s Profile`)
    } else if (walletAddress) {
      setTitle(`${formatWalletAddress(walletAddress)}'s Profile`)
    } else {
      setTitle('User Profile')
    }
  }, [setTitle, walletData, walletAddress])

  const handleNextPage = () => {
    if (feedsData?.pagination?.next_page_token) {
      setPageTokens([...pageTokens, feedsData.pagination.next_page_token])
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setPageTokens(pageTokens.slice(0, -1))
      setCurrentPage(currentPage - 1)
    }
  }

  const handleEditClick = (feed: AnyFeed) => {
    setEditDialogState({
      isOpen: true,
      feed: feed as Feed,
    })
  }

  const handleEditClose = () => {
    setEditDialogState({ isOpen: false, feed: null })
  }

  const handleDeleteClick = (feedId: string, feedName: string) => {
    setDeleteDialogState({
      isOpen: true,
      feedId,
      feedName,
    })
  }

  const handleDeleteConfirm = async () => {
    if (deleteDialogState.feedId) {
      try {
        await deleteFeed.mutateAsync(deleteDialogState.feedId)
        setDeleteDialogState({ isOpen: false, feedId: null, feedName: '' })
      } catch (err) {
        console.error('Failed to delete feed:', err)
        // Error is handled by the mutation hook
      }
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogState({ isOpen: false, feedId: null, feedName: '' })
  }

  // Loading state for wallet
  if (isLoadingWallet) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size="xl" />
        <p className={styles.loadingText}>Loading user profile...</p>
      </div>
    )
  }

  // Error state for wallet
  if (walletError || !walletData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.errorCard}>
          <p className={styles.errorTitle}>ERROR 404</p>
          <p>User not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          onClick={() => navigate(backPath)}
          variant={themeKey === 'modern' ? 'ghost' : 'secondary'}
          size={themeKey === 'modern' ? 'md' : 'lg'}
          className={themeKey === 'modern' ? 'hover:bg-gray-800' : ''}
        >
          ← Back
        </Button>
      </div>

      {/* User Info Header */}
      <div className={styles.userInfoCard}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* Username or Wallet Address */}
            <h1 className={styles.userName}>
              {walletData.username || formatWalletAddress(walletData.wallet_address)}
            </h1>

            {/* Full Wallet Address */}
            <div className={themeKey === 'modern' ? "flex items-center mb-3" : "font-mono text-sm mb-3"}>
              <span className={styles.walletLabel}>WALLET: </span>
              <span className={styles.walletValue}>
                {walletData.wallet_address}
              </span>
            </div>

            {/* Network Badge */}
            <div className={styles.networkBadge}>
              {walletData.wallet_address_network.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Feeds Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={styles.sectionTitle}>
            FEEDS BY THIS USER
          </h2>
        </div>

        {/* Loading state for feeds */}
        {isLoadingFeeds ? (
          <div className={styles.loadingContainer}>
            <Loader size="xl" />
            <p className={styles.loadingText}>Loading feeds...</p>
          </div>
        ) : feedsData && feedsData.feeds.length > 0 ? (
          <>
            {/* Feed Grid */}
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 mb-8">
              {feedsData.feeds.map((feed) => {
                const isOwner = !!(address && feed.owner_wallet_address?.toLowerCase() === address.toLowerCase())
                return (
                  <FeedCard
                    key={feed.id}
                    feed={feed}
                    showEdit={isOwner}
                    showDelete={isOwner}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                )
              })}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={0}
              hasMore={feedsData.pagination.has_more}
              onPageChange={() => {}}
              onNext={handleNextPage}
              onPrevious={handlePrevPage}
            />
          </>
        ) : (
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyStateTitle}>
              NO FEEDS FOUND
            </div>
            <p className={styles.emptyStateText}>
              This user hasn't created any feeds yet.
            </p>
          </div>
        )}
      </div>

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
