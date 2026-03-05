// Database connection for NuageBook
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as path from "path";
import { env } from "./config/env";

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool);
export { pool };

export async function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "migrations");

  // The DB was originally built with drizzle-kit push (no drizzle.__drizzle_migrations table).
  // Bootstrap the tracking table and mark migration 0000 as already applied so the
  // migrator skips it and only runs newer migrations (0001+).
  const MIGRATION_0000_TIMESTAMP = 1769852598647;
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    const { rows } = await client.query(
      `SELECT id FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`
    );
    if (rows.length === 0) {
      // No migrations recorded yet — insert 0000 as already applied
      const hash = (await import("node:crypto"))
        .createHash("sha256")
        .update((await import("node:fs")).readFileSync(path.join(migrationsFolder, "0000_broad_agent_zero.sql"), "utf8"))
        .digest("hex");
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [hash, MIGRATION_0000_TIMESTAMP]
      );
    }
  } finally {
    client.release();
  }

  await migrate(db, { migrationsFolder });
}
