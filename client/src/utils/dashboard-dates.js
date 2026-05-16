/**
 * dashboard-dates.js
 *
 * Pure date/time utility functions for the Dashboard feature.
 * No external dependencies; all functions accept an optional `date` parameter
 * so they are testable without global Date mocking.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Numeric rank for task priority labels — used for descending sort.
 *
 * @type {{ High: number, Medium: number, Low: number }}
 */
export const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

// ---------------------------------------------------------------------------
// getGreeting
// ---------------------------------------------------------------------------

/**
 * Return a time-appropriate greeting string based on the local hour.
 *
 * | Hour range  | Greeting         |
 * |-------------|------------------|
 * | 05:00–11:59 | "Good morning"   |
 * | 12:00–16:59 | "Good afternoon" |
 * | 17:00–04:59 | "Good evening"   |
 *
 * @param {Date} [date=new Date()]  - Date used to read the local hour
 * @returns {string}
 */
export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ---------------------------------------------------------------------------
// formatFullDate
// ---------------------------------------------------------------------------

/**
 * Format a date as "Weekday, D Month YYYY" using the browser locale.
 *
 * Example: "Friday, 15 May 2026"
 *
 * @param {Date} [date=new Date()]  - Date to format
 * @returns {string}
 */
export function formatFullDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// ---------------------------------------------------------------------------
// getTodayISO
// ---------------------------------------------------------------------------

/**
 * Return the local date as an ISO "YYYY-MM-DD" string.
 *
 * Uses `toLocaleDateString('en-CA')` which produces the YYYY-MM-DD format
 * without any UTC conversion.
 *
 * @param {Date} [date=new Date()]  - Date to convert
 * @returns {string}  e.g. "2026-05-15"
 */
export function getTodayISO(date = new Date()) {
  return date.toLocaleDateString('en-CA');
}

// ---------------------------------------------------------------------------
// formatEventTime
// ---------------------------------------------------------------------------

/**
 * Extract the HH:MM time portion from an ISO 8601 datetime string.
 *
 * Expects a string of the form "YYYY-MM-DDTHH:MM…" and returns the 5
 * characters starting at index 11.
 *
 * @param {string} startAt  - ISO 8601 datetime string, e.g. "2026-05-15T09:30:00"
 * @returns {string}         e.g. "09:30"
 */
export function formatEventTime(startAt) {
  return startAt.slice(11, 16);
}

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------

/**
 * Add `n` days to an ISO date string and return the result as an ISO date string.
 *
 * Uses `new Date(isoDate + 'T00:00:00')` to anchor to local midnight so
 * DST transitions do not shift the date.
 *
 * @param {string} isoDate  - ISO date string "YYYY-MM-DD"
 * @param {number} n        - Number of days to add (may be negative)
 * @returns {string}         ISO date string "YYYY-MM-DD"
 */
export function addDays(isoDate, n) {
  const ms = new Date(isoDate + 'T00:00:00').getTime() + n * 24 * 60 * 60 * 1000;
  return new Date(ms).toLocaleDateString('en-CA');
}

// ---------------------------------------------------------------------------
// Internal helper: dayDiff
// ---------------------------------------------------------------------------

/**
 * Compute the signed difference in calendar days between two ISO date strings.
 * Positive means `targetISO` is in the future relative to `baseISO`.
 *
 * @param {string} baseISO    - Base date "YYYY-MM-DD"
 * @param {string} targetISO  - Target date "YYYY-MM-DD"
 * @returns {number}
 */
function dayDiff(baseISO, targetISO) {
  const base = new Date(baseISO + 'T00:00:00').getTime();
  const target = new Date(targetISO + 'T00:00:00').getTime();
  return Math.round((target - base) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// formatRelativePastDate
// ---------------------------------------------------------------------------

/**
 * Format a past ISO date relative to today.
 *
 * | Days ago | Output        |
 * |----------|---------------|
 * | 1        | "Yesterday"   |
 * | 2+       | "N days ago"  |
 *
 * @param {string} isoDate   - ISO date string of the past date "YYYY-MM-DD"
 * @param {string} todayISO  - ISO date string for today "YYYY-MM-DD"
 * @returns {string}
 */
export function formatRelativePastDate(isoDate, todayISO) {
  const diff = dayDiff(isoDate, todayISO); // positive: isoDate is in the past
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

// ---------------------------------------------------------------------------
// formatRelativeFutureDate
// ---------------------------------------------------------------------------

/**
 * Format a future ISO date relative to today.
 *
 * | Days ahead | Output                           |
 * |------------|----------------------------------|
 * | 1          | "Tomorrow"                       |
 * | 2–4        | "In N days"                      |
 * | 5–7        | Short weekday + day, e.g. "Fri 17"|
 *
 * @param {string} isoDate   - ISO date string of the future date "YYYY-MM-DD"
 * @param {string} todayISO  - ISO date string for today "YYYY-MM-DD"
 * @returns {string}
 */
export function formatRelativeFutureDate(isoDate, todayISO) {
  const diff = dayDiff(todayISO, isoDate); // positive: isoDate is in the future
  if (diff === 1) return 'Tomorrow';
  if (diff <= 4) return `In ${diff} days`;
  // 5–7 days: short weekday + numeric day
  const date = new Date(isoDate + 'T00:00:00');
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
  }).format(date);
}
