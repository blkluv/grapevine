import { Button, ArrowWrapper } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { GrapevineEntry } from '@/services/grapevineApi'

// Neobrutalism styles
const styles = {
  tableContainer: 'bg-white border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
  uploadHeader: 'border-b-[2px] border-black bg-white p-4 flex justify-end',
  emptyState: 'p-12 text-center',
  emptyTitle: 'text-xl font-black uppercase font-mono',
  emptyText: 'mt-2 text-base font-mono',
  tableWrapper: 'overflow-x-auto w-full',
  table: 'w-full min-w-[700px]',
  thead: 'bg-white border-b-[2px] border-black',
  th: 'text-left p-4 font-black uppercase text-xs tracking-wide border-r-[2px] border-black font-mono',
  thLast: 'text-left p-4 font-black uppercase text-xs tracking-wide font-mono',
  trEven: 'bg-white',
  trOdd: 'bg-gray-50',
  trHover: 'hover:bg-accent-aqua/20 transition-colors',
  td: 'p-4 border-r-[2px] border-black font-mono',
  tdLast: 'p-4 text-sm whitespace-nowrap relative group font-mono',
  tdBorder: 'border-b-[2px] border-black cursor-pointer',
  titleText: 'font-black',
  mimeType: 'text-xs text-gray-600 uppercase font-mono',
  priceBadgeFree: 'text-xs font-black uppercase px-2 py-1 border-[2px] border-black bg-green-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
  priceBadgePaid: 'text-xs font-black uppercase px-2 py-1 border-[2px] border-black bg-yellow-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
  tag: 'text-xs bg-white px-2 py-1 border-[2px] border-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
}

// Format price: convert from base units to display format
const formatPrice = (price: string | number | undefined, asset: string | undefined, isFree: boolean) => {
  if (isFree) return 'Free'
  if (!price || !asset) return 'N/A'
  const priceNum = parseFloat(price.toString())
  const decimals = asset === 'USDC' ? 6 : 18 // USDC has 6 decimals, ETH has 18
  const displayPrice = priceNum / Math.pow(10, decimals)
  return `${displayPrice.toFixed(2)} ${asset}`
}

export interface EntriesTableProps {
  entries: GrapevineEntry[]
  showUploadButton?: boolean
  onUploadClick?: () => void
  onEntryClick?: (entryId: string) => void
  onBuyClick?: (entryId: string) => void
  /** Show arrow animation on first row's buy button */
  highlightFirstRow?: boolean
}

export function EntriesTable({
  entries,
  showUploadButton = false,
  onUploadClick,
  onEntryClick,
  onBuyClick,
  highlightFirstRow = true,
}: EntriesTableProps) {
  return (
    <div className={styles.tableContainer}>
      {/* Upload Entry button */}
      {showUploadButton && onUploadClick && (
        <div className={styles.uploadHeader}>
          <Button
            onClick={onUploadClick}
            variant="primary"
            size="lg"
          >
            + Upload Entry
          </Button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No Entries Found</p>
          <p className={styles.emptyText}>This feed doesn't have any entries yet. Upload your first entry to get started!</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Price</th>
                <th className={styles.th}>Tags</th>
                <th className={styles.th}>Action</th>
                <th className={styles.thLast}>Created</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  onClick={() => onEntryClick?.(entry.id)}
                  className={cn(
                    styles.tdBorder,
                    index % 2 === 0 ? styles.trEven : styles.trOdd,
                    styles.trHover
                  )}
                >
                  <td className={styles.td}>
                    <div className="flex flex-col gap-1">
                      <div className={styles.titleText}>
                        {entry.title ? (
                          entry.title.length > 30 ? (
                            <span title={entry.title}>
                              {entry.title.slice(0, 30)}...
                            </span>
                          ) : (
                            entry.title
                          )
                        ) : (
                          <span className="text-gray-400 italic">Untitled</span>
                        )}
                      </div>
                      <span className={styles.mimeType}>
                        {entry.mime_type}
                      </span>
                    </div>
                  </td>
                  <td className={cn(styles.td, 'whitespace-nowrap')}>
                    <span className={entry.is_free ? styles.priceBadgeFree : styles.priceBadgePaid}>
                      {formatPrice(entry.price, entry.asset, entry.is_free)}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {entry.tags && entry.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag: string, i: number) => (
                          <span key={i} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {highlightFirstRow && index === 0 ? (
                      <ArrowWrapper direction="top-right" size={50} bounceDistance={20}>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            onBuyClick?.(entry.id)
                          }}
                          variant="primary"
                          size="sm"
                          noHoverEffect
                        >
                          Buy
                        </Button>
                      </ArrowWrapper>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          onBuyClick?.(entry.id)
                        }}
                        variant="primary"
                        size="sm"
                        noHoverEffect
                      >
                        Buy
                      </Button>
                    )}
                  </td>
                  <td className={styles.tdLast}>
                    <span>
                      {new Date(entry.created_at * 1000).toLocaleDateString()}
                    </span>
                    <div className="absolute hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 bottom-full left-1/2 -translate-x-1/2 mb-1">
                      {new Date(entry.created_at * 1000).toLocaleTimeString()}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
