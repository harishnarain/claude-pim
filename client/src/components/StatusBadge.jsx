/**
 * StatusBadge — pill badge that displays a task status.
 *
 * Colour mapping:
 *   Not Started → grey
 *   Blocked     → orange
 *   In Progress → blue
 *   Completed   → green
 *   Cancelled   → slate
 * Unknown values fall back to a neutral grey.
 *
 * @param {object} props
 * @param {string} props.status - One of the five valid status values.
 * @returns {JSX.Element}
 */
import React from 'react';

/** Common Tailwind classes shared by all status pills. */
const BASE_CLASSES =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

/** Map of status value → Tailwind colour classes. */
const STATUS_CLASSES = {
  'Not Started': 'bg-gray-100 text-gray-600',
  Blocked: 'bg-orange-100 text-orange-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-slate-100 text-slate-500',
};

/** Fallback colour classes for unknown status values. */
const FALLBACK_CLASSES = 'bg-gray-100 text-gray-600';

/**
 * StatusBadge renders a coloured pill for a given status string.
 *
 * @param {object} props - Component props.
 * @param {string} props.status - One of 'Not Started', 'Blocked', 'In Progress',
 *   'Completed', or 'Cancelled'.
 * @returns {JSX.Element}
 */
function StatusBadge({ status }) {
  const colourClasses = STATUS_CLASSES[status] ?? FALLBACK_CLASSES;

  return (
    <span className={`${BASE_CLASSES} ${colourClasses}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
