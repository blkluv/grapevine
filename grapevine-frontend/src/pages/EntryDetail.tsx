import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { usePageTitle } from '@/context/PageTitleContext'
import { usePayment } from '@/context/PaymentContext'
import { useToast } from '@/context/ToastContext'
import { useWallet } from '@/context/WalletContext'
import { useHasPurchasedEntry } from '@/hooks/useTransactions'
import { useDeleteEntry } from '@/hooks/useDeleteEntry'
import { grapevineApiClient, type GrapevineEntry } from '@/services/grapevineApi'
import { Button, ArrowWrapper, Loader } from '@/components/ui'
import { DeleteEntryDialog } from '@/components/DeleteEntryDialog'
import { ExpiryCountdown } from '@/components/ExpiryCountdown'
import { cn } from '@/lib/utils'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import sdk from '@farcaster/miniapp-sdk'
import { useFarcaster } from '@/context/FarcasterContext'

// Theme-specific styles
const themeStyles = {
  default: {
    backButton: 'px-8 py-3 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] font-black uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]',
    titleLabel: 'px-8 py-3 bg-[#dfdfdf] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] font-black uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]',
    card: 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-12 text-center',
    infoCard: 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8',
    contentCard: 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-6',
    loadingText: 'mt-4 text-xl font-bold uppercase',
    errorContainer: 'bg-red-100 border-4 border-red-600 p-8 shadow-[8px_8px_0px_0px_#000] mb-6',
    errorTitle: 'text-xl font-bold uppercase text-red-800 mb-2',
    errorText: 'text-lg',
    sectionTitle: 'text-2xl font-black uppercase mb-4',
    purchaseTitle: 'text-2xl font-black uppercase mb-4',
    purchaseText: 'text-lg mb-6',
    purchasedBadge: 'bg-green-100 border-2 border-green-600 p-4 mb-6',
    purchasedTitle: 'text-sm font-bold uppercase text-green-800',
    purchasedText: 'text-sm text-green-700',
    ownerBadge: 'bg-purple-100 border-2 border-purple-600 p-4 mb-6',
    ownerTitle: 'text-sm font-bold uppercase text-purple-800',
    ownerText: 'text-sm text-purple-700',
    purchaseErrorBadge: 'bg-red-100 border-2 border-red-600 p-4 mb-6 text-left',
    purchaseErrorTitle: 'text-sm font-bold uppercase text-red-800 mb-1',
    purchaseErrorText: 'text-sm',
    infoSection: 'mb-6 pb-6 border-b-4 border-black',
    infoHeader: 'flex justify-between items-start mb-2',
    infoTitle: 'text-lg font-black uppercase',
    infoDescription: 'text-lg whitespace-pre-wrap leading-relaxed',
    infoDescriptionEmpty: 'text-lg text-gray-400 italic',
    infoGrid: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    infoLabel: 'text-lg font-black uppercase mb-2',
    cidBox: 'font-mono text-sm bg-[#f5f5f5] p-2 border-2 border-black break-all',
    typeBadge: 'inline-block text-sm font-bold uppercase bg-gray-100 px-3 py-2 border-2 border-black',
    priceBadgeFree: 'inline-block text-sm font-bold uppercase px-3 py-2 border-2 border-black bg-green-200',
    priceBadgePaid: 'inline-block text-sm font-bold uppercase px-3 py-2 border-2 border-black bg-yellow-200',
    dateText: 'text-sm',
    tagsSection: 'mt-6',
    tag: 'text-sm bg-blue-100 px-3 py-2 border-2 border-black font-bold',
    mediaContent: 'max-w-full h-auto border-2 border-black',
    downloadTitle: 'text-xl font-bold uppercase mb-4',
    downloadText: 'mb-6',
  },
  modern: {
    backButtonVariant: 'ghost',
    backButton: 'px-6 py-3 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-lg font-semibold text-sm text-gray-100 shadow-lg',
    titleLabel: 'px-6 py-3 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-lg font-semibold text-sm text-gray-100 shadow-lg',
    card: 'bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-12 text-center',
    infoCard: 'bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8',
    contentCard: 'bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6',
    loadingText: 'mt-4 text-xl font-semibold text-gray-100',
    errorContainer: 'bg-red-500/10 border border-red-500/50 rounded-xl p-8 mb-6',
    errorTitle: 'text-xl font-semibold text-red-300 mb-2',
    errorText: 'text-base text-red-200',
    sectionTitle: 'text-2xl font-bold text-gray-100 mb-4',
    purchaseTitle: 'text-2xl font-bold text-gray-100 mb-4',
    purchaseText: 'text-base text-gray-300 mb-6',
    purchasedBadge: 'bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4 mb-6',
    purchasedTitle: 'text-sm font-semibold text-emerald-300',
    purchasedText: 'text-sm text-emerald-200',
    ownerBadge: 'bg-purple-500/20 border border-purple-500/50 rounded-lg p-4 mb-6',
    ownerTitle: 'text-sm font-semibold text-purple-300',
    ownerText: 'text-sm text-purple-200',
    purchaseErrorBadge: 'bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-left',
    purchaseErrorTitle: 'text-sm font-semibold text-red-300 mb-1',
    purchaseErrorText: 'text-sm text-red-200',
    infoSection: 'mb-6 pb-6 border-b border-gray-700',
    infoHeader: 'flex justify-between items-start mb-2',
    infoTitle: 'text-lg font-semibold text-gray-100',
    infoDescription: 'text-base text-gray-300 whitespace-pre-wrap leading-relaxed',
    infoDescriptionEmpty: 'text-base text-gray-500 italic',
    infoGrid: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    infoLabel: 'text-base font-semibold text-gray-100 mb-2',
    cidBox: 'font-mono text-sm bg-gray-900/50 border border-gray-700 rounded-lg p-3 break-all text-gray-300',
    typeBadge: 'inline-block text-sm font-medium bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200',
    priceBadgeFree: 'inline-block text-sm font-medium px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300',
    priceBadgePaid: 'inline-block text-sm font-medium px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-300',
    dateText: 'text-sm text-gray-300',
    tagsSection: 'mt-6',
    tag: 'text-sm bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 font-medium text-gray-200',
    mediaContent: 'max-w-full h-auto border border-gray-700 rounded-lg',
    downloadTitle: 'text-xl font-semibold text-gray-100 mb-4',
    downloadText: 'text-gray-300 mb-6',
  },
  neobrutalism: {
    backButton: 'px-6 py-3 bg-white border-[2px] border-black font-mono font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
    titleLabel: 'px-6 py-3 bg-accent-aqua border-[2px] border-black font-mono font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    card: 'bg-white border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 text-center',
    infoCard: 'bg-white border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8',
    contentCard: 'bg-white border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6',
    loadingText: 'mt-4 text-xl font-black uppercase',
    errorContainer: 'bg-red-100 border-[2px] border-red-600 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6',
    errorTitle: 'text-xl font-black uppercase text-red-800 mb-2',
    errorText: 'text-base font-bold',
    sectionTitle: 'text-2xl font-black uppercase mb-4 font-mono',
    purchaseTitle: 'text-2xl font-black uppercase mb-4 font-mono',
    purchaseText: 'text-base mb-6 font-mono',
    purchasedBadge: 'bg-green-100 border-[2px] border-green-600 p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    purchasedTitle: 'text-sm font-black uppercase text-green-800',
    purchasedText: 'text-sm font-bold text-green-700',
    ownerBadge: 'bg-purple-100 border-[2px] border-purple-600 p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    ownerTitle: 'text-sm font-black uppercase text-purple-800',
    ownerText: 'text-sm font-bold text-purple-700',
    purchaseErrorBadge: 'bg-red-100 border-[2px] border-red-600 p-4 mb-6 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    purchaseErrorTitle: 'text-sm font-black uppercase text-red-800 mb-1',
    purchaseErrorText: 'text-sm font-bold',
    infoSection: 'mb-6 pb-6 border-b-[2px] border-black',
    infoHeader: 'flex justify-between items-start mb-2',
    infoTitle: 'text-lg font-black uppercase font-mono',
    infoDescription: 'text-base whitespace-pre-wrap leading-relaxed font-mono',
    infoDescriptionEmpty: 'text-base text-gray-400 italic font-mono',
    infoGrid: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    infoLabel: 'text-base font-black uppercase mb-2 font-mono',
    cidBox: 'font-mono text-sm bg-gray-100 p-3 border-[2px] border-black break-all shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)]',
    typeBadge: 'inline-block text-sm font-black uppercase bg-white px-3 py-2 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    priceBadgeFree: 'inline-block text-sm font-black uppercase px-3 py-2 border-[2px] border-black bg-green-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    priceBadgePaid: 'inline-block text-sm font-black uppercase px-3 py-2 border-[2px] border-black bg-yellow-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    dateText: 'text-sm font-mono',
    tagsSection: 'mt-6',
    tag: 'text-sm bg-white px-3 py-2 border-[2px] border-black font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    mediaContent: 'max-w-full h-auto border-[2px] border-black',
    downloadTitle: 'text-xl font-black uppercase mb-4 font-mono',
    downloadText: 'mb-6 font-mono',
  },
}

