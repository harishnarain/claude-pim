/**
 * Express router for the /api/notes resource.
 * Implements all five REST endpoints: list, get-one, create, update, delete.
 * Tags are attached to each note response via the Tag model.
 * JWT auth is wired in a later task; no auth middleware is applied here.
 * @module routes/notes
 */

import { Router } from 'express';
import * as Note from '../models/note.js';
import * as Tag from '../models/tag.js';
import logger from '../logger.js';

const router = Router();

/** Maximum allowed byte length for note content. */
const MAX_CONTENT_LENGTH = 25_000;

/** Maximum number of tags allowed per note. */
const MAX_TAGS_COUNT = 5;

/** Maximum character length for a single tag name. */
const MAX_TAG_NAME_LENGTH = 30;

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
 * Attach a `tags` array to a note object by querying the tag model.
 * Returns a new object; does not mutate the original.
 * @param {{ id: number, [key: string]: unknown }} note - A note row from the database.
 * @returns {{ id: number, tags: Array<{ id: number, name: string }>, [key: string]: unknown }} Note with tags attached.
 */
function attachTags(note) {
  return { ...note, tags: Tag.getTagsForNote(note.id) };
}

/**
 * Validate note input fields. Returns a map of field -> error message for
 * any fields that fail validation, or an empty object if all valid.
 * @param {{ content?: unknown, tags?: unknown }} fields - Fields to validate.
 * @returns {Record<string, string>} Map of field name to error message.
 */
function validateNoteFields({ content, tags }) {
  const errors = {};

  if (content !== undefined) {
    if (typeof content !== 'string' || content.length > MAX_CONTENT_LENGTH) {
      errors.content = `must be a string of at most ${MAX_CONTENT_LENGTH} characters`;
    }
  }

  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.tags = 'must be an array';
    } else if (tags.length > MAX_TAGS_COUNT) {
      errors.tags = `must contain at most ${MAX_TAGS_COUNT} tags`;
    } else {
      const overlong = tags.find(
        (t) => typeof t !== 'string' || t.trim().length > MAX_TAG_NAME_LENGTH
      );
      if (overlong !== undefined) {
        errors.tags = `each tag name must be at most ${MAX_TAG_NAME_LENGTH} characters`;
      }
    }
  }

  return errors;
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
 * GET /api/notes
 * List all notes ordered by the ?sort= query parameter (default: updated_desc).
 * Each note includes a computed `tags` array.
 */
router.get('/', (req, res) => {
  const sort = req.query.sort ?? 'updated_desc';
  const notes = Note.findAll({ sort }).map(attachTags);
  logger.info(`GET /api/notes — returned ${notes.length} record(s)`);
  res.status(200).json(ok(notes, { count: notes.length }));
});

/**
 * GET /api/notes/:id
 * Retrieve a single note by its integer ID, with tags attached.
 */
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const note = Note.findById(id);

  if (!note) {
    logger.warn(`GET /api/notes/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  logger.info(`GET /api/notes/${id} — found`);
  res.status(200).json(ok(attachTags(note)));
});

/**
 * POST /api/notes
 * Create a new note. Validates content length and tag constraints.
 * Normalises tag names (lowercase, trim) before persisting.
 */
router.post('/', (req, res) => {
  const { content = '', is_pinned, tags } = req.body ?? {};

  const errors = validateNoteFields({ content, tags });

  if (Object.keys(errors).length > 0) {
    logger.warn('POST /api/notes — validation error');
    return res.status(422).json(fail('VALIDATION_ERROR', errors));
  }

  const note = Note.create({ content, is_pinned });

  const tagNames = Array.isArray(tags) ? tags : [];
  Tag.syncNoteTags(note.id, tagNames);

  const result = attachTags(Note.findById(note.id));
  logger.info(`POST /api/notes — created id=${note.id}`);
  res.status(201).json(ok(result));
});

/**
 * PATCH /api/notes/:id
 * Partially update a note. When `tags` is present the tag set is replaced;
 * when absent the existing tags are preserved. Updates updated_at.
 */
router.patch('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const existing = Note.findById(id);

  if (!existing) {
    logger.warn(`PATCH /api/notes/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const { content, is_pinned, tags } = req.body ?? {};

  const errors = validateNoteFields({
    content: content !== undefined ? content : undefined,
    tags: tags !== undefined ? tags : undefined,
  });

  if (Object.keys(errors).length > 0) {
    logger.warn(`PATCH /api/notes/${id} — validation error`);
    return res.status(422).json(fail('VALIDATION_ERROR', errors));
  }

  const updateFields = {};
  if (content !== undefined) updateFields.content = content;
  if (is_pinned !== undefined) updateFields.is_pinned = is_pinned;

  Note.update(id, updateFields);

  if (tags !== undefined) {
    Tag.syncNoteTags(id, tags);
  }

  const result = attachTags(Note.findById(id));
  logger.info(`PATCH /api/notes/${id} — updated`);
  res.status(200).json(ok(result));
});

/**
 * DELETE /api/notes/:id
 * Remove a note by ID. Orphaned tags are cleaned up by syncNoteTags internals
 * (ON DELETE CASCADE removes note_tags; the orphan sweep runs automatically
 * on the next syncNoteTags call or via the tag model's deleteOrphans logic).
 * Returns 404 if the note does not exist.
 */
router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const existing = Note.findById(id);

  if (!existing) {
    logger.warn(`DELETE /api/notes/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  Note.destroy(id);

  // Run orphan tag cleanup after deletion (note_tags rows already removed by ON DELETE CASCADE).
  Tag.deleteOrphans();

  logger.info(`DELETE /api/notes/${id} — deleted`);
  res.status(200).json(ok({ deleted: true }));
});

export default router;
