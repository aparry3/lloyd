import fs from 'fs';
import path from 'path';
import pg from 'pg';

/**
 * Simple migration runner — executes SQL files from /migrations in order.
 * Tracks applied migrations in a lloyd_migrations table.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  // Create migrations tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS lloyd_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Get already-applied migrations
  const { rows: applied } = await client.query('SELECT name FROM lloyd_migrations ORDER BY name');
  const appliedSet = new Set(applied.map((r: any) => r.name));

  // Read migration files
  const __dirname = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);
  const migrationsDir = path.resolve(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    console.log(`Applying: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO lloyd_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed on ${file}:`, err);
      process.exit(1);
    }
  }

  console.log(count === 0 ? 'All migrations up to date.' : `Applied ${count} migration(s).`);
  await client.end();
}

main();