export default function EntryDetail() {
  const { feedId, entryId } = useParams<{ feedId: string; entryId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { fetchWithPayment } = usePayment()
  const { setTitle } = usePageTitle()
  const toast = useToast()
  const { isConnected, signRequest, address } = useWallet()
  const { isInMiniApp } = useFarcaster()

  const [entry, setEntry] = useState<GrapevineEntry | null>(null)
  const [feedOwnerAddress, setFeedOwnerAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchasedContent, setPurchasedContent] = useState<{ blob: Blob; mimeType: string } | null>(null)
  const [contentUrl, setContentUrl] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Ref for the purchase box for testing
  const purchaseBoxRef = useRef<HTMLDivElement>(null)

  // Check if the user has already purchased this entry
  const { data: hasPurchased, isLoading: isCheckingPurchase } = useHasPurchasedEntry(entryId)

  // Delete entry mutation
  const deleteEntry = useDeleteEntry()

  // Check if the current wallet is the feed owner (owners have access to their own content)
  const isOwner = !!(address && feedOwnerAddress && address.toLowerCase() === feedOwnerAddress.toLowerCase())

  // User has access if they're the owner OR they've purchased
  const hasAccess = isOwner || hasPurchased

  // Theme detection
  const [currentTheme, setCurrentTheme] = useState('default')

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

  // Get theme-specific styles
  const themeKey = ['modern', 'neobrutalism'].includes(currentTheme) ? currentTheme : 'default'
  const styles = themeStyles[themeKey as keyof typeof themeStyles]

  // Refetch entry data function
  const refetchEntry = useCallback(async () => {
    if (!feedId || !entryId) return

    try {
      const entryData = await grapevineApiClient.getEntry(feedId, entryId)
      setEntry(entryData)
    } catch (err) {
      console.error('Failed to refetch entry:', err)
    }
  }, [feedId, entryId])

  useEffect(() => {
    const fetchData = async () => {
      if (!feedId || !entryId) return

      try {
        setLoading(true)
        const [entryData, feedData] = await Promise.all([
          grapevineApiClient.getEntry(feedId, entryId),
          grapevineApiClient.getFeed(feedId),
        ])
        setEntry(entryData)
        setFeedOwnerAddress(feedData.owner_wallet_address || null)
        setError(null)
        // Set page title
        setTitle(entryData.title || 'Untitled Entry')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch entry')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [feedId, entryId, setTitle])

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (contentUrl) {
        URL.revokeObjectURL(contentUrl)
      }
    }
  }, [contentUrl])

  // Dangerous MIME types that could execute scripts or contain malicious content
  // Note: HTML/XML are rendered safely in sandboxed iframes
  const isDangerousMimeType = (mimeType: string): boolean => {
    const dangerous = [
      'application/javascript',
      'application/x-javascript',
      'text/javascript',
      'application/x-shockwave-flash',
      'application/x-msdownload',
      'application/x-executable',
    ]
    return dangerous.some(type => mimeType.toLowerCase().includes(type))
  }

  // Check if MIME type is HTML-based
  const isHtmlMimeType = (mimeType: string | undefined): boolean => {
    if (!mimeType) return false
    const htmlTypes = ['text/html', 'application/xhtml+xml', 'application/xml', 'text/xml']
    return htmlTypes.some(type => mimeType.toLowerCase() === type)
  }

  const handleBuyResource = async () => {
    if (!entry?.cid) return

    try {
      setPurchasing(true)
      setPurchaseError(null)

      // For HTML content, open in new window
      if (isHtmlMimeType(entry.mime_type)) {
        const gatewayUrl = `https://${import.meta.env.VITE_PINATA_GATEWAY}/x402/cid/${entry.cid}`

        // Free content: open gateway URL directly, no auth needed
        if (entry.is_free) {
          if (isInMiniApp) {
            await sdk.actions.openUrl(gatewayUrl)
          } else {
            window.open(gatewayUrl, '_blank')
          }
          return
        }

        // Paid content: need to purchase first if no access
        if (!hasAccess) {
          const maxPaymentAmount = BigInt(1_000_000)
          const response = await fetchWithPayment(gatewayUrl, {}, maxPaymentAmount)

          if (!response.ok) {
            try {
              const errorData = await response.json()
              if (response.status === 402 && errorData.error === 'insufficient_funds') {
                throw new Error('Insufficient USDC balance to purchase resource. Please add funds to your wallet.')
              }
              throw new Error(errorData.error || `Failed to purchase resource: ${response.status}`)
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message.includes('USDC')) {
                throw parseError
              }
              throw new Error(`Failed to purchase resource: ${response.status} ${response.statusText}`)
            }
          }
          // Payment successful, purchase is now registered
        }

        // Paid content with access: get signed URL
        if (!isConnected) {
          throw new Error('Please connect your wallet to view this content')
        }

        if (!feedId || !entryId) {
          throw new Error('Missing feed or entry ID')
        }

        const authPayload = await signRequest('POST', `/v1/feeds/${feedId}/entries/${entryId}/access-link`)
        const timestamp = Math.floor(Date.now() / 1000).toString()
        const authHeaders = {
          'x-wallet-address': authPayload.address,
          'x-signature': authPayload.signature,
          'x-message': authPayload.message,
          'x-timestamp': timestamp,
        }

        const accessLinkResponse = await grapevineApiClient.getEntryAccessLink(feedId, entryId, authHeaders)
        if (isInMiniApp) {
          await sdk.actions.openUrl(accessLinkResponse.url)
        } else {
          window.open(accessLinkResponse.url, '_blank')
        }

        // Track analytics for paid HTML content
        if (isOwner) {
          trackEvent(AnalyticsEvents.VIEW_OWN_RESOURCE, { entryId: entryId || '', feedId: feedId || '' }, address)
        } else if (hasPurchased) {
          trackEvent(AnalyticsEvents.VIEW_PURCHASED_RESOURCE, { entryId: entryId || '', feedId: feedId || '' }, address)
        } else {
          // New purchase was just made (in the x402 flow above)
          trackEvent(AnalyticsEvents.BUY_RESOURCE, { entryId: entryId || '', feedId: feedId || '' }, address)
        }
        return
      }

      // For non-HTML content, continue with existing logic
      let response: Response

      // Check if already has access (owner or purchased) - use access-link endpoint
      if (hasAccess && !entry.is_free && feedId && entryId) {
        if (!isConnected) {
          throw new Error('Please connect your wallet to view this content')
        }

        // Get access link with authentication (POST endpoint)
        const authPayload = await signRequest('POST', `/v1/feeds/${feedId}/entries/${entryId}/access-link`)

        // Extract timestamp from the nonce message or use current time
        const timestamp = Math.floor(Date.now() / 1000).toString()

        const authHeaders = {
          'x-wallet-address': authPayload.address,
          'x-signature': authPayload.signature,
          'x-message': authPayload.message,
          'x-timestamp': timestamp,
        }

        console.log("Auth Headers:", authHeaders)

        const accessLinkResponse = await grapevineApiClient.getEntryAccessLink(feedId, entryId, authHeaders)

        // Fetch content from the access link
        response = await fetch(accessLinkResponse.url)
      } else {
        // Original flow for unpurchased or free content
        const gatewayUrl = `https://${import.meta.env.VITE_PINATA_GATEWAY}/x402/cid/${entry.cid}`

        if (entry.is_free) {
          // For free resources, just fetch directly without payment
          response = await fetch(gatewayUrl)
        } else {
          // Perform x402 payment exchange (GET request)
          // Set max payment to $1.00 USDC (1000000 in 6 decimal base units)
          const maxPaymentAmount = BigInt(1_000_000)
          response = await fetchWithPayment(gatewayUrl, {}, maxPaymentAmount)
        }
      }

      if (!response.ok) {
        // Handle errors from the response
        try {
          const errorData = await response.json();

          if (response.status === 402 && errorData.error === 'insufficient_funds') {
            throw new Error('Insufficient USDC balance to purchase resource. Please add funds to your wallet.');
          }

          throw new Error(errorData.error || `Failed to ${entry.is_free ? 'fetch' : hasAccess ? 'load' : 'purchase'} resource: ${response.status}`);
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('USDC')) {
            throw parseError;
          }
          throw new Error(`Failed to ${entry.is_free ? 'fetch' : hasAccess ? 'load' : 'purchase'} resource: ${response.status} ${response.statusText}`);
        }
      }

      // Get the content as a blob
      const blob = await response.blob()
      const mimeType = entry.mime_type || response.headers.get('content-type') || 'application/octet-stream'

      // Security: Block dangerous MIME types
      if (isDangerousMimeType(mimeType)) {
        throw new Error(`Content type '${mimeType}' is not allowed for security reasons. Only images, videos, audio, PDFs, and plain text are supported.`)
      }

      // Create object URL for display
      const url = URL.createObjectURL(blob)
      setContentUrl(url)
      setPurchasedContent({ blob, mimeType })

      // Track analytics based on access type
      if (entry.is_free) {
        // Free content - no specific tracking needed
      } else if (isOwner) {
        trackEvent(AnalyticsEvents.VIEW_OWN_RESOURCE, { entryId: entryId || '', feedId: feedId || '' }, address)
      } else if (hasPurchased) {
        trackEvent(AnalyticsEvents.VIEW_PURCHASED_RESOURCE, { entryId: entryId || '', feedId: feedId || '' }, address)
      } else {
        // New purchase was just made
        trackEvent(AnalyticsEvents.BUY_RESOURCE, { entryId: entryId || '', feedId: feedId || '' }, address)
      }
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : `Failed to ${entry.is_free ? 'fetch' : hasAccess ? 'load' : 'purchase'} resource`)
    } finally {
      setPurchasing(false)
    }
  }

  const renderContent = () => {
    if (!purchasedContent || !contentUrl) return null

    const { mimeType } = purchasedContent

    // Image types
    if (mimeType.startsWith('image/')) {
      return (
        <div className={styles.contentCard}>
          <img
            src={contentUrl}
            alt={entry?.title || 'Entry content'}
            className={styles.mediaContent}
          />
        </div>
      )
    }

    // Video types
    if (mimeType.startsWith('video/')) {
      return (
        <div className={styles.contentCard}>
          <video
            src={contentUrl}
            controls
            className={styles.mediaContent}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )
    }

    // Audio types
    if (mimeType.startsWith('audio/')) {
      return (
        <div className={styles.contentCard}>
          <audio
            src={contentUrl}
            controls
            className="w-full"
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      )
    }

    // PDF
    if (mimeType === 'application/pdf') {
      return (
        <div className={styles.contentCard}>
          <iframe
            src={`${contentUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className={cn('w-full', styles.mediaContent)}
            style={{ height: '600px' }}
            title={entry?.title || 'PDF content'}
          />
        </div>
      )
    }

    // HTML/XML - Render in sandboxed iframe (blocks scripts, forms, navigation)
    if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml' || mimeType === 'application/xml' || mimeType === 'text/xml') {
      return (
        <div className={styles.contentCard}>
          <iframe
            src={contentUrl}
            className={cn('w-full', styles.mediaContent)}
            style={{ height: '600px' }}
            title={entry?.title || 'HTML content'}
            sandbox=""
          />
        </div>
      )
    }

    // Plain text and JSON - Safe to display with sandboxing
    if (mimeType === 'text/plain' || mimeType.includes('json')) {
      return (
        <div className={styles.contentCard}>
          <iframe
            src={contentUrl}
            className={cn('w-full font-mono text-sm', styles.mediaContent)}
            style={{ height: '600px' }}
            title={entry?.title || 'Text content'}
            sandbox=""
          />
        </div>
      )
    }

    // Other text types - Download only (could be HTML/JS disguised)
    if (mimeType.startsWith('text/')) {
      return (
        <div className={styles.card}>
          <p className={styles.downloadTitle}>Text File Ready</p>
          <p className={styles.downloadText}>
            This text file type ({mimeType}) must be downloaded for security reasons.
          </p>
          <Button
            variant="success"
            size="lg"
            onClick={() => {
              const link = document.createElement('a')
              link.href = contentUrl
              link.download = entry?.title || 'download'
              link.click()
            }}
          >
            Download File
          </Button>
        </div>
      )
    }

    // Default: Download link for unknown types
    return (
      <div className={styles.card}>
        <p className={styles.downloadTitle}>Content Ready</p>
        <p className={styles.downloadText}>This file type ({mimeType}) cannot be displayed in the browser.</p>
        <Button
          variant="success"
          size="lg"
          onClick={() => {
            const link = document.createElement('a')
            link.href = contentUrl
            link.download = entry?.title || 'download'
            link.click()
          }}
        >
          Download File
        </Button>
      </div>
    )
  }

  // Preserve the 'from' query param when navigating back (keep it encoded)
  const fromEncoded = searchParams.get('from')

  const handleShareToFarcaster = async () => {
    if (!entry) return
    const baseUrl = import.meta.env.VITE_ENV === 'production' ? 'https://grapevine.fyi' : 'https://grapevine.markets'
    const entryUrl = `${baseUrl}/feeds/${feedId}/entries/${entryId}`
    try {
      await sdk.actions.composeCast({
        text: `Check out "${entry.title || 'this entry'}" on Grapevine`,
        embeds: [entryUrl],
      })
      trackEvent(AnalyticsEvents.SHARE_ENTRY_FARCASTER, { entryId: entryId || '', feedId: feedId || '' }, address)
    } catch (err) {
      console.log('[EntryDetail] Share failed (not in mini app context):', err)
    }
  }

  return (
    <div>
      {/* Back Button and Entry Title */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <Button
          onClick={() => navigate(feedId ? `/feeds/${feedId}/entries?from=${fromEncoded || encodeURIComponent('/')}` : '/')}
          variant={themeKey === 'modern' ? 'ghost' : 'secondary'}
          size={themeKey === 'modern' ? 'md' : 'lg'}
          className={themeKey === 'modern' ? 'hover:bg-gray-800' : ''}
        >
          {themeKey === 'modern' ? '← Back to Entries' : '← Back to Entries'}
        </Button>
        {!loading && !error && entry && (
          <>
            <div className={styles.titleLabel}>
              {entry.title || 'Untitled Entry'}
            </div>
            {isInMiniApp && (
              <Button
                onClick={handleShareToFarcaster}
                variant="secondary"
                size={themeKey === 'modern' ? 'md' : 'lg'}
              >
                Share
              </Button>
            )}
          </>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.card}>
          <Loader size="lg" />
          <p className={styles.loadingText}>Loading Entry...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorTitle}>Error</p>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}

      {/* Entry Details */}
      {!loading && !error && entry && (
        <>
          {/* Purchase Section */}
          {!purchasedContent && (
            <div ref={purchaseBoxRef} className={cn(styles.card, 'mb-8')}>
              <h2 className={styles.purchaseTitle}>
                {entry.is_free ? 'View Resource' : hasAccess ? 'View Resource' : 'Purchase Resource'}
              </h2>
              <p className={styles.purchaseText}>
                {entry.is_free
                  ? 'Click the button below to view this free content.'
                  : isOwner
                  ? 'This is your content. Click below to view it.'
                  : hasAccess
                  ? 'Click the button below to view this content.'
                  : 'Click the button below to purchase and view this content.'}
              </p>

              {/* Owner Badge */}
              {isOwner && !entry.is_free && (
                <div className={styles.ownerBadge}>
                  <p className={styles.ownerTitle}>Your Content</p>
                  <p className={styles.ownerText}>You own this feed, so you have full access to this entry.</p>
                </div>
              )}

              {/* Already Purchased Badge */}
              {!isCheckingPurchase && hasPurchased && !isOwner && !entry.is_free && (
                <div className={styles.purchasedBadge}>
                  <p className={styles.purchasedTitle}>Already Bought</p>
                  <p className={styles.purchasedText}>You have already purchased this content. Click below to view it again.</p>
                </div>
              )}

              {purchaseError && (
                <div className={styles.purchaseErrorBadge}>
                  <p className={styles.purchaseErrorTitle}>{entry.is_free || hasAccess ? 'Failed to Load' : 'Purchase Failed'}</p>
                  <p className={styles.purchaseErrorText}>{purchaseError}</p>
                </div>
              )}

              <ArrowWrapper direction="bottom-right" size={50} bounceDistance={20}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleBuyResource}
                  loading={purchasing}
                  disabled={!entry.cid || purchasing}
                >
                  {purchasing
                    ? (entry.is_free ? 'Loading...' : hasAccess ? 'Loading...' : 'Purchasing...')
                    : (entry.is_free ? 'View Resource' : hasAccess ? 'View Resource' : 'Buy Resource')}
                </Button>
              </ArrowWrapper>
            </div>
          )}

          {/* Content Display */}
          {purchasedContent && (
            <div className="mb-8">
              <h2 className={styles.sectionTitle}>
                Content
              </h2>
              {renderContent()}
            </div>
          )}

          {/* Entry Info Card */}
          <div className={cn(styles.infoCard, 'mb-8')}>
            <div className={styles.infoSection}>
              <div className={styles.infoHeader}>
                <h3 className={styles.infoTitle}>
                  Description
                </h3>
                <div className="flex gap-2">
                  {entry.cid && (
                    <Button
                      onClick={async () => {
                        const gatewayUrl = `https://${import.meta.env.VITE_PINATA_GATEWAY}/x402/cid/${entry.cid}`
                        try {
                          await navigator.clipboard.writeText(gatewayUrl)
                          trackEvent(AnalyticsEvents.COPY_LINK, { entryId: entryId || '', feedId: feedId || '' }, address)
                          toast.success('Link copied to clipboard!')
                        } catch (err) {
                          toast.error('Failed to copy link')
                        }
                      }}
                      variant="primary"
                      size="sm"
                    >
                      Copy x402 Link
                    </Button>
                  )}
                  {isOwner && feedId && entryId && (
                    <Button
                      onClick={() => setShowDeleteDialog(true)}
                      variant="danger"
                      size="sm"
                      loading={deleteEntry.isPending}
                    >
                      Delete Entry
                    </Button>
                  )}
                </div>
              </div>
              {entry.description ? (
                <p className={styles.infoDescription}>
                  {entry.description}
                </p>
              ) : (
                <p className={styles.infoDescriptionEmpty}>
                  No description provided
                </p>
              )}
            </div>
            <div className={styles.infoGrid}>
              <div>
                <h3 className={styles.infoLabel}>
                  CID
                </h3>
                <p className={styles.cidBox}>
                  {entry.cid || 'N/A'}
                </p>
              </div>

              <div>
                <h3 className={styles.infoLabel}>
                  Type
                </h3>
                <span className={styles.typeBadge}>
                  {entry.mime_type}
                </span>
              </div>

              <div>
                <h3 className={styles.infoLabel}>
                  Price
                </h3>
                <span className={entry.is_free ? styles.priceBadgeFree : styles.priceBadgePaid}>
                  {(() => {
                    // Format price: convert from base units to display format
                    // For USDC: 1000000 = 1 USDC (6 decimals)
                    if (entry.is_free) return 'Free'
                    if (!entry.price || !entry.asset) return 'N/A'
                    const priceNum = parseFloat(entry.price.toString())
                    const decimals = entry.asset === 'USDC' ? 6 : 18 // USDC has 6 decimals, ETH has 18
                    const displayPrice = priceNum / Math.pow(10, decimals)
                    return `${displayPrice.toFixed(2)} ${entry.asset}`
                  })()}
                </span>
              </div>

              <div>
                <h3 className={styles.infoLabel}>
                  Created
                </h3>
                <p className={styles.dateText}>
                  {new Date(entry.created_at * 1000).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Countdown Timer for Expiration */}
            {entry.expires_at && !entry.is_free && (
              <div className="mt-6 p-4 border-[2px] border-black bg-yellow-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className={styles.infoLabel}>
                  Becomes Free In
                </h3>
                <ExpiryCountdown
                  expiresAt={entry.expires_at}
                  onExpire={refetchEntry}
                />
              </div>
            )}

            {entry.tags && entry.tags.length > 0 && (
              <div className={styles.tagsSection}>
                <h3 className={styles.infoLabel}>
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag: string, i: number) => (
                    <span key={i} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Entry Dialog */}
      {entry && feedId && entryId && (
        <DeleteEntryDialog
          isOpen={showDeleteDialog}
          entryName={entry.title || 'Untitled Entry'}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={async () => {
            try {
              await deleteEntry.mutateAsync({ feedId, entryId })
              toast.success('Entry deleted successfully')
              setShowDeleteDialog(false)
              navigate(`/feeds/${feedId}/entries`)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to delete entry')
            }
          }}
          isDeleting={deleteEntry.isPending}
        />
      )}

    </div>
  )
}
