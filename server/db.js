/**
 * SQLite connection helper for the PIM server.
 * Opens (or creates) the pim.db database file and returns a singleton instance.
 * @module db
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'db', 'pim.db');

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

export { getDb, closeDb };
