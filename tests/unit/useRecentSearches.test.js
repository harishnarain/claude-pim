// @vitest-environment jsdom
/**
 * Unit tests for client/src/hooks/useRecentSearches.js.
 *
 * Covers: adding a new entry, deduplication on re-add (moves to front),
 * trimming at 5 entries, deleting an entry, and clearing all entries.
 *
 * Uses @testing-library/react renderHook to exercise the hook inside a real
 * React render cycle, verifying that state and localStorage stay in sync.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useRecentSearches from '../../client/src/hooks/useRecentSearches.js';

const STORAGE_KEY = 'pim_recent_searches';

/**
 * Read and parse the current value from localStorage.
 * @returns {string[]} Parsed array, or empty array on missing/invalid data.
 */
function readStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

beforeEach(() => {
  localStorage.clear();
});

describe('useRecentSearches', () => {
  it('initialises with an empty list when localStorage is empty', () => {
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('initialises from existing localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['apple', 'banana']));
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual(['apple', 'banana']);
  });

  it('adds a new entry and places it first', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addRecentSearch('contacts');
    });

    expect(result.current.recentSearches[0]).toBe('contacts');
    expect(result.current.recentSearches).toHaveLength(1);
    expect(readStorage()[0]).toBe('contacts');
  });

  it('adds multiple entries, newest first', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addRecentSearch('first');
    });
    act(() => {
      result.current.addRecentSearch('second');
    });

    expect(result.current.recentSearches).toEqual(['second', 'first']);
  });

  it('deduplicates: re-adding an existing query moves it to the front', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addRecentSearch('alpha');
    });
    act(() => {
      result.current.addRecentSearch('beta');
    });
    act(() => {
      result.current.addRecentSearch('alpha');
    });

    expect(result.current.recentSearches[0]).toBe('alpha');
    // 'alpha' should appear only once
    expect(result.current.recentSearches.filter((q) => q === 'alpha')).toHaveLength(1);
    expect(result.current.recentSearches).toEqual(['alpha', 'beta']);
  });

  it('trims the list to 5 entries', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => { result.current.addRecentSearch('one'); });
    act(() => { result.current.addRecentSearch('two'); });
    act(() => { result.current.addRecentSearch('three'); });
    act(() => { result.current.addRecentSearch('four'); });
    act(() => { result.current.addRecentSearch('five'); });
    act(() => { result.current.addRecentSearch('six'); });

    expect(result.current.recentSearches).toHaveLength(5);
    // Oldest entry 'one' should have been evicted
    expect(result.current.recentSearches).not.toContain('one');
    // Newest entry 'six' should be first
    expect(result.current.recentSearches[0]).toBe('six');
    expect(readStorage()).toHaveLength(5);
  });

  it('deletes a specific entry by exact value', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addRecentSearch('keep-me');
    });
    act(() => {
      result.current.addRecentSearch('remove-me');
    });
    act(() => {
      result.current.deleteRecentSearch('remove-me');
    });

    expect(result.current.recentSearches).toEqual(['keep-me']);
    expect(readStorage()).toEqual(['keep-me']);
  });

  it('deleteRecentSearch is a no-op when the entry does not exist', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addRecentSearch('existing');
    });
    act(() => {
      result.current.deleteRecentSearch('nonexistent');
    });

    expect(result.current.recentSearches).toEqual(['existing']);
  });

  it('clears all entries', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addRecentSearch('one');
    });
    act(() => {
      result.current.addRecentSearch('two');
    });
    act(() => {
      result.current.clearAllRecentSearches();
    });

    expect(result.current.recentSearches).toEqual([]);
    expect(readStorage()).toEqual([]);
  });

  it('persists state to localStorage on every mutation', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addRecentSearch('persist-check');
    });
    expect(readStorage()).toEqual(['persist-check']);

    act(() => {
      result.current.deleteRecentSearch('persist-check');
    });
    expect(readStorage()).toEqual([]);
  });
});
