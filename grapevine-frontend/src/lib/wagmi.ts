import { http, createConfig } from 'wagmi';
import { createConfig as createPrivyConfig } from '@privy-io/wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Privy mode: No connectors needed, Privy injects its own
// ssr: true prevents wagmi from auto-detecting/connecting wallets on initial load
export const privyWagmiConfig = createPrivyConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

// Farcaster mode: Use Farcaster connector, no Privy
export const farcasterWagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [farcasterMiniApp()],
});
