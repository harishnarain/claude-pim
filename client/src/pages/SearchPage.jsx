/**
 * SearchPage — full-page search results view at /search.
 *
 * Reads `q` and `type` from URL search params. Fires `store.search(q, 50)`
 * whenever `q` changes and keeps the navbar SearchBar query in sync via
 * `store.setQuery`. Applies the `type` filter client-side against
 * `store.results`. Provides module filter tabs, a "Group by module" toggle,
 * and delegates list rendering to `SearchResultList`.
 *
 * @module pages/SearchPage
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearchStore } from '../store/searchStore.js';
import SearchResultList from '../components/SearchResultList.jsx';

/**
 * Module filter tab definitions.
 * `value` is the `type` param value; `null` means "All" (no filter).
 * @type {Array<{ label: string, value: string|null }>}
 */
const MODULE_TABS = [
  { label: 'All', value: null },
  { label: 'Contacts', value: 'contact' },
  { label: 'Notes', value: 'note' },
  { label: 'Tasks', value: 'task' },
  { label: 'Events', value: 'event' },
];

/**
 * SearchPage renders the full search results page.
 *
 * URL params:
 *   q    {string}      - The active search query.
 *   type {string|null} - Optional module filter (contact | note | task | event).
 *
 * @returns {JSX.Element}
 */
function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  /** Current query from URL. */
  const q = searchParams.get('q') ?? '';

  /** Current module type filter from URL. */
  const type = searchParams.get('type') ?? null;

  /** Local state: whether to group results by module. */
  const [grouped, setGrouped] = useState(false);

  const isLoading = useSearchStore((s) => s.isLoading);
  const results = useSearchStore((s) => s.results);
  const { search, setQuery } = useSearchStore.getState();

  /**
   * Keep the navbar SearchBar input in sync with the URL `?q` param,
   * and fire a new search whenever `q` changes.
   */
  useEffect(() => {
    setQuery(q);
    if (q.length > 0) {
      search(q, 50);
    }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Apply the `type` filter client-side against `store.results`.
   * @type {object[]}
   */
  const filteredResults =
    type != null
      ? results.filter((result) => result.kind === type)
      : results;

  /**
   * Handle clicking a search result: navigate to its canonical URL.
   * @param {object} result - The clicked SearchResult object.
   * @param {string} result.url - Destination URL.
   * @returns {void}
   */
  function handleResultClick(result) {
    navigate(result.url);
  }

  /**
   * Update the `type` URL param when the user clicks a module filter tab.
   * Clicking "All" clears the param entirely.
   *
   * @param {string|null} newType - The tab value to set, or null to clear.
   * @returns {void}
   */
  function handleTabClick(newType) {
    if (newType == null) {
      searchParams.delete('type');
    } else {
      searchParams.set('type', newType);
    }
    setSearchParams(searchParams, { replace: true });
  }

  /**
   * Toggle the "Group by module" layout.
   * @returns {void}
   */
  function handleGroupToggle() {
    setGrouped((prev) => !prev);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  /** Classes applied to the active module filter tab. */
  const activeTabClass =
    'border-b-2 border-blue-600 text-blue-600 font-medium';

  /** Classes applied to inactive module filter tabs. */
  const inactiveTabClass =
    'text-gray-500 hover:text-gray-700 border-b-2 border-transparent';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Empty query prompt */}
      {q.length === 0 && (
        <p className="mt-12 text-center text-gray-500">
          Type something to search across all your data.
        </p>
      )}

      {q.length > 0 && (
        <>
          {/* Result count */}
          {!isLoading && (
            <p className="mb-4 text-sm text-gray-500">
              {filteredResults.length}{' '}
              {filteredResults.length === 1 ? 'result' : 'results'}
            </p>
          )}

          {/* Loading state */}
          {isLoading && (
            <p className="mb-4 text-sm text-gray-500">Searching…</p>
          )}

          {/* Module filter tabs */}
          <div className="mb-4 flex gap-4 border-b border-gray-200" role="tablist">
            {MODULE_TABS.map(({ label, value }) => {
              const isActive =
                value === null ? type == null : type === value;
              return (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabClick(value)}
                  className={`pb-2 text-sm ${isActive ? activeTabClass : inactiveTabClass}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Group-by toggle */}
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={handleGroupToggle}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              {grouped ? 'Ungroup' : 'Group by module'}
            </button>
          </div>

          {/* Results list */}
          {!isLoading && filteredResults.length > 0 && (
            <SearchResultList
              results={filteredResults}
              grouped={grouped}
              onResultClick={handleResultClick}
            />
          )}

          {/* Empty state */}
          {!isLoading && filteredResults.length === 0 && (
            <div className="mt-8 text-center text-gray-500">
              <p>
                No results for &laquo;{q}&raquo;
              </p>
              {type != null && (
                <p className="mt-1 text-sm">
                  Try removing the module filter.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;
