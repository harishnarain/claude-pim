/**
 * useRecentSearches — manages a persistent list of recent search queries.
 *
 * Stores up to 5 recent searches in localStorage under the key
 * `pim_recent_searches` as a JSON array of strings, newest first.
 * State is kept in sync with localStorage on every mutation.
 *
 * @module hooks/useRecentSearches
 */

import { useState } from 'react';

/** @constant {string} localStorage key for persisting recent searches. */
const STORAGE_KEY = 'pim_recent_searches';

/** @constant {number} Maximum number of recent searches to retain. */
const MAX_ENTRIES = 5;

/**
 * Read the current list from localStorage, returning an empty array on error.
 * @returns {string[]} Parsed array of recent search strings.
 */
function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persist a list of recent searches to localStorage.
 * @param {string[]} searches - The array to store.
 * @returns {void}
 */
function writeToStorage(searches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
}

/**
 * Custom hook for managing recent searches backed by localStorage.
 *
 * @returns {{
 *   recentSearches: string[],
 *   addRecentSearch: (q: string) => void,
 *   deleteRecentSearch: (q: string) => void,
 *   clearAllRecentSearches: () => void,
 * }}
 */
function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState(() => readFromStorage());

  /**
   * Prepend a query to the list, removing any existing duplicate, and trim to
   * {@link MAX_ENTRIES} entries. Persists the updated list to localStorage.
   * @param {string} q - The search query to add.
   * @returns {void}
   */
  function addRecentSearch(q) {
    const deduped = recentSearches.filter((entry) => entry !== q);
    const updated = [q, ...deduped].slice(0, MAX_ENTRIES);
    writeToStorage(updated);
    setRecentSearches(updated);
  }

  /**
   * Remove a query from the list by exact value.
   * @param {string} q - The search query to remove.
   * @returns {void}
   */
  function deleteRecentSearch(q) {
    const updated = recentSearches.filter((entry) => entry !== q);
    writeToStorage(updated);
    setRecentSearches(updated);
  }

  /**
   * Remove all recent searches from both state and localStorage.
   * @returns {void}
   */
  function clearAllRecentSearches() {
    writeToStorage([]);
    setRecentSearches([]);
  }

  return { recentSearches, addRecentSearch, deleteRecentSearch, clearAllRecentSearches };
}

export default useRecentSearches;
