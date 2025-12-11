import { useWallet } from '@/context/WalletContext'
import { useFarcaster } from '@/context/FarcasterContext'
import {UserPill} from '@privy-io/react-auth/ui';
import type { ReactNode } from 'react';

interface SecondaryNavigationViewProps {
  isConnected: boolean
  address: string | null
  walletComponent?: ReactNode
  isFarcasterMode?: boolean
}

export function SecondaryNavigationView({
  isConnected,
  address,
  walletComponent,
  isFarcasterMode,
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
    </div>
  )
}

export function SecondaryNavigation() {
  const { isConnected, address } = useWallet()
  const { isInMiniApp, isSDKReady } = useFarcaster()
  const isFarcasterMode = isSDKReady && isInMiniApp

  return (
    <SecondaryNavigationView
      isConnected={isConnected}
      address={address}
      isFarcasterMode={isFarcasterMode}
    />
  )
}
