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
  await migrate(db, { migrationsFolder });
}
