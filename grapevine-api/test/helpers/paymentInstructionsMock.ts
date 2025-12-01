import { vi } from 'vitest';
import { uuidv7 } from 'uuidv7';
import type {
  PaymentInstructionsClient,
  PaymentInstruction,
  CreatePaymentInstructionInput
} from '../../src/services/paymentInstructions';
import { pool } from '../../src/services/db.js';

/**
 * Mock PaymentInstructionsClient for testing
 * This mock actually inserts payment instructions into the test database
 * to maintain referential integrity with gv_feed_entries.piid foreign key
 */
export const createMockPaymentInstructionsClient = () => {
  const mockCreate = vi.fn<[CreatePaymentInstructionInput], Promise<PaymentInstruction>>(
    async (input: CreatePaymentInstructionInput): Promise<PaymentInstruction> => {
      const id = uuidv7();
      const now = Math.floor(Date.now() / 1000);

      // Insert into test database to maintain foreign key integrity
      await pool.query(
        `INSERT INTO payment_instructions (id, user_id, payment_requirements, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, '00000000-0000-0000-0000-000000000000', input.payment_requirements, 1, now, now]
      );

      return {
        id,
        name: input.name,
        description: input.description,
        user_id: '00000000-0000-0000-0000-000000000000',
        payment_requirements: input.payment_requirements,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  );

  const mockGet = vi.fn<[string], Promise<PaymentInstruction>>(
    async (id: string): Promise<PaymentInstruction> => ({
      id,
      name: 'Mock Payment Instruction',
      user_id: '00000000-0000-0000-0000-000000000000',
      payment_requirements: [],
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  );

  const mockMapCid = vi.fn<[string, string], Promise<void>>(async () => undefined);
  const mockUnmapCid = vi.fn<[string, string], Promise<void>>(async () => undefined);
  const mockDelete = vi.fn<[string], Promise<void>>(async () => undefined);

  return {
    create: mockCreate,
    get: mockGet,
    mapCid: mockMapCid,
    unmapCid: mockUnmapCid,
    delete: mockDelete
  } as unknown as PaymentInstructionsClient;
};

/**
 * Mock implementation that can be used in place of the real client
 */
export const mockPaymentInstructionsClient = createMockPaymentInstructionsClient();

/**
 * Reset all mocks - call this in beforeEach
 */
export const resetPaymentInstructionsMocks = () => {
  const client = mockPaymentInstructionsClient as any;
  client.create.mockClear();
  client.get.mockClear();
  client.mapCid.mockClear();
  client.unmapCid.mockClear();
  client.delete.mockClear();
};

/**
 * Create a mock payment instruction response
 */
export const createMockPaymentInstruction = (
  overrides?: Partial<PaymentInstruction>
): PaymentInstruction => ({
  id: 'mock-piid-uuid',
  name: 'Mock Payment',
  description: 'Mock payment instruction for testing',
  user_id: 'mock-user-id',
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
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});
