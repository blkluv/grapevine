import { useWallet } from '@/context/WalletContext'
import { useFarcaster } from '@/context/FarcasterContext'
import {UserPill} from '@privy-io/react-auth/ui';
import type { ReactNode } from 'react';

interface FarcasterUserInfo {
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface SecondaryNavigationViewProps {
  isConnected: boolean
  address: string | null
  walletComponent?: ReactNode
  isFarcasterMode?: boolean
  farcasterUser?: FarcasterUserInfo | null
}

export function SecondaryNavigationView({
  isConnected,
  address,
  walletComponent,
  isFarcasterMode,
  farcasterUser,
}: SecondaryNavigationViewProps) {
  // Don't render Privy's UserPill in Farcaster mode
  const showUserPill = !isFarcasterMode && !walletComponent

  return (
    <div className="flex flex-col lg:flex-row items-center justify-end gap-2 text-sm lg:text-base font-mono font-bold">
      { isConnected && address && <>
          {/*<span className="text-xs lg:text-base">Wallet: {truncateAddress(address)}</span>*/}
        </>
      }
      {walletComponent}
      {showUserPill && <UserPill />}
      {/* Farcaster user display */}
      {isFarcasterMode && farcasterUser && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          {farcasterUser.pfpUrl && (
            <img
              src={farcasterUser.pfpUrl}
              alt={farcasterUser.username || 'User'}
              className="w-6 h-6 rounded-full border border-black"
            />
          )}
          <span className="text-xs font-black uppercase">
            {farcasterUser.username || farcasterUser.displayName || 'Connected'}
          </span>
        </div>
      )}
    </div>
  )
}

export function SecondaryNavigation() {
  const { isConnected, address } = useWallet()
  const { isInMiniApp, isSDKReady, user } = useFarcaster()
  const isFarcasterMode = isSDKReady && isInMiniApp

  return (
    <SecondaryNavigationView
      isConnected={isConnected}
      address={address}
      isFarcasterMode={isFarcasterMode}
      farcasterUser={user}
    />
  )
}
