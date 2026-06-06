import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "../db.js";

async function migrate() {
  // __dirname is not available in ESM, resolve relative to cwd
  const sqlPath = join(process.cwd(), "migrations/001_init.sql");
  console.log(`[migrate] Reading migration: ${sqlPath}`);

  const sql = readFileSync(sqlPath, "utf8");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("[migrate] ✅ Migration completed successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[migrate] ❌ Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
