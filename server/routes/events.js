/**
 * Express router for the /api/events resource.
 * Implements all five REST endpoints: list (with task chips), get-one, create, update, delete.
 * The GET /api/events endpoint merges calendar events and task chips into a unified response.
 * @module routes/events
 */

import { Router } from 'express';
import { getDb } from '../db.js';
import * as Event from '../models/event.js';
import logger from '../logger.js';

const router = Router();

/** Valid color values for an event. */
const VALID_COLORS = new Set(['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange', 'grey']);

/** ISO-8601 datetime pattern without seconds (YYYY-MM-DDTHH:MM). */
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** ISO-8601 date pattern (YYYY-MM-DD). */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Maximum character length for an event title. */
const MAX_TITLE_LENGTH = 255;

/** Maximum character length for an event description. */
const MAX_DESCRIPTION_LENGTH = 10_000;

/** Maximum character length for an event location. */
const MAX_LOCATION_LENGTH = 255;

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
 * Convert a snake_case event row from the database to a camelCase response object.
 * @param {{ id: number, title: string, description: string|null, location: string|null, all_day: number, start_at: string, end_at: string, color: string, created_at: string, updated_at: string }} row - Raw DB row.
 * @returns {{ id: number, title: string, description: string|null, location: string|null, allDay: number, startAt: string, endAt: string, color: string, createdAt: string, updatedAt: string }} camelCase event object.
 */
function toCamelEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    allDay: row.all_day,
    startAt: row.start_at,
    endAt: row.end_at,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a snake_case task chip row from the database to a camelCase object.
 * @param {{ id: number, title: string, due_date: string|null, due_time: string|null, status: string, priority: string, is_pinned: number }} row - Raw DB task chip row.
 * @returns {{ id: number, title: string, dueDate: string|null, dueTime: string|null, status: string, priority: string, isPinned: number }} camelCase task chip object.
 */
function toCamelTaskChip(row) {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    dueTime: row.due_time,
    status: row.status,
    priority: row.priority,
    isPinned: row.is_pinned,
  };
}

/**
 * Validate event input fields. Returns a map of field -> error message for
 * any fields that fail validation, or an empty object if all are valid.
 * @param {object} fields - Fields to validate.
 * @param {unknown} [fields.title] - Event title.
 * @param {unknown} [fields.description] - Event description.
 * @param {unknown} [fields.location] - Event location.
 * @param {unknown} [fields.allDay] - Whether the event is all-day.
 * @param {unknown} [fields.startAt] - Start datetime in YYYY-MM-DDTHH:MM format.
 * @param {unknown} [fields.endAt] - End datetime in YYYY-MM-DDTHH:MM format; must be >= startAt.
 * @param {unknown} [fields.color] - Event color; must be in VALID_COLORS.
 * @param {boolean} [requireAll=false] - Whether all required fields are mandatory (POST vs PATCH).
 * @returns {Record<string, string>} Map of field name to error message.
 */
function validateEventFields({ title, description, location, allDay, startAt, endAt, color }, requireAll = false) {
  const errors = {};

  if (requireAll) {
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

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH) {
      errors.description = `must be a string of at most ${MAX_DESCRIPTION_LENGTH} characters`;
    }
  }

  if (location !== undefined && location !== null) {
    if (typeof location !== 'string' || location.length > MAX_LOCATION_LENGTH) {
      errors.location = `must be a string of at most ${MAX_LOCATION_LENGTH} characters`;
    }
  }

  if (allDay !== undefined && allDay !== null) {
    if (typeof allDay !== 'boolean') {
      errors.allDay = 'must be a boolean';
    }
  }

  let startAtValid = false;
  if (requireAll) {
    if (startAt === undefined || startAt === null) {
      errors.startAt = 'required and must be a datetime in YYYY-MM-DDTHH:MM format';
    } else if (typeof startAt !== 'string' || !DATETIME_PATTERN.test(startAt)) {
      errors.startAt = 'must be a datetime in YYYY-MM-DDTHH:MM format';
    } else if (!isValidDate(startAt.slice(0, 10))) {
      errors.startAt = 'must contain a valid calendar date';
    } else {
      startAtValid = true;
    }
  } else if (startAt !== undefined) {
    if (typeof startAt !== 'string' || !DATETIME_PATTERN.test(startAt)) {
      errors.startAt = 'must be a datetime in YYYY-MM-DDTHH:MM format';
    } else if (!isValidDate(startAt.slice(0, 10))) {
      errors.startAt = 'must contain a valid calendar date';
    } else {
      startAtValid = true;
    }
  }

  if (requireAll) {
    if (endAt === undefined || endAt === null) {
      errors.endAt = 'required and must be a datetime in YYYY-MM-DDTHH:MM format';
    } else if (typeof endAt !== 'string' || !DATETIME_PATTERN.test(endAt)) {
      errors.endAt = 'must be a datetime in YYYY-MM-DDTHH:MM format';
    } else if (!isValidDate(endAt.slice(0, 10))) {
      errors.endAt = 'must contain a valid calendar date';
    } else if (startAtValid && endAt < startAt) {
      errors.endAt = 'must be greater than or equal to startAt';
    }
  } else if (endAt !== undefined) {
    if (typeof endAt !== 'string' || !DATETIME_PATTERN.test(endAt)) {
      errors.endAt = 'must be a datetime in YYYY-MM-DDTHH:MM format';
    } else if (!isValidDate(endAt.slice(0, 10))) {
      errors.endAt = 'must contain a valid calendar date';
    } else if (startAtValid && endAt < startAt) {
      errors.endAt = 'must be greater than or equal to startAt';
    }
  }

  if (color !== undefined && color !== null) {
    if (!VALID_COLORS.has(color)) {
      errors.color = `must be one of: ${[...VALID_COLORS].join(', ')}`;
    }
  }

  return errors;
}

