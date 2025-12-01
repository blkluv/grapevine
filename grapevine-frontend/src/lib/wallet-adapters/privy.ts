import { getAddress } from 'viem'
import type { ConnectedWallet } from '@privy-io/react-auth'

/**
 * Creates a viem-compatible account adapter for Privy wallets.
 *
 * This adapter bridges Privy's wallet API to viem's Account interface,
 * which is required by x402-fetch for payment signing.
 *
 * IMPORTANT IMPLEMENTATION NOTES:
 *
 * 1. Wallet Type Detection:
 *    Privy supports multiple wallet types:
 *    - External wallets (MetaMask, Coinbase Wallet, Rainbow, etc.) via EIP-1193 provider
 *    - Embedded wallets (created by Privy)
 *    - WalletConnect wallets
 *
 * 2. EIP-712 Parameter Handling:
 *    - For external wallets with EIP-1193 providers (MetaMask-like), we must add EIP712Domain
 *    - For Privy embedded wallets, the SDK handles EIP-712 correctly
 *
 * 3. Provider Access:
 *    - External wallets: Access via wallet.getEthereumProvider()
 *    - Embedded wallets: Access via wallet.sign* methods directly
 *
 * 4. Address Format:
 *    Privy returns checksum addresses, but we normalize with getAddress() to be safe.
 *
 * @param {ConnectedWallet} wallet - The connected Privy wallet
 * @returns {Object} A viem-compatible Account object
 *
 * @example
 * ```typescript
 * import { usePrivy, useWallets } from '@privy-io/react-auth'
 * import { createPrivyAccount } from './lib/wallet-adapters/privy'
 *
 * const { wallets } = useWallets()
 * const wallet = wallets[0] // Get first connected wallet
 *
 * const account = createPrivyAccount(wallet)
 * const fetchWithPayment = wrapFetchWithPayment(fetch, account)
 * ```
 */
