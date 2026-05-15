/**
 * Zustand store for the Search module.
 * Manages the global search query, paginated results, loading/error status,
 * and dropdown visibility. All API calls delegate to the search API client.
 *
 * @module store/searchStore
 */

import { create } from 'zustand';
import { search as apiSearch } from '../api/search.js';

/**
 * Zustand store hook for managing search state and actions.
 *
 * State shape:
 *   query        {string}      - The current search query string. Default ''.
 *   results      {object[]}    - Ranked search result objects. Default [].
 *   total        {number}      - Total number of matching results. Default 0.
 *   isLoading    {boolean}     - True while a search request is in flight. Default false.
 *   error        {string|null} - Last error message, or null if none. Default null.
 *   dropdownOpen {boolean}     - True when the search results dropdown is visible. Default false.
 *
 * Actions:
 *   setQuery(q)         - Update `query` only; does not trigger an API call.
 *   search(q, limit)    - Execute a search: sets isLoading, calls the API, updates results/total.
 *   openDropdown()      - Set dropdownOpen to true.
 *   closeDropdown()     - Set dropdownOpen to false.
 *   clearResults()      - Reset results to [], total to 0, and error to null.
 *
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<object>>}
 */
export const useSearchStore = create((set) => ({
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** @type {string} The current raw search query string. */
  query: '',

  /** @type {object[]} Ranked search results from the last successful request. */
  results: [],

  /** @type {number} Total number of matching results reported by the API. */
  total: 0,

  /** @type {boolean} True while a search network request is in flight. */
  isLoading: false,

  /** @type {string|null} Last error message; null when no error has occurred. */
  error: null,

  /** @type {boolean} True when the search results dropdown should be visible. */
  dropdownOpen: false,

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Update the query string without triggering an API call.
   * Use this to keep the input field in sync with the store.
   * @param {string} q - The new query string.
   * @returns {void}
   */
  setQuery: (q) => {
    set({ query: q });
  },

  /**
   * Execute a search against the API using the provided query and optional limit.
   * Sets isLoading to true before the request. On success, updates results, total,
   * isLoading, and clears any previous error. On failure, sets error to the error
   * message and clears isLoading.
   * @param {string} q - The search query string.
   * @param {number} [limit=10] - Maximum number of results to return.
   * @returns {Promise<void>}
   */
  search: async (q, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const { results, total } = await apiSearch({ q, limit });
      set({ results, total, isLoading: false, error: null });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /**
   * Open the search results dropdown.
   * @returns {void}
   */
  openDropdown: () => {
    set({ dropdownOpen: true });
  },

  /**
   * Close the search results dropdown.
   * @returns {void}
   */
  closeDropdown: () => {
    set({ dropdownOpen: false });
  },

  /**
   * Clear the current search results, total count, and any error.
   * Does not clear the query or affect dropdownOpen.
   * @returns {void}
   */
  clearResults: () => {
    set({ results: [], total: 0, error: null });
  },
}));
