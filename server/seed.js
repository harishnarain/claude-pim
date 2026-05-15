/**
 * Database seed utilities for the PIM server.
 * Provides date helpers, a table-clear utility, and the top-level runSeed
 * entry point that wraps all seed operations in a single transaction.
 * @module seed
 */

import logger from './logger.js';

/**
 * Return a UTC date string in 'YYYY-MM-DD' format for today plus an offset.
 * @param {number} offsetDays - Number of days to add to today (may be negative).
 * @returns {string} Date string in 'YYYY-MM-DD' format.
 */
function isoDate(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Return a UTC datetime string in 'YYYY-MM-DD HH:MM:SS' format for today
 * plus an offset at the given hour and minute (seconds always 00).
 * @param {number} offsetDays - Number of days to add to today (may be negative).
 * @param {number} hour - UTC hour (0–23).
 * @param {number} minute - UTC minute (0–59).
 * @returns {string} Datetime string in 'YYYY-MM-DD HH:MM:SS' format.
 */
function isoDateTime(offsetDays, hour, minute) {
  const datePart = isoDate(offsetDays);
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${datePart} ${hh}:${mm}:00`;
}

/**
 * Delete all rows from every module table in FK-safe dependency order.
 * Order: task_tags → task_tags_vocab → tasks → note_tags → tags → notes
 *        → contacts → events
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function clearAllTables(db) {
  const TABLES = [
    'task_tags',
    'task_tags_vocab',
    'tasks',
    'note_tags',
    'tags',
    'notes',
    'contacts',
    'events',
  ];
  for (const table of TABLES) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
}

/**
 * Top-level seed entry point.
 * Wraps all seed operations in a single better-sqlite3 transaction.
 * Currently clears all tables and logs start/end; data insertion is added
 * in subsequent tasks.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function runSeed(db) {
  const seed = db.transaction(() => {
    clearAllTables(db);
    logger.info('Seeding database...');
    logger.info('Seed complete');
  });
  seed();
}

export { isoDate, isoDateTime, clearAllTables, runSeed };
