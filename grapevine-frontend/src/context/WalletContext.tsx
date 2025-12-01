import { createContext, useContext, type ReactNode, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSignMessage, useAccount, useConnectors } from 'wagmi';
import sdk from '@farcaster/miniapp-sdk';
import type { SignaturePayload } from '@/services/auth';
import { grapevineApiClient } from '@/services/grapevineApi';

export interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;

  // Signature
  signRequest: (method: string, endpoint: string) => Promise<SignaturePayload>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { signMessageAsync } = useSignMessage();
  const wagmiAccount = useAccount();
  const wagmiConnectors = useConnectors();

  // Determine address with priority:
  // 1. If wagmi is connected → Use wagmi's address (latest connected wallet)
  // 2. Otherwise → Use Privy's active wallet (wallets[0])
  // 3. Fallback → linkedAccounts if wallets is empty (Farcaster mini app)
  let address: string | null = null;
  let addressSource: string = 'none';

  if (wagmiAccount.isConnected && wagmiAccount.address) {
    // Priority 1: Use wagmi's connected wallet
    address = wagmiAccount.address;
    addressSource = 'wagmi';
  } else if (wallets.length > 0) {
    // Priority 2: Use Privy's active wallet (wallets[0])
    address = wallets[0].address;
    addressSource = 'privy-active-wallet';
  } else if (authenticated && user?.linkedAccounts) {
    // Priority 3: Fallback to linkedAccounts (Farcaster mini app)
    const walletAccount = user.linkedAccounts.find(
      (account) => account.type === 'wallet' && 'address' in account
    );
    if (walletAccount && 'address' in walletAccount) {
      address = walletAccount.address as string;
      addressSource = 'privy-linked-accounts';
    }
  }

  // Get active wallet for signing (may be different from address if wagmi is connected)
  const activeWallet = wallets[0];

  // Determine if connected
  // In mini app: authenticated + has address from linkedAccounts
  // On desktop: authenticated + has address + wagmi connected
  const isConnected = ready && authenticated && !!address;

  // Log wallet state for debugging
  useEffect(() => {
    console.log('[WalletContext] 🔍 ===== WALLET STATE UPDATE =====');
    console.log('[WalletContext] - ready:', ready);
    console.log('[WalletContext] - authenticated:', authenticated);
    console.log('[WalletContext] - user:', user);

    console.log('[WalletContext] 📋 PRIVY WALLETS (useWallets):');
    console.log('[WalletContext] - Total Privy wallets:', wallets.length);
    wallets.forEach((wallet, index) => {
      console.log(`[WalletContext] - Privy wallet ${index}:`, {
        address: wallet.address,
        walletClientType: wallet.walletClientType,
        connectorType: wallet.connectorType,
        imported: wallet.imported,
        isActive: index === 0,
      });
    });
    console.log('[WalletContext] - activeWallet (wallets[0]):', activeWallet);

    console.log('[WalletContext] 🔌 WAGMI STATE (useAccount):');
    console.log('[WalletContext] - wagmiAccount.isConnected:', wagmiAccount.isConnected);
    console.log('[WalletContext] - wagmiAccount.address:', wagmiAccount.address);
    console.log('[WalletContext] - wagmiAccount.connector:', wagmiAccount.connector);
    console.log('[WalletContext] - wagmiAccount.status:', wagmiAccount.status);
    console.log('[WalletContext] - wagmiAccount.chain:', wagmiAccount.chain);
    if (wagmiAccount.connector) {
      console.log('[WalletContext] - wagmiAccount.connector details:', {
        id: wagmiAccount.connector.id,
        name: wagmiAccount.connector.name,
        type: wagmiAccount.connector.type,
      });
    }

    console.log('[WalletContext] 🔌 WAGMI CONNECTORS (useConnectors):');
    console.log('[WalletContext] - Total connectors:', wagmiConnectors.length);
    wagmiConnectors.forEach((connector, index) => {
      console.log(`[WalletContext] - Connector ${index}:`, {
        id: connector.id,
        name: connector.name,
        type: connector.type,
        uid: connector.uid,
      });
    });

    console.log('[WalletContext] 🎯 FINAL SELECTION:');
    console.log('[WalletContext] - SELECTED ADDRESS:', address);
    console.log('[WalletContext] - ADDRESS SOURCE:', addressSource);
    console.log('[WalletContext] - isConnected:', isConnected);

    // Log linked accounts from Privy user
    if (user?.linkedAccounts) {
      console.log('[WalletContext] 📎 PRIVY LINKED ACCOUNTS:');
      user.linkedAccounts.forEach((account, index) => {
        console.log(`[WalletContext] - Linked account ${index}:`, {
          type: account.type,
          address: 'address' in account ? account.address : 'N/A',
        });
      });
    }

    // Show comparison if wagmi and privy have different addresses
    if (wagmiAccount.address && wallets.length > 0 && wagmiAccount.address.toLowerCase() !== wallets[0].address.toLowerCase()) {
      console.log('[WalletContext] ⚠️ ADDRESS MISMATCH DETECTED:');
      console.log('[WalletContext] - Wagmi address:', wagmiAccount.address);
      console.log('[WalletContext] - Privy wallets[0] address:', wallets[0].address);
      console.log('[WalletContext] - Using wagmi address as priority');
    } else if (wagmiAccount.address && wallets.length > 0) {
      console.log('[WalletContext] ✅ Wagmi and Privy addresses match');
    }

    console.log('[WalletContext] ===== END WALLET STATE =====');
  }, [ready, authenticated, user, wallets, activeWallet, address, addressSource, wagmiAccount, wagmiConnectors, isConnected]);

  // Detect when wallet gets disconnected externally
  useEffect(() => {
    if (authenticated && address && !wagmiAccount.isConnected) {
      console.warn('Wallet provider disconnected externally. User may need to reconnect.');
    }
  }, [authenticated, address, wagmiAccount.isConnected]);

  // Sign a request for authentication using Grapevine API's nonce-based flow
  const signRequest = async (
    _method: string,
    _endpoint: string
  ): Promise<SignaturePayload> => {
    console.log('[WalletContext] 📝 signRequest called');
    console.log('[WalletContext] - isConnected:', isConnected);
    console.log('[WalletContext] - address:', address);
    console.log('[WalletContext] - activeWallet:', activeWallet);

    if (!isConnected || !address) {
      console.error('[WalletContext] ❌ Wallet not connected');
      throw new Error('Wallet not connected');
    }

    // Get nonce from API
    console.log('[WalletContext] Step 1: Getting nonce from API for address:', address);
    const nonceResponse = await grapevineApiClient.getNonce(address);
    console.log('[WalletContext] ✅ Got nonce response:', nonceResponse);

    // Branch: Use Farcaster SDK if no activeWallet (mini app context)
    if (!activeWallet) {
      console.log('[WalletContext] 🚀 Using Farcaster SDK for signing (mini app mode)');
      try {
        // Get Ethereum provider from Farcaster SDK
        const provider = await sdk.wallet.getEthereumProvider();
        if (!provider) {
          throw new Error('Farcaster wallet provider not available');
        }
        console.log('[WalletContext] ✅ Got Farcaster provider:', provider);

        // Request personal_sign from Farcaster wallet
        const signature = await provider.request({
          method: 'personal_sign',
          params: [nonceResponse.message as `0x${string}`, address as `0x${string}`],
        });

        console.log('[WalletContext] ✅ Got signature from Farcaster:', signature);

        const payload = {
          address,
          message: nonceResponse.message,
          signature: signature as string,
        };
        console.log('[WalletContext] ✅ Signature payload ready:', payload);
        return payload;
      } catch (error) {
        console.error('[WalletContext] ❌ Farcaster signing failed:', error);
        throw new Error('Failed to sign with Farcaster wallet');
      }
    }

    // Branch: Use Wagmi for desktop wallets
    console.log('[WalletContext] 🖥️ Using Wagmi for signing (desktop mode)');

    // Check if wallet provider is actually connected
    console.log('[WalletContext] Step 2: Checking wallet provider accessibility...');
    try {
      const walletClient = await activeWallet.getEthereumProvider();
      if (!walletClient) {
        console.error('[WalletContext] ❌ Wallet provider not accessible');
        throw new Error('Wallet provider not accessible. Please reconnect your wallet.');
      }
      console.log('[WalletContext] ✅ Wallet provider accessible:', walletClient);
    } catch (error) {
      console.error('[WalletContext] ❌ Wallet provider check failed:', error);
      throw new Error('Wallet provider disconnected. Please reconnect your wallet and try again.');
    }

    // Sign the message using Wagmi's signMessage
    console.log('[WalletContext] Step 3: Requesting signature from wallet...');
    console.log('[WalletContext] - Message to sign:', nonceResponse.message);
    try {
      const signaturePromise = signMessageAsync({
        message: nonceResponse.message,
      });

      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Signature request timed out. Please check your wallet and try again.'));
        }, 30000);
      });

      // Race between signature and timeout
      const signature = await Promise.race([signaturePromise, timeoutPromise]);
      console.log('[WalletContext] ✅ Got signature:', signature);

      const payload = {
        address,
        message: nonceResponse.message,
        signature,
      };
      console.log('[WalletContext] ✅ Signature payload ready:', payload);
      return payload;
    } catch (error) {
      console.error('[WalletContext] ❌ Signature request failed:', error);

      // Check if it's a user rejection
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('denied')) {
          console.error('[WalletContext] ❌ User rejected signature request');
          throw new Error('Signature request was rejected');
        }
        if (error.message.includes('timeout')) {
          console.error('[WalletContext] ❌ Signature request timed out');
          throw error; // Re-throw timeout error as-is
        }
      }

      // Generic error - likely wallet disconnected
      console.error('[WalletContext] ❌ Generic signature error - wallet may be disconnected');
      throw new Error('Failed to sign message. Please reconnect your wallet and try again.');
    }
  };

  const connect = () => {
    if (!ready) return;
    login();
  };

  const disconnect = async () => {
    await logout();
  };

  const value: WalletContextType = {
    isConnected,
    isConnecting: !ready,
    address,
    connect,
    disconnect,
    signRequest,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
