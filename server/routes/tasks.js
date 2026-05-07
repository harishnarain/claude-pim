/**
 * Express router for the /api/tasks resource.
 * Implements all five REST endpoints: list, get-one, create, update, delete.
 * Tags are attached to each task response via the TaskTag model.
 * JWT auth is wired in a later task; no auth middleware is applied here.
 * @module routes/tasks
 */

import { Router } from 'express';
import { getDb } from '../db.js';
import * as Task from '../models/task.js';
import * as TaskTag from '../models/task-tag.js';
import logger from '../logger.js';

const router = Router();

/** Valid sort keys for GET /api/tasks. */
const VALID_SORT_KEYS = new Set(['due_asc', 'due_desc', 'priority_desc', 'updated_desc']);

/** Valid status enum values. */
const VALID_STATUSES = new Set(['Not Started', 'Blocked', 'In Progress', 'Completed', 'Cancelled']);

/** Valid priority enum values. */
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High']);

/** Maximum character length for a task title. */
const MAX_TITLE_LENGTH = 255;

/** Maximum character length for a task body. */
const MAX_BODY_LENGTH = 10_000;

/** Maximum number of tags allowed per task. */
const MAX_TAGS_COUNT = 5;

/** Maximum character length for a single tag name. */
const MAX_TAG_NAME_LENGTH = 30;

/** ISO-8601 date pattern (YYYY-MM-DD). */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build a successful response envelope.
 * @param {unknown} data - The response payload.
 * @param {object|null} [meta=null] - Optional metadata (e.g. count).
 * @returns {{ data: unknown, error: null, meta: object|null }} Envelope object.
 */
function ok(data, meta = null) {
  return { data, error: null, meta };
}

/**
 * Build an error response envelope.
 * @param {string} code - Machine-readable error code (e.g. 'NOT_FOUND').
 * @param {Record<string, string>|null} [fields=null] - Per-field validation errors.
 * @returns {{ data: null, error: { code: string, fields?: Record<string, string> }, meta: null }} Envelope object.
 */
function fail(code, fields = null) {
  const error = { code };
  if (fields) {
    error.fields = fields;
  }
  return { data: null, error, meta: null };
}

/**
 * Attach a `tags` array to a task object by querying the TaskTag model.
 * Returns a new object; does not mutate the original.
 * @param {{ id: number, [key: string]: unknown }} task - A task row from the database.
 * @returns {{ id: number, tags: Array<{ id: number, name: string }>, [key: string]: unknown }} Task with tags attached.
 */
function attachTags(task) {
  return { ...task, tags: TaskTag.getTagsForTask(task.id) };
}

/**
 * Parse a route parameter as a positive integer.
 * @param {string} param - The raw route parameter string.
 * @returns {number|null} Parsed integer, or null if not a valid positive integer.
 */
function parseId(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Validate whether a date string represents a valid calendar date.
 * Matches the YYYY-MM-DD pattern and checks month/day ranges.
 * @param {string} value - The date string to validate.
 * @returns {boolean} True if the date is valid, false otherwise.
 */
function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/**
 * Validate task input fields. Returns a map of field -> error message for
 * any fields that fail validation, or an empty object if all valid.
 * @param {object} fields - Fields to validate.
 * @param {unknown} [fields.title] - Task title.
 * @param {unknown} [fields.body] - Task body.
 * @param {unknown} [fields.due_date] - Due date in YYYY-MM-DD format.
 * @param {unknown} [fields.priority] - Priority enum value.
 * @param {unknown} [fields.status] - Status enum value.
 * @param {unknown} [fields.tags] - Array of tag name strings.
 * @param {boolean} [requireTitle=false] - Whether title is required (POST vs PATCH).
 * @returns {Record<string, string>} Map of field name to error message.
 */
function validateTaskFields({ title, body, due_date, priority, status, tags }, requireTitle = false) {
  const errors = {};

  if (requireTitle) {
    if (
      title === undefined ||
      title === null ||
      typeof title !== 'string' ||
      title.trim().length === 0 ||
      title.length > MAX_TITLE_LENGTH
    ) {
      errors.title = `required and must be a non-empty string of at most ${MAX_TITLE_LENGTH} characters`;
    }
  } else if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > MAX_TITLE_LENGTH) {
      errors.title = `must be a non-empty string of at most ${MAX_TITLE_LENGTH} characters`;
    }
  }

  if (body !== undefined && body !== null) {
    if (typeof body !== 'string' || body.length > MAX_BODY_LENGTH) {
      errors.body = `must be a string of at most ${MAX_BODY_LENGTH} characters`;
    }
  }

  if (due_date !== undefined && due_date !== null) {
    if (typeof due_date !== 'string' || !isValidDate(due_date)) {
      errors.due_date = 'must be a valid date in YYYY-MM-DD format';
    }
  }

  if (priority !== undefined) {
    if (!VALID_PRIORITIES.has(priority)) {
      errors.priority = `must be one of: ${[...VALID_PRIORITIES].join(', ')}`;
    }
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.has(status)) {
      errors.status = `must be one of: ${[...VALID_STATUSES].join(', ')}`;
    }
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.tags = 'must be an array';
    } else if (tags.length > MAX_TAGS_COUNT) {
      errors.tags = `must contain at most ${MAX_TAGS_COUNT} tags`;
    } else {
      const overlong = tags.find(
        (t) => typeof t !== 'string' || t.trim().length === 0 || t.trim().length > MAX_TAG_NAME_LENGTH
      );
      if (overlong !== undefined) {
        errors.tags = `each tag name must be at most ${MAX_TAG_NAME_LENGTH} characters`;
      }
    }
  }

  return errors;
}

