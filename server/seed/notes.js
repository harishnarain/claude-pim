/**
 * Seed function for the notes, tags, and note_tags tables.
 * @module seed/notes
 */

import logger from '../logger.js';
import { TAG_NAMES, NOTES, NOTE_TAG_LINKS } from './notes-data.js';

/**
 * Insert 7 tags and 20 notes into the database, then link at least 5 notes
 * to tags via the note_tags join table.
 * Exactly 3 notes have is_pinned = 1.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
export function seedNotes(db) {
  const insertTag = db.prepare('INSERT INTO tags (name) VALUES (@name)');
  const tagIds = {};
  for (const name of TAG_NAMES) {
    const { lastInsertRowid } = insertTag.run({ name });
    tagIds[name] = lastInsertRowid;
  }
  logger.info(`Seeded ${TAG_NAMES.length} tags`);

  const insertNote = db.prepare(`
    INSERT INTO notes (content, is_pinned, created_at, updated_at)
    VALUES (@content, @is_pinned, @created_at, @updated_at)
  `);
  const noteIds = [];
  for (const note of NOTES) {
    const { lastInsertRowid } = insertNote.run(note);
    noteIds.push(lastInsertRowid);
  }
  logger.info(`Seeded ${noteIds.length} notes`);

  const insertNoteTag = db.prepare(
    'INSERT INTO note_tags (note_id, tag_id) VALUES (@note_id, @tag_id)'
  );
  for (const { noteIndex, tagName } of NOTE_TAG_LINKS) {
    insertNoteTag.run({ note_id: noteIds[noteIndex], tag_id: tagIds[tagName] });
  }
  logger.info(`Seeded ${NOTE_TAG_LINKS.length} note_tags links`);
}
