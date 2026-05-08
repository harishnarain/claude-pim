/**
 * Task tag model — lifecycle operations for the `task_tags_vocab` and `task_tags` SQLite tables.
 * All writes execute inside a single transaction to ensure atomicity.
 * Normalisation (lowercase/trim) of tag names is handled here before any SQL.
 * @module models/task-tag
 */

import { getDb } from '../db.js';

/**
 * Return all task tag vocabulary rows sorted by name ascending.
 * @returns {Array<{ id: number, name: string }>} Every tag in the task_tags_vocab table.
 */
function findAll() {
  const db = getDb();
  return db.prepare('SELECT id, name FROM task_tags_vocab ORDER BY name ASC').all();
}

/**
 * Return the { id, name } tag objects currently associated with a task, sorted by name ASC.
 * @param {number} taskId - The task's integer ID.
 * @returns {Array<{ id: number, name: string }>} Tags linked to the task.
 */
function getTagsForTask(taskId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT tv.id, tv.name
       FROM task_tags_vocab tv
       JOIN task_tags tt ON tt.tag_id = tv.id
       WHERE tt.task_id = ?
       ORDER BY tv.name ASC`
    )
    .all(taskId);
}

/**
 * Atomically synchronise the tag set for a task.
 *
 * Steps performed inside a single transaction:
 *  1. Normalise each tag name to lowercase and trimmed.
 *  2. INSERT OR IGNORE each name into `task_tags_vocab`.
 *  3. Resolve the id of each name.
 *  4. DELETE all existing task_tags rows for the task.
 *  5. INSERT new task_tags rows for each resolved tag id.
 *  6. DELETE orphaned vocab entries (entries with no remaining task associations).
 *
 * @param {number} taskId - The task's integer ID.
 * @param {string[]} tagNames - Raw tag name strings (will be normalised here).
 * @returns {Array<{ id: number, name: string }>} The updated list of tag objects for the task, sorted by name ASC.
 */
function syncTaskTags(taskId, tagNames) {
  const db = getDb();

  const normalised = tagNames
    .map((n) => n.toLowerCase().trim())
    .filter((n) => n.length > 0);

  const insertTag = db.prepare('INSERT OR IGNORE INTO task_tags_vocab (name) VALUES (?)');
  const selectTag = db.prepare('SELECT id FROM task_tags_vocab WHERE name = ?');
  const deleteTaskLinks = db.prepare('DELETE FROM task_tags WHERE task_id = ?');
  const insertTaskLink = db.prepare(
    'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)'
  );
  const deleteOrphans = db.prepare(
    'DELETE FROM task_tags_vocab WHERE id NOT IN (SELECT DISTINCT tag_id FROM task_tags)'
  );

  const sync = db.transaction(() => {
    for (const name of normalised) {
      insertTag.run(name);
    }

    const ids = normalised.map((name) => selectTag.get(name).id);

    deleteTaskLinks.run(taskId);

    for (const tagId of ids) {
      insertTaskLink.run(taskId, tagId);
    }

    deleteOrphans.run();
  });

  sync();

  return getTagsForTask(taskId);
}

export { findAll, syncTaskTags, getTagsForTask };
