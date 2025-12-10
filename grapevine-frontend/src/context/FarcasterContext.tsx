import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import sdk from '@farcaster/miniapp-sdk'

interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface FarcasterContextType {
  isInMiniApp: boolean
  isSDKReady: boolean
  user: FarcasterUser | null
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInMiniApp: false,
  isSDKReady: false,
  user: null,
})

export function useFarcaster() {
  return useContext(FarcasterContext)
}

export function FarcasterProvider({ children }: { children: ReactNode }) {
  const [isSDKReady, setIsSDKReady] = useState(false)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [user, setUser] = useState<FarcasterUser | null>(null)

  useEffect(() => {
    const initSDK = async () => {
      try {
        // Use the SDK's built-in method to detect mini app context
        const inMiniApp = await sdk.isInMiniApp()
        console.log('[FarcasterContext] isInMiniApp:', inMiniApp)

        if (inMiniApp) {
          await sdk.actions.ready()
          console.log('[FarcasterContext] SDK ready - in mini app')

          // Get user context
          const context = await sdk.context
          if (context?.user) {
            setUser({
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl,
            })
            console.log('[FarcasterContext] User:', context.user.username)
          }
        }

        setIsInMiniApp(inMiniApp)
        setIsSDKReady(true)
      } catch (error) {
        console.log('[FarcasterContext] SDK init error:', error)
        setIsSDKReady(true)
        setIsInMiniApp(false)
      }
    }

    if (!isSDKReady) {
      initSDK()
    }
  }, [isSDKReady])

  return (
    <FarcasterContext.Provider value={{ isInMiniApp, isSDKReady, user }}>
      {children}
    </FarcasterContext.Provider>
  )
}
