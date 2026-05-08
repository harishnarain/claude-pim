/**
 * TaskChip — a compact chip that represents a task inside the calendar view.
 *
 * Visually distinct from EventChip: white background with a left-side colored
 * border rather than a solid colored background. A small checkbox icon (inline
 * SVG, unchecked square) appears on the left side of the title to signal that
 * this chip represents a task, not a calendar event.
 *
 * For timed tasks the chip shows the formatted time (e.g. "2:00 PM") below the
 * title in a smaller font. There is no delete action — clicking the chip calls
 * `onClick()`, which is expected to navigate to `/tasks/:id`.
 *
 * The `style` prop is spread directly onto the root element so that the
 * calendar layout (DayColumn / AllDayBanner) can control absolute positioning
 * the same way it does for EventChip.
 *
 * @module TaskChip
 */

import React from 'react';

/**
 * Format a time string (HH:MM, 24-hour) into a human-readable 12-hour string.
 * Examples:
 *   "14:00" → "2:00 PM"
 *   "09:30" → "9:30 AM"
 *
 * @param {string} timeStr - Time string in "HH:MM" format.
 * @returns {string} Formatted 12-hour time with AM/PM suffix.
 */
function formatTime(timeStr) {
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = String(min).padStart(2, '0');
  return `${displayHour}:${displayMin} ${period}`;
}

/**
 * Inline SVG of an unchecked checkbox square used as the task indicator icon.
 *
 * @returns {JSX.Element}
 */
function CheckboxIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mt-px shrink-0"
    >
      <rect
        x="0.5"
        y="0.5"
        width="9"
        height="9"
        rx="1.5"
        stroke="#60a5fa"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

/**
 * TaskChip — white chip with a left-side blue border that renders a task.
 *
 * @param {object}   props
 * @param {object}   props.task             - Task data object.
 * @param {number}   props.task.id          - Unique task ID.
 * @param {string}   props.task.title       - Task title.
 * @param {string}   [props.task.dueDate]   - Due date string (ISO date or similar).
 * @param {string}   [props.task.dueTime]   - Due time string in "HH:MM" format.
 * @param {string}   [props.task.status]    - Task status (e.g. "open", "done").
 * @param {string}   [props.task.priority]  - Task priority (e.g. "low", "high").
 * @param {object}   [props.style]          - Inline style object spread onto the root for overlap positioning.
 * @param {Function} props.onClick          - Called when the chip is clicked or activated by keyboard.
 * @returns {JSX.Element}
 */
function TaskChip({ task, style, onClick }) {
  const { title, dueTime } = task;

  const formattedTime = dueTime ? formatTime(dueTime) : null;

  /**
   * Handle keyboard activation (Enter / Space) on the chip.
   *
   * @param {React.KeyboardEvent} e
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      style={style}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="flex cursor-pointer flex-col overflow-hidden rounded border-l-4 border-blue-400 bg-white px-1.5 py-0.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
    >
      {/* Title row with checkbox icon */}
      <span className="flex items-start gap-1 truncate">
        <CheckboxIcon />
        <span className="truncate text-xs font-semibold leading-tight text-gray-800">
          {title}
        </span>
      </span>

      {/* Formatted time — timed tasks only */}
      {formattedTime && (
        <span className="truncate text-xs leading-tight text-gray-500">
          {formattedTime}
        </span>
      )}
    </div>
  );
}

export default TaskChip;
