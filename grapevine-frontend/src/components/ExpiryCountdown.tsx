import { useState, useEffect } from 'react'

interface ExpiryCountdownProps {
  /** Unix timestamp in seconds when the entry expires */
  expiresAt: number
  /** Callback when the countdown reaches zero */
  onExpire?: () => void
  /** Compact mode for table cells - shows inline text */
  compact?: boolean
  /** Custom className */
  className?: string
}

interface CountdownTime {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

function getCountdown(expiresAtMs: number): CountdownTime | null {
  const now = Date.now()
  const diff = expiresAtMs - now

  if (diff <= 0) {
    return null
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, totalMs: diff }
}

function formatCompactCountdownTime(countdown: CountdownTime): string {
  const totalHours = countdown.days * 24 + countdown.hours

  if (totalHours >= 1) {
    // More than 1 hour: show days and hours
    if (countdown.days > 0) {
      return `in ${countdown.days}d ${countdown.hours}h`
    }
    return `in ${countdown.hours}h`
  }

  // Less than 1 hour: show minutes and seconds
  return `in ${countdown.minutes}m ${countdown.seconds}s`
}

export function ExpiryCountdown({
  expiresAt,
  onExpire,
  compact = false,
  className,
}: ExpiryCountdownProps) {
  const [countdown, setCountdown] = useState<CountdownTime | null>(() => {
    const expiresAtMs = expiresAt * 1000
    return getCountdown(expiresAtMs)
  })
  const [isExpiredWaiting, setIsExpiredWaiting] = useState(() => {
    const expiresAtMs = expiresAt * 1000
    return expiresAtMs <= Date.now()
  })

  useEffect(() => {
    const expiresAtMs = expiresAt * 1000
    const now = Date.now()

    // If already expired, show waiting state and call onExpire after delay
    if (expiresAtMs <= now) {
      setIsExpiredWaiting(true)
      setCountdown(null)
      const timeout = setTimeout(() => {
        onExpire?.()
      }, 3000)
      return () => clearTimeout(timeout)
    }

    let expireTimeout: ReturnType<typeof setTimeout> | null = null

    const updateCountdown = () => {
      const newCountdown = getCountdown(expiresAtMs)

      if (newCountdown === null) {
        // Just expired - show waiting state and wait 3 seconds before calling onExpire
        setCountdown(null)
        setIsExpiredWaiting(true)
        expireTimeout = setTimeout(() => {
          onExpire?.()
        }, 3000)
        return
      }

      setCountdown(newCountdown)
    }

    // Update immediately
    updateCountdown()

    // Then update every second
    const interval = setInterval(updateCountdown, 1000)

    return () => {
      clearInterval(interval)
      if (expireTimeout) {
        clearTimeout(expireTimeout)
      }
    }
  }, [expiresAt, onExpire])

  // Show waiting message when expired but waiting for server
  if (isExpiredWaiting) {
    if (compact) {
      return (
        <span className={className}>
          <span className="text-gray-500">Making free...</span>
        </span>
      )
    }
    return (
      <div className={className}>
        <p className="text-sm font-mono text-gray-600">
          Making this file free, should be ready soon...
        </p>
      </div>
    )
  }

  // Don't render if no countdown
  if (!countdown) {
    return null
  }

  // Compact mode for table cells
  if (compact) {
    return (
      <span className={className}>
        <span className="text-green-600">Free</span>
        <span className="text-gray-500"> {formatCompactCountdownTime(countdown)}</span>
      </span>
    )
  }

  // Full display mode
  return (
    <div className={className}>
      <div className="flex gap-4 mt-2">
        <div className="text-center">
          <p className="text-2xl font-black font-mono">{countdown.days}</p>
          <p className="text-xs font-mono uppercase">Days</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black font-mono">{countdown.hours.toString().padStart(2, '0')}</p>
          <p className="text-xs font-mono uppercase">Hours</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black font-mono">{countdown.minutes.toString().padStart(2, '0')}</p>
          <p className="text-xs font-mono uppercase">Min</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black font-mono">{countdown.seconds.toString().padStart(2, '0')}</p>
          <p className="text-xs font-mono uppercase">Sec</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-mono text-black/70">
        On {new Date(expiresAt * 1000).toLocaleString()}
      </p>
    </div>
  )
}
