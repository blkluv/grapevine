import { getAddress } from 'viem'
import type { WalletClient } from 'viem'

/**
 * Creates a viem-compatible account adapter for Farcaster wallets.
 *
 * This adapter bridges wagmi's WalletClient to viem's Account interface,
 * which is required by x402-fetch for payment signing.
 *
 * @param {WalletClient} walletClient - The wagmi wallet client from useWalletClient()
 * @returns {Object} A viem-compatible Account object
 */
export function createFarcasterAccount(walletClient: WalletClient) {
  if (!walletClient.account) {
    throw new Error('Wallet client has no account')
  }

  // Convert to checksum format (mixed case) as required by viem
  const checksumAddress = getAddress(walletClient.account.address)

  console.log('🔍 [Farcaster Adapter] Creating account:', {
    address: checksumAddress,
    chainId: walletClient.chain?.id,
  })

  return {
    // Core viem Account properties
    address: checksumAddress,
    type: 'local' as const, // Required: 'local' type passes x402-fetch validation
    source: 'farcaster',

    // publicKey - Required by viem Account interface
    publicKey: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,

    /**
     * Raw hash signing - NOT used for x402 USDC payments
     */
    sign: async (_params: { hash: `0x${string}` }) => {
      console.warn('⚠️ [Farcaster Adapter] sign() called - this should not happen for x402 payments')
      throw new Error('Raw signing not supported for x402 - use signTypedData for USDC payments')
    },

    /**
     * EIP-7702 authorization signing - NOT used for x402 USDC payments
     */
    signAuthorization: async (_authorization: any) => {
      console.warn('⚠️ [Farcaster Adapter] signAuthorization() called - this should not happen for x402 payments')
      throw new Error('Authorization signing not supported for x402 - use signTypedData for USDC payments')
    },

    /**
     * Personal message signing
     */
    signMessage: async ({ message }: { message: string }) => {
      console.log('📝 [Farcaster Adapter] signMessage() called')
      const signature = await walletClient.signMessage({
        account: walletClient.account!,
        message,
      })
      return signature
    },

    /**
     * Full transaction signing
     */
    signTransaction: async (_transaction: any) => {
      console.log('📝 [Farcaster Adapter] signTransaction() called')
      throw new Error('Transaction signing not implemented - x402 uses off-chain signatures')
    },

    /**
     * EIP-712 typed data signing - THIS IS USED FOR X402 PAYMENTS
     */
    signTypedData: async (params: any) => {
      console.log('🔑 [Farcaster Adapter] signTypedData called')
      console.log('📋 [Farcaster Adapter] Full params received:', JSON.stringify(params, null, 2))

      const { domain, types, primaryType, message } = params

      if (!domain || !types || !primaryType || !message) {
        console.error('❌ [Farcaster Adapter] Missing required EIP-712 fields:', {
          hasDomain: !!domain,
          hasTypes: !!types,
          hasPrimaryType: !!primaryType,
          hasMessage: !!message,
        })
        throw new Error('Invalid EIP-712 parameters: missing required fields')
      }

      try {
        console.log('📤 [Farcaster Adapter] Using walletClient.signTypedData()')

        const signature = await walletClient.signTypedData({
          account: walletClient.account!,
          domain,
          types,
          primaryType,
          message,
        })

        console.log('✅ [Farcaster Adapter] Signature created:', signature)
        return signature
      } catch (error) {
        console.error('❌ [Farcaster Adapter] Signing failed:', error)
        throw error
      }
    },
  }
}
