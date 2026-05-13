/**
 * EventEditorPage — edit page for a single calendar event.
 *
 * Route: `/calendar/events/:id` (always edit mode).
 * Events are always created first via QuickCreateForm; there is no `/new` route.
 *
 * On mount: calls `fetchEvent(id)` from `useCalendarStore`. If the event is not
 * found (404 or null `selectedEvent` after loading), redirects to `/calendar`
 * with router state `{ toast: 'Event not found.' }`.
 *
 * Local state `localEvent` mirrors `selectedEvent`; a debounced auto-save
 * (800 ms) fires on every field change, following the same pattern as
 * `TaskEditorPage`. Blur on any field flushes the debounce immediately.
 *
 * A toolbar row shows: back button (→ `/calendar`), save status badge
 * (`'saving' | 'saved' | 'error'`), and a delete button.
 *
 * Delete opens a `ConfirmDialog`; on confirm calls `deleteEvent(id)` then
 * navigates to `/calendar`.
 *
 * On `saveStatus === 'error'`, the error message is checked for
 * `VALIDATION_ERROR` to parse per-field errors; they are stored in
 * `fieldErrors` and cleared on each successful save.
 *
 * @returns {JSX.Element}
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCalendarStore } from '../store/calendarStore.js';
import EventForm from '../components/EventForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

/** Auto-save debounce delay in milliseconds. */
const DEBOUNCE_MS = 800;

/**
 * Parse per-field validation errors from the store error string.
 * The API returns a 422 `VALIDATION_ERROR` code for invalid fields.
 * The error message format is `"API error 422: VALIDATION_ERROR"`.
 * When a VALIDATION_ERROR is detected we surface a generic message for
 * every field that the server most recently rejected, if available in
 * the `details` payload. Because the frontend API client only forwards
 * the code string (not structured details), we return a generic map
 * keyed by any fields that are empty or otherwise obviously invalid
 * in `localEvent`. Callers who need richer messages should extend the
 * API client to forward `error.details`.
 *
 * @param {string|null} errorMessage - The error string from the store.
 * @returns {object} A (possibly empty) object of `{ fieldName: string }` pairs.
 */
function parseValidationErrors(errorMessage) {
  if (!errorMessage) return {};
  if (errorMessage.includes('VALIDATION_ERROR')) {
    // The API client does not forward structured field details, so we
    // return a sentinel object to indicate a generic validation failure.
    return { _validation: true };
  }
  return {};
}

/**
 * Render the save-status badge.
 *
 * @param {'idle'|'saving'|'saved'|'error'} saveStatus - Current save status.
 * @returns {JSX.Element}
 */
function SaveStatusBadge({ saveStatus }) {
  if (saveStatus === 'saving') {
    return (
      <span aria-live="polite" className="text-sm text-gray-500">
        Saving...
      </span>
    );
  }
  if (saveStatus === 'saved') {
    return (
      <span aria-live="polite" className="text-sm text-gray-500">
        Saved
      </span>
    );
  }
  if (saveStatus === 'error') {
    return (
      <span aria-live="polite" className="text-sm text-red-600">
        Save failed
      </span>
    );
  }
  return <span aria-live="polite" className="text-sm text-gray-500" />;
}

/**
 * EventEditorPage — edit page for a single calendar event.
 * @returns {JSX.Element}
 */
function EventEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    selectedEvent,
    isLoading,
    isSaving,
    saveStatus,
    error,
    fetchEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarStore();

  /** Whether the delete ConfirmDialog is open. */
  const [showConfirm, setShowConfirm] = useState(false);

  /** True once the selectedEvent has been loaded so we can show a 404 redirect. */
  const [hasLoaded, setHasLoaded] = useState(false);

  /**
   * Local event state — a copy of the event being edited.
   * Updated on every EventForm onChange; persisted to the server via debounce.
   * @type {[object|null, Function]}
   */
  const [localEvent, setLocalEvent] = useState(null);

  /**
   * Per-field validation errors, populated when saveStatus === 'error' and
   * the API returned a 422 VALIDATION_ERROR.
   * @type {[object, Function]}
   */
  const [fieldErrors, setFieldErrors] = useState({});

  /** Ref for the debounce timer handle. */
  const debounceTimerRef = useRef(null);

  /** Ref tracking whether there are unsaved changes to flush. */
  const hasUnsavedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Sync localEvent when selectedEvent changes (initial load or navigation).
  // Guard: skip if the user has already started editing to avoid overwriting.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (selectedEvent && !hasUnsavedRef.current) {
      setLocalEvent({ ...selectedEvent });
    }
  }, [selectedEvent?.id]);

  // ---------------------------------------------------------------------------
  // Fetch the event on mount.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    /**
     * Load the event by ID.
     * @returns {Promise<void>}
     */
    async function load() {
      await fetchEvent(id);
      setHasLoaded(true);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------------------------
  // 404 redirect — when the event is not found after loading completes.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (hasLoaded && !isLoading && !selectedEvent) {
      navigate('/calendar', { state: { toast: 'Event not found.' } });
    }
  }, [hasLoaded, isLoading, selectedEvent, navigate]);

  useEffect(() => {
    if (error && (error.includes('404') || error.toLowerCase().includes('not found'))) {
      navigate('/calendar', { state: { toast: 'Event not found.' } });
    }
  }, [error, navigate]);

  // ---------------------------------------------------------------------------
  // Parse field errors when saveStatus transitions to 'error'.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (saveStatus === 'error') {
      const parsed = parseValidationErrors(error);
      setFieldErrors(parsed);
    }
  }, [saveStatus, error]);

  // ---------------------------------------------------------------------------
  // Clear field errors on successful save.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (saveStatus === 'saved') {
      setFieldErrors({});
    }
  }, [saveStatus]);

  // ---------------------------------------------------------------------------
  // document.title
  // ---------------------------------------------------------------------------

  useEffect(() => {
    document.title = localEvent?.title ?? selectedEvent?.title ?? 'Event';
  }, [localEvent?.title, selectedEvent?.title]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Flush the debounce immediately — call updateEvent with current localEvent.
   * Used on blur events to persist in-flight edits.
   * @returns {void}
   */
  function flushSave() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (hasUnsavedRef.current && localEvent && localEvent.title && localEvent.title.trim() !== '') {
      hasUnsavedRef.current = false;
      updateEvent(Number(id), localEvent);
    }
  }

  /**
   * Handle an EventForm field change — merge the changed field into localEvent
   * and schedule a debounced save after 800 ms of inactivity.
   *
   * Auto-save is suppressed if the title is empty or whitespace-only.
   *
   * @param {object} changed - An object with a single changed camelCase field, e.g. `{ title: 'New' }`.
   * @returns {void}
   */
  function handleFormChange(changed) {
    const updated = { ...localEvent, ...changed };
    setLocalEvent(updated);
    hasUnsavedRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Suppress auto-save when title is empty.
    if (!updated.title || updated.title.trim() === '') return;

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (hasUnsavedRef.current) {
        hasUnsavedRef.current = false;
        updateEvent(Number(id), updated);
      }
    }, DEBOUNCE_MS);
  }

  /**
   * Handle blur on any EventForm field — flush the debounce immediately.
   * @returns {void}
   */
  function handleFormBlur() {
    flushSave();
  }

  /**
   * Confirm deletion — delete the event and navigate to the calendar list.
   * @returns {Promise<void>}
   */
  async function handleConfirmDelete() {
    setShowConfirm(false);
    await deleteEvent(Number(id));
    navigate('/calendar');
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading && !selectedEvent) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!selectedEvent) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Back to calendar"
        >
          ← Back
        </button>

        {/* Save status badge */}
        <SaveStatusBadge saveStatus={saveStatus} />

        {/* Spacer pushes Delete to the right */}
        <div className="flex-1" />

        {/* Delete button */}
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Delete
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-auto p-4">
        <EventForm
          event={localEvent ?? selectedEvent}
          onChange={handleFormChange}
          onBlur={handleFormBlur}
          errors={fieldErrors}
        />
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        message="Are you sure you want to delete this event? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

export default EventEditorPage;
