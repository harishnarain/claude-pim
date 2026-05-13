/**
 * Express router for the GET /api/search unified search endpoint.
 * Queries all active module tables (contacts, notes, tasks, events), scores
 * each candidate, merges and sorts results, then returns a paginated envelope.
 * @module routes/search
 */

import { Router } from 'express';
import { getDb } from '../db.js';
import { parseQuery } from '../utils/search-query-parser.js';
import logger from '../logger.js';

const router = Router();

/** Maximum allowed length for the q query parameter. */
const MAX_Q_LENGTH = 500;

/** Default page size for results. */
const DEFAULT_LIMIT = 10;

/** Maximum page size cap. */
const MAX_LIMIT = 50;

/** All module types that can be searched. */
const ALL_TYPES = ['contact', 'note', 'task', 'event'];

/**
 * Build a successful response envelope.
 * @param {unknown} data - The response payload.
 * @param {object|null} [meta=null] - Optional metadata.
 * @returns {{ data: unknown, error: null, meta: object|null }} Envelope object.
 */
function ok(data, meta = null) {
  return { data, error: null, meta };
}

/**
 * Build an error response envelope.
 * @param {string} code - Machine-readable error code.
 * @param {Record<string, string>|null} [fields=null] - Per-field validation errors.
 * @returns {{ data: null, error: { code: string, fields?: Record<string, string> }, meta: null }} Envelope.
 */
function fail(code, fields = null) {
  const error = { code };
  if (fields) {
    error.fields = fields;
  }
  return { data: null, error, meta: null };
}

/**
 * Compute the number of whole days between a given UTC datetime string and now.
 * Used to calculate the recency score component.
 * @param {string} updatedAt - ISO datetime string from the database (e.g. '2025-01-01 12:00:00').
 * @returns {number} Number of days since the record was last updated (0 = today).
 */
