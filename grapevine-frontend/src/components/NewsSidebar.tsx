import gif1 from '@/assets/img/news1.gif'
import { useQuery } from '@tanstack/react-query'

const X402_PROD_API_URL = 'https://api.grapevine.fyi/v1/feeds/019a74da-d919-754b-bce6-760f228e147b/entries?page_size=5&is_free=true'
const GRAPEVINE_NEWS_PROD_API_URL = 'https://api.grapevine.fyi/v1/feeds/019a79a1-6d52-7739-8da7-e3fd5439b5fa/entries?page_size=5&is_free=true'
const GATEWAY_URL = 'https://gateway.grapevine.fyi/x402/cid'

type EntryContent = {
  hash: string
  text: string
  timestamp: string
  author: {
    fid: number
    username: string
    display_name: string
    pfp_url: string
    bio: string
    follower_count: number
    following_count: number
    power_badge: boolean
  }
  engagement: {
    likes_count: number
    recasts_count: number
    replies_count: number
  }
  warpcast_url: string
}

type EntryWithContent = {
  id: string
  cid: string
  content: EntryContent | null
}

function formatTimestamp(timestamp: string): string {
  const now = new Date()
  const postDate = new Date(timestamp)
  const diffMs = now.getTime() - postDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  } else {
    return postDate.toLocaleString(undefined, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
}

// Neobrutalism styles
const styles = {
  container: 'w-64 flex-shrink-0',
  sticky: 'sticky top-8 space-y-6',
  image: 'w-full border-[2px] border-black',
  newsContainer: 'bg-white border-[2px] border-black p-4',
  newsHeader: 'flex items-center justify-between mb-3 border-b-[2px] border-black pb-2',
  newsTitle: 'font-mono text-sm font-black uppercase tracking-tight',
  loading: 'text-xs text-center py-8 border-[2px] border-black bg-white',
  loadingText: 'font-black uppercase',
  entryList: 'space-y-4 text-xs',
  entry: 'bg-white p-3 border-[2px] border-black overflow-hidden hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform',
  entryHeader: 'flex items-start gap-2 mb-2',
  avatar: 'w-8 h-8 border-[2px] border-black',
  authorName: 'font-mono font-black truncate uppercase text-xs',
  timestamp: 'text-[10px] font-bold text-black/60 uppercase',
  entryText: 'mb-2 leading-relaxed break-words overflow-hidden font-mono',
  readMore: 'inline-block font-mono font-black uppercase text-xs border-b-[2px] border-black hover:bg-black hover:text-white transition-colors px-1',
}

export function NewsSidebar() {
  // Fetch x402 news
  const { data: x402Entries, isLoading: isLoadingX402 } = useQuery({
    queryKey: ['x402-news'],
    queryFn: async () => {
      const response = await fetch(X402_PROD_API_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`)
      }
      const json = await response.json()

      if (!json?.data) {
        return []
      }

      const entriesWithContent = await Promise.all(
        json.data.map(async (entry: any) => {
          try {
            const contentResponse = await fetch(`${GATEWAY_URL}/${entry.cid}`)
            if (!contentResponse.ok) {
              throw new Error(`Failed to fetch content: ${contentResponse.statusText}`)
            }
            const content = await contentResponse.json()
            return {
              id: entry.id,
              cid: entry.cid,
              content,
            }
          } catch (error) {
            console.error(`Failed to fetch content for CID ${entry.cid}:`, error)
            return {
              id: entry.id,
              cid: entry.cid,
              content: null,
            }
          }
        })
      )

      return entriesWithContent.filter((entry): entry is EntryWithContent => entry.content !== null)
    },
    staleTime: 5 * 60 * 1000,
  })

  // Fetch Grapevine news
  const { data: grapevineEntries, isLoading: isLoadingGrapevine } = useQuery({
    queryKey: ['grapevine-news'],
    queryFn: async () => {
      const response = await fetch(GRAPEVINE_NEWS_PROD_API_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch Grapevine news: ${response.statusText}`)
      }
      const json = await response.json()

      if (!json?.data) {
        return []
      }

      const entriesWithContent = await Promise.all(
        json.data.map(async (entry: any) => {
          try {
            const contentResponse = await fetch(`${GATEWAY_URL}/${entry.cid}`)
            if (!contentResponse.ok) {
              throw new Error(`Failed to fetch content: ${contentResponse.statusText}`)
            }
            const content = await contentResponse.json()
            return {
              id: entry.id,
              cid: entry.cid,
              content,
            }
          } catch (error) {
            console.error(`Failed to fetch content for CID ${entry.cid}:`, error)
            return {
              id: entry.id,
              cid: entry.cid,
              content: null,
            }
          }
        })
      )

      return entriesWithContent.filter((entry): entry is EntryWithContent => entry.content !== null)
    },
    staleTime: 5 * 60 * 1000,
  })

  const renderNewsSection = (
    title: string,
    entries: EntryWithContent[] | undefined,
    isLoading: boolean
  ) => (
    <div className={styles.newsContainer}>
      <div className={styles.newsHeader}>
        <h3 className={styles.newsTitle}>{title}</h3>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.loadingText}>Loading news...</div>
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className={styles.loading}>
          <div className={styles.loadingText}>No news available</div>
        </div>
      ) : (
        <div className={styles.entryList}>
          {entries.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryHeader}>
                {entry.content?.author?.pfp_url && (
                  <img
                    src={entry.content.author.pfp_url}
                    alt={entry.content.author.display_name || entry.content.author.username}
                    className={styles.avatar}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className={styles.authorName}>
                    {entry.content?.author?.display_name || entry.content?.author?.username || 'Anonymous'}
                  </div>
                  {entry.content?.timestamp && (
                    <div className={styles.timestamp}>
                      {formatTimestamp(entry.content.timestamp)}
                    </div>
                  )}
                </div>
              </div>
              <p className={styles.entryText}>
                {entry.content?.text && entry.content.text.length > 150
                  ? `${entry.content.text.substring(0, 150)}...`
                  : entry.content?.text}
              </p>
              {entry.content?.warpcast_url && (
                <a
                  href={entry.content.warpcast_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.readMore}
                >
                  Read more
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.sticky}>
        <img
          src={gif1}
          alt="Grapevine Animation"
          className={styles.image}
        />
        {renderNewsSection('x402 News', x402Entries, isLoadingX402)}
        {renderNewsSection('Grapevine News', grapevineEntries, isLoadingGrapevine)}
      </div>
    </div>
  )
}
