/**
 * PriorityBadge — pill badge that displays a task priority level.
 *
 * Colour mapping:
 *   Low    → grey
 *   Medium → amber
 *   High   → red
 * Unknown values fall back to a neutral grey.
 *
 * @param {object} props
 * @param {string} props.priority - Priority label: 'Low', 'Medium', or 'High'.
 * @returns {JSX.Element}
 */
import React from 'react';

/** Common Tailwind classes shared by all priority pills. */
const BASE_CLASSES =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

/** Map of priority value → Tailwind colour classes. */
const PRIORITY_CLASSES = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
};

/** Fallback colour classes for unknown priority values. */
const FALLBACK_CLASSES = 'bg-gray-100 text-gray-600';

/**
 * PriorityBadge renders a coloured pill for a given priority string.
 *
 * @param {object} props - Component props.
 * @param {string} props.priority - One of 'Low', 'Medium', or 'High'.
 * @returns {JSX.Element}
 */
function PriorityBadge({ priority }) {
  const colourClasses = PRIORITY_CLASSES[priority] ?? FALLBACK_CLASSES;

  return (
    <span className={`${BASE_CLASSES} ${colourClasses}`}>
      {priority}
    </span>
  );
}

export default PriorityBadge;
