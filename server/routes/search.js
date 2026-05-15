/**
 * Express router for GET /api/search — unified search across all modules.
 * Query params: q (required, ≤500 chars), limit (default 10, max 50), offset (default 0).
 * @module routes/search
 */

import { Router } from 'express';
import { getDb } from '../db.js';
import { parseQuery } from '../utils/search-query-parser.js';
import { searchContacts, searchNotes, searchTasks, searchEvents } from '../utils/search-queries.js';
import { contactToResult, noteToResult, taskToResult, eventToResult } from '../utils/search-result-mapper.js';
import logger from '../logger.js';

const router = Router();

const MAX_Q_LENGTH = 500;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const ALL_TYPES = ['contact', 'note', 'task', 'event'];

/**
 * Build a successful response envelope.
 * @param {unknown} data
 * @param {object|null} [meta=null]
 * @returns {{ data: unknown, error: null, meta: object|null }}
 */
function ok(data, meta = null) {
  return { data, error: null, meta };
}

/**
 * Build an error response envelope.
 * @param {string} code
 * @param {Record<string, string>|null} [fields=null]
 * @returns {{ data: null, error: object, meta: null }}
 */
function fail(code, fields = null) {
  const error = { code };
  if (fields) error.fields = fields;
  return { data: null, error, meta: null };
}

/**
 * Determine which module types to query based on the parsed type filter.
 * @param {Set<string>|null} types
 * @returns {string[]}
 */
function resolveActiveTypes(types) {
  if (!types) return ALL_TYPES;
  return ALL_TYPES.filter((t) => types.has(t));
}

/**
 * GET /api/search
 * Unified ranked search across contacts, notes, tasks, and events.
 */
router.get('/', (req, res) => {
  const rawQ = req.query.q;

  if (rawQ === undefined || rawQ === null || rawQ === '') {
    logger.warn('GET /api/search — missing q param');
    return res.status(422).json(fail('MISSING_PARAMS', { q: 'required' }));
  }

  if (rawQ.length > MAX_Q_LENGTH) {
    logger.warn(`GET /api/search — q exceeds ${MAX_Q_LENGTH} chars`);
    return res.status(422).json(fail('VALIDATION_ERROR', { q: `must be at most ${MAX_Q_LENGTH} characters` }));
  }

  const rawLimit = parseInt(req.query.limit, 10);
  const rawOffset = parseInt(req.query.offset, 10);
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const { types, status, priority, tags, date, text } = parseQuery(rawQ);
  const terms = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
  const activeTypes = resolveActiveTypes(types);
  const db = getDb();

  /** @type {Array<object>} */
  const candidates = [];

  if (activeTypes.includes('contact')) {
    for (const row of searchContacts(db, terms)) {
      candidates.push(contactToResult(row, terms));
    }
  }

  if (activeTypes.includes('note')) {
    for (const row of searchNotes(db, terms, tags)) {
      candidates.push(noteToResult(row, terms));
    }
  }

  if (activeTypes.includes('task')) {
    for (const row of searchTasks(db, terms, tags, status, priority, date)) {
      candidates.push(taskToResult(row, terms));
    }
  }

  if (activeTypes.includes('event')) {
    for (const row of searchEvents(db, terms, date)) {
      candidates.push(eventToResult(row, terms));
    }
  }

  candidates.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    if (b._updatedAt > a._updatedAt) return 1;
    if (b._updatedAt < a._updatedAt) return -1;
    return 0;
  });

  const total = candidates.length;
  const results = candidates.slice(offset, offset + limit).map(({ _score, _updatedAt, ...result }) => result);

  logger.info(`GET /api/search q="${rawQ}" — total=${total} returned=${results.length}`);

  return res.status(200).json(ok({ results, total }, { count: results.length, total, q: rawQ }));
});

export default router;
