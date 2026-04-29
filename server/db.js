/**
 * SQLite connection helper and migration runner for the PIM server.
 * Opens (or creates) the pim.db database file and returns a singleton instance.
 * Applies pending migrations from db/migrations/ on startup.
 * @module db
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'db', 'pim.db');
const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

/** @type {import('better-sqlite3').Database | null} */
let instance = null;

/**
 * Return the singleton better-sqlite3 Database instance.
 * Opens the database on first call; subsequent calls return the cached instance.
 * @returns {import('better-sqlite3').Database} The open SQLite database.
 */
function getDb() {
  if (!instance) {
    instance = new Database(DB_PATH);
    // Enable WAL mode for better concurrent read performance.
    instance.pragma('journal_mode = WAL');
    logger.info(`SQLite database opened at ${DB_PATH}`);
  }
  return instance;
}

/**
 * Close the database connection. Primarily used in tests.
 * @returns {void}
 */
function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
    logger.info('SQLite database connection closed');
  }
}

/**
 * Ensure the _migrations tracking table exists in the database.
 * This table records which migration files have already been applied.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function ensureMigrationsTable(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      filename   TEXT    NOT NULL UNIQUE,
      applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
}

/**
 * Read all applied migration filenames from the _migrations table.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {Set<string>} Set of filenames that have already been applied.
 */
function getAppliedMigrations(db) {
  const rows = db.prepare('SELECT filename FROM _migrations').all();
  return new Set(rows.map((r) => r.filename));
}

/**
 * Apply all pending SQL migration files from db/migrations/ in filename order.
 * Each migration is recorded in the _migrations table so it is never applied twice.
 * Migrations are applied inside a transaction — if one fails the whole batch rolls back.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function runMigrations(db) {
  ensureMigrationsTable(db);

  const applied = getAppliedMigrations(db);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    logger.info('Database migrations: nothing to apply');
    return;
  }

  const insertMigration = db.prepare(
    'INSERT INTO _migrations (filename) VALUES (?)'
  );

  const applyAll = db.transaction(() => {
    for (const filename of pending) {
      const filePath = join(MIGRATIONS_DIR, filename);
      const sql = readFileSync(filePath, 'utf8');
      db.exec(sql);
      insertMigration.run(filename);
      logger.info(`Migration applied: ${filename}`);
    }
  });

  applyAll();
  logger.info(`Database migrations: applied ${pending.length} file(s)`);
}

export { getDb, closeDb, runMigrations };
