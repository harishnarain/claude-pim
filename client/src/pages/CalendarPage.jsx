/**
 * CalendarPage — main calendar view composing all calendar sub-components.
 *
 * Reads calendar state and actions from `useCalendarStore`. On mount, calls
 * `fetchWindow()` to load events and tasks for the current window. Renders
 * `CalendarToolbar` for navigation and `CalendarGrid` for the calendar body.
 *
 * Slot clicks open a `QuickCreateForm` fixed overlay; event and task clicks
 * navigate to their respective editor pages. The month view "day click" drills
 * down to the day view. Errors are shown in a dismissible banner with a Retry
 * button.
 *
 * @returns {JSX.Element}
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendarStore } from '../store/calendarStore.js';
import CalendarToolbar from '../components/CalendarToolbar.jsx';
import CalendarGrid from '../components/CalendarGrid.jsx';
import QuickCreateForm from '../components/QuickCreateForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

/**
 * CalendarPage — top-level calendar route component.
 *
 * @returns {JSX.Element}
 */
function CalendarPage() {
  const navigate = useNavigate();

  const {
    activeView,
    currentDate: currentDateStr,
    items,
    isLoading,
    error,
    setActiveView,
    setCurrentDate,
    goToToday,
    goPrev,
    goNext,
    fetchWindow,
    deleteEvent,
  } = useCalendarStore();

  /**
   * State for the quick-create form overlay.
   * Null when the form is closed; otherwise `{ date: Date, hour: number|null }`.
   * @type {[{ date: Date, hour: number|null }|null, Function]}
   */
  const [quickCreate, setQuickCreate] = useState(null);

  /**
   * ID of the event pending confirmation before deletion.
   * Null when no deletion is in progress.
   * @type {[number|null, Function]}
   */
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  /** Fetch the current window on first mount. */
  useEffect(() => {
    fetchWindow();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Convert the store's ISO date string to a Date object for components that
   * require a Date (CalendarToolbar and CalendarGrid).
   * Parsed as local midnight to avoid timezone-related off-by-one days.
   *
   * @type {Date}
   */
  const currentDateObj = (() => {
    const [year, month, day] = currentDateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  })();

  // ---------------------------------------------------------------------------
  // Slot / event / task handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle click on an empty calendar slot (day/week views).
   * Opens the QuickCreateForm overlay pre-filled with the clicked date and hour.
   *
   * @param {Date}        date - The calendar date that was clicked.
   * @param {number|null} hour - Hour of day (0–23), or null for all-day.
   * @returns {void}
   */
  function handleSlotClick(date, hour) {
    setQuickCreate({ date, hour });
  }

  /**
   * Handle click on an event chip.
   * Navigates to the event editor page.
   *
   * @param {object} event - The event object that was clicked.
   * @returns {void}
   */
  function handleEventClick(event) {
    navigate(`/calendar/events/${event.id}`);
  }

  /**
   * Handle click on a task chip inside the calendar.
   * Navigates to the task detail page.
   *
   * @param {object} task - The task object that was clicked.
   * @returns {void}
   */
  function handleTaskClick(task) {
    navigate(`/tasks/${task.id}`);
  }

  /**
   * Handle delete triggered from an event chip.
   * Opens a confirmation dialog before deleting.
   *
   * @param {number} eventId - ID of the event to delete.
   * @returns {void}
   */
  function handleEventDelete(eventId) {
    setPendingDeleteId(eventId);
  }

  /** Confirm the pending chip-level event deletion. */
  function handleConfirmDelete() {
    if (pendingDeleteId != null) {
      deleteEvent(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }

  /** Cancel the pending chip-level event deletion. */
  function handleCancelDelete() {
    setPendingDeleteId(null);
  }

  /**
   * Handle day-cell click in the month view.
   * Drills down to the day view for the clicked date.
   *
   * @param {Date} date - The calendar date that was clicked.
   * @returns {void}
   */
  function handleDayClick(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    setActiveView('day');
    setCurrentDate(iso);
  }

  // ---------------------------------------------------------------------------
  // QuickCreateForm callbacks
  // ---------------------------------------------------------------------------

  /**
   * Called when the QuickCreateForm saves an event.
   * Closes the overlay.
   *
   * @returns {void}
   */
  function handleQuickSave() {
    setQuickCreate(null);
  }

  /**
   * Called when the QuickCreateForm's Expand button is clicked.
   * Closes the overlay and navigates to the full event editor.
   *
   * @param {number} id - ID of the newly created event.
   * @returns {void}
   */
  function handleQuickExpand(id) {
    setQuickCreate(null);
    navigate(`/calendar/events/${id}`);
  }

  /** Close the QuickCreateForm overlay without creating an event. */
  function handleQuickClose() {
    setQuickCreate(null);
  }

  // ---------------------------------------------------------------------------
  // Derived flags
  // ---------------------------------------------------------------------------

  /** True when first loading with no items yet present. */
  const showSpinner = isLoading && items.length === 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <CalendarToolbar
        activeView={activeView}
        onViewChange={setActiveView}
        currentDate={currentDateObj}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToToday}
      />

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center justify-between bg-red-50 px-4 py-2 text-sm text-red-800"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchWindow}
            className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading spinner — only while fetching with no items */}
      {showSpinner && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {/* Calendar grid */}
      {!showSpinner && (
        <div className="relative flex-1 overflow-auto">
          <CalendarGrid
            activeView={activeView}
            currentDate={currentDateObj}
            items={items}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
            onTaskClick={handleTaskClick}
            onEventDelete={handleEventDelete}
            onDayClick={handleDayClick}
          />

          {/* QuickCreateForm fixed overlay */}
          {quickCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
              <QuickCreateForm
                initialDate={quickCreate.date}
                initialHour={quickCreate.hour}
                onSave={handleQuickSave}
                onExpand={handleQuickExpand}
                onClose={handleQuickClose}
              />
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        isOpen={pendingDeleteId != null}
        message="Delete this event? This cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default CalendarPage;
