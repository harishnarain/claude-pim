/**
 * TaskForm — controlled form for editing all task fields.
 *
 * Renders six controlled inputs: title (text), body (textarea), dueDate
 * (date), dueTime (time, shown only when dueDate is non-empty), priority
 * (select), and status (select). Character counters are shown below the title
 * and body fields. The counter turns red when the field is at its character
 * limit. An inline validation error is shown when the title is empty. Tags are
 * NOT part of this form — they are managed separately by TagCombobox in
 * TaskEditorPage.
 *
 * On every field change, `onChange` is called with an object containing only
 * the changed field (`{ fieldName: newValue }`). `onBlur` is called whenever
 * any field loses focus (used by the parent to flush the auto-save debounce).
 *
 * NOTE: When `dueDate` is cleared (set to `''`), the Due Time input disappears
 * automatically. The parent's `handleFormChange` is responsible for clearing
 * `dueTime` (i.e. calling `onChange({ dueTime: '' })`) whenever `dueDate` is
 * cleared, so that stale time values are not persisted.
 *
 * @param {object}   props
 * @param {object}   props.task       - Camelcase task object, or null on first render.
 * @param {Function} props.onChange   - Called with `{ fieldName: newValue }` on change.
 * @param {Function} props.onBlur    - Called when any field loses focus.
 * @returns {JSX.Element}
 */

import React from 'react';

/** Maximum allowed characters for the title field. */
const TITLE_MAX = 255;

/** Maximum allowed characters for the body field. */
const BODY_MAX = 10_000;

/** All valid priority options. */
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

/** All valid status options. */
const STATUS_OPTIONS = [
  'Not Started',
  'Blocked',
  'In Progress',
  'Completed',
  'Cancelled',
];

/**
 * Resolve the Tailwind text-colour class for a character counter.
 *
 * @param {number} length  - Current field length.
 * @param {number} max     - Maximum allowed length.
 * @returns {string} Tailwind text-colour class.
 */
function counterColourClass(length, max) {
  if (length >= max) return 'text-red-600';
  return 'text-gray-500';
}

/**
 * TaskForm renders controlled inputs for all task fields.
 *
 * @param {object} props - See module-level JSDoc for prop details.
 * @returns {JSX.Element}
 */
function TaskForm({ task, onChange, onBlur }) {
  const title = task?.title ?? '';
  const body = task?.body ?? '';
  const dueDate = task?.dueDate ?? '';
  const dueTime = task?.dueTime ?? '';
  const priority = task?.priority ?? 'Low';
  const status = task?.status ?? 'Not Started';

  const titleLength = title.length;
  const bodyLength = body.length;

  const titleAtLimit = titleLength >= TITLE_MAX;
  const bodyAtLimit = bodyLength >= BODY_MAX;

  const showTitleError = title.trim() === '';

  /**
   * Handle change events on any field and forward only the changed field.
   *
   * @param {string} fieldName - The camelCase field name.
   * @param {string} value     - The new field value.
   */
  function handleChange(fieldName, value) {
    onChange({ [fieldName]: value });
  }

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label
          htmlFor="task-title"
          className="block text-sm font-medium text-gray-700"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          maxLength={TITLE_MAX}
          aria-label="Task title"
          onChange={(e) => handleChange('title', e.target.value)}
          onBlur={onBlur}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            showTitleError ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {showTitleError && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            Title is required.
          </p>
        )}
        <p className={`mt-1 text-xs ${counterColourClass(titleLength, TITLE_MAX)}`}>
          {titleLength.toLocaleString()} / {TITLE_MAX.toLocaleString()}
        </p>
      </div>

      {/* Body */}
      <div>
        <label
          htmlFor="task-body"
          className="block text-sm font-medium text-gray-700"
        >
          Notes
        </label>
        <textarea
          id="task-body"
          value={body}
          maxLength={BODY_MAX}
          rows={6}
          aria-label="Task body"
          onChange={(e) => handleChange('body', e.target.value)}
          onBlur={onBlur}
          readOnly={bodyAtLimit}
          className={`mt-1 block w-full resize-none rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            bodyAtLimit
              ? 'border-red-400 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300'
          }`}
        />
        <p className={`mt-1 text-xs ${counterColourClass(bodyLength, BODY_MAX)}`}>
          {bodyLength.toLocaleString()} / {BODY_MAX.toLocaleString()}
        </p>
      </div>

      {/* Due Date */}
      <div>
        <label
          htmlFor="task-due-date"
          className="block text-sm font-medium text-gray-700"
        >
          Due Date
        </label>
        <input
          id="task-due-date"
          type="date"
          value={dueDate}
          aria-label="Due date"
          onChange={(e) => handleChange('dueDate', e.target.value)}
          onBlur={onBlur}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Due Time — only visible when a due date has been selected */}
      {dueDate !== '' && (
        <div>
          <label
            htmlFor="task-due-time"
            className="block text-sm font-medium text-gray-700"
          >
            Due Time
          </label>
          <input
            id="task-due-time"
            type="time"
            value={dueTime}
            aria-label="Due time"
            onChange={(e) => handleChange('dueTime', e.target.value)}
            onBlur={onBlur}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Priority */}
      <div>
        <label
          htmlFor="task-priority"
          className="block text-sm font-medium text-gray-700"
        >
          Priority
        </label>
        <select
          id="task-priority"
          value={priority}
          aria-label="Priority"
          onChange={(e) => handleChange('priority', e.target.value)}
          onBlur={onBlur}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="task-status"
          className="block text-sm font-medium text-gray-700"
        >
          Status
        </label>
        <select
          id="task-status"
          value={status}
          aria-label="Status"
          onChange={(e) => handleChange('status', e.target.value)}
          onBlur={onBlur}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default TaskForm;
