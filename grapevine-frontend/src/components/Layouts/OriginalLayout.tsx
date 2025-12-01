import { useState, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Navigation } from '@/components/Navigation.tsx'
import { SecondaryNavigation } from '@/components/SecondaryNavigation.tsx'
import { CategoriesSidebar } from '@/components/CategoriesSidebar.tsx'
import { HamburgerMenu } from '@/components/HamburgerMenu.tsx'
import { PageTitle } from '@/components/PageTitle.tsx'
import { usePageTitle } from '@/context/PageTitleContext.tsx'
import { MusicPlayer } from '@/components/MusicPlayer.tsx'
import { useLayout } from '@/context/LayoutContext.tsx'
import { cn } from '@/lib/utils.ts'

interface LayoutProps {
  children: ReactNode
  maxWidth?: 'full' | '7xl'  // Allow customization of max-width
}

export function OriginalLayout({ children, maxWidth = '7xl' }: LayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()
  const { title } = usePageTitle()
  const { layoutVariant } = useLayout()

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // 1024px is lg breakpoint
    }

    // Initial check
    checkMobile()

    // Add resize listener
    window.addEventListener('resize', checkMobile)

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Only show title on about page
  const shouldShowTitle = location.pathname === '/about'

  // Use original layout for default theme
  return (
    <div className={cn("min-h-screen", layoutVariant === 'modern' && "font-sans")}>
      {/* Hamburger Menu - Mobile only */}
      <HamburgerMenu />

      {/* Secondary Navigation - Desktop only */}
      <div className="hidden lg:block px-6 py-1">
        <SecondaryNavigation />
      </div>

      {/* Navigation */}
      <div className="px-6 py-1">
        <Navigation />
      </div>

      {/* Global Page Title - Only show on about page */}
      {title && shouldShowTitle && (
        <div className="text-center mb-8 mt-4 flex justify-center">
          <PageTitle>{title}</PageTitle>
        </div>
      )}

      {/* Main Layout: Full width on mobile, side-by-side on desktop */}
      <div className="px-6 pb-12">
        <div className={maxWidth === 'full' ? 'w-full' : 'max-w-7xl mx-auto'}>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Section - Sidebar (hidden on mobile, 25% on desktop) */}
            <div className="hidden lg:block lg:w-1/4 flex-shrink-0 lg:pt-20">
              <CategoriesSidebar />
              {!isMobile && (
                <div className="mt-6">
                  <MusicPlayer />
                </div>
              )}
            </div>

            {/* Right Section - Main content (full width on mobile, 75% on desktop) */}
            <div className="w-full lg:flex-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OriginalLayout
