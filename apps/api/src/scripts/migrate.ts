import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getPostgresPool } from "../lib/postgres";

async function run() {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.resolve(process.cwd(), "apps", "api", "src", "db", "migrations");
    const files = (await readdir(migrationsDir))
      .filter((entry) => entry.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));

    for (const file of files) {
      const alreadyApplied = await client.query(
        "SELECT 1 FROM _schema_migrations WHERE id = $1 LIMIT 1",
        [file]
      );
      if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _schema_migrations (id) VALUES ($1)", [file]);
        await client.query("COMMIT");
        process.stdout.write(`Applied migration ${file}\n`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
