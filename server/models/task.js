/**
 * Task model — CRUD operations against the `tasks` SQLite table.
 * All queries use parameterised statements (no string interpolation of user input).
 * Tag wiring is handled separately by the task-tag model.
 * @module models/task
 */

import { getDb } from '../db.js';

/** Valid sort keys and their corresponding SQL ORDER BY expression (third-tier only). */
const SORT_EXPR = {
  due_asc: "COALESCE(due_date, '9999-12-31') ASC",
  due_desc: "COALESCE(due_date, '0000-01-01') DESC",
  priority_desc: "CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END ASC",
  updated_desc: 'updated_at DESC',
};

/** Whitelisted status enum values. */
const VALID_STATUSES = new Set(['Not Started', 'Blocked', 'In Progress', 'Completed', 'Cancelled']);

/** Whitelisted priority enum values. */
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High']);

/**
 * Build the three-tier ORDER BY clause for findAll queries.
 * Tier 1: is_pinned DESC (pinned first).
 * Tier 2: active tasks before Completed/Cancelled.
 * Tier 3: the caller-supplied sort key.
 * @param {string} sort - One of the SORT_EXPR keys.
 * @returns {string} A SQL ORDER BY expression string (without the ORDER BY keyword).
 */
function buildOrderBy(sort) {
  const tertiary = SORT_EXPR[sort] ?? SORT_EXPR.due_asc;
  return [
    'is_pinned DESC',
    "CASE WHEN status IN ('Completed', 'Cancelled') THEN 1 ELSE 0 END ASC",
    tertiary,
  ].join(', ');
}

/**
 * Create a new task record.
 * @param {{ title: string, body?: string, due_date?: string, due_time?: string, priority?: string, status?: string, is_pinned?: number|boolean }} fields - Task fields.
 * @returns {{ id: number, title: string, body: string|null, due_date: string|null, due_time: string|null, priority: string, status: string, is_pinned: number, created_at: string, updated_at: string }} The newly created task row.
 */
function create(fields) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tasks (title, body, due_date, due_time, priority, status, is_pinned)
    VALUES (@title, @body, @due_date, @due_time, @priority, @status, @is_pinned)
  `);

  const info = stmt.run({
    title: fields.title ?? '',
    body: fields.body ?? null,
    due_date: fields.due_date ?? null,
    due_time: fields.due_time ?? null,
    priority: fields.priority ?? 'Low',
    status: fields.status ?? 'Not Started',
    is_pinned: fields.is_pinned ? 1 : 0,
  });

  return findById(info.lastInsertRowid);
}

/**
 * Return all tasks with a body_preview computed column (first 140 chars of body).
 * Applies three-tier ordering: pinned first, active before done, then the given sort.
 * Optionally filters by status and/or priority arrays (only whitelisted values accepted).
 * Tags are NOT attached in findAll — the route layer merges tags separately.
 *
 * Sort options:
 *   - 'due_asc' (default): tasks with no due_date sort last
 *   - 'due_desc': tasks with no due_date sort first
 *   - 'priority_desc': High → Medium → Low
 *   - 'updated_desc': most recently updated first
 *
 * @param {{ sort?: string, status?: string[], priority?: string[] }} [options={}] - Filter/sort options.
 * @returns {Array<{ id: number, title: string, body_preview: string|null, due_date: string|null, priority: string, status: string, is_pinned: number, created_at: string, updated_at: string }>} Array of task rows with body_preview.
 */
function findAll({ sort = 'due_asc', status = [], priority = [] } = {}) {
  const db = getDb();

  // Filter out unknown enum values to prevent SQL injection via whitelists.
  const safeStatuses = (status ?? []).filter((s) => VALID_STATUSES.has(s));
  const safePriorities = (priority ?? []).filter((p) => VALID_PRIORITIES.has(p));

  const whereClauses = [];

  if (safeStatuses.length > 0) {
    const placeholders = safeStatuses.map(() => '?').join(', ');
    whereClauses.push(`status IN (${placeholders})`);
  }

  if (safePriorities.length > 0) {
    const placeholders = safePriorities.map(() => '?').join(', ');
    whereClauses.push(`priority IN (${placeholders})`);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderSQL = buildOrderBy(sort);

  const sql = `
    SELECT
      id,
      title,
      SUBSTR(body, 1, 140) AS body_preview,
      due_date,
      priority,
      status,
      is_pinned,
      created_at,
      updated_at
    FROM tasks
    ${whereSQL}
    ORDER BY ${orderSQL}
  `;

  // Bind positional parameters in the same order the placeholders appear.
  const params = [...safeStatuses, ...safePriorities];
  return db.prepare(sql).all(params);
}

/**
 * Find a single task by its primary key. Returns the full body (not a preview).
 * @param {number} id - The task's integer ID.
 * @returns {{ id: number, title: string, body: string|null, due_date: string|null, due_time: string|null, priority: string, status: string, is_pinned: number, created_at: string, updated_at: string } | undefined} The task row, or undefined if not found.
 */
function findById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      id,
      title,
      body,
      due_date,
      due_time,
      priority,
      status,
      is_pinned,
      created_at,
      updated_at
    FROM tasks
    WHERE id = ?
  `);
  return stmt.get(id);
}

/**
 * Update a task record with the given fields. Only provided fields are changed.
 * updated_at is always refreshed to the current UTC datetime.
 * @param {number} id - The task's integer ID.
 * @param {{ title?: string, body?: string, due_date?: string, due_time?: string, priority?: string, status?: string, is_pinned?: number|boolean }} fields - Fields to update (partial).
 * @returns {{ id: number, title: string, body: string|null, due_date: string|null, due_time: string|null, priority: string, status: string, is_pinned: number, created_at: string, updated_at: string } | undefined} The updated task row, or undefined if not found.
 */
function update(id, fields) {
  const db = getDb();

  const ALLOWED_COLUMNS = ['title', 'body', 'due_date', 'due_time', 'priority', 'status', 'is_pinned'];

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
    UPDATE tasks
    SET ${setClauses.join(', ')}
    WHERE id = @id
  `);

  stmt.run({ ...normalizedFields, id });

  return findById(id);
}

/**
 * Delete a task by its primary key.
 * task_tags rows are removed automatically via ON DELETE CASCADE.
 * @param {number} id - The task's integer ID.
 * @returns {{ deleted: boolean }} An object indicating whether a row was deleted.
 */
function destroy(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const info = stmt.run(id);
  return { deleted: info.changes > 0 };
}

export { create, findAll, findById, update, destroy };