/**
 * GET /api/events
 * List all events and task chips within the given [start, end] date window.
 * Both `start` and `end` query params are required (YYYY-MM-DD format, valid dates).
 * Returns a merged array of events (kind: 'event') and tasks with due dates (kind: 'task').
 * Returns 422 MISSING_PARAMS if either param is absent.
 */
router.get('/', (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    logger.warn('GET /api/events — missing start or end query param');
    return res.status(422).json(fail('MISSING_PARAMS'));
  }

  if (!DATE_PATTERN.test(start) || !isValidDate(start)) {
    return res.status(422).json(fail('VALIDATION_ERROR', { start: 'must be a valid date in YYYY-MM-DD format' }));
  }

  if (!DATE_PATTERN.test(end) || !isValidDate(end)) {
    return res.status(422).json(fail('VALIDATION_ERROR', { end: 'must be a valid date in YYYY-MM-DD format' }));
  }

  const events = Event.findAll({ start, end }).map((row) => ({ ...toCamelEvent(row), kind: 'event' }));

  const db = getDb();
  const taskRows = db
    .prepare(
      'SELECT id, title, due_date, due_time, status, priority, is_pinned FROM tasks WHERE due_date BETWEEN ? AND ?'
    )
    .all(start, end);

  const tasks = taskRows.map((row) => ({ ...toCamelTaskChip(row), kind: 'task' }));

  const data = [...events, ...tasks];

  logger.info(`GET /api/events — returned ${events.length} event(s) and ${tasks.length} task chip(s)`);
  res.status(200).json(ok(data, { count: data.length, start, end }));
});

/**
 * POST /api/events
 * Create a new event. Validates all required fields (title, startAt, endAt).
 * Accepts camelCase body fields and persists them as snake_case in the database.
 * Returns 201 with the full event object in camelCase.
 */
router.post('/', (req, res) => {
  const { title, description, location, allDay, startAt, endAt, color } = req.body ?? {};

  const errors = validateEventFields({ title, description, location, allDay, startAt, endAt, color }, true);

  if (Object.keys(errors).length > 0) {
    logger.warn('POST /api/events — validation error');
    return res.status(422).json(fail('VALIDATION_ERROR', errors));
  }

  const row = Event.create({
    title,
    description,
    location,
    all_day: allDay,
    start_at: startAt,
    end_at: endAt,
    color,
  });

  logger.info(`POST /api/events — created id=${row.id}`);
  res.status(201).json(ok(toCamelEvent(row)));
});

/**
 * GET /api/events/:id
 * Retrieve a single event by its integer ID.
 * Returns 404 if not found or id is not a valid positive integer.
 * Response is camelCase (no `kind` field).
 */
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const row = Event.findById(id);

  if (!row) {
    logger.warn(`GET /api/events/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  logger.info(`GET /api/events/${id} — found`);
  res.status(200).json(ok(toCamelEvent(row)));
});

/**
 * PATCH /api/events/:id
 * Partially update an event. Only provided fields are changed.
 * Accepts camelCase body fields and persists them as snake_case in the database.
 * Returns 200 with the full updated event object in camelCase.
 */
router.patch('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const existing = Event.findById(id);

  if (!existing) {
    logger.warn(`PATCH /api/events/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const { title, description, location, allDay, startAt, endAt, color } = req.body ?? {};

  const errors = validateEventFields({ title, description, location, allDay, startAt, endAt, color }, false);

  if (Object.keys(errors).length > 0) {
    logger.warn(`PATCH /api/events/${id} — validation error`);
    return res.status(422).json(fail('VALIDATION_ERROR', errors));
  }

  const updateFields = {};
  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (location !== undefined) updateFields.location = location;
  if (allDay !== undefined) updateFields.all_day = allDay;
  if (startAt !== undefined) updateFields.start_at = startAt;
  if (endAt !== undefined) updateFields.end_at = endAt;
  if (color !== undefined) updateFields.color = color;

  const updated = Event.update(id, updateFields);

  logger.info(`PATCH /api/events/${id} — updated`);
  res.status(200).json(ok(toCamelEvent(updated)));
});

/**
 * DELETE /api/events/:id
 * Remove an event by ID.
 * Returns 404 if the event does not exist.
 * Returns 200 with { deleted: true } on success.
 */
router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const existing = Event.findById(id);

  if (!existing) {
    logger.warn(`DELETE /api/events/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  Event.destroy(id);

  logger.info(`DELETE /api/events/${id} — deleted`);
  res.status(200).json(ok({ deleted: true }));
});

export default router;
