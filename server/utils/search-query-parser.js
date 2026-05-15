/**
 * Search query parser for the PIM unified search feature.
 * Converts a raw query string into a structured filter object.
 * @module search-query-parser
 */

/** @type {string[]} Valid entity type values. */
const VALID_TYPES = ['contact', 'note', 'task', 'event'];

/**
 * Map of lowercase status inputs to their DB-cased equivalents.
 * @type {Record<string, string>}
 */
const STATUS_MAP = {
  'not-started': 'Not Started',
  'notstarted': 'Not Started',
  'in-progress': 'In Progress',
  'inprogress': 'In Progress',
  'completed': 'Completed',
  'blocked': 'Blocked',
  'cancelled': 'Cancelled',
};

/**
 * Map of lowercase priority inputs to their DB-cased equivalents.
 * @type {Record<string, string>}
 */
const PRIORITY_MAP = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
};

/**
 * Recognised filter key names (case-insensitive).
 * @type {Set<string>}
 */
const FILTER_KEYS = new Set(['type', 'status', 'priority', 'tag', 'date']);

/**
 * Return the Monday of the ISO week that contains the given date.
 * @param {Date} date - Any date within the target week.
 * @returns {Date} Monday 00:00:00 of that week.
 */
function weekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  // Shift so Monday is 0
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a Date as a YYYY-MM-DD string in local time.
 * @param {Date} d - Date to format.
 * @returns {string} ISO date string.
 */
function toYMD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolve a date keyword or YYYY-MM-DD string to a { start, end } range.
 * Supported keywords: today, tomorrow, this-week.
 * Falls back to treating the value as a literal YYYY-MM-DD date.
 * @param {string} value - Raw date value from the query.
 * @returns {{ start: string, end: string } | null} Date range or null if unresolvable.
 */
function resolveDate(value) {
  const now = new Date();
  const lower = value.toLowerCase();

  if (lower === 'today') {
    const ymd = toYMD(now);
    return { start: ymd, end: ymd };
  }

  if (lower === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const ymd = toYMD(tomorrow);
    return { start: ymd, end: ymd };
  }

  if (lower === 'this-week') {
    const mon = weekStart(now);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: toYMD(mon), end: toYMD(sun) };
  }

  // Validate YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { start: value, end: value };
  }

  return null;
}

/**
 * Parse a raw search query string into a structured filter object.
 *
 * Recognised filter tokens:
 *   - `type:<value>` — entity type; valid values: contact, note, task, event
 *   - `status:<value>` — task status; normalised to DB casing
 *   - `priority:<value>` — task priority; normalised to DB casing
 *   - `tag:<value>` — tag name filter
 *   - `#tagname` — shorthand tag filter
 *   - `date:<value>` — date filter; supports today, tomorrow, this-week, YYYY-MM-DD
 *
 * Implicit type narrowing:
 *   - When `date:` is present and no explicit `type:` is given → types = ['task', 'event']
 *   - When `status:` or `priority:` is present and no explicit `type:` is given → types = ['task']
 *
 * Unrecognised key:value tokens and bare words are accumulated as free text.
 *
 * @param {string} rawQuery - The raw search string entered by the user.
 * @returns {{
 *   types: Set<string> | null,
 *   status: string | null,
 *   priority: string | null,
 *   tags: string[],
 *   date: { start: string, end: string } | null,
 *   text: string
 * }} Structured filter object.
 */
function parseQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return { types: null, status: null, priority: null, tags: [], date: null, text: '' };
  }

  const tokens = rawQuery.trim().split(/\s+/).filter(Boolean);

  /** @type {Set<string> | null} */
  let explicitTypes = null;
  /** @type {string | null} */
  let status = null;
  /** @type {string | null} */
  let priority = null;
  /** @type {string[]} */
  const tags = [];
  /** @type {{ start: string, end: string } | null} */
  let date = null;
  /** @type {string[]} */
  const freeTextParts = [];

  let hasExplicitType = false;
  let hasDate = false;
  let hasStatusOrPriority = false;

  for (const token of tokens) {
    // Handle #tagname shorthand
    if (token.startsWith('#') && token.length > 1) {
      tags.push(token.slice(1));
      continue;
    }

    const colonIndex = token.indexOf(':');
    if (colonIndex > 0) {
      const key = token.slice(0, colonIndex).toLowerCase();
      const value = token.slice(colonIndex + 1);

      if (!FILTER_KEYS.has(key)) {
        // Unrecognised key:value → treat as free text
        freeTextParts.push(token);
        continue;
      }

      if (key === 'type') {
        const normalised = value.toLowerCase();
        if (VALID_TYPES.includes(normalised)) {
          if (!explicitTypes) {
            explicitTypes = new Set();
          }
          explicitTypes.add(normalised);
          hasExplicitType = true;
        }
        // Silently drop unknown type values
        continue;
      }

      if (key === 'status') {
        const normalised = STATUS_MAP[value.toLowerCase()];
        if (normalised) {
          status = normalised;
          hasStatusOrPriority = true;
        } else {
          // Unknown status value → treat as free text
          freeTextParts.push(token);
        }
        continue;
      }

      if (key === 'priority') {
        const normalised = PRIORITY_MAP[value.toLowerCase()];
        if (normalised) {
          priority = normalised;
          hasStatusOrPriority = true;
        } else {
          // Unknown priority value → treat as free text
          freeTextParts.push(token);
        }
        continue;
      }

      if (key === 'tag') {
        if (value) {
          tags.push(value);
        }
        continue;
      }

      if (key === 'date') {
        const resolved = resolveDate(value);
        if (resolved) {
          date = resolved;
          hasDate = true;
        } else {
          // Unresolvable date → treat as free text
          freeTextParts.push(token);
        }
        continue;
      }
    }

    // Bare word or unrecognised token → free text
    freeTextParts.push(token);
  }

  // Apply implicit type narrowing when no explicit type:  was given
  let types = explicitTypes;
  if (!hasExplicitType) {
    if (hasDate && hasStatusOrPriority) {
      // Both narrowing signals present — status/priority wins (task only)
      types = new Set(['task']);
    } else if (hasStatusOrPriority) {
      types = new Set(['task']);
    } else if (hasDate) {
      types = new Set(['task', 'event']);
    }
  }

  return {
    types,
    status,
    priority,
    tags,
    date,
    text: freeTextParts.join(' '),
  };
}

export { parseQuery };
