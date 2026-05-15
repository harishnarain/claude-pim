/**
 * TypeIcon — renders a 14×14 inline SVG icon appropriate for each search-result
 * kind. Uses `currentColor` for stroke/fill so the parent can control colour via
 * Tailwind text classes.
 *
 * Supported kinds:
 *   - "contact" — person silhouette (head circle + shoulders arc)
 *   - "note"    — document with horizontal lines
 *   - "task"    — checkbox square
 *   - "event"   — small calendar grid (rectangle with top bar + grid lines)
 *
 * @module TypeIcon
 */

import React from 'react';

/**
 * TypeIcon component.
 *
 * @param {object}  props
 * @param {string}  props.kind       - One of "contact" | "note" | "task" | "event".
 * @param {string}  [props.className] - Additional Tailwind classes forwarded to the
 *                                     root `<svg>` element (e.g. "text-blue-500").
 * @returns {JSX.Element|null} An SVG icon, or null for an unknown kind.
 */
function TypeIcon({ kind, className = '' }) {
  const shared = {
    'aria-hidden': 'true',
    focusable: 'false',
    width: '14',
    height: '14',
    viewBox: '0 0 14 14',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
  };

  if (kind === 'contact') {
    return (
      <svg {...shared}>
        {/* Head circle */}
        <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        {/* Shoulders arc */}
        <path
          d="M1.5 13c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === 'note') {
    return (
      <svg {...shared}>
        {/* Document outline */}
        <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        {/* Horizontal lines */}
        <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'task') {
    return (
      <svg {...shared}>
        {/* Checkbox square */}
        <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }

  if (kind === 'event') {
    return (
      <svg {...shared}>
        {/* Calendar outline */}
        <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        {/* Top bar */}
        <line x1="1.5" y1="6" x2="12.5" y2="6" stroke="currentColor" strokeWidth="1" />
        {/* Vertical divider */}
        <line x1="7" y1="6" x2="7" y2="12.5" stroke="currentColor" strokeWidth="1" />
        {/* Horizontal middle divider */}
        <line x1="1.5" y1="9.25" x2="12.5" y2="9.25" stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  }

  return null;
}

export default TypeIcon;
