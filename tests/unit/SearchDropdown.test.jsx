/**
 * Unit tests for client/src/components/SearchDropdown.jsx.
 *
 * Covers all four render states (in priority order):
 *   1. Loading  — isLoading === true shows "Searching…"
 *   2. Recent searches — query is empty and recentSearches is non-empty
 *   3. Results  — results array is non-empty (up to 10 rows + "See all" footer)
 *   4. Empty    — query is non-empty, results is empty, not loading
 *
 * Also covers:
 *   - ✕ button stops propagation so onRecentClick is NOT called
 *   - Loading state takes priority over all others
 *   - Results state takes priority over empty state
 *
 * SearchResultItem is mocked so tests don't depend on TypeIcon.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock SearchResultItem to isolate SearchDropdown rendering
// ---------------------------------------------------------------------------

vi.mock('../../client/src/components/SearchResultItem.jsx', () => ({
  default: function SearchResultItem({ result, onClick }) {
    return (
      <div
        data-testid="search-result-item"
        data-kind={result.kind}
        data-id={result.id}
        role="button"
        tabIndex={0}
        onClick={() => onClick(result)}
      >
        {result.title}
      </div>
    );
  },
}));

import SearchDropdown from '../../client/src/components/SearchDropdown.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A sample result object. */
const SAMPLE_RESULT = {
  id: 1,
  kind: 'note',
  title: 'Meeting Notes',
  subtitle: 'Q3 roadmap discussion',
  url: '/notes/1',
  updatedAt: '2025-01-15T10:00:00.000Z',
  isPinned: false,
};

/** Build an array of N results. */
function makeResults(n) {
  return Array.from({ length: n }, (_, i) => ({
    ...SAMPLE_RESULT,
    id: i + 1,
    title: `Result ${i + 1}`,
  }));
}

