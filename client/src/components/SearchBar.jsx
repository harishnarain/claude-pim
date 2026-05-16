/**
 * SearchBar — the navbar search input and dropdown controller.
 *
 * Manages query input, debounced search dispatch, keyboard shortcuts (Enter /
 * Escape), click-outside detection, and delegation of user actions to
 * SearchDropdown via callbacks.
 *
 * @module components/SearchBar
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '../store/searchStore.js';
import useRecentSearches from '../hooks/useRecentSearches.js';
import SearchDropdown from './SearchDropdown.jsx';

/** Debounce delay (ms) before firing a search API call. */
const DEBOUNCE_MS = 300;

/**
 * SearchBar renders a text input and a floating dropdown that shows live
 * search results or recent searches.
 *
 * @returns {JSX.Element}
 */
function SearchBar() {
  const navigate = useNavigate();

  const query = useSearchStore((s) => s.query);
  const results = useSearchStore((s) => s.results);
  const isLoading = useSearchStore((s) => s.isLoading);
  const dropdownOpen = useSearchStore((s) => s.dropdownOpen);
  const { setQuery, search, openDropdown, closeDropdown } = useSearchStore.getState();

  const { recentSearches, addRecentSearch, deleteRecentSearch } = useRecentSearches();

  /** Ref to the timer used for debouncing search calls. */
  const debounceTimer = useRef(null);

  /** Ref to the wrapper div used for click-outside detection. */
  const wrapperRef = useRef(null);

  /** Ref to the element that was focused before the search bar opened, for Escape restoration. */
  const previousFocusRef = useRef(null);

  /**
   * Close the dropdown when the user clicks outside the wrapper div.
   */
  useEffect(() => {
    /**
     * Handle document mousedown events.
     * @param {MouseEvent} event - The mousedown event.
     * @returns {void}
     */
    function handleMouseDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [closeDropdown]);

  /**
   * Handle changes to the search input value.
   * Immediately updates the store query. After DEBOUNCE_MS ms, fires the
   * search API call (skipped when the value is empty — only the dropdown is
   * opened to show recent searches).
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   * @returns {void}
   */
  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (q.length > 0) {
        search(q, 10);
      }
    }, DEBOUNCE_MS);
  }

  /**
   * Handle input focus: capture the previously focused element (for Escape
   * restoration) and open the dropdown so recent searches are visible.
   *
   * @param {React.FocusEvent<HTMLInputElement>} e - The focus event.
   * @returns {void}
   */
  function handleFocus(e) {
    previousFocusRef.current = e.relatedTarget;
    openDropdown();
  }

  /**
   * Handle keydown events on the input.
   *
   * - Enter: add to recent searches and navigate to /search?q=…
   * - Escape: close the dropdown and blur the input
   *
   * @param {React.KeyboardEvent<HTMLInputElement>} e - The keyboard event.
   * @returns {void}
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.length > 0) {
      addRecentSearch(query);
      navigate(`/search?q=${encodeURIComponent(query)}`);
      closeDropdown();
    } else if (e.key === 'Escape') {
      closeDropdown();
      e.currentTarget.blur();
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }

  /**
   * Called when a result row inside the dropdown is clicked.
   * Records the result title as a recent search, navigates to the result URL,
   * and closes the dropdown.
   *
   * @param {object} result - The clicked search result object.
   * @param {string} result.title - Display title, recorded as a recent search.
   * @param {string} result.url   - Destination URL to navigate to.
   * @returns {void}
   */
  const handleResultClick = useCallback(
    (result) => {
      addRecentSearch(result.title);
      navigate(result.url);
      closeDropdown();
    },
    [addRecentSearch, navigate, closeDropdown]
  );

  /**
   * Called when the "See all results" footer button is clicked.
   * Records the current query as a recent search, navigates to the full
   * search results page, and closes the dropdown.
   *
   * @returns {void}
   */
  const handleSeeAll = useCallback(() => {
    if (query.length > 0) {
      addRecentSearch(query);
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
    closeDropdown();
  }, [query, addRecentSearch, navigate, closeDropdown]);

  /**
   * Called when a recent search row is clicked.
   * Fires a search for that query, navigates to the full search results page,
   * and closes the dropdown.
   *
   * @param {string} q - The recent search query string.
   * @returns {void}
   */
  const handleRecentClick = useCallback(
    (q) => {
      search(q, 10);
      navigate(`/search?q=${encodeURIComponent(q)}`);
      closeDropdown();
    },
    [search, navigate, closeDropdown]
  );

  /**
   * Called when the ✕ delete button on a recent search row is clicked.
   * Removes the entry from the recent searches list.
   *
   * @param {string} q - The recent search query string to remove.
   * @returns {void}
   */
  const handleDeleteRecent = useCallback(
    (q) => {
      deleteRecentSearch(q);
    },
    [deleteRecentSearch]
  );

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm">
      <input
        type="search"
        aria-label="Search"
        placeholder="Search…"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {dropdownOpen && (
        <SearchDropdown
          results={results}
          recentSearches={recentSearches}
          isLoading={isLoading}
          query={query}
          onResultClick={handleResultClick}
          onSeeAll={handleSeeAll}
          onRecentClick={handleRecentClick}
          onDeleteRecent={handleDeleteRecent}
        />
      )}
    </div>
  );
}

export default SearchBar;
