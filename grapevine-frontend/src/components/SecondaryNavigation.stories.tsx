import type { Story } from '@ladle/react';
import { SecondaryNavigationView } from './SecondaryNavigation';

const MockWalletPill = () => (
  <div className="bg-white border-4 border-black px-4 py-2 shadow-[2px_2px_0px_0px_#000] font-mono">
    0x1234...5678
  </div>
);

export const SecondaryNavigation: Story = () => {
  return (
    <SecondaryNavigationView
      isConnected={true}
      address="0x1234567890abcdef1234567890abcdef12345678"
      walletComponent={<MockWalletPill />}
    />
  );
};
