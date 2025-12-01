# Grapevine Workers

Background workers for handling asynchronous tasks in the Grapevine platform.

## Expiry Worker

The expiry worker automatically transitions expired feed entries to free access by remapping their payment instructions.

### Functionality

1. **Polling**: Queries the database at configurable intervals (default: 60 seconds) for entries where `expires_at <= current_timestamp` and `is_active = TRUE`
2. **Batch Processing**: Processes expired entries in configurable batch sizes (default: 100 entries per cycle)
3. **Payment Instruction Remapping**: Uses the Payment Instructions Client to remap expired CIDs to the configured free payment instruction
4. **Database Updates**: Updates the `gv_feed_entries` table to reflect the new free payment instruction and sets `is_free = TRUE`

### Configuration

Environment variables:

- `EXPIRY_WORKER_POLL_INTERVAL` - Polling interval in milliseconds (default: 60000)
- `EXPIRY_WORKER_BATCH_SIZE` - Number of entries to process per cycle (default: 100)
- `FREE_PAYMENT_INSTRUCTION_ID` - Required. The payment instruction ID to use for expired entries

### Error Handling

- Individual entry failures are logged but don't stop the batch processing
- Failed entries remain unchanged and will be retried in the next cycle
- Worker includes safety check to prevent concurrent runs
- Comprehensive logging for monitoring and debugging


