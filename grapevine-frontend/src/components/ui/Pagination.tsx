type PaginationProps = {
  currentPage: number
  totalPages: number
  hasMore: boolean
  onPageChange: (page: number) => void
  onNext: () => void
  onPrevious: () => void
  loading?: boolean
}

// Neobrutalism styles
const styles = {
  container: 'flex justify-center items-center gap-2 mt-8',
  button: 'px-4 py-2 border-2 font-black uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150',
  buttonActive: 'bg-white text-black border-black hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer',
  buttonDisabled: 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed',
  buttonCurrent: 'bg-black text-white border-black',
  ellipsis: 'px-2 text-xl font-bold',
  pageButton: 'min-w-[48px]',
}

export function Pagination({
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  onNext,
  onPrevious,
  loading = false,
}: PaginationProps) {
  const canGoPrevious = currentPage > 1
  const canGoNext = hasMore

  // Calculate visible page numbers (show 5 pages at a time)
  const getVisiblePages = () => {
    const pages: number[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show pages around current page
      let start = Math.max(1, currentPage - 2)
      let end = Math.min(totalPages, currentPage + 2)

      // Adjust if at the beginning
      if (currentPage <= 3) {
        end = maxVisible
      }

      // Adjust if at the end
      if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }

    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <div className={styles.container}>
      {/* Previous Button */}
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious || loading}
        className={`${styles.button} ${
          canGoPrevious && !loading
            ? styles.buttonActive
            : styles.buttonDisabled
        }`}
      >
        ← Prev
      </button>

      {/* Page Numbers */}
      {visiblePages.length > 0 && visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          disabled={loading}
          className={`${styles.button} ${styles.pageButton} ${
            page === currentPage
              ? styles.buttonCurrent
              : loading
              ? styles.buttonDisabled
              : styles.buttonActive
          }`}
        >
          {page}
        </button>
      ))}

      {/* Show ellipsis if there are more pages */}
      {hasMore && totalPages > 0 && (
        <span className={styles.ellipsis}>...</span>
      )}

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!canGoNext || loading}
        className={`${styles.button} ${
          canGoNext && !loading
            ? styles.buttonActive
            : styles.buttonDisabled
        }`}
      >
        Next →
      </button>
    </div>
  )
}
