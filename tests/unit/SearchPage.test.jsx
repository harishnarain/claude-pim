// @vitest-environment jsdom
/**
 * Unit tests for client/src/pages/SearchPage.jsx.
 *
 * Covers:
 *   - Empty-query prompt renders when q is absent.
 *   - search() and setQuery() are called when q is non-empty.
 *   - Result count displays the filtered result count.
 *   - Loading state shows "Searching…" text.
 *   - Module filter tabs render and update the URL type param.
 *   - Active tab has highlighted styling.
 *   - Group-by toggle switches the grouped prop on SearchResultList.
 *   - handleResultClick navigates to result.url.
 *   - Empty state renders when filteredResults is empty.
 *   - Empty state includes hint when type param is set.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared navigate mock. */
const mockNavigate = vi.fn();

/** Shared setSearchParams mock — captures the URLSearchParams passed to it. */
const mockSetSearchParams = vi.fn();

/**
 * URLSearchParams-like object returned by the useSearchParams mock.
 * Mutated per test via `mockSearchParamsState`.
 */
let mockSearchParamsState = { q: '', type: null };

/**
 * Build a minimal URLSearchParams-compatible object from `mockSearchParamsState`.
 * @returns {{ get: Function, set: Function, delete: Function }}
 */
function buildSearchParams() {
  const params = { ...mockSearchParamsState };
  return {
    get: (key) => params[key] ?? null,
    set: (key, value) => {
      params[key] = value;
    },
    delete: (key) => {
      params[key] = null;
    },
  };
}

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [buildSearchParams(), mockSetSearchParams],
  useNavigate: () => mockNavigate,
}));

/** Store action mocks. */
const mockSearch = vi.fn();
const mockSetQuery = vi.fn();

/** Mutable store state used by the hook mock. */
let mockStoreState = {
  isLoading: false,
  results: [],
  total: 0,
};

vi.mock('../../client/src/store/searchStore.js', () => {
  /**
   * Selector-based hook reading from mockStoreState.
   * @param {Function} selector
   * @returns {*}
   */
  function useSearchStore(selector) {
    return selector(mockStoreState);
  }

  useSearchStore.getState = () => ({
    search: mockSearch,
    setQuery: mockSetQuery,
  });

  return { useSearchStore };
});

/**
 * SearchResultList mock — exposes its props via data attributes so tests can
 * verify which props are passed without rendering real list internals.
 */
vi.mock('../../client/src/components/SearchResultList.jsx', () => ({
  default: function SearchResultList({ results, grouped, onResultClick }) {
    return (
      <div
        data-testid="search-result-list"
        data-grouped={String(grouped)}
        data-count={results.length}
      >
        {results.map((r) => (
          <div
            key={`${r.kind}-${r.id}`}
            data-testid="result-item"
            role="button"
            tabIndex={0}
            onClick={() => onResultClick(r)}
          >
            {r.title}
          </div>
        ))}
      </div>
    );
  },
}));

// ---------------------------------------------------------------------------
// Import component AFTER all mocks are registered
// ---------------------------------------------------------------------------

import SearchPage from '../../client/src/pages/SearchPage.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Sample search results — one per module kind.
 * @type {object[]}
 */
const RESULTS = [
  { id: 1, kind: 'contact', title: 'Alice Smith', subtitle: 'alice@example.com', url: '/contacts/1', updatedAt: '2025-01-01T00:00:00Z', isPinned: false },
  { id: 2, kind: 'note', title: 'Meeting notes', subtitle: 'project recap', url: '/notes/2', updatedAt: '2025-01-02T00:00:00Z', isPinned: false },
  { id: 3, kind: 'task', title: 'Buy groceries', subtitle: 'Not Started', url: '/tasks/3', updatedAt: '2025-01-03T00:00:00Z', isPinned: false },
  { id: 4, kind: 'event', title: 'Team standup', subtitle: 'Jan 4', url: '/events/4', updatedAt: '2025-01-04T00:00:00Z', isPinned: false },
];

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsState = { q: '', type: null };
  mockStoreState = { isLoading: false, results: [] };
});

