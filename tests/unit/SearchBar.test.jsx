// @vitest-environment jsdom
/**
 * Unit tests for client/src/components/SearchBar.jsx.
 *
 * Covers:
 *   - Input renders with correct placeholder and aria-label.
 *   - Typing triggers store.setQuery.
 *   - Enter key with a non-empty query navigates to /search?q=… and closes the dropdown.
 *   - Escape key closes the dropdown and blurs the input.
 *   - Click outside the wrapper closes the dropdown.
 *   - Focus opens the dropdown.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom'; // mocked — renders children directly

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Captured navigate calls. */
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  MemoryRouter: ({ children }) => children,
}));

/** Store action mocks — captured at module level so tests can inspect calls. */
const mockSetQuery = vi.fn();
const mockSearch = vi.fn();
const mockOpenDropdown = vi.fn();
const mockCloseDropdown = vi.fn();

/**
 * Current mutable store state used by the mock.
 * Each test can modify this before rendering.
 */
let mockStoreState = {
  query: '',
  results: [],
  isLoading: false,
  dropdownOpen: false,
};

vi.mock('../../client/src/store/searchStore.js', () => {
  /**
   * Selector-based hook that reads from mockStoreState.
   * @param {Function} selector - Selector function.
   * @returns {*} Selected value.
   */
  function useSearchStore(selector) {
    return selector(mockStoreState);
  }

  useSearchStore.getState = () => ({
    setQuery: mockSetQuery,
    search: mockSearch,
    openDropdown: mockOpenDropdown,
    closeDropdown: mockCloseDropdown,
  });

  return { useSearchStore };
});

/** useRecentSearches mock — minimal implementation. */
const mockAddRecentSearch = vi.fn();
const mockDeleteRecentSearch = vi.fn();

vi.mock('../../client/src/hooks/useRecentSearches.js', () => ({
  default: () => ({
    recentSearches: [],
    addRecentSearch: mockAddRecentSearch,
    deleteRecentSearch: mockDeleteRecentSearch,
    clearAllRecentSearches: vi.fn(),
  }),
}));

/** SearchDropdown mock — renders a simple sentinel so tests can detect it. */
vi.mock('../../client/src/components/SearchDropdown.jsx', () => ({
  default: function SearchDropdown() {
    return <div data-testid="search-dropdown" />;
  },
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks are set up
// ---------------------------------------------------------------------------

import SearchBar from '../../client/src/components/SearchBar.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render SearchBar inside a MemoryRouter (required for useNavigate).
 *
 * @returns {{ input: HTMLInputElement }} The rendered search input element.
 */
function renderSearchBar() {
  render(
    <MemoryRouter>
      <SearchBar />
    </MemoryRouter>
  );

  const input = screen.getByRole('searchbox', { hidden: true }) ??
    screen.getByPlaceholderText('Search…');

  return { input };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockStoreState = {
    query: '',
    results: [],
    isLoading: false,
    dropdownOpen: false,
  };
});

afterEach(() => {
  vi.clearAllTimers();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('rendering', () => {
  it('renders a search input with placeholder "Search…"', () => {
    renderSearchBar();
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument();
  });

  it('has aria-label "Search" on the input', () => {
    renderSearchBar();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('does not render the dropdown when dropdownOpen is false', () => {
    mockStoreState.dropdownOpen = false;
    renderSearchBar();
    expect(screen.queryByTestId('search-dropdown')).not.toBeInTheDocument();
  });

  it('renders the dropdown when dropdownOpen is true', () => {
    mockStoreState.dropdownOpen = true;
    renderSearchBar();
    expect(screen.getByTestId('search-dropdown')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Typing → store.setQuery
// ---------------------------------------------------------------------------

describe('typing', () => {
  it('calls store.setQuery with the current input value on each change', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(mockSetQuery).toHaveBeenCalledWith('hello');
  });

  it('does not call store.search immediately (debounced)', () => {
    vi.useFakeTimers();
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockSearch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('calls store.search after 300 ms debounce when query is non-empty', () => {
    vi.useFakeTimers();
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'hello' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearch).toHaveBeenCalledWith('hello', 10);
    vi.useRealTimers();
  });

  it('does NOT call store.search after debounce when query is empty', () => {
    vi.useFakeTimers();
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: '' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Focus → openDropdown
// ---------------------------------------------------------------------------

describe('focus', () => {
  it('calls store.openDropdown when the input is focused', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.focus(input);
    expect(mockOpenDropdown).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Enter key
// ---------------------------------------------------------------------------

describe('Enter key', () => {
  it('navigates to /search?q=… when Enter is pressed with a non-empty query', () => {
    mockStoreState.query = 'my search';
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=my%20search');
  });

  it('calls store.closeDropdown after Enter navigation', () => {
    mockStoreState.query = 'query';
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockCloseDropdown).toHaveBeenCalledTimes(1);
  });

  it('records the query as a recent search on Enter', () => {
    mockStoreState.query = 'record me';
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockAddRecentSearch).toHaveBeenCalledWith('record me');
  });

  it('does NOT navigate when Enter is pressed with an empty query', () => {
    mockStoreState.query = '';
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Escape key
// ---------------------------------------------------------------------------

describe('Escape key', () => {
  it('calls store.closeDropdown when Escape is pressed', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockCloseDropdown).toHaveBeenCalledTimes(1);
  });

  it('blurs the input when Escape is pressed', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    // Focus first, then fire Escape
    fireEvent.focus(input);
    const blurSpy = vi.spyOn(input, 'blur');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(blurSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Click outside
// ---------------------------------------------------------------------------

describe('click outside', () => {
  it('calls store.closeDropdown when mousedown fires outside the wrapper', () => {
    renderSearchBar();
    // Simulate a mousedown on the document body (outside the component wrapper)
    fireEvent.mouseDown(document.body);
    expect(mockCloseDropdown).toHaveBeenCalledTimes(1);
  });

  it('does NOT call store.closeDropdown when mousedown fires inside the input', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.mouseDown(input);
    expect(mockCloseDropdown).not.toHaveBeenCalled();
  });
});
