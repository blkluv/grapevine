import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'

const LOGO_URL = 'https://grapevine-assets.mypinata.cloud/ipfs/bafkreib4zfs5lxdvlqzxyvc2djb4oaw2rvizg5rzwivjlet53j6fd6mvsy'

// Neobrutalism styles
const styles = {
  wrapper: 'flex flex-col lg:flex-row items-center lg:items-start lg:justify-between gap-6 bg-white border-b-4 border-black pb-6 mb-8',
  navContainer: 'flex flex-wrap items-center justify-center gap-3 lg:gap-4 bg-white p-3',
  buttonClass: 'min-w-[80px] lg:min-w-[150px] text-xs lg:text-sm px-3 lg:px-4',
}

export function Navigation() {
  const location = useLocation()

  const navItems = [
    { path: '/feeds', label: 'Feeds' },
    { path: '/top-sellers', label: 'Top Sellers' },
    { path: '/about', label: 'About' },
  ]

  // Check if current path is feeds or a feed entry page
  const isActive = (path: string) => {
    if (path === '/feeds') {
      return location.pathname === path || location.pathname.startsWith('/feeds/')
    }
    return location.pathname === path
  }

  return (
    <div className={styles.wrapper}>
      <Link to="/" className="no-underline">
        <img
          src={LOGO_URL}
          alt="Grapevine"
          className="h-10 lg:h-16"
        />
      </Link>

      <div className={styles.navContainer}>
        {/* Navigation Links */}
        {navItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Button
              variant={isActive(item.path) ? 'primary' : 'secondary'}
              size="lg"
              className={styles.buttonClass}
            >
              {item.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
