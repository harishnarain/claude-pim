/**
 * Zustand store for the Calendar module.
 * Manages calendar view state, navigation, the current window of merged
 * events+tasks, the selected event for editing, loading/saving/error status,
 * and all CRUD actions that delegate to the API client.
 *
 * `windowStart` and `windowEnd` are derived synchronously from `currentDate`
 * and `activeView` via `getWindowBounds` whenever either changes. The store
 * does not cache multiple windows — each navigation replaces `items[]` with
 * the freshly fetched window.
 *
 * @module store/calendarStore
 */

import { create } from 'zustand';
import {
  getEvents,
  getEvent,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
} from '../api/events.js';
import { getWindowBounds } from '../utils/calendar-layout.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @type {number} Milliseconds before saveStatus resets from 'saved' to 'idle'. */
const SAVE_IDLE_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Return today's date as an ISO date string (YYYY-MM-DD) in local time.
 * @returns {string} Today's date string.
 */
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Add `n` months to an ISO date string and return the result as an ISO date string.
 * The day is clamped to the last valid day of the target month.
 * @param {string} dateStr - ISO date string 'YYYY-MM-DD'.
 * @param {number} n - Number of months to add (may be negative).
 * @returns {string} Resulting ISO date string.
 */
function addMonths(dateStr, n) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1 + n, day);
  // If day overflowed (e.g. Jan 31 + 1 month), Date clamped it already.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
}

/**
 * Add `n` days to an ISO date string and return the result as an ISO date string.
 * @param {string} dateStr - ISO date string 'YYYY-MM-DD'.
 * @param {number} n - Number of days to add (may be negative).
 * @returns {string} Resulting ISO date string.
 */
function addDaysToIso(dateStr, n) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
}

/**
 * Compute the delta (in days or months) used by goPrev/goNext for a given view.
 * Returns an object indicating the unit and amount to apply.
 * @param {string} view - 'day' | 'workweek' | 'week' | 'month'
 * @returns {{ unit: 'days'|'months', amount: number }}
 */
function viewDelta(view) {
  if (view === 'day') return { unit: 'days', amount: 1 };
  if (view === 'workweek') return { unit: 'days', amount: 7 };
  if (view === 'week') return { unit: 'days', amount: 7 };
  return { unit: 'months', amount: 1 };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Zustand store hook for managing calendar state and actions.
 *
 * State shape:
 *   activeView     {string}      - One of 'day' | 'workweek' | 'week' | 'month'.
 *                                  Initialised from localStorage key 'calendar_view';
 *                                  defaults to 'week'.
 *   currentDate    {string}      - ISO date string 'YYYY-MM-DD' for the anchor date.
 *                                  Initialised to today.
 *   windowStart    {string}      - YYYY-MM-DD start of the current fetch window.
 *   windowEnd      {string}      - YYYY-MM-DD end of the current fetch window.
 *   items          {object[]}    - Merged events+tasks for the current window.
 *   isLoading      {boolean}     - True while fetchWindow or fetchEvent is in flight.
 *   error          {string|null} - Last error message, or null if none.
 *   selectedEvent  {object|null} - Full event object being viewed/edited.
 *   isSaving       {boolean}     - True while an updateEvent call is in flight.
 *   saveStatus     {string}      - One of 'idle' | 'saving' | 'saved' | 'error'.
 *
 * Actions:
 *   setActiveView(view)       - Switch calendar view, persist, recompute window, refetch.
 *   setCurrentDate(dateStr)   - Jump to a specific date, recompute window, refetch.
 *   goToToday()               - Navigate to today's date, refetch.
 *   goPrev()                  - Navigate back one view unit, refetch.
 *   goNext()                  - Navigate forward one view unit, refetch.
 *   fetchWindow()             - Fetch events+tasks for the current windowStart/windowEnd.
 *   fetchEvent(id)            - Fetch a single event and store as selectedEvent.
 *   createEvent(data)         - POST a new event; prepends to items[]; returns created.
 *   updateEvent(id, data)     - PATCH an event; updates items[] + selectedEvent.
 *   deleteEvent(id)           - DELETE an event; removes from items[].
 *   setSelectedEvent(event)   - Set selectedEvent directly without an API call.
 *
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<object>>}
 */
