/**
 * TaskCard — clickable card that represents a single task in the task list.
 * Displays the task's title, pin status, body preview, due date, priority,
 * status, an inline status-change select, and tags.
 *
 * @param {object}   props
 * @param {object}   props.task                  - Task data object (camelCase).
 * @param {number}   props.task.id               - Unique task ID.
 * @param {string}   props.task.title            - Task title.
 * @param {string}   props.task.bodyPreview      - Plain-text body preview (up to 140 chars).
 * @param {boolean}  props.task.isPinned         - Whether the task is pinned.
 * @param {string}   props.task.dueDate          - ISO date string (YYYY-MM-DD) or null/undefined.
 * @param {string}   props.task.priority         - One of 'Low', 'Medium', 'High'.
 * @param {string}   props.task.status           - One of the five valid status values.
 * @param {Array}    props.task.tags             - Array of tag objects or strings.
 * @param {Function} props.onSelect              - Callback invoked with the task object on click.
 * @param {Function} props.onStatusChange        - Callback invoked with (id, newStatus) on select change.
 * @returns {JSX.Element}
 */
import React from 'react';
import PriorityBadge from './PriorityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';

/** Status values that are considered "done" (completed or cancelled). */
const DONE_STATUSES = ['Completed', 'Cancelled'];

/** All valid task status options shown in the inline dropdown. */
const STATUS_OPTIONS = [
  'Not Started',
  'Blocked',
  'In Progress',
  'Completed',
  'Cancelled',
];

/**
 * Format an ISO date string (YYYY-MM-DD) into a human-readable date.
 *
 * @param {string} isoDate - ISO 8601 date string.
 * @returns {string} Human-readable date (e.g. "May 12, 2026").
 */
function formatDueDate(isoDate) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}

/**
 * Determine whether an ISO date string represents a past date.
 * Comparison is done at day granularity using UTC dates.
 *
 * @param {string} isoDate - ISO 8601 date string (YYYY-MM-DD).
 * @returns {boolean} True when the date is strictly before today (UTC).
 */
function isOverdue(isoDate) {
  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const dueUTC = new Date(isoDate).getTime();
  return dueUTC < todayUTC;
}

/**
 * Extract a display-friendly tag name from a tag value that may be an object
 * or a plain string.
 *
 * @param {object|string} tag - A tag object with a `name` property or a string.
 * @returns {string}
 */
function getTagName(tag) {
  return typeof tag === 'string' ? tag : tag.name;
}

/**
 * TaskCard renders a single task as a clickable summary card.
 *
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function TaskCard({ task, onSelect, onStatusChange }) {
  const { id, title, bodyPreview, isPinned, dueDate, priority, status, tags = [] } = task;

  const isDone = DONE_STATUSES.includes(status);

  const cardBg = isDone ? 'bg-gray-50' : 'bg-white';

  const titleClasses = isDone
    ? 'truncate text-sm font-bold text-gray-400 line-through'
    : 'truncate text-sm font-bold text-gray-900';

  const dueDateOverdue = dueDate && !isDone && isOverdue(dueDate);
  const dueDateClasses = dueDateOverdue ? 'text-xs text-red-600' : 'text-xs text-gray-400';

  /**
   * Handle keyboard activation (Enter / Space) for accessibility.
   *
   * @param {React.KeyboardEvent} e
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(task);
    }
  }

  /**
   * Handle inline status change without bubbling the click to onSelect.
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} e
   */
  function handleStatusChange(e) {
    e.stopPropagation();
    onStatusChange(id, e.target.value);
  }

  /**
   * Stop propagation of click events originating from the select element
   * so the card's onSelect is not triggered.
   *
   * @param {React.MouseEvent} e
   */
  function handleSelectClick(e) {
    e.stopPropagation();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(task)}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer rounded-md border border-gray-200 ${cardBg} px-4 py-3 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
    >
      {/* Header row: title + pin icon */}
      <div className="flex items-start justify-between gap-2">
        <p className={titleClasses}>{title}</p>
        {isPinned && (
          <span
            aria-label="Pinned"
            className="shrink-0 text-amber-500"
            role="img"
          >
            📌
          </span>
        )}
      </div>

      {/* Body preview */}
      {bodyPreview && (
        <p className="mt-1 truncate text-sm text-gray-500">{bodyPreview}</p>
      )}

      {/* Due date */}
      {dueDate && (
        <p className={`mt-1 ${dueDateClasses}`}>{formatDueDate(dueDate)}</p>
      )}

      {/* Badges + inline status select */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={priority} />
        <StatusBadge status={status} />

        <select
          value={status}
          onChange={handleStatusChange}
          onClick={handleSelectClick}
          aria-label="Change status"
          className="ml-auto rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => {
            const name = getTagName(tag);
            return (
              <span
                key={name}
                className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TaskCard;
