import { type WalletClient, type Address } from 'viem';

export interface SignaturePayload {
  address: string;
  message: string;
  signature: string;
}

/**
 * Generate a message to be signed for authentication
 * Format: {METHOD}:{endpoint}:{address}:{timestamp}
 */
export function generateMessage(
  method: string,
  endpoint: string,
  address: string
): string {
  const timestamp = Date.now();
  return `${method}:${endpoint}:${address}:${timestamp}`;
}

/**
 * Sign a message using an EVM wallet (Base chains)
 */
export async function signMessageEVM(
  walletClient: WalletClient,
  message: string,
  address: Address
): Promise<string> {
  try {
    const signature = await walletClient.signMessage({
      account: address,
      message,
    });
    return signature;
  } catch (error) {
    console.error('Error signing message with EVM wallet:', error);
    throw new Error('User rejected signature request');
  }
}

// Removed Solana support for frontend-only app

/**
 * Create a signature payload for API authentication
 */
export async function createSignaturePayload(
  method: string,
  endpoint: string,
  address: string,
  signFunction: (message: string) => Promise<string>
): Promise<SignaturePayload> {
  const message = generateMessage(method, endpoint, address);
  const signature = await signFunction(message);

  return {
    address,
    message,
    signature,
  };
}

/**
 * Truncate a wallet address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
