/**
 * QuickCreateForm — inline quick-create form for calendar events.
 *
 * Renders a compact form that pre-fills from `initialDate` and `initialHour`.
 * Supports title input, all-day toggle, start/end time inputs (hidden when
 * allDay is true), and a ColorPicker. Provides Save, Expand, and Cancel
 * buttons. Save and Expand both create the event via the calendar store; Save
 * calls `onSave(createdEvent)`, Expand calls `onExpand(createdEvent.id)`.
 * Cancel calls `onClose()` without creating anything.
 *
 * @module QuickCreateForm
 */

import React, { useState } from 'react';
import { useCalendarStore } from '../store/calendarStore.js';
import ColorPicker from './ColorPicker.jsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum allowed characters for the title field. */
const TITLE_MAX = 255;

/** Default color for new events. */
const DEFAULT_COLOR = 'blue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date and hour number into a 'YYYY-MM-DDTHH:MM' string.
 *
 * @param {Date}        date - The calendar date to use.
 * @param {number|null} hour - Hour of day (0–23), or null for midnight (00:00).
 * @returns {string} Formatted datetime string 'YYYY-MM-DDTHH:MM'.
 */
function formatDateTime(date, hour) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(hour ?? 0).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:00`;
}

/**
 * Add one hour to a 'YYYY-MM-DDTHH:MM' datetime string.
 * Wraps at midnight (23:00 + 1h → 00:00 next day is not handled — for
 * simplicity the hour just increments; values beyond 23 become 24:00 which
 * the <input type="time"> will reject, so we cap at 23:59).
 *
 * @param {string} dateTimeStr - Input datetime 'YYYY-MM-DDTHH:MM'.
 * @returns {string} Datetime string with hour incremented by 1.
 */
function addOneHour(dateTimeStr) {
  const [datePart, timePart] = dateTimeStr.split('T');
  const [hh, mm] = timePart.split(':').map(Number);
  const newHour = hh + 1;
  if (newHour >= 24) {
    // Advance to next day at the same minute
    const [y, mo, d] = datePart.split('-').map(Number);
    const next = new Date(y, mo - 1, d + 1);
    const ny = next.getFullYear();
    const nm = String(next.getMonth() + 1).padStart(2, '0');
    const nd = String(next.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}T${String(newHour - 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return `${datePart}T${String(newHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * QuickCreateForm — inline quick-create form for calendar events.
 *
 * @param {object}        props
 * @param {Date}          props.initialDate  - The calendar date to pre-fill.
 * @param {number|null}   props.initialHour  - Hour to pre-fill (0–23), or null for all-day.
 * @param {Function}      props.onSave       - Called with the created event after Save.
 * @param {Function}      props.onExpand     - Called with the created event's id after Expand.
 * @param {Function}      props.onClose      - Called when Cancel is clicked.
 * @returns {JSX.Element}
 */
function QuickCreateForm({ initialDate, initialHour, onSave, onExpand, onClose }) {
  const createEvent = useCalendarStore((s) => s.createEvent);
  const isSaving = useCalendarStore((s) => s.isSaving);

  // Derive initial datetime strings from props.
  const initialStartAt = formatDateTime(initialDate, initialHour);
  const initialEndAt = addOneHour(initialStartAt);
  const initialAllDay = initialHour === null;

  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(initialAllDay);
  const [startAt, setStartAt] = useState(initialStartAt);
  const [endAt, setEndAt] = useState(initialEndAt);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [titleError, setTitleError] = useState('');
  const [apiError, setApiError] = useState('');

  /**
   * Validate and build the event payload for the API.
   * Returns null and sets titleError if validation fails.
   *
   * @returns {object|null} Event data payload, or null if invalid.
   */
  function buildPayload() {
    if (title.trim() === '') {
      setTitleError('Title is required.');
      return null;
    }
    setTitleError('');

    if (allDay) {
      // Server requires YYYY-MM-DDTHH:MM format even for all-day events.
      const datePart = startAt.slice(0, 10);
      return { title: title.trim(), allDay: true, startAt: `${datePart}T00:00`, endAt: `${datePart}T23:59`, color };
    }

    return { title: title.trim(), allDay: false, startAt, endAt, color };
  }

  /**
   * Handle the Save button click.
   * Creates the event and calls onSave on success, or shows an inline error.
   *
   * @returns {Promise<void>}
   */
  async function handleSave() {
    const payload = buildPayload();
    if (!payload) return;

    setApiError('');
    try {
      const created = await createEvent(payload);
      onSave(created);
    } catch (err) {
      setApiError(err.message ?? 'Failed to create event. Please try again.');
    }
  }

  /**
   * Handle the Expand button click.
   * Creates the event and calls onExpand with the new event's id on success.
   *
   * @returns {Promise<void>}
   */
  async function handleExpand() {
    const payload = buildPayload();
    if (!payload) return;

    setApiError('');
    try {
      const created = await createEvent(payload);
      onExpand(created.id);
    } catch (err) {
      setApiError(err.message ?? 'Failed to create event. Please try again.');
    }
  }

  /**
   * Handle title field change — clear title error as soon as user types.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  function handleTitleChange(e) {
    setTitle(e.target.value);
    if (titleError && e.target.value.trim() !== '') {
      setTitleError('');
    }
  }

  /**
   * Handle all-day toggle change.
   * When switching to timed, resets startAt/endAt from the initial props.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  function handleAllDayChange(e) {
    const checked = e.target.checked;
    setAllDay(checked);
    if (!checked) {
      // Restore sensible time defaults when switching back to timed.
      setStartAt(initialStartAt);
      setEndAt(initialEndAt);
    }
  }

  return (
    <div
      className="w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
      role="dialog"
      aria-label="Quick create event"
    >
      <div className="space-y-3">
        {/* Title */}
        <div>
          <label
            htmlFor="qcf-title"
            className="block text-sm font-medium text-gray-700"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="qcf-title"
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            autoFocus
            aria-label="Event title"
            aria-required="true"
            onChange={handleTitleChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              titleError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {titleError && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {titleError}
            </p>
          )}
        </div>

        {/* All-day toggle */}
        <div className="flex items-center gap-2">
          <input
            id="qcf-all-day"
            type="checkbox"
            checked={allDay}
            aria-label="All day"
            onChange={handleAllDayChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="qcf-all-day"
            className="text-sm font-medium text-gray-700"
          >
            All day
          </label>
        </div>

        {/* Start / End time — hidden when allDay is true */}
        {!allDay && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="qcf-start"
                className="block text-xs font-medium text-gray-700"
              >
                Start
              </label>
              <input
                id="qcf-start"
                type="datetime-local"
                value={startAt}
                aria-label="Start time"
                onChange={(e) => setStartAt(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="qcf-end"
                className="block text-xs font-medium text-gray-700"
              >
                End
              </label>
              <input
                id="qcf-end"
                type="datetime-local"
                value={endAt}
                aria-label="End time"
                onChange={(e) => setEndAt(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Color picker */}
        <div>
          <p className="mb-1 text-xs font-medium text-gray-700">Color</p>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {/* Inline API error */}
        {apiError && (
          <p className="text-xs text-red-600" role="alert">
            {apiError}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            aria-label="Cancel"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Expand event editor"
              disabled={isSaving}
              onClick={handleExpand}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Expand'}
            </button>
            <button
              type="button"
              aria-label="Save event"
              disabled={isSaving}
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickCreateForm;
