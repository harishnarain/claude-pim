/**
 * Unit tests for the dashboard-dates utility
 * (client/src/utils/dashboard-dates.js).
 *
 * All functions under test are pure — no global Date mocking required
 * because each function accepts an optional `date` parameter.
 */
import { describe, it, expect } from 'vitest';
import {
  PRIORITY_RANK,
  getGreeting,
  formatFullDate,
  getTodayISO,
  formatEventTime,
  addDays,
  formatRelativePastDate,
  formatRelativeFutureDate,
} from '../../client/src/utils/dashboard-dates.js';

// ---------------------------------------------------------------------------
// PRIORITY_RANK
// ---------------------------------------------------------------------------

describe('PRIORITY_RANK', () => {
  it('has High > Medium > Low', () => {
    expect(PRIORITY_RANK.High).toBeGreaterThan(PRIORITY_RANK.Medium);
    expect(PRIORITY_RANK.Medium).toBeGreaterThan(PRIORITY_RANK.Low);
  });

  it('exports numeric values for all three levels', () => {
    expect(typeof PRIORITY_RANK.High).toBe('number');
    expect(typeof PRIORITY_RANK.Medium).toBe('number');
    expect(typeof PRIORITY_RANK.Low).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// getGreeting
// ---------------------------------------------------------------------------

describe('getGreeting()', () => {
  /**
   * Build a Date set to a specific local hour.
   *
   * @param {number} hour  - 0–23
   * @returns {Date}
   */
  function dateAtHour(hour) {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d;
  }

  it('returns "Good morning" at 05:00', () => {
    expect(getGreeting(dateAtHour(5))).toBe('Good morning');
  });

  it('returns "Good morning" at 11:59 (hour 11)', () => {
    const d = new Date();
    d.setHours(11, 59, 0, 0);
    expect(getGreeting(d)).toBe('Good morning');
  });

  it('returns "Good afternoon" at 12:00', () => {
    expect(getGreeting(dateAtHour(12))).toBe('Good afternoon');
  });

  it('returns "Good afternoon" at 16:59 (hour 16)', () => {
    const d = new Date();
    d.setHours(16, 59, 0, 0);
    expect(getGreeting(d)).toBe('Good afternoon');
  });

  it('returns "Good evening" at 17:00', () => {
    expect(getGreeting(dateAtHour(17))).toBe('Good evening');
  });

  it('returns "Good evening" at 23:00', () => {
    expect(getGreeting(dateAtHour(23))).toBe('Good evening');
  });

  it('returns "Good evening" at 00:00 (midnight)', () => {
    expect(getGreeting(dateAtHour(0))).toBe('Good evening');
  });

  it('returns "Good evening" at 04:59 (hour 4)', () => {
    const d = new Date();
    d.setHours(4, 59, 0, 0);
    expect(getGreeting(d)).toBe('Good evening');
  });

  it('defaults to new Date() when no argument is passed', () => {
    // Just assert it returns one of the three expected strings.
    const result = getGreeting();
    expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// formatFullDate
// ---------------------------------------------------------------------------

describe('formatFullDate()', () => {
  it('returns a non-empty string', () => {
    const result = formatFullDate(new Date('2026-05-15T12:00:00'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains the year 2026 for a 2026 date', () => {
    const result = formatFullDate(new Date('2026-05-15T12:00:00'));
    expect(result).toMatch(/2026/);
  });

  it('defaults to new Date() when no argument is passed', () => {
    const result = formatFullDate();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getTodayISO
// ---------------------------------------------------------------------------

describe('getTodayISO()', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const result = getTodayISO(new Date('2026-05-15T12:00:00'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns "2026-05-15" for 15 May 2026 local noon', () => {
    // Use local noon to avoid any TZ-edge cases in CI.
    const d = new Date(2026, 4, 15, 12, 0, 0); // month is 0-based
    expect(getTodayISO(d)).toBe('2026-05-15');
  });

  it('defaults to new Date() when no argument is passed', () => {
    const result = getTodayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// formatEventTime
// ---------------------------------------------------------------------------

describe('formatEventTime()', () => {
  it('extracts HH:MM from a full ISO datetime string', () => {
    expect(formatEventTime('2026-05-15T09:30:00')).toBe('09:30');
  });

  it('handles midnight correctly', () => {
    expect(formatEventTime('2026-05-15T00:00:00')).toBe('00:00');
  });

  it('handles end-of-day time', () => {
    expect(formatEventTime('2026-12-31T23:59:00')).toBe('23:59');
  });
});

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------

describe('addDays()', () => {
  it('adds 3 days to 2026-05-15 to get 2026-05-18', () => {
    expect(addDays('2026-05-15', 3)).toBe('2026-05-18');
  });

  it('adds 0 days returns the same date', () => {
    expect(addDays('2026-05-15', 0)).toBe('2026-05-15');
  });

  it('subtracts 1 day (n=-1) correctly', () => {
    expect(addDays('2026-05-15', -1)).toBe('2026-05-14');
  });

  it('rolls over month boundaries', () => {
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
  });

  it('rolls over year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

// ---------------------------------------------------------------------------
// formatRelativePastDate
// ---------------------------------------------------------------------------

describe('formatRelativePastDate()', () => {
  it('returns "Yesterday" when 1 day ago', () => {
    expect(formatRelativePastDate('2026-05-14', '2026-05-15')).toBe('Yesterday');
  });

  it('returns "2 days ago" when 2 days ago', () => {
    expect(formatRelativePastDate('2026-05-13', '2026-05-15')).toBe('2 days ago');
  });

  it('returns "7 days ago" when 7 days ago', () => {
    expect(formatRelativePastDate('2026-05-08', '2026-05-15')).toBe('7 days ago');
  });

  it('returns "30 days ago" when 30 days ago', () => {
    expect(formatRelativePastDate('2026-04-15', '2026-05-15')).toBe('30 days ago');
  });
});

// ---------------------------------------------------------------------------
// formatRelativeFutureDate
// ---------------------------------------------------------------------------

describe('formatRelativeFutureDate()', () => {
  it('returns "Tomorrow" when 1 day ahead', () => {
    expect(formatRelativeFutureDate('2026-05-16', '2026-05-15')).toBe('Tomorrow');
  });

  it('returns "In 2 days" when 2 days ahead', () => {
    expect(formatRelativeFutureDate('2026-05-17', '2026-05-15')).toBe('In 2 days');
  });

  it('returns "In 3 days" when 3 days ahead', () => {
    expect(formatRelativeFutureDate('2026-05-18', '2026-05-15')).toBe('In 3 days');
  });

  it('returns "In 4 days" when 4 days ahead', () => {
    expect(formatRelativeFutureDate('2026-05-19', '2026-05-15')).toBe('In 4 days');
  });

  it('returns a short weekday+day string when 5 days ahead', () => {
    const result = formatRelativeFutureDate('2026-05-20', '2026-05-15');
    // Locale formats vary: "Wed 20" or "20 Wed" are both acceptable.
    // Verify it contains the numeric day and a short alphabetic weekday token.
    expect(result).toMatch(/\d+/);   // contains the day number
    expect(result).toMatch(/[A-Za-z]+/); // contains a weekday abbreviation
    expect(result).toContain('20');
  });

  it('returns a short weekday+day string when 7 days ahead', () => {
    const result = formatRelativeFutureDate('2026-05-22', '2026-05-15');
    expect(result).toMatch(/\d+/);
    expect(result).toMatch(/[A-Za-z]+/);
    expect(result).toContain('22');
  });
});
