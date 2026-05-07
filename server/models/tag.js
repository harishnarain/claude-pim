/**
 * Tag model — lifecycle operations for the `tags` and `note_tags` SQLite tables.
 * All writes execute inside a single transaction to ensure atomicity.
 * Normalisation (lowercase/trim) of tag names is handled here before any SQL.
 * @module models/tag
 */

import { getDb } from '../db.js';

/**
 * Return all tag rows sorted by name ascending.
 * @returns {Array<{ id: number, name: string }>} Every tag in the database.
 */
function findAll() {
  const db = getDb();
  return db.prepare('SELECT id, name FROM tags ORDER BY name ASC').all();
}

/**
 * Return the { id, name } tag objects currently associated with a note, sorted by name ASC.
 * @param {number} noteId - The note's integer ID.
 * @returns {Array<{ id: number, name: string }>} Tags linked to the note.
 */
function getTagsForNote(noteId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT t.id, t.name
       FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       WHERE nt.note_id = ?
       ORDER BY t.name ASC`
    )
    .all(noteId);
}

/**
 * Atomically synchronise the tag set for a note.
 *
 * Steps performed inside a single transaction:
 *  1. Normalise each tag name to lowercase and trimmed.
 *  2. INSERT OR IGNORE each name into `tags`.
 *  3. Resolve the id of each name.
 *  4. DELETE all existing note_tags rows for the note.
 *  5. INSERT new note_tags rows for each resolved tag id.
 *  6. DELETE orphaned tags (tags with no remaining note associations).
 *
 * @param {number} noteId - The note's integer ID.
 * @param {string[]} tagNames - Raw tag name strings (will be normalised here).
 * @returns {Array<{ id: number, name: string }>} The updated list of tag objects for the note, sorted by name ASC.
 */
function syncNoteTags(noteId, tagNames) {
  const db = getDb();

  const normalised = tagNames
    .map((n) => n.toLowerCase().trim())
    .filter((n) => n.length > 0);

  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const selectTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const deleteNoteLinks = db.prepare('DELETE FROM note_tags WHERE note_id = ?');
  const insertNoteLink = db.prepare(
    'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)'
  );
  const deleteOrphans = db.prepare(
    'DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)'
  );

  const sync = db.transaction(() => {
    for (const name of normalised) {
      insertTag.run(name);
    }

    const ids = normalised.map((name) => selectTag.get(name).id);

    deleteNoteLinks.run(noteId);

    for (const tagId of ids) {
      insertNoteLink.run(noteId, tagId);
    }

    deleteOrphans.run();
  });

  sync();

  return getTagsForNote(noteId);
}

export { findAll, syncNoteTags, getTagsForNote };