/** Default props — renders nothing (no query, no recents, no results). */
const DEFAULT_PROPS = {
  results: [],
  recentSearches: [],
  isLoading: false,
  query: '',
  onResultClick: vi.fn(),
  onSeeAll: vi.fn(),
  onRecentClick: vi.fn(),
  onDeleteRecent: vi.fn(),
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Render SearchDropdown with defaults merged with overrides.
 *
 * @param {object} [overrides] - Prop overrides applied on top of DEFAULT_PROPS.
 * @returns {{ onResultClick, onSeeAll, onRecentClick, onDeleteRecent }} - mock callbacks
 */
function renderDropdown(overrides = {}) {
  const onResultClick = overrides.onResultClick ?? vi.fn();
  const onSeeAll = overrides.onSeeAll ?? vi.fn();
  const onRecentClick = overrides.onRecentClick ?? vi.fn();
  const onDeleteRecent = overrides.onDeleteRecent ?? vi.fn();

  const props = {
    ...DEFAULT_PROPS,
    ...overrides,
    onResultClick,
    onSeeAll,
    onRecentClick,
    onDeleteRecent,
  };

  render(<SearchDropdown {...props} />);
  return { onResultClick, onSeeAll, onRecentClick, onDeleteRecent };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// State 1: Loading
// ---------------------------------------------------------------------------

describe('loading state', () => {
  it('shows "Searching…" when isLoading is true', () => {
    renderDropdown({ isLoading: true });
    expect(screen.getByText('Searching…')).toBeInTheDocument();
  });

  it('does not show results when isLoading is true', () => {
    renderDropdown({ isLoading: true, results: makeResults(3), query: 'hello' });
    expect(screen.queryByTestId('search-result-item')).not.toBeInTheDocument();
  });

  it('does not show recent searches when isLoading is true', () => {
    renderDropdown({ isLoading: true, recentSearches: ['foo', 'bar'] });
    expect(screen.queryByText('foo')).not.toBeInTheDocument();
    expect(screen.queryByText('bar')).not.toBeInTheDocument();
  });

  it('does not show the empty message when isLoading is true', () => {
    renderDropdown({ isLoading: true, query: 'something', results: [] });
    expect(screen.queryByText(/no results for/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// State 2: Recent searches
// ---------------------------------------------------------------------------

describe('recent searches state', () => {
  it('renders each recent search string', () => {
    renderDropdown({ recentSearches: ['contacts report', 'Q3 notes'] });
    expect(screen.getByText('contacts report')).toBeInTheDocument();
    expect(screen.getByText('Q3 notes')).toBeInTheDocument();
  });

  it('calls onRecentClick with the query when a row is clicked', () => {
    const { onRecentClick } = renderDropdown({ recentSearches: ['contacts report'] });
    // The row div has role="button"; find it by its text content (not the ✕ button)
    const rows = screen.getAllByRole('button');
    const rowButton = rows.find((btn) => btn.textContent.includes('contacts report') && !btn.getAttribute('aria-label'));
    fireEvent.click(rowButton);
    expect(onRecentClick).toHaveBeenCalledWith('contacts report');
  });

  it('calls onDeleteRecent with the query when ✕ is clicked', () => {
    const { onDeleteRecent } = renderDropdown({ recentSearches: ['Q3 notes'] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove recent search: Q3 notes' }));
    expect(onDeleteRecent).toHaveBeenCalledWith('Q3 notes');
  });

  it('does NOT call onRecentClick when ✕ is clicked (stop propagation)', () => {
    const { onRecentClick } = renderDropdown({ recentSearches: ['Q3 notes'] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove recent search: Q3 notes' }));
    expect(onRecentClick).not.toHaveBeenCalled();
  });

  it('does not render recent searches when query is non-empty', () => {
    renderDropdown({ query: 'hello', recentSearches: ['Q3 notes'] });
    expect(screen.queryByText('Q3 notes')).not.toBeInTheDocument();
  });

  it('does not render recent searches heading when list is empty', () => {
    renderDropdown({ recentSearches: [] });
    expect(screen.queryByText(/recent searches/i)).not.toBeInTheDocument();
  });

  it('renders all provided recent search entries', () => {
    renderDropdown({ recentSearches: ['alpha', 'beta', 'gamma'] });
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.getByText('gamma')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// State 3: Results
// ---------------------------------------------------------------------------

describe('results state', () => {
  it('renders a SearchResultItem for each result', () => {
    renderDropdown({ query: 'hello', results: makeResults(3) });
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(3);
  });

  it('renders at most 10 result rows when more than 10 are provided', () => {
    renderDropdown({ query: 'hello', results: makeResults(12) });
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(10);
  });

  it('renders the "See all results" footer button', () => {
    renderDropdown({ query: 'hello', results: makeResults(2) });
    expect(screen.getByRole('button', { name: /see all results/i })).toBeInTheDocument();
  });

  it('calls onSeeAll when "See all results" is clicked', () => {
    const { onSeeAll } = renderDropdown({ query: 'hello', results: makeResults(2) });
    fireEvent.click(screen.getByRole('button', { name: /see all results/i }));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('calls onResultClick with the result when a result row is clicked', () => {
    const results = makeResults(1);
    const { onResultClick } = renderDropdown({ query: 'hello', results });
    fireEvent.click(screen.getByTestId('search-result-item'));
    expect(onResultClick).toHaveBeenCalledTimes(1);
    expect(onResultClick).toHaveBeenCalledWith(results[0]);
  });

  it('does not render the empty message when results are present', () => {
    renderDropdown({ query: 'hello', results: makeResults(1) });
    expect(screen.queryByText(/no results for/i)).not.toBeInTheDocument();
  });

  it('results take priority over the empty state', () => {
    renderDropdown({ query: 'hello', results: makeResults(1), isLoading: false });
    expect(screen.getByTestId('search-result-item')).toBeInTheDocument();
    expect(screen.queryByText(/no results for/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// State 4: Empty
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('shows "No results for «{query}»" when query is set and results are empty', () => {
    renderDropdown({ query: 'unicorn', results: [] });
    expect(screen.getByText('No results for «unicorn»')).toBeInTheDocument();
  });

  it('includes the query verbatim in the empty message', () => {
    renderDropdown({ query: 'my search term', results: [] });
    expect(screen.getByText('No results for «my search term»')).toBeInTheDocument();
  });

  it('does not show the empty message when query is empty', () => {
    renderDropdown({ query: '', results: [] });
    expect(screen.queryByText(/no results for/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Null render (no state matches)
// ---------------------------------------------------------------------------

describe('null render', () => {
  it('renders nothing when query is empty, recentSearches is empty, and results is empty', () => {
    const { container } = render(
      <SearchDropdown {...DEFAULT_PROPS} />
    );
    expect(container.firstChild).toBeNull();
  });
});
