/**
 * CalendarToolbar — toolbar strip rendered at the top of CalendarPage.
 *
 * Contains four view-switching tabs (Day, Work Week, Week, Month), previous/next
 * arrow buttons for navigating the calendar, a Today button for jumping to the
 * current date, and a human-readable date range label derived from the active view
 * and the current anchor date.
 *
 * This component is purely presentational — it owns no state. All interaction is
 * delegated to the provided callback props.
 *
 * @param {object}   props
 * @param {string}   props.activeView     - Current view key: 'day' | 'workweek' | 'week' | 'month'
 * @param {Function} props.onViewChange   - Called with the new view key when a tab is clicked.
 * @param {Date}     props.currentDate    - The anchor Date object used to derive the range label.
 * @param {Function} props.onPrev         - Called when the left-arrow (previous) button is clicked.
 * @param {Function} props.onNext         - Called when the right-arrow (next) button is clicked.
 * @param {Function} props.onToday        - Called when the Today button is clicked.
 * @returns {JSX.Element}
 */

import React from 'react';

/** @type {{ key: string, label: string }[]} */
const VIEW_TABS = [
  { key: 'day', label: 'Day' },
  { key: 'workweek', label: 'Work Week' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

/** Month names used for date range label generation. */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Short month names used when two different months appear in the same range. */
const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ---------------------------------------------------------------------------
// Date range label helpers
// ---------------------------------------------------------------------------

/**
 * Add `n` days to a Date and return a new Date (does not mutate the original).
 *
 * @param {Date}   date - Base date.
 * @param {number} n    - Number of days to add (may be negative).
 * @returns {Date}
 */
function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
  return d;
}

/**
 * Derive a human-readable date range string for the toolbar label.
 *
 * Examples:
 *   day      → "May 7, 2026"
 *   workweek → "May 4–8, 2026"
 *   week     → "May 4–10, 2026"
 *   month    → "May 2026"
 *
 * When the range spans two months, the format becomes:
 *   "Apr 28 – May 4, 2026"  (short month names for both ends)
 *
 * When the range spans two years:
 *   "Dec 30, 2025 – Jan 5, 2026"
 *
 * @param {Date}   currentDate - The anchor date for the current calendar view.
 * @param {string} activeView  - One of 'day' | 'workweek' | 'week' | 'month'.
 * @returns {string}
 */
function buildDateRangeLabel(currentDate, activeView) {
  const d = currentDate instanceof Date ? currentDate : new Date(currentDate);

  if (activeView === 'day') {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  if (activeView === 'month') {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  // workweek: Mon–Fri of the anchor week
  // week: Sun–Sat of the anchor week
  let rangeStart;
  let rangeEnd;

  if (activeView === 'workweek') {
    const dow = d.getDay(); // 0 = Sun … 6 = Sat
    const monday = addDays(d, dow === 0 ? -6 : 1 - dow);
    rangeStart = monday;
    rangeEnd = addDays(monday, 4); // Friday
  } else {
    // week view
    const dow = d.getDay();
    rangeStart = addDays(d, -dow); // Sunday
    rangeEnd = addDays(rangeStart, 6); // Saturday
  }

  const startYear = rangeStart.getFullYear();
  const endYear = rangeEnd.getFullYear();
  const startMonth = rangeStart.getMonth();
  const endMonth = rangeEnd.getMonth();

  if (startYear !== endYear) {
    // Spans two years: "Dec 30, 2025 – Jan 5, 2026"
    return (
      `${SHORT_MONTH_NAMES[startMonth]} ${rangeStart.getDate()}, ${startYear}` +
      ` – ` +
      `${SHORT_MONTH_NAMES[endMonth]} ${rangeEnd.getDate()}, ${endYear}`
    );
  }

  if (startMonth !== endMonth) {
    // Spans two months in the same year: "Apr 28 – May 4, 2026"
    return (
      `${SHORT_MONTH_NAMES[startMonth]} ${rangeStart.getDate()}` +
      ` – ` +
      `${SHORT_MONTH_NAMES[endMonth]} ${rangeEnd.getDate()}, ${endYear}`
    );
  }

  // Same month and year: "May 4–10, 2026"
  return (
    `${MONTH_NAMES[startMonth]} ${rangeStart.getDate()}–${rangeEnd.getDate()}, ${startYear}`
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CalendarToolbar renders view tabs, navigation arrows, Today button, and date label.
 *
 * @param {object}   props - See module-level JSDoc for prop details.
 * @returns {JSX.Element}
 */
function CalendarToolbar({
  activeView,
  onViewChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
}) {
  const dateLabel = buildDateRangeLabel(currentDate, activeView);

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
      {/* View tab buttons */}
      <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 p-0.5">
        {VIEW_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onViewChange(key)}
            aria-pressed={activeView === key}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              activeView === key
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Prev / Next navigation arrows */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous"
          className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {/* Left chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next"
          className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {/* Right chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Date range label */}
      <span className="text-sm font-medium text-gray-700">{dateLabel}</span>

      {/* Spacer pushes Today to the right */}
      <div className="flex-1" />

      {/* Today button */}
      <button
        type="button"
        onClick={onToday}
        className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Today
      </button>
    </div>
  );
}

export default CalendarToolbar;
