import { useState } from 'react'
import type { ReactNode } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { CategoriesSidebarView } from '@/components/CategoriesSidebar'
import { UserPill } from '@privy-io/react-auth/ui'
import { cn } from '@/lib/utils'

// Neobrutalism styles
const styles = {
  hamburgerButton: 'lg:hidden fixed top-4 left-4 z-10 bg-white border-4 border-black p-2 shadow-[4px_4px_0px_0px_#000]',
  overlay: 'fixed inset-0 bg-black/50 z-[5] lg:hidden',
  sidebarMenu: 'fixed top-0 left-0 h-full w-64 bg-white border-r-4 border-black shadow-[8px_0px_0px_0px_#000] z-10 transform transition-transform duration-300 lg:hidden',
  closeButtonContainer: 'flex justify-end p-4 border-b-4 border-black',
  closeButton: 'bg-white border-4 border-black p-2 shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] active:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]',
  walletSection: 'p-4 border-b-4 border-black',
  walletContent: 'flex flex-col gap-3 text-sm font-mono font-bold',
  categoriesSection: 'p-4',
  strokeColor: 'currentColor'
}

interface HamburgerMenuViewProps {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  categories: any[]
  categoriesLoading: boolean
  walletComponent?: ReactNode
}

export function HamburgerMenuView({
  isOpen,
  onOpen,
  onClose,
  categories,
  categoriesLoading,
  walletComponent,
}: HamburgerMenuViewProps) {
  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={onOpen}
        className={styles.hamburgerButton}
        aria-label="Open menu"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={styles.strokeColor}
          strokeWidth="2"
          strokeLinecap="square"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={onClose}
        />
      )}

      {/* Sidebar Menu */}
      <div
        className={cn(
          styles.sidebarMenu,
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close Button */}
        <div className={styles.closeButtonContainer}>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={styles.strokeColor}
              strokeWidth="2"
              strokeLinecap="square"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Secondary Navigation Items */}
        <div className={styles.walletSection}>
          <div className={styles.walletContent}>
            {/* Wallet Connection */}
            {walletComponent || <UserPill />}
          </div>
        </div>

        {/* Categories using the existing CategoriesSidebarView component */}
        <div className={styles.categoriesSection}>
          <div className="w-full">
            <CategoriesSidebarView
              categories={categories}
              categoriesLoading={categoriesLoading}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories()
  const categories = categoriesData || []

  return (
    <HamburgerMenuView
      isOpen={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      categories={categories}
      categoriesLoading={categoriesLoading}
    />
  )
}
