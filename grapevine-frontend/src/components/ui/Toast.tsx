import { useEffect } from 'react'

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose: (id: string) => void
}

export function Toast({ id, message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  // Neobrutalism theme - white backgrounds with black text and borders
  const typeClasses = {
    success: {
      bg: 'bg-white',
      border: 'border-2 border-black border-r-4 border-b-4',
      text: 'text-black',
    },
    error: {
      bg: 'bg-white',
      border: 'border-2 border-black border-r-4 border-b-4',
      text: 'text-black',
    },
    warning: {
      bg: 'bg-white',
      border: 'border-2 border-black border-r-4 border-b-4',
      text: 'text-black',
    },
    info: {
      bg: 'bg-white',
      border: 'border-2 border-black border-r-4 border-b-4',
      text: 'text-black',
    },
  }

  const colors = typeClasses[type]

  return (
    <div
      className={`
        ${colors.bg}
        ${colors.text}
        ${colors.border}
        px-6 py-4
        shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        min-w-[300px]
        max-w-[400px]
        animate-slide-in
      `}
      role="alert"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-bold uppercase tracking-wide flex-1">
          {message}
        </p>
        <button
          onClick={() => onClose(id)}
          className={`
            ${colors.text}
            text-xl
            font-bold
            leading-none
            hover:opacity-70
            transition-opacity
            -mt-1
          `}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </div>
  )
}