/**
 * GET /api/tasks
 * List all tasks with optional sort, status, and priority filters.
 * Each task includes a computed `tags` array and `body_preview` (first 140 chars).
 * Unknown sort values fall back to `due_asc`. Unknown filter values are dropped.
 */
router.get('/', (req, res) => {
  const rawSort = req.query.sort ?? 'due_asc';
  const sort = VALID_SORT_KEYS.has(rawSort) ? rawSort : 'due_asc';

  const rawStatus = typeof req.query.status === 'string' ? req.query.status : '';
  const statusFilter = rawStatus
    ? rawStatus.split(',').map((s) => s.trim()).filter((s) => VALID_STATUSES.has(s))
    : [];

  const rawPriority = typeof req.query.priority === 'string' ? req.query.priority : '';
  const priorityFilter = rawPriority
    ? rawPriority.split(',').map((p) => p.trim()).filter((p) => VALID_PRIORITIES.has(p))
    : [];

  const tasks = Task.findAll({ sort, status: statusFilter, priority: priorityFilter }).map(attachTags);
  logger.info(`GET /api/tasks — returned ${tasks.length} record(s)`);
  res.status(200).json(ok(tasks, { count: tasks.length }));
});

/**
 * GET /api/tasks/:id
 * Retrieve a single task by its integer ID, with full body and tags attached.
 */
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const task = Task.findById(id);

  if (!task) {
    logger.warn(`GET /api/tasks/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  logger.info(`GET /api/tasks/${id} — found`);
  res.status(200).json(ok(attachTags(task)));
});

/**
 * POST /api/tasks
 * Create a new task. Validates all fields and normalises tag names.
 * Returns 201 with the full task object including tags.
 */
router.post('/', (req, res) => {
  const { title, body, due_date, priority, status, is_pinned, tags } = req.body ?? {};

  const errors = validateTaskFields({ title, body, due_date, priority, status, tags }, true);

  if (Object.keys(errors).length > 0) {
    logger.warn('POST /api/tasks — validation error');
    return res.status(422).json(fail('VALIDATION_ERROR', errors));
  }

  const task = Task.create({ title, body, due_date, priority, status, is_pinned });

  const tagNames = Array.isArray(tags) ? tags.map((t) => t.toLowerCase().trim()) : [];
  TaskTag.syncTaskTags(task.id, tagNames);

  const result = attachTags(Task.findById(task.id));
  logger.info(`POST /api/tasks — created id=${task.id}`);
  res.status(201).json(ok(result));
});

/**
 * PATCH /api/tasks/:id
 * Partially update a task. When `tags` is present the tag set is replaced;
 * when absent the existing tags are preserved. Updates updated_at.
 */
router.patch('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const existing = Task.findById(id);

  if (!existing) {
    logger.warn(`PATCH /api/tasks/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const { title, body, due_date, priority, status, is_pinned, tags } = req.body ?? {};

  const errors = validateTaskFields({
    title: title !== undefined ? title : undefined,
    body: body !== undefined ? body : undefined,
    due_date: due_date !== undefined ? due_date : undefined,
    priority: priority !== undefined ? priority : undefined,
    status: status !== undefined ? status : undefined,
    tags: tags !== undefined ? tags : undefined,
  });

  if (Object.keys(errors).length > 0) {
    logger.warn(`PATCH /api/tasks/${id} — validation error`);
    return res.status(422).json(fail('VALIDATION_ERROR', errors));
  }

  const updateFields = {};
  if (title !== undefined) updateFields.title = title;
  if (body !== undefined) updateFields.body = body;
  if (due_date !== undefined) updateFields.due_date = due_date;
  if (priority !== undefined) updateFields.priority = priority;
  if (status !== undefined) updateFields.status = status;
  if (is_pinned !== undefined) updateFields.is_pinned = is_pinned;

  Task.update(id, updateFields);

  if (tags !== undefined) {
    const tagNames = tags.map((t) => t.toLowerCase().trim());
    TaskTag.syncTaskTags(id, tagNames);
  }

  const result = attachTags(Task.findById(id));
  logger.info(`PATCH /api/tasks/${id} — updated`);
  res.status(200).json(ok(result));
});

/**
 * DELETE /api/tasks/:id
 * Remove a task by ID. ON DELETE CASCADE removes task_tags rows automatically.
 * After deletion, runs a standalone orphan cleanup for task_tags_vocab.
 * Returns 404 if the task does not exist.
 */
router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const existing = Task.findById(id);

  if (!existing) {
    logger.warn(`DELETE /api/tasks/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  Task.destroy(id);

  // Run standalone orphan cleanup for task_tags_vocab after cascade deletes task_tags rows.
  const db = getDb();
  db.prepare('DELETE FROM task_tags_vocab WHERE id NOT IN (SELECT DISTINCT tag_id FROM task_tags)').run();

  logger.info(`DELETE /api/tasks/${id} — deleted`);
  res.status(200).json(ok({ deleted: true }));
});

export default router;
