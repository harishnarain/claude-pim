/**
 * Unit tests for client/src/store/searchStore.js.
 * Mocks the API client module so no real HTTP requests are made.
 * Verifies that each action updates store state correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSearchStore } from '../../client/src/store/searchStore.js';

// ---------------------------------------------------------------------------
// Mock the search API client
// ---------------------------------------------------------------------------

vi.mock('../../client/src/api/search.js', () => ({
  search: vi.fn(),
}));

import { search as apiSearch } from '../../client/src/api/search.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reset the Zustand store to its initial state between tests.
 */
function resetStore() {
  useSearchStore.setState({
    query: '',
    results: [],
    total: 0,
    isLoading: false,
    error: null,
    dropdownOpen: false,
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('has the expected default values', () => {
    const state = useSearchStore.getState();
    expect(state.query).toBe('');
    expect(state.results).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.dropdownOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setQuery
// ---------------------------------------------------------------------------

describe('setQuery', () => {
  it('updates query without making an API call', () => {
    useSearchStore.getState().setQuery('hello world');

    const state = useSearchStore.getState();
    expect(state.query).toBe('hello world');
    expect(apiSearch).not.toHaveBeenCalled();
  });

  it('can clear the query to an empty string', () => {
    useSearchStore.setState({ query: 'existing query' });
    useSearchStore.getState().setQuery('');

    expect(useSearchStore.getState().query).toBe('');
  });
});

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------

describe('search', () => {
  it('sets isLoading true before the request completes', async () => {
    let resolve;
    apiSearch.mockReturnValue(new Promise((res) => { resolve = res; }));

    const promise = useSearchStore.getState().search('test');
    expect(useSearchStore.getState().isLoading).toBe(true);

    resolve({ results: [], total: 0 });
    await promise;
  });

  it('updates results, total, and clears error on success', async () => {
    const mockResults = [
      { id: 1, type: 'contact', title: 'Ada Lovelace' },
      { id: 2, type: 'note', title: 'My Note' },
    ];
    apiSearch.mockResolvedValue({ results: mockResults, total: 2 });

    await useSearchStore.getState().search('ada', 10);

    const state = useSearchStore.getState();
    expect(state.results).toEqual(mockResults);
    expect(state.total).toBe(2);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(apiSearch).toHaveBeenCalledWith({ q: 'ada', limit: 10 });
  });

  it('passes a custom limit to the API', async () => {
    apiSearch.mockResolvedValue({ results: [], total: 0 });

    await useSearchStore.getState().search('query', 5);

    expect(apiSearch).toHaveBeenCalledWith({ q: 'query', limit: 5 });
  });

  it('uses limit=10 by default', async () => {
    apiSearch.mockResolvedValue({ results: [], total: 0 });

    await useSearchStore.getState().search('query');

    expect(apiSearch).toHaveBeenCalledWith({ q: 'query', limit: 10 });
  });

  it('sets error and clears isLoading on API failure', async () => {
    apiSearch.mockRejectedValue(new Error('API error 500: SERVER_ERROR'));

    await useSearchStore.getState().search('bad query');

    const state = useSearchStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('API error 500: SERVER_ERROR');
    expect(state.results).toEqual([]);
  });

  it('clears a previous error on a subsequent successful search', async () => {
    useSearchStore.setState({ error: 'previous error' });
    apiSearch.mockResolvedValue({ results: [], total: 0 });

    await useSearchStore.getState().search('clean query');

    expect(useSearchStore.getState().error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// openDropdown / closeDropdown
// ---------------------------------------------------------------------------

describe('openDropdown', () => {
  it('sets dropdownOpen to true', () => {
    useSearchStore.getState().openDropdown();
    expect(useSearchStore.getState().dropdownOpen).toBe(true);
  });
});

describe('closeDropdown', () => {
  it('sets dropdownOpen to false', () => {
    useSearchStore.setState({ dropdownOpen: true });
    useSearchStore.getState().closeDropdown();
    expect(useSearchStore.getState().dropdownOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearResults
// ---------------------------------------------------------------------------

describe('clearResults', () => {
  it('resets results, total, and error to their initial values', () => {
    useSearchStore.setState({
      results: [{ id: 1, type: 'contact', title: 'Ada' }],
      total: 42,
      error: 'some error',
    });

    useSearchStore.getState().clearResults();

    const state = useSearchStore.getState();
    expect(state.results).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.error).toBeNull();
  });

  it('does not affect query or dropdownOpen', () => {
    useSearchStore.setState({ query: 'keep me', dropdownOpen: true });

    useSearchStore.getState().clearResults();

    const state = useSearchStore.getState();
    expect(state.query).toBe('keep me');
    expect(state.dropdownOpen).toBe(true);
  });
});