function daysSince(updatedAt) {
  if (!updatedAt) return 999;
  const updated = new Date(updatedAt.replace(' ', 'T') + 'Z');
  const now = new Date();
  const diffMs = now - updated;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Compute a relevance score for a search candidate.
 * Scoring rules:
 *   - Title/name exact match (case-insensitive): +100
 *   - Title/name starts with text term (case-insensitive): +80
 *   - Title/name contains text term (case-insensitive): +60
 *   - Body/content/description contains text term (case-insensitive): +30
 *   - is_pinned = 1: +50
 *   - Recency: 20 / (daysSinceUpdated + 1)
 * @param {{ title: string, body: string, is_pinned: number, updated_at: string }} candidate - Raw candidate fields.
 * @param {string} textTerm - The free-text portion of the query (may be empty).
 * @returns {number} Numeric relevance score.
 */
function scoreCandidate(candidate, textTerm) {
  let score = 0;
  const term = textTerm ? textTerm.toLowerCase() : '';
  const title = (candidate.title || '').toLowerCase();
  const body = (candidate.body || '').toLowerCase();

  if (term) {
    if (title === term) {
      score += 100;
    } else if (title.startsWith(term)) {
      score += 80;
    } else if (title.includes(term)) {
      score += 60;
    }

    if (body.includes(term)) {
      score += 30;
    }
  }

  if (candidate.is_pinned === 1) {
    score += 50;
  }

  const days = daysSince(candidate.updated_at);
  score += 20 / (days + 1);

  return score;
}

/**
 * Format a Date object as "MMM D, YYYY" (e.g. "Jan 5, 2026").
 * @param {string} datetimeStr - ISO datetime string from the database.
 * @returns {string} Human-readable date string.
 */
function formatEventDate(datetimeStr) {
  if (!datetimeStr) return '';
  const date = new Date(datetimeStr.replace(' ', 'T') + 'Z');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Extract the note title (first line of content) and preview body (remaining lines).
 * @param {string} content - Raw note content.
 * @returns {{ title: string, preview: string }} Title and preview body.
 */
function splitNoteContent(content) {
  if (!content) return { title: '', preview: '' };
  const newlineIdx = content.indexOf('\n');
  if (newlineIdx === -1) {
    return { title: content, preview: '' };
  }
  const title = content.slice(0, newlineIdx);
  const rest = content.slice(newlineIdx + 1);
  const preview = rest.slice(0, 80);
  return { title, preview };
}

/**
 * Build the subtitle string for a task search result.
 * Format: "Due YYYY-MM-DD · Priority · Status" (due part omitted when no due_date).
 * @param {{ due_date: string|null, priority: string, status: string }} task - Task row fields.
 * @returns {string} Formatted task subtitle.
 */
function buildTaskSubtitle(task) {
  const parts = [];
  if (task.due_date) {
    parts.push(`Due ${task.due_date}`);
  }
  parts.push(task.priority);
  parts.push(task.status);
  return parts.join(' · ');
}

/**
 * Build the subtitle string for an event search result.
 * Format: "MMM D, YYYY" optionally followed by " · location".
 * @param {{ start_at: string, location: string|null }} event - Event row fields.
 * @returns {string} Formatted event subtitle.
 */
function buildEventSubtitle(event) {
  const datePart = formatEventDate(event.start_at);
  if (event.location) {
    return `${datePart} · ${event.location}`;
  }
  return datePart;
}

/**
 * Build the subtitle string for a contact search result.
 * Priority: company → email → phone → ''.
 * @param {{ company: string|null, email: string|null, phone: string|null }} contact - Contact row fields.
 * @returns {string} Formatted contact subtitle.
 */
function buildContactSubtitle(contact) {
  if (contact.company) return contact.company;
  if (contact.email) return contact.email;
  if (contact.phone) return contact.phone;
  return '';
}

/**
 * Query the contacts table for rows matching the given filters.
 * Searches: first_name, last_name, email, phone, company, notes columns.
 * @param {import('better-sqlite3').Database} db - Open database instance.
 * @param {string} textTerm - Free-text term to LIKE-match (may be empty string).
 * @returns {Array<object>} Raw contact rows.
 */
function searchContacts(db, textTerm) {
  if (!textTerm) {
    return db.prepare('SELECT * FROM contacts ORDER BY updated_at DESC LIMIT 200').all();
  }
  const like = `%${textTerm}%`;
  return db
    .prepare(
      `SELECT * FROM contacts
       WHERE first_name LIKE ?
          OR last_name  LIKE ?
          OR email      LIKE ?
          OR phone      LIKE ?
          OR company    LIKE ?
          OR notes      LIKE ?
       ORDER BY updated_at DESC
       LIMIT 200`
    )
    .all(like, like, like, like, like, like);
}

/**
 * Query the notes table for rows matching text and optional tag filters.
 * Searches: content column. Tags are matched via the note_tags join table.
 * @param {import('better-sqlite3').Database} db - Open database instance.
 * @param {string} textTerm - Free-text term to LIKE-match (may be empty string).
 * @param {string[]} tags - Tag names to require (all must match via AND).
 * @returns {Array<object>} Raw note rows.
 */
function searchNotes(db, textTerm, tags) {
  const params = [];
  let sql = 'SELECT DISTINCT n.* FROM notes n';

  if (tags.length > 0) {
    sql += ' JOIN note_tags nt ON nt.note_id = n.id JOIN tags t ON t.id = nt.tag_id';
  }

  const conditions = [];

  if (textTerm) {
    const like = `%${textTerm}%`;
    conditions.push('n.content LIKE ?');
    params.push(like);
  }

  if (tags.length > 0) {
    const tagConditions = tags.map(() => 't.name LIKE ?');
    conditions.push(`(${tagConditions.join(' OR ')})`);
    for (const tag of tags) {
      params.push(`%${tag}%`);
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY n.updated_at DESC LIMIT 200';

  return db.prepare(sql).all(...params);
}

/**
 * Query the tasks table for rows matching text, tag, status, priority, and date filters.
 * Searches: title, body columns. Tags via task_tags join table. Status/priority direct columns.
 * @param {import('better-sqlite3').Database} db - Open database instance.
 * @param {string} textTerm - Free-text term to LIKE-match (may be empty string).
 * @param {string[]} tags - Tag names to require.
 * @param {string|null} status - Exact status value to filter on (or null).
 * @param {string|null} priority - Exact priority value to filter on (or null).
 * @param {{ start: string, end: string }|null} date - Date range to filter due_date (or null).
 * @returns {Array<object>} Raw task rows.
 */
function searchTasks(db, textTerm, tags, status, priority, date) {
  const params = [];
  let sql = 'SELECT DISTINCT t.* FROM tasks t';

  if (tags.length > 0) {
    sql += ' JOIN task_tags tt ON tt.task_id = t.id JOIN task_tags_vocab ttv ON ttv.id = tt.tag_id';
  }

  const conditions = [];

  if (textTerm) {
    const like = `%${textTerm}%`;
    conditions.push('(t.title LIKE ? OR t.body LIKE ?)');
    params.push(like, like);
  }

  if (tags.length > 0) {
    const tagConditions = tags.map(() => 'ttv.name LIKE ?');
    conditions.push(`(${tagConditions.join(' OR ')})`);
    for (const tag of tags) {
      params.push(`%${tag}%`);
    }
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

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY t.updated_at DESC LIMIT 200';

  return db.prepare(sql).all(...params);
}

/**
 * Query the events table for rows matching text and optional date range filters.
 * Searches: title, description, location columns. Date range applied to start_at.
 * @param {import('better-sqlite3').Database} db - Open database instance.
 * @param {string} textTerm - Free-text term to LIKE-match (may be empty string).
 * @param {{ start: string, end: string }|null} date - Date range to filter start_at (or null).
 * @returns {Array<object>} Raw event rows.
 */
function searchEvents(db, textTerm, date) {
  const params = [];
  const conditions = [];
  let sql = 'SELECT * FROM events';

  if (textTerm) {
    const like = `%${textTerm}%`;
    conditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)');
    params.push(like, like, like);
  }

  if (date) {
    conditions.push("date(substr(start_at, 1, 10)) BETWEEN ? AND ?");
    params.push(date.start, date.end);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY updated_at DESC LIMIT 200';

  return db.prepare(sql).all(...params);
}

/**
 * Convert a raw contact DB row into a SearchResult object.
 * @param {object} row - Raw contacts table row.
 * @param {string} textTerm - Free-text search term for scoring.
 * @returns {{ kind: string, id: number, title: string, subtitle: string, url: string, updatedAt: string, isPinned: boolean, _score: number, _updatedAt: string }} SearchResult with internal scoring fields.
 */
function contactToResult(row, textTerm) {
  const title = `${row.first_name} ${row.last_name}`.trim();
  const subtitle = buildContactSubtitle(row);
  const candidate = { title, body: [row.email, row.phone, row.company, row.notes].filter(Boolean).join(' '), is_pinned: 0, updated_at: row.updated_at };
  const score = scoreCandidate(candidate, textTerm);
  return {
    kind: 'contact',
    id: row.id,
    title,
    subtitle,
    url: `/contacts/${row.id}`,
    updatedAt: row.updated_at,
    isPinned: false,
    _score: score,
    _updatedAt: row.updated_at,
  };
}

/**
 * Convert a raw note DB row into a SearchResult object.
 * @param {object} row - Raw notes table row.
 * @param {string} textTerm - Free-text search term for scoring.
 * @returns {{ kind: string, id: number, title: string, subtitle: string, url: string, updatedAt: string, isPinned: boolean, _score: number, _updatedAt: string }} SearchResult with internal scoring fields.
 */
function noteToResult(row, textTerm) {
  const { title, preview } = splitNoteContent(row.content);
  const candidate = { title, body: row.content, is_pinned: row.is_pinned, updated_at: row.updated_at };
  const score = scoreCandidate(candidate, textTerm);
  return {
    kind: 'note',
    id: row.id,
    title,
    subtitle: preview,
    url: `/notes/${row.id}`,
    updatedAt: row.updated_at,
    isPinned: Boolean(row.is_pinned),
    _score: score,
    _updatedAt: row.updated_at,
  };
}

/**
 * Convert a raw task DB row into a SearchResult object.
 * @param {object} row - Raw tasks table row.
 * @param {string} textTerm - Free-text search term for scoring.
 * @returns {{ kind: string, id: number, title: string, subtitle: string, url: string, updatedAt: string, isPinned: boolean, _score: number, _updatedAt: string }} SearchResult with internal scoring fields.
 */
function taskToResult(row, textTerm) {
  const candidate = { title: row.title, body: row.body || '', is_pinned: row.is_pinned, updated_at: row.updated_at };
  const score = scoreCandidate(candidate, textTerm);
  return {
    kind: 'task',
    id: row.id,
    title: row.title,
    subtitle: buildTaskSubtitle(row),
    url: `/tasks/${row.id}`,
    updatedAt: row.updated_at,
    isPinned: Boolean(row.is_pinned),
    _score: score,
    _updatedAt: row.updated_at,
  };
}

/**
 * Convert a raw event DB row into a SearchResult object.
 * @param {object} row - Raw events table row.
 * @param {string} textTerm - Free-text search term for scoring.
 * @returns {{ kind: string, id: number, title: string, subtitle: string, url: string, updatedAt: string, isPinned: boolean, _score: number, _updatedAt: string }} SearchResult with internal scoring fields.
 */
function eventToResult(row, textTerm) {
  const candidate = {
    title: row.title,
    body: [row.description, row.location].filter(Boolean).join(' '),
    is_pinned: 0,
    updated_at: row.updated_at,
  };
  const score = scoreCandidate(candidate, textTerm);
  return {
    kind: 'event',
    id: row.id,
    title: row.title,
    subtitle: buildEventSubtitle(row),
    url: `/calendar`,
    updatedAt: row.updated_at,
    isPinned: false,
    _score: score,
    _updatedAt: row.updated_at,
  };
}

/**
 * Determine which module types should be searched based on the parsed query.
 * When types is null, all modules are active.
 * @param {Set<string>|null} types - Set of requested types, or null for all.
 * @returns {string[]} Array of type strings to query.
 */
function resolveActiveTypes(types) {
  if (!types) return ALL_TYPES;
  return ALL_TYPES.filter((t) => types.has(t));
}

/**
 * GET /api/search
 * Unified search across contacts, notes, tasks, and events.
 * Query parameters:
 *   - q (required): raw search query string, max 500 chars
 *   - limit (optional): max results per page, default 10, max 50
 *   - offset (optional): pagination offset, default 0
 * Returns a ranked, paginated list of SearchResult objects.
 */
router.get('/', (req, res) => {
  const rawQ = req.query.q;

  if (rawQ === undefined || rawQ === null || rawQ === '') {
    logger.warn('GET /api/search — missing q param');
    return res.status(422).json(fail('MISSING_PARAMS', { q: 'required' }));
  }

  if (typeof rawQ === 'string' && rawQ.length > MAX_Q_LENGTH) {
    logger.warn(`GET /api/search — q exceeds ${MAX_Q_LENGTH} chars`);
    return res.status(422).json(fail('VALIDATION_ERROR', { q: `must be at most ${MAX_Q_LENGTH} characters` }));
  }

  const rawLimit = parseInt(req.query.limit, 10);
  const rawOffset = parseInt(req.query.offset, 10);
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const parsed = parseQuery(rawQ);
  const { types, status, priority, tags, date, text } = parsed;
  const textTerm = text.trim();

  const activeTypes = resolveActiveTypes(types);
  const db = getDb();

  /** @type {Array<object>} */
  const candidates = [];

  if (activeTypes.includes('contact')) {
    const rows = searchContacts(db, textTerm);
    for (const row of rows) {
      candidates.push(contactToResult(row, textTerm));
    }
  }

  if (activeTypes.includes('note')) {
    const rows = searchNotes(db, textTerm, tags);
    for (const row of rows) {
      candidates.push(noteToResult(row, textTerm));
    }
  }

  if (activeTypes.includes('task')) {
    const rows = searchTasks(db, textTerm, tags, status, priority, date);
    for (const row of rows) {
      candidates.push(taskToResult(row, textTerm));
    }
  }

  if (activeTypes.includes('event')) {
    const rows = searchEvents(db, textTerm, date);
    for (const row of rows) {
      candidates.push(eventToResult(row, textTerm));
    }
  }

  // Sort by score DESC, then updated_at DESC as tiebreaker.
  candidates.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    if (b._updatedAt > a._updatedAt) return 1;
    if (b._updatedAt < a._updatedAt) return -1;
    return 0;
  });

  const total = candidates.length;
  const slice = candidates.slice(offset, offset + limit);

  // Strip internal scoring fields before returning.
  const results = slice.map(({ _score, _updatedAt, ...result }) => result);

  logger.info(`GET /api/search q="${rawQ}" — total=${total} returned=${results.length}`);

  return res.status(200).json(ok({ results, total }, { count: results.length, total, q: rawQ }));
});

export default router;
