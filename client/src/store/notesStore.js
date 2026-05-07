/**
 * Zustand store for the Notes module.
 * Manages the list of notes, the currently selected note, available tags,
 * sort state, loading/saving/error status, and all CRUD actions that delegate
 * to the API client. Derived `sortedNotes` is always pinned-first within the
 * chosen secondary sort order.
 * @module store/notesStore
 */

import { create } from 'zustand';
import {
  getNotes,
  getNote,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  deleteNote as apiDeleteNote,
} from '../api/notes.js';
import { getTags } from '../api/tags.js';

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Derive a sorted notes array from the full list using the given sort key.
 * Pinned notes always appear before unpinned notes. Within each group the
 * secondary sort is applied:
 *   - `updated_desc` — updatedAt descending (most-recently-edited first)
 *   - `updated_asc`  — updatedAt ascending  (least-recently-edited first)
 *   - `title_asc`    — title ascending, case-insensitive
 * @param {object[]} notes   - Full array of camelCase note objects.
 * @param {string}   sortKey - One of `updated_desc`, `updated_asc`, `title_asc`.
 * @returns {object[]} Sorted array with pinned notes first.
 */
function _deriveSorted(notes, sortKey) {
  const pinned = notes.filter((n) => n.isPinned === true);
  const unpinned = notes.filter((n) => n.isPinned !== true);

  /**
   * Return a comparator function for the given sort key.
   * @param {string} key - Sort key string.
   * @returns {(a: object, b: object) => number} Comparator.
   */
  function comparator(key) {
    if (key === 'updated_asc') {
      return (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt);
    }
    if (key === 'title_asc') {
      return (a, b) =>
        (a.title ?? '').toLowerCase().localeCompare((b.title ?? '').toLowerCase());
    }
    // default: updated_desc
    return (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);
  }

  const cmp = comparator(sortKey);
  return [...pinned.sort(cmp), ...unpinned.sort(cmp)];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Zustand store hook for managing notes state and actions.
 *
 * State shape:
 *   notes        {object[]}    - Full list of notes from the last fetch.
 *   selectedNote {object|null} - Currently viewed/edited note.
 *   tags         {object[]}    - All available tags.
 *   isLoading    {boolean}     - True while a fetch action is in flight.
 *   isSaving     {boolean}     - True while an updateNote call is in flight.
 *   error        {string|null} - Last error message, or null if none.
 *   sortKey      {string}      - Active sort key, persisted to localStorage.
 *   sortedNotes  {object[]}    - Derived: pinned-first sorted view of `notes`.
 *
 * Actions:
 *   fetchNotes()               - Load all notes from the API (sorted by sortKey).
 *   fetchNote(id)              - Load a single note and set selectedNote.
 *   createNote(data)           - POST a new note and prepend to list.
 *   updateNote(id, data)       - PATCH a note; sets isSaving around the call.
 *   deleteNote(id)             - DELETE a note and remove from list.
 *   fetchTags()                - Load all tags from the API.
 *   setSortKey(key)            - Update sortKey and persist to localStorage.
 *   setSelectedNote(note)      - Set selectedNote directly (no API call).
 *
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<object>>}
 */
export const useNotesStore = create((set, get) => ({
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  notes: [],
  selectedNote: null,
  tags: [],
  isLoading: false,
  isSaving: false,
  error: null,
  sortKey: (typeof localStorage !== 'undefined' && localStorage.getItem('notes_sort')) || 'updated_desc',
  sortedNotes: [],

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Fetch all notes from the API using the current sortKey and update state.
   * Sets `isLoading` around the request and re-derives `sortedNotes`.
   * @returns {Promise<void>}
   */
  fetchNotes: async () => {
    const { sortKey } = get();
    set({ isLoading: true, error: null });
    try {
      const notes = await getNotes({ sort: sortKey });
      set({
        notes,
        sortedNotes: _deriveSorted(notes, sortKey),
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /**
   * Fetch a single note by ID and store it as selectedNote.
   * @param {number} id - The note ID to fetch.
   * @returns {Promise<void>}
   */
  fetchNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const note = await getNote(id);
      set({ selectedNote: note, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /**
   * Create a new note via the API, then prepend it to the notes list.
   * Re-derives `sortedNotes` after the update.
   * @param {object} data - camelCase note fields (title required).
   * @returns {Promise<object>} The newly created note object.
   */
  createNote: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const created = await apiCreateNote(data);
      const notes = [created, ...get().notes];
      const { sortKey } = get();
      set({
        notes,
        sortedNotes: _deriveSorted(notes, sortKey),
        isLoading: false,
      });
      return created;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Update an existing note via the API, then refresh its entry in the list.
   * Sets `isSaving` to true before the call and false after (success or error).
   * Also updates selectedNote if it matches the updated ID.
   * @param {number} id   - The note ID to update.
   * @param {object} data - Partial camelCase note fields to update.
   * @returns {Promise<object>} The updated note object.
   */
  updateNote: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await apiUpdateNote(id, data);
      const { selectedNote, sortKey } = get();
      const notes = get().notes.map((n) => (n.id === id ? updated : n));
      set({
        notes,
        sortedNotes: _deriveSorted(notes, sortKey),
        selectedNote: selectedNote && selectedNote.id === id ? updated : selectedNote,
        isSaving: false,
      });
      return updated;
    } catch (err) {
      set({ isSaving: false, error: err.message });
      throw err;
    }
  },

  /**
   * Delete a note by ID via the API, then remove it from the list.
   * Clears selectedNote if it matches the deleted ID.
   * @param {number} id - The note ID to delete.
   * @returns {Promise<void>}
   */
  deleteNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteNote(id);
      const { selectedNote, sortKey } = get();
      const notes = get().notes.filter((n) => n.id !== id);
      set({
        notes,
        sortedNotes: _deriveSorted(notes, sortKey),
        selectedNote: selectedNote && selectedNote.id === id ? null : selectedNote,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Fetch all available tags from the API and update state.
   * @returns {Promise<void>}
   */
  fetchTags: async () => {
    set({ error: null });
    try {
      const tags = await getTags();
      set({ tags });
    } catch (err) {
      set({ error: err.message });
    }
  },

  /**
   * Update the sort key, persist it to localStorage, and re-derive sortedNotes.
   * No API call is made — sorting is applied to the already-fetched notes.
   * @param {string} key - One of `updated_desc`, `updated_asc`, `title_asc`.
   * @returns {void}
   */
  setSortKey: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('notes_sort', key);
    const { notes } = get();
    set({
      sortKey: key,
      sortedNotes: _deriveSorted(notes, key),
    });
  },

  /**
   * Set selectedNote directly without making an API call.
   * @param {object|null} note - The note to select, or null to deselect.
   * @returns {void}
   */
  setSelectedNote: (note) => {
    set({ selectedNote: note });
  },
}));
