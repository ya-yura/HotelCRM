import { Pool } from "pg";

let sharedPool: Pool | null = null;

export function getDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  return value && value.length > 0 ? value : null;
}

export function requireDatabaseUrl() {
  const value = getDatabaseUrl();
  if (!value) {
    throw new Error("DATABASE_URL is not configured. Set it before using PostgreSQL commands.");
  }
  return value;
}

export function getPostgresPool() {
  if (sharedPool) {
    return sharedPool;
  }

  sharedPool = new Pool({
    connectionString: requireDatabaseUrl(),
    max: 10,
    idleTimeoutMillis: 30_000
  });

  return sharedPool;
}
