import type { PoolConfig } from "pg";

export function databaseOptions(connectionString: string | undefined, certificate?: string): PoolConfig {
  if (certificate && connectionString) {
    const url = new URL(connectionString);
    // pg's URL SSL options otherwise replace the explicit verified CA configuration.
    for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(key);
    return { connectionString: url.toString(), ssl: { ca: certificate, rejectUnauthorized: true } };
  }
  return { connectionString };
}
