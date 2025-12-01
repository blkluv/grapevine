import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PaymentInstructionsClient,
  getTokenAddress,
  createEntryPaymentInstruction,
  TOKEN_ADDRESSES,
  type CreatePaymentInstructionInput,
  type PaymentInstruction,
  type PaymentInstructionResponse
} from '../../src/services/paymentInstructions';
import { config } from '../../src/services/config.js';

describe('getTokenAddress', () => {
  it('should return USDC address on Base mainnet', () => {
    const address = getTokenAddress('USDC', 'base');
    expect(address).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  });

  it('should return USDC address on Base Sepolia', () => {
    const address = getTokenAddress('USDC', 'base-sepolia');
    expect(address).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  });

  it('should throw error for unknown currency', () => {
    expect(() => getTokenAddress('UNKNOWN', 'base')).toThrow('Unknown token UNKNOWN on network base');
  });

  it('should throw error for unknown network', () => {
    expect(() => getTokenAddress('USDC', 'unknown-network')).toThrow('Unknown token USDC on network unknown-network');
  });

  it('should handle case-sensitive currency names', () => {
    expect(() => getTokenAddress('usdc', 'base')).toThrow('Unknown token usdc on network base');
  });
});

describe('PaymentInstructionsClient', () => {
  let client: PaymentInstructionsClient;
  const mockBaseUrl = 'https://test-api.pinata.cloud';
  const mockToken = 'test-jwt-token';

  beforeEach(() => {
    client = new PaymentInstructionsClient(mockBaseUrl, mockToken);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if no auth token provided', () => {
      // Mock config to return undefined for jwtToken
      const originalJwtToken = config.pinata.jwtToken;
      // @ts-ignore - overriding readonly property for test
      config.pinata.jwtToken = undefined;

      expect(() => new PaymentInstructionsClient(mockBaseUrl, '')).toThrow(
        'PINATA_JWT_TOKEN environment variable is required'
      );

      // Restore config
      // @ts-ignore - overriding readonly property for test
      config.pinata.jwtToken = originalJwtToken;
    });

    it('should use config values if not provided', () => {
      const originalApiUrl = config.pinata.backendApiUrl;
      const originalToken = config.pinata.jwtToken;

      // @ts-ignore - overriding readonly property for test
      config.pinata.backendApiUrl = 'https://env-api.pinata.cloud';
      // @ts-ignore - overriding readonly property for test
      config.pinata.jwtToken = 'env-token';

      const envClient = new PaymentInstructionsClient();
      expect(envClient).toBeDefined();

      // Restore config
      // @ts-ignore - overriding readonly property for test
      config.pinata.backendApiUrl = originalApiUrl;
      // @ts-ignore - overriding readonly property for test
      config.pinata.jwtToken = originalToken;
    });

  });

  describe('create', () => {
    it('should create a payment instruction successfully', async () => {
      const mockResponse: PaymentInstructionResponse = {
        data: {
          id: 'test-uuid',
          name: 'Test Payment',
          description: 'Test Description',
          user_id: 'user-uuid',
          payment_requirements: [
            {
              pay_to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
              network: 'base',
              asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
              max_amount_required: '1000000',
              description: '1 USDC'
            }
          ],
          version: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      });

      const input: CreatePaymentInstructionInput = {
        name: 'Test Payment',
        description: 'Test Description',
        payment_requirements: [
          {
            pay_to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            network: 'base',
            asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            max_amount_required: '1000000'
          }
        ]
      };

      const result = await client.create(input);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v3/x402/payment_instructions`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        })
      );
    });

    it('should create payment instruction with empty requirements (free access)', async () => {
      const mockResponse: PaymentInstructionResponse = {
        data: {
          id: 'test-uuid',
          name: 'Free Access',
          user_id: 'user-uuid',
          payment_requirements: [],
          version: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const input: CreatePaymentInstructionInput = {
        name: 'Free Access',
        payment_requirements: []
      };

      const result = await client.create(input);

      expect(result.data.payment_requirements).toEqual([]);
    });

    it('should throw error on failed request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid payment requirements'
      });

      const input: CreatePaymentInstructionInput = {
        name: 'Test',
        payment_requirements: []
      };

      await expect(client.create(input)).rejects.toThrow(
        'Failed to create payment instruction: 400 Bad Request - Invalid payment requirements'
      );
    });

    it('should handle 401 unauthorized error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid token'
      });

      const input: CreatePaymentInstructionInput = {
        name: 'Test',
        payment_requirements: []
      };

      await expect(client.create(input)).rejects.toThrow(
        'Failed to create payment instruction: 401 Unauthorized - Invalid token'
      );
    });

    it('should handle 409 conflict error (duplicate)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => 'Payment instruction already exists'
      });

      const input: CreatePaymentInstructionInput = {
        name: 'Test',
        payment_requirements: []
      };

      await expect(client.create(input)).rejects.toThrow(
        'Failed to create payment instruction: 409 Conflict - Payment instruction already exists'
      );
    });
  });

  describe('get', () => {
    it('should get a payment instruction by ID', async () => {
      const mockResponse: PaymentInstructionResponse = {
        data: {
          id: 'test-uuid',
          name: 'Test Payment',
          user_id: 'user-uuid',
          payment_requirements: [],
          version: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.get('test-uuid');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v3/x402/payment_instructions/test-uuid`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockToken}`
          }
        })
      );
    });

    it('should throw error for non-existent payment instruction', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Payment instruction not found'
      });

      await expect(client.get('non-existent')).rejects.toThrow(
        'Failed to get payment instruction: 404 Not Found - Payment instruction not found'
      );
    });
  });

  describe('mapCid', () => {
    it('should map CID to payment instruction', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      });

      await client.mapCid('test-uuid', 'QmTest123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v3/x402/payment_instructions/test-uuid/cids/QmTest123`,
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${mockToken}`
          }
        })
      );
    });

    it('should throw error on failed CID mapping', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Payment instruction not found'
      });

      await expect(client.mapCid('invalid-uuid', 'QmTest')).rejects.toThrow(
        'Failed to map CID to payment instruction: 404 Not Found - Payment instruction not found'
      );
    });
  });

  describe('unmapCid', () => {
    it('should unmap CID from payment instruction', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      });

      await client.unmapCid('test-uuid', 'QmTest123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v3/x402/payment_instructions/test-uuid/cids/QmTest123`,
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mockToken}`
          }
        })
      );
    });

    it('should throw error on failed CID unmapping', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'CID mapping not found'
      });

      await expect(client.unmapCid('test-uuid', 'QmTest')).rejects.toThrow(
        'Failed to unmap CID from payment instruction: 404 Not Found - CID mapping not found'
      );
    });
  });

  describe('delete', () => {
    it('should delete a payment instruction', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      });

      await client.delete('test-uuid');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v3/x402/payment_instructions/test-uuid`,
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mockToken}`
          }
        })
      );
    });

    it('should throw error when deleting payment instruction with active CIDs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => 'Cannot delete payment instruction with active CID mappings'
      });

      await expect(client.delete('test-uuid')).rejects.toThrow(
        'Failed to delete payment instruction: 409 Conflict - Cannot delete payment instruction with active CID mappings'
      );
    });
  });
});

describe('createEntryPaymentInstruction', () => {
  let mockClient: PaymentInstructionsClient;

  beforeEach(() => {
    mockClient = new PaymentInstructionsClient('https://test.api', 'test-token');
    vi.clearAllMocks();
  });

  it('should create payment instruction and map CID for USDC on Base', async () => {
    const mockPaymentInstruction: PaymentInstruction = {
      id: 'piid-uuid',
      name: 'Payment for Test Entry',
      description: 'Access to feed entry: Test Entry',
      user_id: 'user-uuid',
      payment_requirements: [
        {
          pay_to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          network: 'base',
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          max_amount_required: '1000000',
          description: '1 USDC on base'
        }
      ],
      version: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const createSpy = vi.spyOn(mockClient, 'create').mockResolvedValue({ data: mockPaymentInstruction });
    const mapCidSpy = vi.spyOn(mockClient, 'mapCid').mockResolvedValue(undefined);

    const result = await createEntryPaymentInstruction(
      mockClient,
      'Test Entry',
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      'QmTest123',
      {
        amount: '1000000',
        currency: 'USDC',
        network: 'base'
      }
    );

    expect(result.piid).toBe('piid-uuid');
    expect(result.price).toBe('1000000'); // Returns smallest unit, not display amount

    expect(createSpy).toHaveBeenCalledWith({
      name: 'Payment for Test Entry',
      description: 'Access to feed entry: Test Entry',
      payment_requirements: [
        {
          pay_to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          network: 'base',
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          max_amount_required: '1000000',
          description: '1 USDC on base'
        }
      ]
    });

    expect(mapCidSpy).toHaveBeenCalledWith('piid-uuid', 'QmTest123');
  });

  it('should create payment instruction for Base Sepolia testnet', async () => {
    const mockPaymentInstruction: PaymentInstruction = {
      id: 'piid-uuid',
      name: 'Payment for Test Entry',
      user_id: 'user-uuid',
      payment_requirements: [
        {
          pay_to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          network: 'base-sepolia',
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          max_amount_required: '500000'
        }
      ],
      version: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const createSpy = vi.spyOn(mockClient, 'create').mockResolvedValue({ data: mockPaymentInstruction });
    const mapCidSpy = vi.spyOn(mockClient, 'mapCid').mockResolvedValue(undefined);

    const result = await createEntryPaymentInstruction(
      mockClient,
      'Test Entry',
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      'QmTest123',
      {
        amount: '500000',
        currency: 'USDC',
        network: 'base-sepolia'
      }
    );

    expect(result.piid).toBe('piid-uuid');
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_requirements: [
          expect.objectContaining({
            network: 'base-sepolia',
            asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
          })
        ]
      })
    );
  });

  it('should format amount correctly for display', async () => {
    const mockPaymentInstruction: PaymentInstruction = {
      id: 'piid-uuid',
      name: 'Payment for Test',
      user_id: 'user-uuid',
      payment_requirements: [
        {
          pay_to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          network: 'base',
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          max_amount_required: '1500000',
          description: '1.5 USDC on base'
        }
      ],
      version: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const createSpy = vi.spyOn(mockClient, 'create').mockResolvedValue({ data: mockPaymentInstruction });
    vi.spyOn(mockClient, 'mapCid').mockResolvedValue(undefined);

    await createEntryPaymentInstruction(
      mockClient,
      'Test',
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      'QmTest',
      {
        amount: '1500000',
        currency: 'USDC',
        network: 'base'
      }
    );

    const callArgs = createSpy.mock.calls[0][0];
    expect(callArgs.payment_requirements[0].description).toBe('1.5 USDC on base');
  });

  it('should throw error if token not supported', async () => {
    await expect(
      createEntryPaymentInstruction(
        mockClient,
        'Test Entry',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        'QmTest123',
        {
          amount: '1000000',
          currency: 'UNKNOWN_TOKEN',
          network: 'base'
        }
      )
    ).rejects.toThrow('Unknown token UNKNOWN_TOKEN on network base');
  });

  it('should propagate create error', async () => {
    vi.spyOn(mockClient, 'create').mockRejectedValue(
      new Error('Failed to create payment instruction: 401 Unauthorized')
    );

    await expect(
      createEntryPaymentInstruction(
        mockClient,
        'Test Entry',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        'QmTest123',
        {
          amount: '1000000',
          currency: 'USDC',
          network: 'base'
        }
      )
    ).rejects.toThrow('Failed to create payment instruction: 401 Unauthorized');
  });

  it('should propagate mapCid error', async () => {
    const mockPaymentInstruction: PaymentInstruction = {
      id: 'piid-uuid',
      name: 'Test',
      user_id: 'user-uuid',
      payment_requirements: [],
      version: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    vi.spyOn(mockClient, 'create').mockResolvedValue({ data: mockPaymentInstruction });
    vi.spyOn(mockClient, 'mapCid').mockRejectedValue(
      new Error('Failed to map CID: CID already mapped')
    );

    await expect(
      createEntryPaymentInstruction(
        mockClient,
        'Test Entry',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        'QmTest123',
        {
          amount: '1000000',
          currency: 'USDC',
          network: 'base'
        }
      )
    ).rejects.toThrow('Failed to map CID: CID already mapped');
  });
});
