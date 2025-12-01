import type { WalletClient } from 'viem';

/**
 * Adapts a wagmi WalletClient to a viem-compatible Account object
 * that x402-fetch can use for signing payment authorizations.
 *
 * This adapter bridges the gap between wagmi's wallet client and the
 * viem Account interface expected by x402-fetch.
 */
export function createViemAccount(walletClient: WalletClient) {
  if (!walletClient.account) {
    throw new Error('WalletClient has no account');
  }

  return {
    // Core properties
    address: walletClient.account.address,
    type: 'local' as const,
    source: 'wagmi',

    // publicKey is required by viem Account interface but not used for signing
    publicKey: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,

    // Signing methods
    sign: async ({ hash: _hash }: { hash: `0x${string}` }) => {
      // Raw signing not needed for USDC payments (uses EIP-712 instead)
      throw new Error('Raw signing not supported - use signTypedData for x402 payments');
    },

    signAuthorization: async (_authorization: any) => {
      // Authorization signing not needed for USDC payments
      throw new Error('Authorization signing not supported - use signTypedData for x402 payments');
    },

    signMessage: async ({ message }: { message: string | { raw: `0x${string}` | Uint8Array } }) => {
      return await walletClient.signMessage({
        message,
        account: walletClient.account!,
      });
    },

    signTransaction: async (tx: any) => {
      return await walletClient.signTransaction(tx);
    },

    signTypedData: async (typedData: any) => {
      return await walletClient.signTypedData(typedData);
    },
  };
}
