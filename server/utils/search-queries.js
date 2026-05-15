/**
 * Per-module SQL query functions for the unified search endpoint.
 * All tag filters use EXISTS subqueries so multiple tags compose with AND semantics.
 * Multiple free-text terms are ANDed: a row must contain every term somewhere.
 * @module utils/search-queries
 */

/**
 * Query the contacts table for rows matching all given free-text terms.
 * Searches: first_name, last_name, email, phone, company, notes.
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} terms - Free-text terms (each must match at least one column).
 * @returns {Array<object>} Raw contact rows.
 */
export function searchContacts(db, terms) {
  if (terms.length === 0) {
    return db.prepare('SELECT * FROM contacts ORDER BY updated_at DESC LIMIT 200').all();
  }

  const params = [];
  const termBlocks = terms.map(() => {
    params.push(...Array(6).fill(null)); // placeholder; filled below
    return '(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ? OR notes LIKE ?)';
  });

  // Refill params with actual values (one like per column per term).
  params.length = 0;
  for (const term of terms) {
    const like = `%${term}%`;
    params.push(like, like, like, like, like, like);
  }

  const sql = `SELECT * FROM contacts WHERE ${termBlocks.join(' AND ')} ORDER BY updated_at DESC LIMIT 200`;
  return db.prepare(sql).all(...params);
}

/**
 * Query the notes table for rows matching all free-text terms and all tag filters.
 * Tag filter uses EXISTS subquery per tag (AND semantics across multiple tags).
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} terms - Free-text terms.
 * @param {string[]} tags - Tag names that must all be present on the note.
 * @returns {Array<object>} Raw note rows.
 */
export function searchNotes(db, terms, tags) {
  const params = [];
  const conditions = [];

  for (const term of terms) {
    conditions.push('n.content LIKE ?');
    params.push(`%${term}%`);
  }

  for (const tag of tags) {
    conditions.push(
      'EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = n.id AND t.name LIKE ?)'
    );
    params.push(`%${tag}%`);
  }

  let sql = 'SELECT n.* FROM notes n';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY n.updated_at DESC LIMIT 200';

  return db.prepare(sql).all(...params);
}

/**
 * Query the tasks table for rows matching all free-text terms, all tag filters,
 * and any status/priority/date constraints.
 * Tag filter uses EXISTS subquery per tag (AND semantics across multiple tags).
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} terms - Free-text terms.
 * @param {string[]} tags - Tag names that must all be present on the task.
 * @param {string|null} status - Exact status value to filter on, or null.
 * @param {string|null} priority - Exact priority value to filter on, or null.
 * @param {{ start: string, end: string }|null} date - due_date range filter, or null.
 * @returns {Array<object>} Raw task rows.
 */
export function searchTasks(db, terms, tags, status, priority, date) {
  const params = [];
  const conditions = [];

  for (const term of terms) {
    const like = `%${term}%`;
    conditions.push('(t.title LIKE ? OR t.body LIKE ?)');
    params.push(like, like);
  }

  for (const tag of tags) {
    conditions.push(
      'EXISTS (SELECT 1 FROM task_tags tt JOIN task_tags_vocab ttv ON ttv.id = tt.tag_id WHERE tt.task_id = t.id AND ttv.name LIKE ?)'
    );
    params.push(`%${tag}%`);
  }

  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }

  if (priority) {
    conditions.push('t.priority = ?');
    params.push(priority);
  }

  if (date) {
    conditions.push('t.due_date BETWEEN ? AND ?');
    params.push(date.start, date.end);
  }

  let sql = 'SELECT t.* FROM tasks t';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY t.updated_at DESC LIMIT 200';

  return db.prepare(sql).all(...params);
}

/**
 * Query the events table for rows matching all free-text terms and an optional date range.
 * Searches: title, description, location. Date range applied to start_at.
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} terms - Free-text terms.
 * @param {{ start: string, end: string }|null} date - start_at range filter, or null.
 * @returns {Array<object>} Raw event rows.
 */
export function searchEvents(db, terms, date) {
  const params = [];
  const conditions = [];

  for (const term of terms) {
    const like = `%${term}%`;
    conditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)');
    params.push(like, like, like);
  }

  if (date) {
    conditions.push("date(substr(start_at, 1, 10)) BETWEEN ? AND ?");
    params.push(date.start, date.end);
  }

  let sql = 'SELECT * FROM events';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY updated_at DESC LIMIT 200';

  return db.prepare(sql).all(...params);
}