export const useCalendarStore = create((set, get) => {
  // Derive initial window bounds from today + default view.
  const _initialView =
    (typeof localStorage !== 'undefined' && localStorage.getItem('calendar_view')) ?? 'week';
  const _initialDate = todayIso();
  const _initialBounds = getWindowBounds(_initialDate, _initialView);

  return {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /** @type {string} Active calendar view; one of 'day' | 'workweek' | 'week' | 'month'. */
    activeView: _initialView,

    /** @type {string} Anchor date as ISO string 'YYYY-MM-DD'. */
    currentDate: _initialDate,

    /** @type {string} Start of the current fetch window (inclusive). */
    windowStart: _initialBounds.windowStart,

    /** @type {string} End of the current fetch window (inclusive). */
    windowEnd: _initialBounds.windowEnd,

    /** @type {object[]} Merged events and task chips for the current window. */
    items: [],

    /** @type {boolean} True while a network request is in flight. */
    isLoading: false,

    /** @type {string|null} Last error message; null when none. */
    error: null,

    /** @type {object|null} Full event object currently selected for viewing/editing. */
    selectedEvent: null,

    /** @type {boolean} True while an updateEvent call is in flight. */
    isSaving: false,

    /** @type {'idle'|'saving'|'saved'|'error'} Auto-save status indicator. */
    saveStatus: 'idle',

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    /**
     * Switch the active calendar view.
     * Persists the new view to localStorage, recomputes windowStart/windowEnd,
     * and triggers a fresh fetchWindow().
     * @param {'day'|'workweek'|'week'|'month'} view - The view to activate.
     * @returns {void}
     */
    setActiveView: (view) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('calendar_view', view);
      }
      const { currentDate } = get();
      const { windowStart, windowEnd } = getWindowBounds(currentDate, view);
      set({ activeView: view, windowStart, windowEnd });
      get().fetchWindow();
    },

    /**
     * Jump the calendar to a specific anchor date.
     * Recomputes windowStart/windowEnd for the current view and triggers fetchWindow().
     * @param {string} dateStr - ISO date string 'YYYY-MM-DD'.
     * @returns {void}
     */
    setCurrentDate: (dateStr) => {
      const { activeView } = get();
      const { windowStart, windowEnd } = getWindowBounds(dateStr, activeView);
      set({ currentDate: dateStr, windowStart, windowEnd });
      get().fetchWindow();
    },

    /**
     * Navigate to today's date.
     * Recomputes windowStart/windowEnd and triggers fetchWindow().
     * @returns {void}
     */
    goToToday: () => {
      const today = todayIso();
      const { activeView } = get();
      const { windowStart, windowEnd } = getWindowBounds(today, activeView);
      set({ currentDate: today, windowStart, windowEnd });
      get().fetchWindow();
    },

    /**
     * Navigate backward by one view unit (1 day, 1 week, or 1 month).
     * Recomputes windowStart/windowEnd and triggers fetchWindow().
     * @returns {void}
     */
    goPrev: () => {
      const { currentDate, activeView } = get();
      const delta = viewDelta(activeView);
      const newDate =
        delta.unit === 'months'
          ? addMonths(currentDate, -delta.amount)
          : addDaysToIso(currentDate, -delta.amount);
      const { windowStart, windowEnd } = getWindowBounds(newDate, activeView);
      set({ currentDate: newDate, windowStart, windowEnd });
      get().fetchWindow();
    },

    /**
     * Navigate forward by one view unit (1 day, 1 week, or 1 month).
     * Recomputes windowStart/windowEnd and triggers fetchWindow().
     * @returns {void}
     */
    goNext: () => {
      const { currentDate, activeView } = get();
      const delta = viewDelta(activeView);
      const newDate =
        delta.unit === 'months'
          ? addMonths(currentDate, delta.amount)
          : addDaysToIso(currentDate, delta.amount);
      const { windowStart, windowEnd } = getWindowBounds(newDate, activeView);
      set({ currentDate: newDate, windowStart, windowEnd });
      get().fetchWindow();
    },

    /**
     * Fetch all events and task chips within the current windowStart/windowEnd.
     * Sets isLoading around the request. On success, replaces items[] with the
     * fetched results. On failure, sets error.
     * @returns {Promise<void>}
     */
    fetchWindow: async () => {
      const { windowStart, windowEnd } = get();
      set({ isLoading: true, error: null });
      try {
        const items = await getEvents({ start: windowStart, end: windowEnd });
        set({ items, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: err.message });
      }
    },

    /**
     * Fetch a single event by ID and store it as selectedEvent.
     * @param {number} id - The event ID to fetch.
     * @returns {Promise<void>}
     */
    fetchEvent: async (id) => {
      set({ isLoading: true, error: null, selectedEvent: null });
      try {
        const event = await getEvent(id);
        set({ selectedEvent: event, isLoading: false });
      } catch (err) {
        set({ isLoading: false, error: err.message });
      }
    },

    /**
     * Create a new calendar event via the API, then prepend it to items[].
     * @param {object} data - camelCase event fields (title and startAt required).
     * @returns {Promise<object>} The newly created camelCase event object.
     */
    createEvent: async (data) => {
      set({ isLoading: true, error: null });
      try {
        const created = await apiCreateEvent(data);
        const items = [created, ...get().items];
        set({ items, isLoading: false });
        return created;
      } catch (err) {
        set({ isLoading: false, error: err.message });
        throw err;
      }
    },

    /**
     * Partially update an existing calendar event via the API.
     * Sets isSaving = true and saveStatus = 'saving' before the request.
     * On success: updates the matching entry in items[] and selectedEvent,
     * sets saveStatus = 'saved', then resets to 'idle' after 2 seconds.
     * On failure: sets saveStatus = 'error'.
     * @param {number} id - The event ID to update.
     * @param {object} data - Partial camelCase event fields to update.
     * @returns {Promise<object>} The updated camelCase event object.
     */
    updateEvent: async (id, data) => {
      set({ isSaving: true, saveStatus: 'saving', error: null });
      try {
        const updated = await apiUpdateEvent(id, data);
        const { selectedEvent } = get();
        const items = get().items.map((item) => (item.id === id ? updated : item));
        set({
          items,
          selectedEvent: selectedEvent && selectedEvent.id === id ? updated : selectedEvent,
          isSaving: false,
          saveStatus: 'saved',
        });
        setTimeout(() => {
          set({ saveStatus: 'idle' });
        }, SAVE_IDLE_DELAY_MS);
        return updated;
      } catch (err) {
        set({ isSaving: false, saveStatus: 'error', error: err.message });
        throw err;
      }
    },

    /**
     * Delete a calendar event by ID via the API, then remove it from items[].
     * Clears selectedEvent if its ID matches the deleted event.
     * @param {number} id - The event ID to delete.
     * @returns {Promise<void>}
     */
    deleteEvent: async (id) => {
      set({ isLoading: true, error: null });
      try {
        await apiDeleteEvent(id);
        const { selectedEvent } = get();
        const items = get().items.filter((item) => item.id !== id);
        set({
          items,
          selectedEvent: selectedEvent && selectedEvent.id === id ? null : selectedEvent,
          isLoading: false,
        });
      } catch (err) {
        set({ isLoading: false, error: err.message });
        throw err;
      }
    },

    /**
     * Set selectedEvent directly without making an API call.
     * Useful when navigating to the editor with an already-loaded event object.
     * @param {object|null} event - The event to select, or null to deselect.
     * @returns {void}
     */
    setSelectedEvent: (event) => {
      set({ selectedEvent: event });
    },
  };
});
