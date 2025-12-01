# Database Configuration Guide

## Connection Timeout Issues

If you're experiencing `timeout exceeded when trying to connect` errors, this guide will help you resolve them.

## Quick Fix

### 1. Increase Connection Pool & Timeouts (Already Applied)

The database configuration has been optimized:
- Connection pool increased from 20 to 50 connections
- Minimum pool size set to 5 for faster response
- Connection timeout increased from 30s to 60s
- Statement/query timeout increased to 60s
- Added pool exhaustion monitoring and warnings

### 2. Check Database Connectivity

Ensure your database is accessible from your application:

```bash
# Test connection from your application server
psql "$DB_URL"
```

Or with individual parameters:
```bash
psql -h <host> -p <port> -U <user> -d <database>
```

### 3. Enable SSL for Production Databases

For managed databases (AWS RDS, Google Cloud SQL, etc.), enable SSL:

```env
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false  # Set to true for strict SSL verification
```

## Configuration Options

### Connection Pool Settings (Automatically Applied)

- **Max connections**: 50 clients (increased from 20)
- **Min connections**: 5 clients (pre-warmed)
- **Connection timeout**: 60 seconds (increased from 30s)
- **Idle timeout**: 30 seconds
- **Statement timeout**: 60 seconds (increased from 30s)
- **Query timeout**: 60 seconds (increased from 30s)
- **Keep-alive**: Enabled with 10 second initial delay
- **Pool monitoring**: Automatic warnings at 75% and 90% utilization
- **Slow query detection**: Warnings for queries > 5 seconds

### Environment Variables

#### Option 1: Single Connection String (Recommended)
```env
DB_URL=postgresql://user:password@host:5432/database
```

#### Option 2: Legacy Full Connection String
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

#### Option 3: Individual Parameters
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grapevine
DB_USER=postgres
DB_PASSWORD=password
```

### SSL Configuration (Production)

For managed PostgreSQL databases (RDS, Cloud SQL, etc.):

```env
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

Set `DB_SSL_REJECT_UNAUTHORIZED=true` only if you have proper CA certificates configured.

## Troubleshooting

### 1. Connection Timeout

**Symptom**: `timeout exceeded when trying to connect`

**Causes**:
- Database is not reachable from the application server
- Firewall blocking connection
- Network latency issues
- Database is overloaded

**Solutions**:
1. Verify database host and port are correct
2. Check firewall rules allow connections from your app server
3. Test database connectivity: `nc -zv <host> <port>`
4. Check database server CPU/memory usage
5. Verify SSL requirements match your configuration

### 2. Connection Pool Exhaustion

**Symptom**:
- Queries hang or timeout with "timeout exceeded when trying to connect"
- Logs show: `total: 50, idle: 0, waiting: N` (where N > 0)
- Pool utilization warnings at 90%+

**Causes**:
- Too many concurrent requests
- Slow queries holding connections
- Database triggers causing lock contention
- Connections not being released properly

**Solutions**:
1. **Monitor pool stats** - The system now automatically logs warnings at 75% and 90% utilization
2. **Identify slow queries** - Check logs for "Slow query detected" warnings (> 5s)
3. **Optimize database**:
   - Add indexes for frequently queried columns
   - Analyze query plans with `EXPLAIN ANALYZE`
   - Consider optimizing triggers (especially the new transaction stats triggers)
4. **Scale database**:
   - Increase database max_connections setting (must be > 50)
   - Consider read replicas for read-heavy workloads
5. **Scale application pool** - If needed, increase max from 50 to higher (requires database support)

### 3. SSL Connection Issues

**Symptom**: Connection fails with SSL-related errors

**Solutions**:
1. Enable SSL: `DB_SSL=true`
2. Disable certificate verification for self-signed certs: `DB_SSL_REJECT_UNAUTHORIZED=false`
3. For AWS RDS: Download and configure RDS CA certificate

## Connection Retry Logic

The application automatically retries failed connections:
- **Retries**: 3 attempts
- **Delay**: 5 seconds between attempts
- **Logging**: All connection attempts are logged

## Monitoring

### Automatic Monitoring (Always Active)

The system automatically monitors and logs:
- **Pool utilization warnings** at 75% and 90% capacity
- **Slow query warnings** for queries taking > 5 seconds
- **Connection wait warnings** when queries are queued

### Debug Logging (Optional)

Enable detailed debug logging:

```env
LOG_LEVEL=debug
```

This adds verbose logging for:
- Individual client connections, acquisitions, and releases
- Pool stats every 30 seconds
- All query executions with timing
- Client removal from pool
- Pool statistics every 30 seconds
- All database queries with execution time

## Production Best Practices

1. **Use connection string**: Prefer `DB_URL` over individual parameters
2. **Enable SSL**: Always use SSL in production (`DB_SSL=true`)
3. **Monitor pool stats**: Set `LOG_LEVEL=debug` initially to verify healthy connections
4. **Network security**: Ensure proper VPC/security group configuration
5. **Connection limits**: Ensure database `max_connections` > application pool size
6. **Health checks**: The `/health` endpoint is exempt from rate limiting for monitoring
7. **Timeouts**: Current 30-second timeout should handle most scenarios

## Docker/Kubernetes Considerations

When running in containers:

1. **Network**: Ensure containers can reach the database
2. **DNS**: Use proper service discovery or external DNS
3. **Init delay**: Database might not be ready when container starts (retry logic handles this)
4. **Secrets**: Use secrets management for `DB_URL` or database credentials

Example Docker Compose:
```yaml
services:
  api:
    environment:
      - DB_URL=postgresql://user:password@db:5432/grapevine
      - DB_SSL=false  # false for local development
    depends_on:
      db:
        condition: service_healthy
```

## Getting Help

If connection issues persist after following this guide:

1. Check application logs for specific error messages
2. Verify database logs for connection attempts
3. Test connectivity: `psql "$DB_URL"`
4. Monitor pool statistics with `LOG_LEVEL=debug`
5. Check database CPU/memory/connection metrics
