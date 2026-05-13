/**
 * TimeColumn — left-hand hour-labels column for day/week calendar views.
 *
 * Renders 24 fixed-height rows (one per hour, 00:00 through 23:00). Each row
 * is 60 px tall to match the slot height used by DayColumn. Labels are
 * formatted in 12-hour AM/PM notation (e.g. "12 AM", "1 PM"). The row
 * corresponding to the current local hour receives a subtle blue highlight.
 *
 * This component accepts no props — the 24 rows are always fixed.
 *
 * @returns {JSX.Element}
 */

import React from 'react';

/** Total number of hours in a day. */
const HOURS_IN_DAY = 24;

/**
 * Format a 0-based hour integer (0–23) into a 12-hour AM/PM label string.
 *
 * Examples:
 *   0  → "12 AM"
 *   1  → "1 AM"
 *   12 → "12 PM"
 *   13 → "1 PM"
 *   23 → "11 PM"
 *
 * @param {number} hour - Integer in the range [0, 23].
 * @returns {string} Human-readable 12-hour label with AM/PM suffix.
 */
function formatHourLabel(hour) {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

/**
 * TimeColumn renders 24 labeled hour rows, each 60 px tall.
 * The current hour receives a light-blue background highlight.
 *
 * @returns {JSX.Element}
 */
function TimeColumn() {
  const currentHour = new Date().getHours();

  return (
    <div className="flex w-16 flex-none flex-col border-r border-gray-200 bg-white">
      {Array.from({ length: HOURS_IN_DAY }, (_, hour) => (
        <div
          key={hour}
          className={`flex h-[60px] flex-none items-start justify-end pr-2 pt-1 ${
            hour === currentHour ? 'bg-blue-50' : ''
          }`}
        >
          <span className="text-xs text-gray-400">{formatHourLabel(hour)}</span>
        </div>
      ))}
    </div>
  );
}

export default TimeColumn;
