/**
 * Unit tests for server/utils/search-query-parser.js.
 * Covers: plain text, all filter keys, #tag shorthand, combinations,
 * unknown keys falling through as text, implicit type narrowing for
 * date:/status:/priority:, and all four date: value forms.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseQuery } from '../../server/utils/search-query-parser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pin the system clock to a specific ISO date string so date-dependent tests
 * are deterministic. Restore after each test via afterEach.
 * @param {string} isoDate - e.g. '2024-03-15'
 */
function mockDate(isoDate) {
  vi.setSystemTime(new Date(`${isoDate}T12:00:00.000Z`));
}

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Empty / null input
// ---------------------------------------------------------------------------

describe('empty / null input', () => {
  it('returns a default result for an empty string', () => {
    const result = parseQuery('');
    expect(result.types).toBeNull();
    expect(result.status).toBeNull();
    expect(result.priority).toBeNull();
    expect(result.tags).toEqual([]);
    expect(result.date).toBeNull();
    expect(result.text).toBe('');
  });

  it('returns a default result for null', () => {
    const result = parseQuery(null);
    expect(result.types).toBeNull();
    expect(result.text).toBe('');
  });

  it('returns a default result for undefined', () => {
    const result = parseQuery(undefined);
    expect(result.types).toBeNull();
    expect(result.text).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

describe('plain text', () => {
  it('treats a single bare word as free text', () => {
    const result = parseQuery('hello');
    expect(result.text).toBe('hello');
    expect(result.types).toBeNull();
  });

  it('joins multiple bare words into free text', () => {
    const result = parseQuery('john doe');
    expect(result.text).toBe('john doe');
  });

  it('trims leading and trailing whitespace', () => {
    const result = parseQuery('  hello world  ');
    expect(result.text).toBe('hello world');
  });
});

// ---------------------------------------------------------------------------
// type: filter
// ---------------------------------------------------------------------------

describe('type: filter', () => {
  it('parses type:contact and stores it in types Set', () => {
    const result = parseQuery('type:contact');
    expect(result.types).toBeInstanceOf(Set);
    expect(result.types.has('contact')).toBe(true);
    expect(result.text).toBe('');
  });

  it('parses type:note', () => {
    expect(parseQuery('type:note').types.has('note')).toBe(true);
  });

  it('parses type:task', () => {
    expect(parseQuery('type:task').types.has('task')).toBe(true);
  });

  it('parses type:event', () => {
    expect(parseQuery('type:event').types.has('event')).toBe(true);
  });

  it('is case-insensitive for type key and value', () => {
    const result = parseQuery('TYPE:CONTACT');
    expect(result.types.has('contact')).toBe(true);
  });

  it('silently drops unknown type values', () => {
    const result = parseQuery('type:unknown');
    expect(result.types).toBeNull();
    expect(result.text).toBe('');
  });

  it('accumulates multiple type: tokens into one Set', () => {
    const result = parseQuery('type:task type:event');
    expect(result.types.has('task')).toBe(true);
    expect(result.types.has('event')).toBe(true);
    expect(result.types.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// status: filter
// ---------------------------------------------------------------------------

describe('status: filter', () => {
  it('normalises not-started to "Not Started"', () => {
    expect(parseQuery('status:not-started').status).toBe('Not Started');
  });

  it('normalises in-progress to "In Progress"', () => {
    expect(parseQuery('status:in-progress').status).toBe('In Progress');
  });

  it('normalises completed to "Completed"', () => {
    expect(parseQuery('status:completed').status).toBe('Completed');
  });

  it('normalises blocked to "Blocked"', () => {
    expect(parseQuery('status:blocked').status).toBe('Blocked');
  });

  it('normalises cancelled to "Cancelled"', () => {
    expect(parseQuery('status:cancelled').status).toBe('Cancelled');
  });

  it('is case-insensitive for status key and value', () => {
    expect(parseQuery('STATUS:COMPLETED').status).toBe('Completed');
  });

  it('treats unknown status values as free text', () => {
    const result = parseQuery('status:pending');
    expect(result.status).toBeNull();
    expect(result.text).toBe('status:pending');
  });
});

// ---------------------------------------------------------------------------
// priority: filter
// ---------------------------------------------------------------------------

describe('priority: filter', () => {
  it('normalises low to "Low"', () => {
    expect(parseQuery('priority:low').priority).toBe('Low');
  });

  it('normalises medium to "Medium"', () => {
    expect(parseQuery('priority:medium').priority).toBe('Medium');
  });

  it('normalises high to "High"', () => {
    expect(parseQuery('priority:high').priority).toBe('High');
  });

  it('is case-insensitive for priority key and value', () => {
    expect(parseQuery('PRIORITY:HIGH').priority).toBe('High');
  });

  it('treats unknown priority values as free text', () => {
    const result = parseQuery('priority:critical');
    expect(result.priority).toBeNull();
    expect(result.text).toBe('priority:critical');
  });
});

// ---------------------------------------------------------------------------
// tag: filter
// ---------------------------------------------------------------------------

describe('tag: filter', () => {
  it('parses a tag: token into the tags array', () => {
    const result = parseQuery('tag:urgent');
    expect(result.tags).toContain('urgent');
  });

  it('accumulates multiple tag: tokens', () => {
    const result = parseQuery('tag:urgent tag:work');
    expect(result.tags).toEqual(['urgent', 'work']);
  });

  it('is case-insensitive for the tag key but preserves value casing', () => {
    const result = parseQuery('TAG:MyTag');
    expect(result.tags).toContain('MyTag');
  });
});

// ---------------------------------------------------------------------------
// #tag shorthand
// ---------------------------------------------------------------------------

describe('#tagname shorthand', () => {
  it('treats #tagname as a tag filter', () => {
    const result = parseQuery('#urgent');
    expect(result.tags).toContain('urgent');
    expect(result.text).toBe('');
  });

  it('accumulates multiple #tags', () => {
    const result = parseQuery('#work #personal');
    expect(result.tags).toEqual(['work', 'personal']);
  });

  it('mixes #tag and tag: tokens', () => {
    const result = parseQuery('#work tag:urgent');
    expect(result.tags).toContain('work');
    expect(result.tags).toContain('urgent');
    expect(result.tags.length).toBe(2);
  });

  it('treats a lone # as free text (not a tag)', () => {
    const result = parseQuery('#');
    expect(result.tags).toEqual([]);
    expect(result.text).toBe('#');
  });
});

// ---------------------------------------------------------------------------
// date: filter — all four value forms
// ---------------------------------------------------------------------------

describe('date: filter', () => {
  it('resolves date:today to a same-start-and-end range', () => {
    vi.useFakeTimers();
    mockDate('2024-03-15');
    const result = parseQuery('date:today');
    expect(result.date).not.toBeNull();
    expect(result.date.start).toBe(result.date.end);
  });

  it('resolves date:tomorrow to the next calendar day', () => {
    vi.useFakeTimers();
    mockDate('2024-03-15');
    const result = parseQuery('date:tomorrow');
    expect(result.date.start).toBe('2024-03-16');
    expect(result.date.end).toBe('2024-03-16');
  });

  it('resolves date:this-week to Monday–Sunday of the current ISO week', () => {
    vi.useFakeTimers();
    // 2024-03-15 is a Friday
    mockDate('2024-03-15');
    const result = parseQuery('date:this-week');
    expect(result.date.start).toBe('2024-03-11'); // Monday
    expect(result.date.end).toBe('2024-03-17');   // Sunday
  });

  it('resolves date:this-week correctly when today is Sunday', () => {
    vi.useFakeTimers();
    // 2024-03-17 is a Sunday
    mockDate('2024-03-17');
    const result = parseQuery('date:this-week');
    expect(result.date.start).toBe('2024-03-11'); // Monday of same week
    expect(result.date.end).toBe('2024-03-17');
  });

  it('resolves a YYYY-MM-DD literal date', () => {
    const result = parseQuery('date:2024-06-01');
    expect(result.date).toEqual({ start: '2024-06-01', end: '2024-06-01' });
  });

  it('is case-insensitive for date keywords', () => {
    vi.useFakeTimers();
    mockDate('2024-03-15');
    const result = parseQuery('DATE:TODAY');
    expect(result.date).not.toBeNull();
  });

  it('treats an unresolvable date value as free text', () => {
    const result = parseQuery('date:yesterday');
    expect(result.date).toBeNull();
    expect(result.text).toBe('date:yesterday');
  });
});

// ---------------------------------------------------------------------------
// Unknown key:value tokens → free text
// ---------------------------------------------------------------------------

describe('unknown key:value tokens', () => {
  it('adds an unrecognised key:value token to free text', () => {
    const result = parseQuery('foo:bar');
    expect(result.text).toBe('foo:bar');
    expect(result.types).toBeNull();
  });

  it('mixes unrecognised tokens with recognised ones', () => {
    const result = parseQuery('type:task foo:bar hello');
    expect(result.types.has('task')).toBe(true);
    expect(result.text).toBe('foo:bar hello');
  });
});

// ---------------------------------------------------------------------------
// Implicit type narrowing
// ---------------------------------------------------------------------------

describe('implicit type narrowing', () => {
  it('sets types to [task, event] when date: is present and no type: given', () => {
    const result = parseQuery('date:2024-06-01');
    expect(result.types).toBeInstanceOf(Set);
    expect(result.types.has('task')).toBe(true);
    expect(result.types.has('event')).toBe(true);
    expect(result.types.size).toBe(2);
  });

  it('sets types to [task] when status: is present and no type: given', () => {
    const result = parseQuery('status:completed');
    expect(result.types).toBeInstanceOf(Set);
    expect(result.types.has('task')).toBe(true);
    expect(result.types.size).toBe(1);
  });

  it('sets types to [task] when priority: is present and no type: given', () => {
    const result = parseQuery('priority:high');
    expect(result.types).toBeInstanceOf(Set);
    expect(result.types.has('task')).toBe(true);
    expect(result.types.size).toBe(1);
  });

  it('does NOT apply implicit narrowing when explicit type: is given alongside date:', () => {
    const result = parseQuery('type:event date:2024-06-01');
    expect(result.types.has('event')).toBe(true);
    expect(result.types.has('task')).toBe(false);
    expect(result.types.size).toBe(1);
  });

  it('does NOT apply implicit narrowing when explicit type: is given alongside status:', () => {
    const result = parseQuery('type:contact status:completed');
    expect(result.types.has('contact')).toBe(true);
    expect(result.types.size).toBe(1);
  });

  it('status: wins over date: when both are present and no explicit type:', () => {
    const result = parseQuery('status:completed date:2024-06-01');
    expect(result.types.has('task')).toBe(true);
    expect(result.types.has('event')).toBe(false);
    expect(result.types.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Combination queries
// ---------------------------------------------------------------------------

describe('combination queries', () => {
  it('parses type + status + free text', () => {
    const result = parseQuery('type:task status:in-progress buy groceries');
    expect(result.types.has('task')).toBe(true);
    expect(result.status).toBe('In Progress');
    expect(result.text).toBe('buy groceries');
  });

  it('parses type + priority + #tag + free text', () => {
    const result = parseQuery('type:task priority:high #work meeting');
    expect(result.types.has('task')).toBe(true);
    expect(result.priority).toBe('High');
    expect(result.tags).toContain('work');
    expect(result.text).toBe('meeting');
  });

  it('parses type + tag: + date:', () => {
    const result = parseQuery('type:event tag:birthday date:2024-12-25');
    expect(result.types.has('event')).toBe(true);
    expect(result.tags).toContain('birthday');
    expect(result.date).toEqual({ start: '2024-12-25', end: '2024-12-25' });
    expect(result.text).toBe('');
  });

  it('handles all filter keys together with free text', () => {
    const result = parseQuery('type:task status:blocked priority:high tag:work #urgent date:2024-01-01 some text here');
    expect(result.types.has('task')).toBe(true);
    expect(result.status).toBe('Blocked');
    expect(result.priority).toBe('High');
    expect(result.tags).toContain('work');
    expect(result.tags).toContain('urgent');
    expect(result.date).toEqual({ start: '2024-01-01', end: '2024-01-01' });
    expect(result.text).toBe('some text here');
  });
});
