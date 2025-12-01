import { describe, it, expect } from 'vitest';

/**
 * Parse PostgreSQL connection string into components
 * This is a test-only version of the parsing function from config.ts
 */
function parseConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  } catch (error) {
    throw new Error('Invalid DB_URL format. Expected: postgresql://user:password@host:port/database');
  }
}

describe('Config - DB_URL Connection String Parsing', () => {
  it('should parse complete DB_URL connection string into components', () => {
    const connectionString = 'postgresql://testuser:testpass@testhost:5433/testdb';
    const parsed = parseConnectionString(connectionString);

    expect(parsed.host).toBe('testhost');
    expect(parsed.port).toBe(5433);
    expect(parsed.database).toBe('testdb');
    expect(parsed.user).toBe('testuser');
    expect(parsed.password).toBe('testpass');
  });

  it('should handle URL-encoded passwords in DB_URL', () => {
    const connectionString = 'postgresql://user:p%40ssw%23rd@host:5432/db';
    const parsed = parseConnectionString(connectionString);

    expect(parsed.user).toBe('user');
    expect(parsed.password).toBe('p@ssw#rd');
  });

  it('should use default port 5432 when not specified in DB_URL', () => {
    const connectionString = 'postgresql://user:pass@host/db';
    const parsed = parseConnectionString(connectionString);

    expect(parsed.host).toBe('host');
    expect(parsed.port).toBe(5432);
    expect(parsed.database).toBe('db');
  });

  it('should handle special characters in username', () => {
    const connectionString = 'postgresql://user%2Bname:pass@host:5432/db';
    const parsed = parseConnectionString(connectionString);

    expect(parsed.user).toBe('user+name');
    expect(parsed.password).toBe('pass');
  });

  it('should parse database name from path', () => {
    const connectionString = 'postgresql://user:pass@host:5432/my_database_name';
    const parsed = parseConnectionString(connectionString);

    expect(parsed.database).toBe('my_database_name');
  });

  it('should throw error for invalid connection string', () => {
    const invalidString = 'not-a-valid-url';

    expect(() => parseConnectionString(invalidString)).toThrow('Invalid DB_URL format');
  });

  it('should handle postgres:// protocol (alternative to postgresql://)', () => {
    const connectionString = 'postgres://user:pass@host:5432/db';
    const parsed = parseConnectionString(connectionString);

    expect(parsed.host).toBe('host');
    expect(parsed.user).toBe('user');
    expect(parsed.database).toBe('db');
  });
});
