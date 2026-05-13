/**
 * EventForm — controlled form for editing all calendar event fields.
 *
 * Renders six controlled inputs: title (text, maxLength=255, required),
 * description (textarea, maxLength=10000), location (text, maxLength=255),
 * allDay (checkbox), startAt (datetime-local), endAt (datetime-local), and
 * color (ColorPicker). Character counters are shown below the title and
 * description fields. Per-field validation errors from `props.errors` are
 * displayed below each affected input.
 *
 * When `allDay` is toggled to true, the start datetime is adjusted to
 * `T00:00` and the end datetime is adjusted to `T23:59` automatically.
 *
 * On every field change, `onChange` is called with an object containing only
 * the changed field (`{ fieldName: newValue }`). `onBlur` is called whenever
 * any field loses focus.
 *
 * @param {object}        props
 * @param {object|null}   props.event    - Camelcase event object, or null on first render.
 * @param {Function}      props.onChange - Called with `{ fieldName: newValue }` on change.
 * @param {Function}      props.onBlur  - Called when any field loses focus.
 * @param {object}        props.errors  - Per-field error strings, keyed by camelCase field name.
 * @returns {JSX.Element}
 */

import React from 'react';
import ColorPicker from './ColorPicker.jsx';

/** Maximum allowed characters for the title field. */
const TITLE_MAX = 255;

/** Maximum allowed characters for the description field. */
const DESCRIPTION_MAX = 10_000;

/**
 * Resolve the Tailwind text-colour class for a character counter.
 *
 * @param {number} length - Current field length.
 * @param {number} max    - Maximum allowed length.
 * @returns {string} Tailwind text-colour class.
 */
function counterColourClass(length, max) {
  if (length >= max) return 'text-red-600';
  return 'text-gray-500';
}

/**
 * Extract the date portion (`YYYY-MM-DD`) from an ISO local datetime string.
 *
 * @param {string} datetime - ISO local datetime string (`YYYY-MM-DDTHH:MM`).
 * @returns {string} The date part, or empty string if input is falsy.
 */
function datePartOf(datetime) {
  if (!datetime) return '';
  return datetime.split('T')[0] ?? '';
}

/**
 * EventForm renders controlled inputs for all event fields.
 *
 * @param {object} props - See module-level JSDoc for prop details.
 * @returns {JSX.Element}
 */
function EventForm({ event, onChange, onBlur, errors = {} }) {
  const title       = event?.title       ?? '';
  const description = event?.description ?? '';
  const location    = event?.location    ?? '';
  const allDay      = event?.allDay      ?? false;
  const startAt     = event?.startAt     ?? '';
  const endAt       = event?.endAt       ?? '';
  const color       = event?.color       ?? 'blue';

  const titleLength       = title.length;
  const descriptionLength = description.length;

  const titleAtLimit       = titleLength       >= TITLE_MAX;
  const descriptionAtLimit = descriptionLength >= DESCRIPTION_MAX;

  const showTitleError = title.trim() === '';

  /**
   * Handle change events on any field and forward only the changed field.
   *
   * @param {string} fieldName - The camelCase field name.
   * @param {*}      value     - The new field value.
   */
  function handleChange(fieldName, value) {
    onChange({ [fieldName]: value });
  }

  /**
   * Handle the allDay checkbox toggle.
   *
   * When toggled on, automatically set startAt to T00:00 and endAt to T23:59
   * (preserving the existing date portions if present). Dispatches three
   * separate onChange calls so the parent can merge them individually.
   *
   * @param {boolean} checked - The new checked state of the allDay checkbox.
   */
  function handleAllDayToggle(checked) {
    onChange({ allDay: checked });
    if (checked) {
      const startDate = datePartOf(startAt) || datePartOf(endAt) || '';
      const endDate   = datePartOf(endAt)   || datePartOf(startAt) || '';
      if (startDate) onChange({ startAt: `${startDate}T00:00` });
      if (endDate)   onChange({ endAt:   `${endDate}T23:59`  });
    }
  }

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label
          htmlFor="event-title"
          className="block text-sm font-medium text-gray-700"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="event-title"
          type="text"
          value={title}
          maxLength={TITLE_MAX}
          aria-label="Event title"
          onChange={(e) => handleChange('title', e.target.value)}
          onBlur={onBlur}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            showTitleError || errors.title ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {showTitleError && !errors.title && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            Title is required.
          </p>
        )}
        {errors.title && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.title}
          </p>
        )}
        <p className={`mt-1 text-xs ${counterColourClass(titleLength, TITLE_MAX)}`}>
          {titleLength.toLocaleString()} / {TITLE_MAX.toLocaleString()}
        </p>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="event-description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="event-description"
          value={description}
          maxLength={DESCRIPTION_MAX}
          rows={5}
          aria-label="Event description"
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={onBlur}
          readOnly={descriptionAtLimit}
          className={`mt-1 block w-full resize-none rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            descriptionAtLimit
              ? 'border-red-400 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.description}
          </p>
        )}
        <p className={`mt-1 text-xs ${counterColourClass(descriptionLength, DESCRIPTION_MAX)}`}>
          {descriptionLength.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()}
        </p>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="event-location"
          className="block text-sm font-medium text-gray-700"
        >
          Location
        </label>
        <input
          id="event-location"
          type="text"
          value={location}
          maxLength={255}
          aria-label="Event location"
          onChange={(e) => handleChange('location', e.target.value)}
          onBlur={onBlur}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.location ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.location && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.location}
          </p>
        )}
      </div>

      {/* All Day */}
      <div className="flex items-center gap-3">
        <input
          id="event-all-day"
          type="checkbox"
          checked={allDay}
          aria-label="All day event"
          onChange={(e) => handleAllDayToggle(e.target.checked)}
          onBlur={onBlur}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor="event-all-day"
          className="text-sm font-medium text-gray-700"
        >
          All Day
        </label>
      </div>

      {/* Start At */}
      <div>
        <label
          htmlFor="event-start-at"
          className="block text-sm font-medium text-gray-700"
        >
          Start <span className="text-red-500">*</span>
        </label>
        <input
          id="event-start-at"
          type="datetime-local"
          value={startAt}
          aria-label="Event start"
          onChange={(e) => handleChange('startAt', e.target.value)}
          onBlur={onBlur}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.startAt ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.startAt && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.startAt}
          </p>
        )}
      </div>

      {/* End At */}
      <div>
        <label
          htmlFor="event-end-at"
          className="block text-sm font-medium text-gray-700"
        >
          End <span className="text-red-500">*</span>
        </label>
        <input
          id="event-end-at"
          type="datetime-local"
          value={endAt}
          aria-label="Event end"
          onChange={(e) => handleChange('endAt', e.target.value)}
          onBlur={onBlur}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.endAt ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.endAt && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.endAt}
          </p>
        )}
      </div>

      {/* Color */}
      <div>
        <span className="block text-sm font-medium text-gray-700">Color</span>
        <div className="mt-2">
          <ColorPicker
            value={color}
            onChange={(newColor) => handleChange('color', newColor)}
          />
        </div>
        {errors.color && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.color}
          </p>
        )}
      </div>
    </div>
  );
}

export default EventForm;
