/**
 * Note model — CRUD operations against the `notes` SQLite table.
 * All queries use parameterised statements (no string interpolation).
 * Tag wiring is handled separately by the tag model.
 * @module models/note
 */

import { getDb } from '../db.js';

/**
 * SQL expression that extracts the first line of note content as the title.
 * Uses INSTR to find the first newline (appending '\n' ensures INSTR > 0 even
 * when no newline exists), then takes SUBSTR up to (but not including) it.
 */
const TITLE_EXPR = `SUBSTR(content, 1, INSTR(content || '\n', '\n') - 1)`;

/**
 * SQL expression that extracts the preview: up to 140 characters of content
 * after the first newline, with leading/trailing whitespace trimmed.
 */
const PREVIEW_EXPR = `TRIM(SUBSTR(content, INSTR(content || '\n', '\n') + 1, 140))`;

/**
 * Create a new note record.
 * @param {{ content?: string, is_pinned?: number|boolean }} fields - Note fields.
 * @returns {{ id: number, content: string, is_pinned: number, created_at: string, updated_at: string }} The newly created note row.
 */
function create(fields) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO notes (content, is_pinned)
    VALUES (@content, @is_pinned)
  `);

  const info = stmt.run({
    content: fields.content ?? '',
    is_pinned: fields.is_pinned ? 1 : 0,
  });

  return findById(info.lastInsertRowid);
}

/**
 * Return all notes with computed title and preview columns.
 * Pinned notes always sort first within each secondary ordering.
 *
 * Sort options:
 *   - 'updated_desc' (default) — most recently updated first
 *   - 'updated_asc'            — oldest update first
 *   - 'title_asc'              — first line of content A→Z
 *
 * @param {{ sort?: 'updated_desc'|'updated_asc'|'title_asc' }} [options={}] - Sort option.
 * @returns {Array<{ id: number, content: string, is_pinned: number, created_at: string, updated_at: string, title: string, preview: string }>} Array of note rows with title and preview.
 */
function findAll({ sort = 'updated_desc' } = {}) {
  const db = getDb();

  const SECONDARY_ORDER = {
    updated_desc: 'updated_at DESC',
    updated_asc: 'updated_at ASC',
    title_asc: `${TITLE_EXPR} ASC`,
  };

  const secondary = SECONDARY_ORDER[sort] ?? SECONDARY_ORDER.updated_desc;

  const stmt = db.prepare(`
    SELECT
      id,
      content,
      is_pinned,
      created_at,
      updated_at,
      ${TITLE_EXPR}   AS title,
      ${PREVIEW_EXPR} AS preview
    FROM notes
    ORDER BY is_pinned DESC, ${secondary}
  `);

  return stmt.all();
}

/**
 * Find a single note by its primary key, including the computed title column.
 * @param {number} id - The note's integer ID.
 * @returns {{ id: number, content: string, is_pinned: number, created_at: string, updated_at: string, title: string } | undefined} The note row, or undefined if not found.
 */
function findById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      id,
      content,
      is_pinned,
      created_at,
      updated_at,
      ${TITLE_EXPR} AS title
    FROM notes
    WHERE id = ?
  `);
  return stmt.get(id);
}

/**
 * Update a note record with the given fields. Only provided fields are changed.
 * updated_at is always refreshed to the current UTC datetime.
 * @param {number} id - The note's integer ID.
 * @param {{ content?: string, is_pinned?: number|boolean }} fields - Fields to update (partial).
 * @returns {{ id: number, content: string, is_pinned: number, created_at: string, updated_at: string, title: string } | undefined} The updated note row, or undefined if not found.
 */
function update(id, fields) {
  const db = getDb();

  const ALLOWED_COLUMNS = ['content', 'is_pinned'];

  // Normalize boolean is_pinned to SQLite-compatible integer (1 or 0).
  const normalizedFields = { ...fields };
  if (normalizedFields.is_pinned !== undefined) {
    normalizedFields.is_pinned = normalizedFields.is_pinned ? 1 : 0;
  }

  const setClauses = Object.keys(normalizedFields)
    .filter((key) => ALLOWED_COLUMNS.includes(key))
    .map((key) => `${key} = @${key}`);

  if (setClauses.length === 0) {
    return findById(id);
  }

  setClauses.push("updated_at = datetime('now')");

  const stmt = db.prepare(`
    UPDATE notes
    SET ${setClauses.join(', ')}
    WHERE id = @id
  `);

  stmt.run({ ...normalizedFields, id });

  return findById(id);
}

/**
 * Delete a note by its primary key.
 * note_tags rows are removed automatically via ON DELETE CASCADE.
 * @param {number} id - The note's integer ID.
 * @returns {{ deleted: boolean }} An object indicating whether a row was deleted.
 */
function destroy(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
  const info = stmt.run(id);
  return { deleted: info.changes > 0 };
}

export { create, findAll, findById, update, destroy };
