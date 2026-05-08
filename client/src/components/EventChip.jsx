/**
 * EventChip — a compact chip that represents a calendar event inside
 * DayColumn or AllDayBanner.
 *
 * The chip background color is derived from `event.color` via a Tailwind class
 * map (COLOR_CLASS_MAP). Dynamic classes are listed explicitly so that
 * Tailwind's purge step can detect them at build time.
 *
 * For timed events the chip shows both the event title and a formatted time
 * range (e.g. "9:00–9:30 AM"). All-day events show only the title.
 *
 * A delete icon button (`×`) is revealed on hover. Clicking it calls
 * `onDelete()`; clicking the rest of the chip calls `onClick()`.
 *
 * The `style` prop is spread directly onto the root element so that
 * DayColumn can control absolute positioning and height for overlap layout.
 *
 * @module EventChip
 */

import React from 'react';
import { COLOR_PALETTE } from './ColorPicker.jsx';

/**
 * Explicit color-key → Tailwind background-class map.
 * Must be kept in sync with COLOR_PALETTE in ColorPicker.jsx.
 * Listing classes here prevents Tailwind from purging them.
 *
 * @type {Object.<string, string>}
 */
const COLOR_CLASS_MAP = Object.fromEntries(
  COLOR_PALETTE.map(({ key, bg }) => [key, bg])
);

/** Fallback background class used when `event.color` is not in COLOR_CLASS_MAP. */
const DEFAULT_BG_CLASS = 'bg-blue-500';

/**
 * Format a start/end pair of Date objects into a compact time-range string.
 * Examples:
 *   9:00–9:30 AM  (same period)
 *   11:00 AM–1:00 PM  (crossing noon)
 *
 * @param {Date} startDate - Event start as a Date instance.
 * @param {Date} endDate   - Event end as a Date instance.
 * @returns {string} Human-readable time range.
 */
function formatTimeRange(startDate, endDate) {
  const startHour = startDate.getHours();
  const startMin = startDate.getMinutes();
  const endHour = endDate.getHours();
  const endMin = endDate.getMinutes();

  const startPeriod = startHour < 12 ? 'AM' : 'PM';
  const endPeriod = endHour < 12 ? 'AM' : 'PM';

  /**
   * Format a single time value (hour, minute) into "H:MM" with no leading
   * zero on the hour.
   *
   * @param {number} h - Hour (0–23).
   * @param {number} m - Minute (0–59).
   * @returns {string}
   */
  function fmt(h, m) {
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const displayMin = String(m).padStart(2, '0');
    return `${displayHour}:${displayMin}`;
  }

  if (startPeriod === endPeriod) {
    return `${fmt(startHour, startMin)}–${fmt(endHour, endMin)} ${endPeriod}`;
  }
  return `${fmt(startHour, startMin)} ${startPeriod}–${fmt(endHour, endMin)} ${endPeriod}`;
}

/**
 * EventChip — colored chip that renders a calendar event.
 *
 * @param {object}   props
 * @param {object}   props.event           - Event data object.
 * @param {number}   props.event.id        - Unique event ID.
 * @param {string}   props.event.title     - Event title.
 * @param {string}   props.event.startAt   - ISO 8601 start datetime string.
 * @param {string}   props.event.endAt     - ISO 8601 end datetime string.
 * @param {string}   props.event.color     - Color key from COLOR_PALETTE.
 * @param {boolean}  props.event.allDay    - True when this is an all-day event.
 * @param {object}   [props.style]         - Inline style object spread onto the root for overlap positioning.
 * @param {Function} props.onClick         - Called when the chip body is clicked.
 * @param {Function} props.onDelete        - Called when the delete button is clicked.
 * @returns {JSX.Element}
 */
function EventChip({ event, style, onClick, onDelete }) {
  const { title, startAt, endAt, color, allDay } = event;

  const bgClass = COLOR_CLASS_MAP[color] ?? DEFAULT_BG_CLASS;

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  const timeRange = allDay ? null : formatTimeRange(startDate, endDate);

  /**
   * Handle keyboard activation (Enter / Space) for the chip body.
   *
   * @param {React.KeyboardEvent} e
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }

  /**
   * Handle delete button click without bubbling to the chip body.
   *
   * @param {React.MouseEvent} e
   */
  function handleDeleteClick(e) {
    e.stopPropagation();
    onDelete();
  }

  /**
   * Prevent keyboard events on the delete button from propagating to the chip.
   *
   * @param {React.KeyboardEvent} e
   */
  function handleDeleteKeyDown(e) {
    e.stopPropagation();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      style={style}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded px-1.5 py-0.5 text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1 ${bgClass}`}
    >
      {/* Delete button — visible only on hover */}
      <button
        type="button"
        aria-label="Delete event"
        tabIndex={-1}
        onClick={handleDeleteClick}
        onKeyDown={handleDeleteKeyDown}
        className="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded text-white opacity-80 hover:opacity-100 focus:outline-none group-hover:flex"
      >
        ×
      </button>

      {/* Title */}
      <span className="truncate text-xs font-semibold leading-tight">
        {title}
      </span>

      {/* Time range — timed events only */}
      {timeRange && (
        <span className="truncate text-xs leading-tight opacity-90">
          {timeRange}
        </span>
      )}
    </div>
  );
}

export default EventChip;
