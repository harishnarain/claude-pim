/**
 * SearchResultList — renders search results as a flat list or grouped by kind.
 *
 * In flat mode (`grouped={false}`) each result is rendered as a
 * {@link SearchResultItem} row in the order given.
 *
 * In grouped mode (`grouped={true}`) results are bucketed into four fixed
 * sections — Contacts, Notes, Tasks, Events — with a section heading above
 * each non-empty group.  Each section shows the first 20 items and exposes a
 * "Show more" button (per-section local state) that reveals the next 20.  The
 * button disappears once all items in that section are visible.
 *
 * @module SearchResultList
 */

import React, { useState } from 'react';
import SearchResultItem from './SearchResultItem.jsx';

/** Number of items shown initially (and added on each "Show more" click). */
const PAGE_SIZE = 20;

/**
 * Fixed section order and display labels for grouped mode.
 * @type {Array<{ kind: string, label: string }>}
 */
const SECTION_ORDER = [
  { kind: 'contact', label: 'Contacts' },
  { kind: 'note', label: 'Notes' },
  { kind: 'task', label: 'Tasks' },
  { kind: 'event', label: 'Events' },
];

// ---------------------------------------------------------------------------
// Section sub-component
// ---------------------------------------------------------------------------

/**
 * Renders one grouped section (heading + items + optional "Show more" button).
 *
 * @param {object}   props
 * @param {string}   props.label         - Section heading text.
 * @param {object[]} props.items         - All result items in this section.
 * @param {Function} props.onResultClick - Forwarded to each SearchResultItem.
 * @returns {JSX.Element}
 */
function ResultSection({ label, items, onResultClick }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /** Reveal the next page of items. */
  function handleShowMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <section aria-label={label}>
      <h3 className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </h3>
      <ul className="list-none p-0 m-0">
        {visibleItems.map((result) => (
          <li key={`${result.kind}-${result.id}`}>
            <SearchResultItem result={result} onClick={onResultClick} />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleShowMore}
          className="mx-3 mb-2 mt-1 text-xs text-blue-600 hover:underline focus:outline-none"
        >
          Show more
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

/**
 * SearchResultList renders a flat or grouped list of search results.
 *
 * @param {object}   props
 * @param {object[]} props.results         - Full array of SearchResult objects.
 * @param {boolean}  props.grouped         - false = flat list; true = grouped by kind.
 * @param {Function} props.onResultClick   - Called with the clicked result object.
 * @returns {JSX.Element|null}
 */
function SearchResultList({ results, grouped, onResultClick }) {
  if (!results || results.length === 0) {
    return null;
  }

  if (!grouped) {
    return (
      <ul className="list-none p-0 m-0" aria-label="Search results">
        {results.map((result) => (
          <li key={`${result.kind}-${result.id}`}>
            <SearchResultItem result={result} onClick={onResultClick} />
          </li>
        ))}
      </ul>
    );
  }

  // Grouped mode — bucket by kind in fixed order.
  const buckets = SECTION_ORDER.reduce((acc, { kind }) => {
    acc[kind] = results.filter((r) => r.kind === kind);
    return acc;
  }, {});

  return (
    <div aria-label="Search results">
      {SECTION_ORDER.map(({ kind, label }) => {
        const items = buckets[kind];
        if (!items || items.length === 0) return null;
        return (
          <ResultSection
            key={kind}
            label={label}
            items={items}
            onResultClick={onResultClick}
          />
        );
      })}
    </div>
  );
}

export default SearchResultList;