export function createPrivyAccount(wallet: ConnectedWallet) {
  // Convert to checksum format (mixed case) as required by viem
  const checksumAddress = getAddress(wallet.address)

  // Detect wallet type for logging
  const walletType = wallet.walletClientType || 'unknown'
  const isEmbedded = walletType === 'privy'

  console.log('🔍 [Privy Adapter] Creating account:', {
    address: checksumAddress,
    walletType,
    isEmbedded,
    connectorType: wallet.connectorType,
  })

  return {
    // Core viem Account properties
    address: checksumAddress,
    type: 'local' as const, // Required: 'local' type passes x402-fetch validation
    source: 'privy',

    // publicKey - Required by viem Account interface
    // Not used for signing, just satisfies the interface
    publicKey: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,

    /**
     * Raw hash signing - NOT used for x402 USDC payments
     * x402 uses EIP-712 signTypedData instead
     */
    sign: async (_params: { hash: `0x${string}` }) => {
      console.warn('⚠️ [Privy Adapter] sign() called - this should not happen for x402 payments')
      throw new Error('Raw signing not supported for x402 - use signTypedData for USDC payments')
    },

    /**
     * EIP-7702 authorization signing - NOT used for x402 USDC payments
     * x402 uses EIP-712 signTypedData instead
     */
    signAuthorization: async (_authorization: any) => {
      console.warn('⚠️ [Privy Adapter] signAuthorization() called - this should not happen for x402 payments')
      throw new Error('Authorization signing not supported for x402 - use signTypedData for USDC payments')
    },

    /**
     * Personal message signing - Available but not used for x402
     */
    signMessage: async ({ message }: { message: string }) => {
      console.log('📝 [Privy Adapter] signMessage() called')

      // Use Privy's unified sign method
      const signature = await wallet.sign(message)
      return signature as `0x${string}`
    },

    /**
     * Full transaction signing - Available but not used for x402
     * x402 uses off-chain EIP-712 signatures instead of on-chain transactions
     */
    signTransaction: async (_transaction: any) => {
      console.log('📝 [Privy Adapter] signTransaction() called')
      throw new Error('Transaction signing not implemented - x402 uses off-chain signatures')
    },

    /**
     * EIP-712 typed data signing - THIS IS USED FOR X402 PAYMENTS
     *
     * x402-fetch calls this method to create USDC payment authorizations.
     * The signature format follows EIP-712 (TransferWithAuthorization).
     *
     * CRITICAL: Different signing paths for different wallet types:
     * - External wallets (MetaMask-like): Must add EIP712Domain to types
     * - Embedded wallets: Use Privy SDK which handles EIP-712 correctly
     *
     * @param {Object} params - May include extra params from viem/x402-fetch
     * @param {Object} params.domain - EIP-712 domain (USDC contract info)
     * @param {Object} params.types - EIP-712 type definitions
     * @param {string} params.primaryType - Main type being signed
     * @param {Object} params.message - The actual data being signed
     * @returns {Promise<string>} The signature (0x-prefixed hex string)
     */
    signTypedData: async (params: any) => {
      console.log('🔑 [Privy Adapter] signTypedData called')
      console.log('📋 [Privy Adapter] Full params received:', JSON.stringify(params, null, 2))

      // Extract only EIP-712 fields
      const { domain, types, primaryType, message } = params

      if (!domain || !types || !primaryType || !message) {
        console.error('❌ [Privy Adapter] Missing required EIP-712 fields:', {
          hasDomain: !!domain,
          hasTypes: !!types,
          hasPrimaryType: !!primaryType,
          hasMessage: !!message,
        })
        throw new Error('Invalid EIP-712 parameters: missing required fields')
      }

      try {
        // First, try to use Privy's universal signTypedData if available
        // This works for both embedded and many external wallets
        if (typeof (wallet as any).signTypedData === 'function') {
          console.log('📤 [Privy Adapter] Using Privy wallet.signTypedData() method')

          const typedData = {
            domain,
            types,
            primaryType,
            message,
          }

          console.log('📤 [Privy Adapter] Sending to Privy SDK:', JSON.stringify(typedData, null, 2))

          const signature = await (wallet as any).signTypedData(typedData)

          console.log('✅ [Privy Adapter] Privy wallet signature created:', signature)
          return signature as `0x${string}`
        }

        // Fallback: Check if this is an external wallet with EIP-1193 provider
        console.log('🔍 [Privy Adapter] Attempting to get Ethereum provider...')
        const provider = await wallet.getEthereumProvider()
        console.log('🔍 [Privy Adapter] Provider result:', {
          hasProvider: !!provider,
          isEmbedded,
          willUseExternal: !!(provider && !isEmbedded)
        })

        if (provider && !isEmbedded) {
          // External wallet (MetaMask, Coinbase Wallet, Rainbow, etc.)
          // These require EIP712Domain to be explicitly in types
          console.log('📤 [Privy Adapter] Using external wallet provider (MetaMask-like)')

          // Check if we need to switch chains
          const requiredChainId = domain.chainId
          console.log('🔍 [Privy Adapter] Required chainId:', requiredChainId)
          console.log('🔍 [Privy Adapter] Current wallet chainId:', wallet.chainId)

          // Switch chain if needed
          if (wallet.chainId && wallet.chainId !== `eip155:${requiredChainId}` && wallet.chainId !== requiredChainId) {
            console.log(`🔄 [Privy Adapter] Switching to chainId ${requiredChainId}...`)
            try {
              await wallet.switchChain(requiredChainId)
              console.log('✅ [Privy Adapter] Chain switched successfully')
            } catch (switchError) {
              console.error('❌ [Privy Adapter] Failed to switch chain:', switchError)
              throw new Error(`Please switch to chainId ${requiredChainId} in your wallet`)
            }
          }

          const typedDataWithDomain = {
            domain,
            types: {
              EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
              ],
              ...types,
            },
            primaryType,
            message,
          }

          console.log('📤 [Privy Adapter] Sending to external wallet:', JSON.stringify(typedDataWithDomain, null, 2))

          const signature = await provider.request({
            method: 'eth_signTypedData_v4',
            params: [checksumAddress, JSON.stringify(typedDataWithDomain)],
          })

          console.log('✅ [Privy Adapter] External wallet signature created:', signature)
          return signature as `0x${string}`
        } else {
          // Embedded Privy wallet or wallet without direct provider access
          // Use Privy's signTypedData which handles EIP-712 correctly
          console.log('📤 [Privy Adapter] Using Privy embedded wallet or wallet without provider')

          const typedData = {
            domain,
            types,
            primaryType,
            message,
          }

          console.log('📤 [Privy Adapter] Sending to Privy SDK:', JSON.stringify(typedData, null, 2))

          // Check if wallet has signTypedData method
          if (typeof (wallet as any).signTypedData !== 'function') {
            console.error('❌ [Privy Adapter] Wallet does not have signTypedData method')
            console.error('🔍 [Privy Adapter] Available methods:', Object.keys(wallet))
            throw new Error('Wallet does not support EIP-712 signing. Please try reconnecting your wallet.')
          }

          // Type assertion: signTypedData exists on embedded Privy wallets
          const signature = await (wallet as any).signTypedData(typedData)

          console.log('✅ [Privy Adapter] Privy wallet signature created:', signature)
          return signature as `0x${string}`
        }
      } catch (error) {
        console.error('❌ [Privy Adapter] Signing failed:', error)
        throw error
      }
    },
  }
}
