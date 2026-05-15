/**
 * Top-level seed entry point.
 * Clears all module tables and re-seeds them in a single SQLite transaction.
 * Called from server/index.js on every server startup.
 * @module seed
 */

import logger from '../logger.js';
import { seedContacts } from './contacts.js';
import { seedNotes } from './notes.js';
import { seedTasks } from './tasks.js';
import { seedEvents } from './events.js';

export { isoDate, isoDateTime, addMinutes } from './helpers.js';
export { seedContacts } from './contacts.js';
export { seedNotes } from './notes.js';
export { seedTasks } from './tasks.js';
export { seedEvents } from './events.js';

/**
 * Delete all rows from every module table in FK-safe dependency order.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
export function clearAllTables(db) {
  db.prepare('DELETE FROM task_tags').run();
  db.prepare('DELETE FROM task_tags_vocab').run();
  db.prepare('DELETE FROM tasks').run();
  db.prepare('DELETE FROM note_tags').run();
  db.prepare('DELETE FROM tags').run();
  db.prepare('DELETE FROM notes').run();
  db.prepare('DELETE FROM contacts').run();
  db.prepare('DELETE FROM events').run();
}

/**
 * Clear all module tables and seed fresh data in a single transaction.
 * Logs progress to the server logger. Throws on any seed error (crashing
 * the server is preferable to starting with partial data).
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
export function runSeed(db) {
  const seed = db.transaction(() => {
    clearAllTables(db);
    logger.info('Seeding database...');
    seedContacts(db);
    seedNotes(db);
    seedTasks(db);
    seedEvents(db);
    logger.info('Seed complete: 20 contacts, 20 notes, 20 tasks, 20 events');
  });
  seed();
}
