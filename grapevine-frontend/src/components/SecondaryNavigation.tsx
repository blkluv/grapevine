import { useWallet } from '@/context/WalletContext'
import {UserPill} from '@privy-io/react-auth/ui';
import type { ReactNode } from 'react';

interface SecondaryNavigationViewProps {
  isConnected: boolean
  address: string | null
  walletComponent?: ReactNode
}

export function SecondaryNavigationView({
  isConnected,
  address,
  walletComponent,
}: SecondaryNavigationViewProps) {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-end gap-2 text-sm lg:text-base font-mono font-bold">
      { isConnected && address && <>
          {/*<span className="text-xs lg:text-base">Wallet: {truncateAddress(address)}</span>*/}
        </>
      }
      {walletComponent || <UserPill />}
    </div>
  )
}

export function SecondaryNavigation() {
  const { isConnected, address } = useWallet()

  return (
    <SecondaryNavigationView
      isConnected={isConnected}
      address={address}
    />
  )
}
