/**
 * Expiry Worker - Sets expirated CIDs to free payment instruction
 * This worker:
 * 1. Polls for entries where expires_at <= current_timestamp
 * 2. Deactivates expired entries (sets is_active = false)
 * 3. Updates payment instruction / CID mappings to a FREE payment instruction
 */
import { pool, currentEpoch } from '../services/db.js';
import { logger } from '../services/logger.js';
import { PaymentInstructionsClient } from '../services/paymentInstructions.js';
import { config } from '../services/config.js';

const POLL_INTERVAL_MS = config.worker.expiryWorkerPollInterval;
const BATCH_SIZE = config.worker.expiryWorkerBatchSize;
const TIMEOUT_MS = config.worker.expiryWorkerTimeout;
const FREE_PAYMENT_INSTRUCTION_ID = config.payment.freePaymentInstructionId;

let isRunning = false;
let workerInterval: NodeJS.Timeout | null = null;
let paymentClient: PaymentInstructionsClient | null = null;


function initializePaymentClient(): PaymentInstructionsClient | null {
  try {
    return new PaymentInstructionsClient();
  } catch (error) {
    logger.warn('Payment instructions client initialization failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Process a batch of expired entries
 */
async function processExpiredEntries(): Promise<void> {
  if (isRunning) {
    logger.debug('Expiry worker already running, skipping this cycle');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  // Create a timeout promise that rejects after the configured timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Expiry worker exceeded timeout of ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
  });

  try {
    // Race the actual work against the timeout
    await Promise.race([
      processExpiredEntriesInternal(),
      timeoutPromise
    ]);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      'Critical error in expiry worker cycle',
      error instanceof Error ? error : new Error(String(error)),
      {
        duration_ms: duration,
        note: 'Worker will retry in next scheduled cycle'
      }
    );
  } finally {
    isRunning = false;
  }
}

/**
 * Internal function that performs the actual expiry processing
 */
async function processExpiredEntriesInternal(): Promise<void> {
  const startTime = Date.now();

  try {
    const now = currentEpoch();

    logger.debug('Checking for expired entries', { current_epoch: now });

    let findResult;
    try {
      findResult = await pool.query(
        `SELECT id, feed_id, cid, piid, expires_at, title
         FROM gv_feed_entries
         WHERE expires_at IS NOT NULL
           AND expires_at <= $1
           AND is_active = TRUE
           AND is_free = FALSE
         ORDER BY expires_at ASC
         LIMIT $2`,
        [now, BATCH_SIZE]
      );
    } catch (dbError) {
      logger.error(
        'Database query failed while fetching expired entries', 
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        {
          current_epoch: now,
          batch_size: BATCH_SIZE
        }
      );
      throw dbError;
    }

    const expiredEntries = findResult.rows;

    if (expiredEntries.length === 0) {
      logger.debug('No expired entries found');
      return;
    }

    logger.info('Found expired entries', {
      count: expiredEntries.length,
      current_epoch: now
    });

    const results = {
      setToFree: 0,
      errors: 0
    };

    for (const entry of expiredEntries) {
      try {

        // Update payment instruction CID mapping if applicable
        if (FREE_PAYMENT_INSTRUCTION_ID && paymentClient && entry.piid && entry.cid) {
          try {

            await paymentClient.mapCid(FREE_PAYMENT_INSTRUCTION_ID, entry.cid)

            logger.info('Remapped CID to FREE payment instruction', {
              entry_id: entry.id,
              cid: entry.cid,
              old_piid: entry.piid,
              new_piid: FREE_PAYMENT_INSTRUCTION_ID
            });

            await pool.query(
              `UPDATE gv_feed_entries
               SET piid = $1, is_free = TRUE,
                   updated_at = $2
               WHERE id = $3`,
              [FREE_PAYMENT_INSTRUCTION_ID, now, entry.id]
            );

            logger.info('Successfully remapped expired CID to FREE payment instruction', {
              entry_id: entry.id,
              feed_id: entry.feed_id,
              cid: entry.cid,
              title: entry.title,
              expires_at: entry.expires_at,
              expired_seconds_ago: now - entry.expires_at
            });

            results.setToFree++;

          } catch (remapError) {
            logger.error(
              'Failed to remap CID to FREE payment instruction',
              remapError instanceof Error ? remapError : new Error(String(remapError)),
              {
                entry_id: entry.id,
                feed_id: entry.feed_id,
                cid: entry.cid,
                old_piid: entry.piid,
                free_piid: FREE_PAYMENT_INSTRUCTION_ID,
                note: 'Entry will remain with original payment instruction'
              }
            );
            results.errors++;
          }
        }
      } catch (entryError) {
        logger.error(
          'Failed to process expired entry',
          entryError instanceof Error ? entryError : new Error(String(entryError)),
          {
            entry_id: entry.id,
            feed_id: entry.feed_id,
            cid: entry.cid,
            piid: entry.piid,
            note: 'Skipping this entry, will retry in next cycle'
          }
        );
        results.errors++;
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Completed expiry worker cycle', {
      duration_ms: duration,
      ...results
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      'Error in expiry worker internal processing',
      error instanceof Error ? error : new Error(String(error)),
      {
        duration_ms: duration,
        note: 'Worker will retry in next scheduled cycle'
      }
    );
    throw error; // Re-throw to be caught by the outer handler
  }
}

/**
 * Start the expiry worker
 */
export function startExpiryWorker(): void {
  if (workerInterval) {
    logger.warn('Expiry worker already started');
    return;
  }

  paymentClient = initializePaymentClient();
  if (!paymentClient) {
    logger.error('Payment instructions client could not be initialized. Expiry worker will not run.');
    stopExpiryWorker();
    return;
  }

  if (!FREE_PAYMENT_INSTRUCTION_ID) {
    logger.error('FREE_PAYMENT_INSTRUCTION_ID is not configured. Expiry worker will not run.');
    stopExpiryWorker();
    return;
  }

  logger.info('Starting expiry worker', {
    poll_interval_ms: POLL_INTERVAL_MS,
    batch_size: BATCH_SIZE,
    free_piid_configured: !!FREE_PAYMENT_INSTRUCTION_ID,
    payment_client_available: !!paymentClient
  });

  processExpiredEntries().catch(error => {
    logger.error(
      'Error in initial expiry worker run',
      error instanceof Error ? error : new Error(String(error)),
    );
  });

  // Schedule recurring runs
  workerInterval = setInterval(() => {
    processExpiredEntries().catch(error => {
      logger.error(
        'Error in scheduled expiry worker run',
        error instanceof Error ? error : new Error(String(error)),
        {
          poll_interval_ms: POLL_INTERVAL_MS,
          note: 'Worker will retry in next scheduled cycle'
        }
      );
    });
  }, POLL_INTERVAL_MS);
}


export function stopExpiryWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    logger.info('Expiry worker stopped');
  }
}

export function getWorkerStatus(): {
  running: boolean;
  pollIntervalMs: number;
  batchSize: number;
  freePaymentInstructionConfigured: boolean;
  paymentClientAvailable: boolean;
} {
  return {
    running: !!workerInterval,
    pollIntervalMs: POLL_INTERVAL_MS,
    batchSize: BATCH_SIZE,
    freePaymentInstructionConfigured: !!FREE_PAYMENT_INSTRUCTION_ID,
    paymentClientAvailable: !!paymentClient
  };
}
