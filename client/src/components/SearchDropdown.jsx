/**
 * SearchDropdown — the panel rendered below the SearchBar.
 *
 * Renders one of four states (checked in order):
 *   1. Loading  — isLoading is true
 *   2. Recent searches — query is empty and recentSearches has entries
 *   3. Results  — results array is non-empty (up to 10 rows + "See all" footer)
 *   4. Empty    — query is non-empty, results is empty, and not loading
 *
 * @param {object}   props
 * @param {Array}    props.results          - Up to 10 SearchResult objects.
 * @param {string[]} props.recentSearches   - Up to 5 recent search strings.
 * @param {boolean}  props.isLoading        - True while a search is in flight.
 * @param {string}   props.query            - Current search input value.
 * @param {Function} props.onResultClick    - Called with a result object when a result row is clicked.
 * @param {Function} props.onSeeAll         - Called when "See all results" footer is clicked.
 * @param {Function} props.onRecentClick    - Called with a query string when a recent-search row is clicked.
 * @param {Function} props.onDeleteRecent   - Called with a query string when the ✕ button on a recent-search row is clicked.
 * @returns {JSX.Element}
 */
import React from 'react';
import SearchResultItem from './SearchResultItem.jsx';

/**
 * ClockIcon renders a simple SVG clock to prefix recent-search rows.
 * @returns {JSX.Element}
 */
function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 flex-shrink-0 text-gray-400"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * SearchDropdown renders the floating panel below the search input.
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function SearchDropdown({
  results,
  recentSearches,
  isLoading,
  query,
  onResultClick,
  onSeeAll,
  onRecentClick,
  onDeleteRecent,
}) {
  const containerClass =
    'absolute top-full mt-1 w-full min-w-[24rem] bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden';

  // ── State 1: Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={containerClass}>
        <p className="px-4 py-3 text-sm text-gray-500">Searching…</p>
      </div>
    );
  }

  // ── State 2: Recent searches ──────────────────────────────────────────────
  if (query === '' && recentSearches.length > 0) {
    return (
      <div className={containerClass}>
        <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Recent searches
        </p>
        <ul>
          {recentSearches.map((q) => (
            <li key={q}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onRecentClick(q)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRecentClick(q);
                  }
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              >
                <ClockIcon />
                <span className="flex-1 truncate text-sm text-gray-700">{q}</span>
                <button
                  type="button"
                  aria-label={`Remove recent search: ${q}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRecent(q);
                  }}
                  className="ml-1 flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 focus:outline-none"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ── State 3: Results ──────────────────────────────────────────────────────
  if (results.length > 0) {
    return (
      <div className={containerClass}>
        <ul>
          {results.slice(0, 10).map((result) => (
            <li key={`${result.kind}-${result.id}`}>
              <SearchResultItem result={result} onClick={onResultClick} />
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={onSeeAll}
            className="flex w-full items-center justify-center px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-gray-50 focus:outline-none"
          >
            See all results →
          </button>
        </div>
      </div>
    );
  }

  // ── State 4: Empty ────────────────────────────────────────────────────────
  if (query !== '') {
    return (
      <div className={containerClass}>
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          No results for «{query}»
        </p>
      </div>
    );
  }

  // query is empty, no recent searches, not loading — render nothing
  return null;
}

export default SearchDropdown;
