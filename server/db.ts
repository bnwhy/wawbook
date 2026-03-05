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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d01d5656-68d1-4c4d-a23a-df6d1e0214cd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3ecfc'},body:JSON.stringify({sessionId:'c3ecfc',hypothesisId:'H-MIGRATIONS',location:'db.ts:runMigrations',message:'runMigrations called',data:{migrationsFolder,cwd:process.cwd()},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  await migrate(db, { migrationsFolder });
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d01d5656-68d1-4c4d-a23a-df6d1e0214cd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c3ecfc'},body:JSON.stringify({sessionId:'c3ecfc',hypothesisId:'H-MIGRATIONS',location:'db.ts:runMigrations:done',message:'runMigrations completed OK',data:{migrationsFolder},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}
