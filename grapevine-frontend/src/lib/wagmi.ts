import { http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [miniAppConnector()],
});
