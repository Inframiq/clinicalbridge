import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const MIGRATIONS_DIR = resolve(__dirname, "../../supabase/migrations");

/**
 * An in-process Postgres (PGlite) with just enough of Supabase stubbed
 * (auth.uid(), storage.objects, the anon/authenticated roles, the realtime
 * publication) to apply every migration in order. Lets the RLS policies and
 * guard triggers be exercised as real roles without Docker or a live project.
 */
export async function createMigratedDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(readFileSync(resolve(__dirname, "supabase-stubs.sql"), "utf8"));
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(resolve(MIGRATIONS_DIR, file), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  return db;
}

/**
 * Runs `sql` as a signed-in user inside a transaction that is always rolled
 * back, so every case starts from the same seed. Resolves to the number of
 * rows the statement returned/affected, or rejects with the Postgres error.
 */
export async function runAs(db: PGlite, userId: string, sql: string): Promise<number> {
  await db.exec("begin");
  try {
    await db.exec(
      `set local role authenticated;
       select set_config('request.jwt.claim.sub', '${userId}', true),
              set_config('request.jwt.claim.role', 'authenticated', true);`
    );
    const result = await db.query(sql);
    return result.rows.length || result.affectedRows || 0;
  } finally {
    await db.exec("rollback");
  }
}

/**
 * Like `runAs`, but hands the transaction to `fn` so a test can act as the
 * user and then inspect the result (as superuser, via `reset role`) before
 * everything is rolled back.
 */
export async function withUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec("begin");
  try {
    await db.exec(
      `set local role authenticated;
       select set_config('request.jwt.claim.sub', '${userId}', true),
              set_config('request.jwt.claim.role', 'authenticated', true);`
    );
    return await fn();
  } finally {
    await db.exec("rollback");
  }
}
