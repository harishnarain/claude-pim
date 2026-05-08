/**
 * Event model — CRUD operations against the `events` SQLite table.
 * All queries use parameterised statements (no string interpolation of user input).
 * @module models/event
 */

import { getDb } from '../db.js';

/** Whitelisted column names that callers may update via the update() function. */
const ALLOWED_COLUMNS = ['title', 'description', 'location', 'all_day', 'start_at', 'end_at', 'color'];

/**
 * Create a new event record.
 * @param {{ title: string, description?: string, location?: string, all_day?: number|boolean, start_at: string, end_at: string, color?: string }} fields - Event fields.
 * @returns {{ id: number, title: string, description: string|null, location: string|null, all_day: number, start_at: string, end_at: string, color: string, created_at: string, updated_at: string }} The newly created event row.
 */
function create(fields) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO events (title, description, location, all_day, start_at, end_at, color)
    VALUES (@title, @description, @location, @all_day, @start_at, @end_at, @color)
  `);

  const info = stmt.run({
    title: fields.title ?? '',
    description: fields.description ?? null,
    location: fields.location ?? null,
    all_day: fields.all_day ? 1 : 0,
    start_at: fields.start_at,
    end_at: fields.end_at,
    color: fields.color ?? 'blue',
  });

  return findById(info.lastInsertRowid);
}

/**
 * Return all events whose date range overlaps the given [start, end] window.
 * Overlap condition: event.start_at <= end + 'T23:59' AND event.end_at >= start + 'T00:00'.
 * @param {{ start?: string, end?: string }} [options={}] - Optional ISO date strings (YYYY-MM-DD) to filter by date range.
 * @returns {Array<{ id: number, title: string, description: string|null, location: string|null, all_day: number, start_at: string, end_at: string, color: string, created_at: string, updated_at: string }>} Array of event rows ordered by start_at ASC.
 */
function findAll({ start, end } = {}) {
  const db = getDb();

  let sql = `
    SELECT
      id,
      title,
      description,
      location,
      all_day,
      start_at,
      end_at,
      color,
      created_at,
      updated_at
    FROM events
  `;

  const params = [];

  if (start && end) {
    sql += `
      WHERE start_at <= ? AND end_at >= ?
      ORDER BY start_at ASC
    `;
    params.push(`${end}T23:59`, `${start}T00:00`);
  } else if (start) {
    sql += `
      WHERE end_at >= ?
      ORDER BY start_at ASC
    `;
    params.push(`${start}T00:00`);
  } else if (end) {
    sql += `
      WHERE start_at <= ?
      ORDER BY start_at ASC
    `;
    params.push(`${end}T23:59`);
  } else {
    sql += ' ORDER BY start_at ASC';
  }

  return db.prepare(sql).all(params);
}

/**
 * Find a single event by its primary key.
 * @param {number} id - The event's integer ID.
 * @returns {{ id: number, title: string, description: string|null, location: string|null, all_day: number, start_at: string, end_at: string, color: string, created_at: string, updated_at: string } | undefined} The event row, or undefined if not found.
 */
function findById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      id,
      title,
      description,
      location,
      all_day,
      start_at,
      end_at,
      color,
      created_at,
      updated_at
    FROM events
    WHERE id = ?
  `);
  return stmt.get(id);
}

/**
 * Update an event record with the given fields. Only provided fields are changed.
 * updated_at is always refreshed to the current UTC datetime.
 * @param {number} id - The event's integer ID.
 * @param {{ title?: string, description?: string, location?: string, all_day?: number|boolean, start_at?: string, end_at?: string, color?: string }} fields - Fields to update (partial).
 * @returns {{ id: number, title: string, description: string|null, location: string|null, all_day: number, start_at: string, end_at: string, color: string, created_at: string, updated_at: string } | undefined} The updated event row, or undefined if not found.
 */
function update(id, fields) {
  const db = getDb();

  // Normalize boolean all_day to SQLite-compatible integer (1 or 0).
  const normalizedFields = { ...fields };
  if (normalizedFields.all_day !== undefined) {
    normalizedFields.all_day = normalizedFields.all_day ? 1 : 0;
  }

  const setClauses = Object.keys(normalizedFields)
    .filter((key) => ALLOWED_COLUMNS.includes(key))
    .map((key) => `${key} = @${key}`);

  if (setClauses.length === 0) {
    return findById(id);
  }

  setClauses.push("updated_at = datetime('now')");

  const stmt = db.prepare(`
    UPDATE events
    SET ${setClauses.join(', ')}
    WHERE id = @id
  `);

  stmt.run({ ...normalizedFields, id });

  return findById(id);
}

/**
 * Delete an event by its primary key.
 * @param {number} id - The event's integer ID.
 * @returns {{ deleted: boolean }} An object indicating whether a row was deleted.
 */
function destroy(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM events WHERE id = ?');
  const info = stmt.run(id);
  return { deleted: info.changes > 0 };
}

export { create, findAll, findById, update, destroy };
