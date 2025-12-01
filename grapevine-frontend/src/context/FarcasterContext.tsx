import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import sdk from '@farcaster/miniapp-sdk'

interface FarcasterContextType {
  isInMiniApp: boolean
  isSDKReady: boolean
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInMiniApp: false,
  isSDKReady: false,
})

export function useFarcaster() {
  return useContext(FarcasterContext)
}

export function FarcasterProvider({ children }: { children: ReactNode }) {
  const [isSDKReady, setIsSDKReady] = useState(false)
  const [isInMiniApp, setIsInMiniApp] = useState(false)

  useEffect(() => {
    const initSDK = async () => {
      try {
        // Use the SDK's built-in method to detect mini app context
        const inMiniApp = await sdk.isInMiniApp()
        console.log('[FarcasterContext] isInMiniApp:', inMiniApp)

        if (inMiniApp) {
          await sdk.actions.ready()
          console.log('[FarcasterContext] SDK ready - in mini app')
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
    <FarcasterContext.Provider value={{ isInMiniApp, isSDKReady }}>
      {children}
    </FarcasterContext.Provider>
  )
}