// ---------------------------------------------------------------------------
// Empty-query state
// ---------------------------------------------------------------------------

describe('empty query', () => {
  it('renders the empty-query prompt when q is absent', () => {
    mockSearchParamsState = { q: '', type: null };
    render(<SearchPage />);
    expect(screen.getByText(/type something to search/i)).toBeInTheDocument();
  });

  it('does not call search() when q is empty', () => {
    mockSearchParamsState = { q: '', type: null };
    render(<SearchPage />);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('calls setQuery with empty string when q is empty', () => {
    mockSearchParamsState = { q: '', type: null };
    render(<SearchPage />);
    expect(mockSetQuery).toHaveBeenCalledWith('');
  });

  it('does not render module filter tabs when q is empty', () => {
    mockSearchParamsState = { q: '', type: null };
    render(<SearchPage />);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Non-empty query — store interactions
// ---------------------------------------------------------------------------

describe('non-empty query — store interactions', () => {
  it('calls store.search(q, 50) on mount when q is non-empty', () => {
    mockSearchParamsState = { q: 'meeting', type: null };
    render(<SearchPage />);
    expect(mockSearch).toHaveBeenCalledWith('meeting', 50);
  });

  it('calls store.setQuery(q) on mount when q is non-empty', () => {
    mockSearchParamsState = { q: 'meeting', type: null };
    render(<SearchPage />);
    expect(mockSetQuery).toHaveBeenCalledWith('meeting');
  });
});

// ---------------------------------------------------------------------------
// Result count
// ---------------------------------------------------------------------------

describe('result count', () => {
  it('shows the correct count when results are present', () => {
    mockSearchParamsState = { q: 'meeting', type: null };
    mockStoreState = { isLoading: false, results: RESULTS, total: RESULTS.length };
    render(<SearchPage />);
    expect(screen.getByText(/4 results/i)).toBeInTheDocument();
  });

  it('uses singular "result" when there is exactly one match', () => {
    mockSearchParamsState = { q: 'alice', type: null };
    mockStoreState = { isLoading: false, results: [RESULTS[0]], total: 1 };
    render(<SearchPage />);
    expect(screen.getByText(/1 result/i)).toBeInTheDocument();
  });

  it('shows filtered count when type param is set', () => {
    mockSearchParamsState = { q: 'test', type: 'contact' };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    // Only the 1 contact should be counted
    expect(screen.getByText(/1 result/i)).toBeInTheDocument();
  });

  it('hides result count while loading', () => {
    mockSearchParamsState = { q: 'meeting', type: null };
    mockStoreState = { isLoading: true, results: [] };
    render(<SearchPage />);
    expect(screen.queryByText(/results/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('loading state', () => {
  it('shows "Searching…" while isLoading is true', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: true, results: [] };
    render(<SearchPage />);
    expect(screen.getByText(/searching…/i)).toBeInTheDocument();
  });

  it('hides "Searching…" once loading is done', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.queryByText(/searching…/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Module filter tabs
// ---------------------------------------------------------------------------

describe('module filter tabs', () => {
  it('renders All, Contacts, Notes, Tasks, Events tabs', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Contacts' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Events' })).toBeInTheDocument();
  });

  it('"All" tab is selected when no type param is set', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Contacts' })).toHaveAttribute('aria-selected', 'false');
  });

  it('the matching tab is selected when type param is set', () => {
    mockSearchParamsState = { q: 'test', type: 'task' };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a tab calls setSearchParams', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Notes' }));
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
  });

  it('clicking "All" tab calls setSearchParams', () => {
    mockSearchParamsState = { q: 'test', type: 'note' };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Group-by toggle
// ---------------------------------------------------------------------------

describe('group-by toggle', () => {
  it('renders a "Group by module" button', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.getByRole('button', { name: /group by module/i })).toBeInTheDocument();
  });

  it('passes grouped={false} to SearchResultList by default', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.getByTestId('search-result-list')).toHaveAttribute('data-grouped', 'false');
  });

  it('toggles button label to "Ungroup" after clicking', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('button', { name: /group by module/i }));
    expect(screen.getByRole('button', { name: /ungroup/i })).toBeInTheDocument();
  });

  it('passes grouped={true} to SearchResultList after toggling', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('button', { name: /group by module/i }));
    expect(screen.getByTestId('search-result-list')).toHaveAttribute('data-grouped', 'true');
  });

  it('toggles back to ungrouped when "Ungroup" is clicked', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('button', { name: /group by module/i }));
    fireEvent.click(screen.getByRole('button', { name: /ungroup/i }));
    expect(screen.getByTestId('search-result-list')).toHaveAttribute('data-grouped', 'false');
  });
});

