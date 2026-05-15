/**
 * Date/time helper utilities for seed data generation.
 * All values are computed relative to the current UTC date at call time.
 * @module seed/helpers
 */

/**
 * Return a UTC date string in 'YYYY-MM-DD' format for today plus an offset.
 * @param {number} offsetDays - Days to add to today (may be negative).
 * @returns {string} Date string in 'YYYY-MM-DD' format.
 */
export function isoDate(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Return a UTC datetime string in 'YYYY-MM-DD HH:MM:SS' format for today
 * plus an offset at the given hour and minute (seconds always 00).
 * @param {number} offsetDays - Days to add to today (may be negative).
 * @param {number} hour - UTC hour (0–23).
 * @param {number} minute - UTC minute (0–59).
 * @returns {string} Datetime string in 'YYYY-MM-DD HH:MM:SS' format.
 */
export function isoDateTime(offsetDays, hour, minute) {
  const datePart = isoDate(offsetDays);
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${datePart} ${hh}:${mm}:00`;
}

/**
 * Add a number of minutes to a 'YYYY-MM-DD HH:MM:SS' UTC datetime string.
 * @param {string} datetimeStr - Datetime in 'YYYY-MM-DD HH:MM:SS' format (UTC).
 * @param {number} minutes - Minutes to add.
 * @returns {string} New datetime string in 'YYYY-MM-DD HH:MM:SS' format (UTC).
 */
export function addMinutes(datetimeStr, minutes) {
  const d = new Date(datetimeStr.replace(' ', 'T') + 'Z');
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
