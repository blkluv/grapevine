import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useLoginToMiniApp } from '@privy-io/react-auth/farcaster';
import { useAccount, useConnect } from 'wagmi';
import sdk from '@farcaster/miniapp-sdk';
import { useFarcaster } from '@/context/FarcasterContext';

/**
 * FarcasterAutoLogin component
 *
 * Automatically logs in via Farcaster when the app is opened as a mini app.
 * Uses Privy's SIWF (Sign In With Farcaster) flow.
 * - In mini app → auto-signs in with Farcaster
 * - On desktop → silently fails, user sees regular Privy login UI
 */
export function FarcasterAutoLogin() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { initLoginToMiniApp, loginToMiniApp } = useLoginToMiniApp();
  const wagmiAccount = useAccount();
  const { isConnected: wagmiConnected, address: wagmiAddress, connector: wagmiConnector } = wagmiAccount;
  const { connect, connectors } = useConnect();
  const { isInMiniApp } = useFarcaster();
  const [attemptedLogin, setAttemptedLogin] = useState(false);
  const [attemptedWalletConnect, setAttemptedWalletConnect] = useState(false);

  // Log wallet information when authenticated
  useEffect(() => {
    if (authenticated && user) {
      const logWalletInfo = async () => {
        console.log('[FarcasterAutoLogin] 🔍 Wallet Debug Info:');
        console.log('[FarcasterAutoLogin] - Privy useWallets():', wallets);
        console.log('[FarcasterAutoLogin] - Wallets count:', wallets.length);
        console.log('[FarcasterAutoLogin] - User linked accounts:', user.linkedAccounts);

        // Log each wallet from Privy
        wallets.forEach((wallet, index) => {
          console.log(`[FarcasterAutoLogin] - Wallet ${index}:`, {
            address: wallet.address,
            walletClientType: wallet.walletClientType,
            connectorType: wallet.connectorType,
            imported: wallet.imported,
          });
        });

        // Try to get Farcaster wallet from SDK
        try {
          const farcasterProvider = await sdk.wallet.getEthereumProvider();
          console.log('[FarcasterAutoLogin] - Farcaster SDK wallet provider:', farcasterProvider ? '✅ Available' : '❌ Not available');
        } catch (error) {
          console.log('[FarcasterAutoLogin] - Farcaster SDK wallet error:', error);
        }
      };

      logWalletInfo();
    }
  }, [authenticated, user, wallets]);

  // Login to Mini App with Privy automatically
  useEffect(() => {
    console.log('[FarcasterAutoLogin] State check:', { ready, authenticated, attemptedLogin });

    if (!ready || authenticated || attemptedLogin) return;

    const login = async () => {
      try {
        console.log('[FarcasterAutoLogin] 🔄 Starting auto-login...');

        // Initialize a new login attempt to get a nonce for the Farcaster wallet to sign
        console.log('[FarcasterAutoLogin] Step 1: Getting nonce from Privy...');
        const { nonce } = await initLoginToMiniApp();
        console.log('[FarcasterAutoLogin] ✅ Got nonce:', nonce);

        // Request a signature from Farcaster
        console.log('[FarcasterAutoLogin] Step 2: Requesting signature from Farcaster...');
        const result = await sdk.actions.signIn({ nonce });
        console.log('[FarcasterAutoLogin] ✅ Got signature from Farcaster');

        // Send the received signature from Farcaster to Privy for authentication
        console.log('[FarcasterAutoLogin] Step 3: Sending signature to Privy...');
        await loginToMiniApp({
          message: result.message,
          signature: result.signature,
        });
        console.log('[FarcasterAutoLogin] ✅ Successfully logged in!');
      } catch (error) {
        console.error('[FarcasterAutoLogin] ❌ Login failed:', error);
      } finally {
        setAttemptedLogin(true);
        console.log('[FarcasterAutoLogin] Login attempt completed');
      }
    };

    login();
  }, [ready, authenticated, attemptedLogin, initLoginToMiniApp, loginToMiniApp]);

  // Connect Farcaster wallet to Wagmi after successful authentication
  useEffect(() => {
    console.log('[FarcasterAutoLogin] 💳 Wallet connection check:', {
      isInMiniApp,
      authenticated,
      wagmiConnected,
      attemptedWalletConnect,
      connectorsAvailable: connectors.length,
      privyWalletsCount: wallets.length,
    });

    // Log current wagmi connection state
    console.log('[FarcasterAutoLogin] 📊 Current Wagmi state:', {
      isConnected: wagmiConnected,
      connectedAddress: wagmiAddress,
      connectedConnector: wagmiConnector?.name,
      connectorId: wagmiConnector?.id,
    });

    // Log Privy's active wallet
    const privyActiveWallet = wallets.length > 0 ? wallets[0] : null;
    if (privyActiveWallet) {
      console.log('[FarcasterAutoLogin] 🎯 Privy active wallet (wallets[0]):', {
        address: privyActiveWallet.address,
        walletClientType: privyActiveWallet.walletClientType,
      });
    }

    // Only try to connect if:
    // 1. We're in mini app context (not desktop)
    // 2. User is authenticated with Privy
    // 3. Wagmi wallet is not connected yet
    // 4. We haven't attempted connection yet
    // 5. We have connectors available
    if (!isInMiniApp || !authenticated || wagmiConnected || attemptedWalletConnect || connectors.length === 0) {
      console.log('[FarcasterAutoLogin] ⏭️ Skipping connection because:', {
        notInMiniApp: !isInMiniApp,
        notAuthenticated: !authenticated,
        alreadyConnected: wagmiConnected,
        alreadyAttempted: attemptedWalletConnect,
        noConnectors: connectors.length === 0,
      });
      return;
    }

    const connectWallet = async () => {
      try {
        console.log('[FarcasterAutoLogin] 🔄 Connecting wallet to Wagmi...');
        console.log('[FarcasterAutoLogin] - Available connectors:', connectors);
        console.log('[FarcasterAutoLogin] - Privy wallets:', wallets);

        // Find the connector that matches the user's Privy active wallet
        const privyActiveWallet = wallets.length > 0 ? wallets[0] : null;
        let targetConnector = connectors[0]; // Fallback to first

        if (privyActiveWallet) {
          console.log('[FarcasterAutoLogin] - Active Privy wallet:', {
            address: privyActiveWallet.address,
            walletClientType: privyActiveWallet.walletClientType,
          });

          // Try to find matching connector by wallet type
          const matchingConnector = connectors.find(c => {
            const walletType = privyActiveWallet.walletClientType;
            // Map Privy wallet types to connector IDs
            if (walletType === 'coinbase_wallet') return c.id === 'com.coinbase.wallet';
            if (walletType === 'rainbow') return c.id === 'me.rainbow';
            if (walletType === 'metamask') return c.id === 'io.metamask';
            if (walletType === 'farcaster') return c.id === 'farcaster';
            return false;
          });

          if (matchingConnector) {
            targetConnector = matchingConnector;
            console.log('[FarcasterAutoLogin] ✅ Found matching connector:', targetConnector.name, 'with ID:', targetConnector.id);
          } else {
            console.warn('[FarcasterAutoLogin] ⚠️ No matching connector found for', privyActiveWallet.walletClientType);
            console.warn('[FarcasterAutoLogin] ⚠️ Using first connector:', targetConnector.name);
          }
        }

        console.log('[FarcasterAutoLogin] - Using connector:', {
          name: targetConnector.name,
          id: targetConnector.id,
          type: targetConnector.type,
        });
        await connect({ connector: targetConnector });

        console.log('[FarcasterAutoLogin] ✅ Wallet connected to Wagmi!');
      } catch (error) {
        console.error('[FarcasterAutoLogin] ❌ Wallet connection failed:', error);
      } finally {
        setAttemptedWalletConnect(true);
        console.log('[FarcasterAutoLogin] Wallet connection attempt completed');
      }
    };

    connectWallet();
  }, [isInMiniApp, authenticated, wagmiConnected, attemptedWalletConnect, connectors, connect, wallets]);

  // This component doesn't render anything
  return null;
}