// ---------------------------------------------------------------------------
// Client-side type filtering
// ---------------------------------------------------------------------------

describe('client-side type filtering', () => {
  it('passes all results to SearchResultList when type is null', () => {
    mockSearchParamsState = { q: 'test', type: null };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.getByTestId('search-result-list')).toHaveAttribute('data-count', '4');
  });

  it('passes only matching results when type is "contact"', () => {
    mockSearchParamsState = { q: 'test', type: 'contact' };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.getByTestId('search-result-list')).toHaveAttribute('data-count', '1');
  });

  it('passes only task results when type is "task"', () => {
    mockSearchParamsState = { q: 'test', type: 'task' };
    mockStoreState = { isLoading: false, results: RESULTS };
    render(<SearchPage />);
    expect(screen.getByTestId('search-result-list')).toHaveAttribute('data-count', '1');
  });
});

// ---------------------------------------------------------------------------
// handleResultClick
// ---------------------------------------------------------------------------

describe('handleResultClick', () => {
  it('navigates to result.url when a result is clicked', () => {
    mockSearchParamsState = { q: 'alice', type: null };
    mockStoreState = { isLoading: false, results: [RESULTS[0]] };
    render(<SearchPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Alice Smith' }));
    expect(mockNavigate).toHaveBeenCalledWith('/contacts/1');
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('shows "No results for" message when results are empty and not loading', () => {
    mockSearchParamsState = { q: 'zzznomatch', type: null };
    mockStoreState = { isLoading: false, results: [] };
    render(<SearchPage />);
    expect(screen.getByText(/no results for/i)).toBeInTheDocument();
  });

  it('includes the query in the empty state message', () => {
    mockSearchParamsState = { q: 'zzznomatch', type: null };
    mockStoreState = { isLoading: false, results: [] };
    render(<SearchPage />);
    expect(screen.getByText(/zzznomatch/)).toBeInTheDocument();
  });

  it('does not show the module filter hint when type param is absent', () => {
    mockSearchParamsState = { q: 'zzznomatch', type: null };
    mockStoreState = { isLoading: false, results: [] };
    render(<SearchPage />);
    expect(screen.queryByText(/try removing the module filter/i)).not.toBeInTheDocument();
  });

  it('shows the module filter hint when type param is set and results are empty', () => {
    mockSearchParamsState = { q: 'zzznomatch', type: 'task' };
    mockStoreState = { isLoading: false, results: [] };
    render(<SearchPage />);
    expect(screen.getByText(/try removing the module filter/i)).toBeInTheDocument();
  });

  it('does not show empty state while loading', () => {
    mockSearchParamsState = { q: 'zzznomatch', type: null };
    mockStoreState = { isLoading: true, results: [] };
    render(<SearchPage />);
    expect(screen.queryByText(/no results for/i)).not.toBeInTheDocument();
  });

  it('does not show SearchResultList when results are empty', () => {
    mockSearchParamsState = { q: 'zzznomatch', type: null };
    mockStoreState = { isLoading: false, results: [] };
    render(<SearchPage />);
    expect(screen.queryByTestId('search-result-list')).not.toBeInTheDocument();
  });
});
