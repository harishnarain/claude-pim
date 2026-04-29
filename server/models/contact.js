/**
 * Contact model — CRUD operations against the `contacts` SQLite table.
 * All queries use parameterised statements (no string interpolation).
 * @module models/contact
 */

import { getDb } from '../db.js';

/**
 * Create a new contact record.
 * @param {{ first_name: string, last_name: string, email?: string, phone?: string, company?: string, notes?: string }} fields - Contact fields.
 * @returns {{ id: number, first_name: string, last_name: string, email: string|null, phone: string|null, company: string|null, notes: string|null, created_at: string, updated_at: string }} The newly created contact row.
 */
function create(fields) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO contacts (first_name, last_name, email, phone, company, notes)
    VALUES (@first_name, @last_name, @email, @phone, @company, @notes)
  `);

  const info = stmt.run({
    first_name: fields.first_name,
    last_name: fields.last_name,
    email: fields.email ?? null,
    phone: fields.phone ?? null,
    company: fields.company ?? null,
    notes: fields.notes ?? null,
  });

  return findById(info.lastInsertRowid);
}

/**
 * Return all contacts, optionally filtered by a search term.
 * The search term is matched case-insensitively against first_name, last_name, and email using LIKE.
 * Results are sorted by last_name ASC, first_name ASC.
 * @param {{ search?: string }} [options={}] - Optional filter options.
 * @returns {Array<{ id: number, first_name: string, last_name: string, email: string|null, phone: string|null, company: string|null, notes: string|null, created_at: string, updated_at: string }>} Array of contact rows.
 */
function findAll({ search } = {}) {
  const db = getDb();

  if (search && search.trim().length > 0) {
    const pattern = `%${search.trim()}%`;
    const stmt = db.prepare(`
      SELECT * FROM contacts
      WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
      ORDER BY last_name ASC, first_name ASC
    `);
    return stmt.all(pattern, pattern, pattern);
  }

  const stmt = db.prepare(`
    SELECT * FROM contacts
    ORDER BY last_name ASC, first_name ASC
  `);
  return stmt.all();
}

/**
 * Find a single contact by its primary key.
 * @param {number} id - The contact's integer ID.
 * @returns {{ id: number, first_name: string, last_name: string, email: string|null, phone: string|null, company: string|null, notes: string|null, created_at: string, updated_at: string } | undefined} The contact row, or undefined if not found.
 */
function findById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM contacts WHERE id = ?');
  return stmt.get(id);
}

/**
 * Update a contact record with the given fields. Only provided fields are changed.
 * The updated_at timestamp is refreshed automatically.
 * @param {number} id - The contact's integer ID.
 * @param {{ first_name?: string, last_name?: string, email?: string, phone?: string, company?: string, notes?: string }} fields - Fields to update (partial).
 * @returns {{ id: number, first_name: string, last_name: string, email: string|null, phone: string|null, company: string|null, notes: string|null, created_at: string, updated_at: string } | undefined} The updated contact row, or undefined if not found.
 */
function update(id, fields) {
  const db = getDb();

  const ALLOWED_COLUMNS = ['first_name', 'last_name', 'email', 'phone', 'company', 'notes'];

  const setClauses = Object.keys(fields)
    .filter((key) => ALLOWED_COLUMNS.includes(key))
    .map((key) => `${key} = @${key}`);

  if (setClauses.length === 0) {
    return findById(id);
  }

  setClauses.push("updated_at = datetime('now')");

  const stmt = db.prepare(`
    UPDATE contacts
    SET ${setClauses.join(', ')}
    WHERE id = @id
  `);

  stmt.run({ ...fields, id });

  return findById(id);
}

/**
 * Delete a contact by its primary key.
 * @param {number} id - The contact's integer ID.
 * @returns {{ deleted: boolean }} An object indicating whether a row was deleted.
 */
function destroy(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM contacts WHERE id = ?');
  const info = stmt.run(id);
  return { deleted: info.changes > 0 };
}

export { create, findAll, findById, update, destroy };
