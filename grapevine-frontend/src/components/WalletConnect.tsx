import { useWallet } from '@/context/WalletContext';
import { useFarcaster } from '@/context/FarcasterContext';
import { truncateAddress } from '@/services/auth';

export function WalletConnect() {
  const { isConnected, isConnecting, address, connect, disconnect } = useWallet();
  const { isInMiniApp, user } = useFarcaster();

  // Show Farcaster username if in mini app, otherwise truncated address
  const displayName = isInMiniApp && user?.username ? `@${user.username}` : truncateAddress(address || '');

  if (isConnecting) {
    return (
      <button
        disabled
        className="px-8 py-3 bg-[#c0c0c0] text-gray-700 border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] font-black uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] cursor-not-allowed"
        style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
      >
        Connecting...
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white px-5 py-3 shadow-[inset_2px_2px_3px_rgba(0,0,0,0.1)]">
          <div className="text-sm font-black uppercase tracking-wide">
            {displayName}
          </div>
        </div>
        <button
          onClick={disconnect}
          className="px-8 py-3 bg-[#df5050] text-white border-2 border-t-[#ff7070] border-l-[#ff7070] border-b-[#a03030] border-r-[#a03030] font-black uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="px-8 py-3 bg-[#5050df] text-white border-2 border-t-[#7070ff] border-l-[#7070ff] border-b-[#3030a0] border-r-[#3030a0] font-black uppercase tracking-wider text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150"
    >
      Connect Wallet
    </button>
  );
}
