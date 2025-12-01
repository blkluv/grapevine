/**
 * Payment Instructions Service
 *
 * Integrates with Pinata backend's x402 payment instructions API
 * to create and manage payment requirements for paid content.
 */

import { config } from './config.js';

export interface PaymentRequirement {
  pay_to: string;
  network: 'base' | 'base-sepolia' | 'ethereum' | 'ethereum-sepolia' | 'polygon' | 'polygon-amoy';
  asset: string;
  max_amount_required: string;
  description?: string;
}

export interface CreatePaymentInstructionInput {
  name: string;
  description?: string;
  payment_requirements: PaymentRequirement[];
}

export interface PaymentInstructionResponse {
  data: PaymentInstruction;
}

export interface PaymentInstruction {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  payment_requirements: PaymentRequirement[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TokenConfig {
  [currency: string]: {
    [network: string]: string;
  };
}

/**
 * ERC-20 token contract addresses by currency and network
 */
export const TOKEN_ADDRESSES: TokenConfig = {
  'USDC': {
    'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'ethereum-sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    'polygon': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    'polygon-amoy': '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'
  },
  // Add more tokens as needed
};

/**
 * Get ERC-20 token contract address for a given currency and network
 */
export function getTokenAddress(currency: string, network: string): string {
  const address = TOKEN_ADDRESSES[currency]?.[network];
  if (!address) {
    throw new Error(`Unknown token ${currency} on network ${network}`);
  }
  return address;
}

/**
 * Client for interacting with Pinata backend's payment instructions API
 */
export class PaymentInstructionsClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl?: string, authToken?: string) {
    this.baseUrl = baseUrl || config.pinata.backendApiUrl || '';
    this.authToken = authToken || config.pinata.jwtToken || '';

    if (!this.authToken) {
      throw new Error('PINATA_JWT_TOKEN environment variable is required');
    }
    if (!this.baseUrl) {
      throw new Error('PINATA_BACKEND_API_URL environment variable is required');
    }
  }

  /**
   * Create a new payment instruction
   */
  async create(input: CreatePaymentInstructionInput): Promise<PaymentInstructionResponse> {
    const url = `${this.baseUrl}/v3/x402/payment_instructions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create payment instruction: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<PaymentInstructionResponse>;
  }

  /**
   * Get a payment instruction by ID
   */
  async get(paymentInstructionId: string): Promise<PaymentInstructionResponse> {
    const url = `${this.baseUrl}/v3/x402/payment_instructions/${paymentInstructionId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get payment instruction: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<PaymentInstructionResponse>;
  }

  /**
   * Map a CID to a payment instruction
   */
  async mapCid(paymentInstructionId: string, cid: string): Promise<void> {
    const url = `${this.baseUrl}/v3/x402/payment_instructions/${paymentInstructionId}/cids/${cid}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to map CID to payment instruction: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
  }

  /**
   * Unmap a CID from a payment instruction
   */
  async unmapCid(paymentInstructionId: string, cid: string): Promise<void> {
    const url = `${this.baseUrl}/v3/x402/payment_instructions/${paymentInstructionId}/cids/${cid}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to unmap CID from payment instruction: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
  }

  /**
   * Delete a payment instruction (soft delete)
   */
  async delete(paymentInstructionId: string): Promise<void> {
    const url = `${this.baseUrl}/v3/x402/payment_instructions/${paymentInstructionId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete payment instruction: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
  }
}

/**
 * Create a payment instruction for a feed entry
 *
 * @param client - PaymentInstructionsClient instance
 * @param entryTitle - Title of the feed entry
 * @param ownerWalletAddress - Wallet address of the content owner
 * @param cid - Content identifier
 * @param price - Price configuration
 * @returns Payment instruction ID (piid) and full payment instruction object
 */
export async function createEntryPaymentInstruction(
  client: PaymentInstructionsClient,
  entryTitle: string,
  ownerWalletAddress: string,
  cid: string,
  price: {
    amount: string;
    currency: string;
    network: 'base' | 'base-sepolia' | 'ethereum' | 'ethereum-sepolia' | 'polygon' | 'polygon-amoy';
  }
): Promise<{ piid: string, price: string }> {
  // Get token contract address
  const asset = getTokenAddress(price.currency, price.network);

  // Format amount for display (used in description only)
  const displayAmount = formatAmount(price.amount, price.currency);
  // Create payment instruction
  const paymentInstruction = await client.create({
    name: `Payment for ${entryTitle}`,
    description: `Access to feed entry: ${entryTitle}`,
    payment_requirements: [
      {
        pay_to: ownerWalletAddress,
        network: price.network,
        asset,
        max_amount_required: price.amount,
        description: `${displayAmount} ${price.currency} on ${price.network}`
      }
    ]
  });


  if (!paymentInstruction || !paymentInstruction.data || !paymentInstruction.data.id) {
    throw new Error(`Failed to create payment instruction - missing ID in response: ${JSON.stringify(paymentInstruction)}`);
  }

  // Map CID to payment instruction
  await client.mapCid(paymentInstruction.data.id, cid);

  // Return smallest unit (wei/microUSDC) for consistent storage
  return {
    piid: paymentInstruction.data.id,
    price: price.amount
  };
}

/**
 * Format amount for human-readable display
 * Converts smallest unit (e.g., cents) to decimal format
 */
function formatAmount(amount: string, currency: string): string {
  const decimals = currency === 'USDC' ? 6 : 18; // USDC has 6 decimals, most tokens have 18
  const amountNum = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = amountNum / divisor;
  const remainder = amountNum % divisor;

  if (remainder === 0n) {
    return whole.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmed = remainderStr.replace(/0+$/, '');
  return `${whole}.${trimmed}`;
}
