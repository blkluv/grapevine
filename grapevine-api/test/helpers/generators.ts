/**
 * Mock data generators
 * These functions generate mock data without inserting into database
 */

export const generateMockWallet = () => ({
  wallet_address: `0x${Math.random().toString(16).substring(2).padEnd(40, '0').substring(0, 40)}`,
  wallet_address_network: 'base-sepolia',
  username: `user_${Math.random().toString(36).substring(7)}`,
});

export const generateMockFeed = (owner_id: string, category_id: string) => ({
  owner_id,
  category_id,
  name: `Feed ${Math.random().toString(36).substring(7)}`,
  description: 'Mock feed description',
  tags: ['mock', 'test'],
});

export const generateMockEntry = (feed_id: string, piid: string) => ({
  feed_id,
  cid: `Qm${Math.random().toString(36).substring(2, 44)}`,
  mime_type: 'application/json',
  title: `Entry ${Math.random().toString(36).substring(7)}`,
  is_free: false,
  piid,
});

export const generateMockTransaction = (
  payer: string,
  pay_to: string,
  entry_id: string
) => ({
  payer,
  pay_to,
  amount: '10.00',
  asset: 'USDC',
  entry_id,
  transaction_hash: `0x${Math.random().toString(16).substring(2).padEnd(64, '0').substring(0, 64)}`,
});

export const generateRandomCID = () => {
  return `Qm${Math.random().toString(36).substring(2, 44).padEnd(42, '0')}`;
};

export const generateRandomTransactionHash = () => {
  return `0x${Math.random().toString(16).substring(2).padEnd(64, '0').substring(0, 64)}`;
};

export const generateRandomWalletAddress = () => {
  return `0x${Math.random().toString(16).substring(2).padEnd(40, '0').substring(0, 40)}`;
};
