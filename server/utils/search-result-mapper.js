/**
 * Utility functions for converting raw DB rows into SearchResult objects
 * and computing relevance scores.
 * @module utils/search-result-mapper
 */

/**
 * Compute the number of whole days between a given UTC datetime string and now.
 * @param {string} updatedAt - ISO datetime string from the database.
 * @returns {number} Days since last update (0 = today).
 */
function daysSince(updatedAt) {
  if (!updatedAt) return 999;
  const updated = new Date(updatedAt.replace(' ', 'T') + 'Z');
  const diffMs = Date.now() - updated;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Compute a relevance score for a candidate, summing across each search term.
 * Scoring per term: title exact +100, starts-with +80, contains +60, body contains +30.
 * Bonuses: is_pinned +50, recency 20/(days+1).
 * @param {{ title: string, body: string, is_pinned: number, updated_at: string }} candidate
 * @param {string[]} terms - Individual free-text terms to score against.
 * @returns {number} Numeric relevance score.
 */
function scoreCandidate(candidate, terms) {
  let score = 0;
  const title = (candidate.title || '').toLowerCase();
  const body = (candidate.body || '').toLowerCase();

  for (const textTerm of terms) {
    const term = textTerm.toLowerCase();
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
  }

  if (candidate.is_pinned === 1) {
    score += 50;
  }

  score += 20 / (daysSince(candidate.updated_at) + 1);

  return score;
}

/**
 * Format a DB datetime string as "MMM D, YYYY" (e.g. "Jun 15, 2026").
 * @param {string} datetimeStr - ISO datetime string from the database.
 * @returns {string} Human-readable date string.
 */
function formatEventDate(datetimeStr) {
  if (!datetimeStr) return '';
  const date = new Date(datetimeStr.replace(' ', 'T') + 'Z');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Extract the note title (first line) and preview body (up to 80 chars of remainder).
 * @param {string} content - Raw note content.
 * @returns {{ title: string, preview: string }}
 */
function splitNoteContent(content) {
  if (!content) return { title: '', preview: '' };
  const newlineIdx = content.indexOf('\n');
  if (newlineIdx === -1) return { title: content, preview: '' };
  return { title: content.slice(0, newlineIdx), preview: content.slice(newlineIdx + 1, newlineIdx + 81) };
}

/**
 * Build the subtitle for a task result.
 * Format: "Due YYYY-MM-DD · Priority · Status" (due part omitted when no due_date).
 * @param {{ due_date: string|null, priority: string, status: string }} task
 * @returns {string}
 */
function buildTaskSubtitle(task) {
  const parts = [];
  if (task.due_date) parts.push(`Due ${task.due_date}`);
  parts.push(task.priority);
  parts.push(task.status);
  return parts.join(' · ');
}

/**
 * Build the subtitle for an event result.
 * Format: "MMM D, YYYY" optionally followed by " · location".
 * @param {{ start_at: string, location: string|null }} event
 * @returns {string}
 */
function buildEventSubtitle(event) {
  const datePart = formatEventDate(event.start_at);
  return event.location ? `${datePart} · ${event.location}` : datePart;
}

/**
 * Build the subtitle for a contact result.
 * Priority: company → email → phone → ''.
 * @param {{ company: string|null, email: string|null, phone: string|null }} contact
 * @returns {string}
 */
function buildContactSubtitle(contact) {
  if (contact.company) return contact.company;
  if (contact.email) return contact.email;
  if (contact.phone) return contact.phone;
  return '';
}

/**
 * Convert a raw contact row into a SearchResult object.
 * @param {object} row - Raw contacts table row.
 * @param {string[]} terms - Free-text search terms for scoring.
 * @returns {object} SearchResult with internal _score and _updatedAt fields.
 */
export function contactToResult(row, terms) {
  const title = `${row.first_name} ${row.last_name}`.trim();
  const candidate = {
    title,
    body: [row.email, row.phone, row.company, row.notes].filter(Boolean).join(' '),
    is_pinned: 0,
    updated_at: row.updated_at,
  };
  return {
    kind: 'contact',
    id: row.id,
    title,
    subtitle: buildContactSubtitle(row),
    url: `/contacts/${row.id}`,
    updatedAt: row.updated_at,
    isPinned: false,
    _score: scoreCandidate(candidate, terms),
    _updatedAt: row.updated_at,
  };
}

/**
 * Convert a raw note row into a SearchResult object.
 * @param {object} row - Raw notes table row.
 * @param {string[]} terms - Free-text search terms for scoring.
 * @returns {object} SearchResult with internal _score and _updatedAt fields.
 */
export function noteToResult(row, terms) {
  const { title, preview } = splitNoteContent(row.content);
  const candidate = { title, body: row.content, is_pinned: row.is_pinned, updated_at: row.updated_at };
  return {
    kind: 'note',
    id: row.id,
    title,
    subtitle: preview,
    url: `/notes/${row.id}`,
    updatedAt: row.updated_at,
    isPinned: Boolean(row.is_pinned),
    _score: scoreCandidate(candidate, terms),
    _updatedAt: row.updated_at,
  };
}

/**
 * Convert a raw task row into a SearchResult object.
 * @param {object} row - Raw tasks table row.
 * @param {string[]} terms - Free-text search terms for scoring.
 * @returns {object} SearchResult with internal _score and _updatedAt fields.
 */
export function taskToResult(row, terms) {
  const candidate = { title: row.title, body: row.body || '', is_pinned: row.is_pinned, updated_at: row.updated_at };
  return {
    kind: 'task',
    id: row.id,
    title: row.title,
    subtitle: buildTaskSubtitle(row),
    url: `/tasks/${row.id}`,
    updatedAt: row.updated_at,
    isPinned: Boolean(row.is_pinned),
    _score: scoreCandidate(candidate, terms),
    _updatedAt: row.updated_at,
  };
}

/**
 * Convert a raw event row into a SearchResult object.
 * @param {object} row - Raw events table row.
 * @param {string[]} terms - Free-text search terms for scoring.
 * @returns {object} SearchResult with internal _score and _updatedAt fields.
 */
export function eventToResult(row, terms) {
  const candidate = {
    title: row.title,
    body: [row.description, row.location].filter(Boolean).join(' '),
    is_pinned: 0,
    updated_at: row.updated_at,
  };
  return {
    kind: 'event',
    id: row.id,
    title: row.title,
    subtitle: buildEventSubtitle(row),
    url: `/calendar/events/${row.id}`,
    updatedAt: row.updated_at,
    isPinned: false,
    _score: scoreCandidate(candidate, terms),
    _updatedAt: row.updated_at,
  };
}
