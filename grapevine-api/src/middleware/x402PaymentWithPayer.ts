/**
 * Custom x402 Payment Middleware that exposes payer address
 *
 * Wraps the standard x402-hono paymentMiddleware to extract and expose
 * the buyer's (payer's) wallet address in the Hono context after successful
 * payment verification.
 */
import { Context } from 'hono';
import { paymentMiddleware } from 'x402-hono';
import { Address } from 'viem';
import { RoutesConfig } from 'x402-hono';
import { exact } from 'x402/schemes';
import { FacilitatorConfig } from 'x402/types';
import { logger } from '../services/logger.js';

export function paymentMiddlewareWithPayer(
  payTo: Address,
  routes: RoutesConfig,
  facilitator: FacilitatorConfig
) {

  return async (c: Context, next: () => Promise<void>) => {
    logger.debug('[x402PaymentWithPayer] Processing payment middleware', {
      path: c.req.path,
      method: c.req.method,
      hasPaymentHeader: !!c.req.header("X-PAYMENT"),
    });

    const paymentHeader = c.req.header("X-PAYMENT");
    let payer = null;
    let network = null;

    if (paymentHeader) {
      try {
        logger.debug('[x402PaymentWithPayer] Decoding payment header');
        const decodedPayment = exact.evm.decodePayment(paymentHeader);
        network = decodedPayment.network;
        if ('authorization' in decodedPayment.payload) {
          payer = decodedPayment.payload.authorization.from;
        }
        logger.debug('[x402PaymentWithPayer] Payment decoded', { payer, network });
      } catch (error: any) {
        logger.error('[x402PaymentWithPayer] Failed to decode payment', error);
      }
    }
    if (paymentHeader && payer && network) {
      c.set('verifiedWallet', payer);
      c.set('verifiedNetwork', network);
      c.set('verifiedAt', Date.now());
      logger.debug('[x402PaymentWithPayer] Set verified wallet in context', { payer, network });
    } else {
      logger.warn('[x402PaymentWithPayer] Payment verification failed or missing payer/network information.', {
        hasPaymentHeader: !!paymentHeader,
        hasPayer: !!payer,
        hasNetwork: !!network,
      });
    }

    logger.debug('[x402PaymentWithPayer] Calling underlying paymentMiddleware', {
      payTo,
      routes: Object.keys(routes),
      facilitatorUrl: (facilitator as any).url || 'unknown',
    });

    try {
      const result = await paymentMiddleware(payTo, routes, facilitator)(c, next);
      logger.debug('[x402PaymentWithPayer] Payment middleware succeeded');
      return result;
    } catch (error: any) {
      logger.error('[x402PaymentWithPayer] Payment middleware failed', error, {
        payTo,
        payer,
        network,
      });
      throw error;
    }
  };
}
