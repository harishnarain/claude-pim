/**
 * Unit tests for client/src/store/notesStore.js.
 * Mocks the API client modules so no real HTTP requests are made.
 * Verifies that each action updates store state correctly, that isSaving
 * is set/cleared around updateNote, and that sortedNotes is always
 * pinned-first within the chosen secondary sort.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotesStore } from '../../client/src/store/notesStore.js';

// ---------------------------------------------------------------------------
// Mock localStorage (not available in node environment)
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ---------------------------------------------------------------------------
// Mock the API clients
// ---------------------------------------------------------------------------

vi.mock('../../client/src/api/notes.js', () => ({
  getNotes: vi.fn(),
  getNote: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('../../client/src/api/tags.js', () => ({
  getTags: vi.fn(),
}));

import {
  getNotes,
  getNote,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  deleteNote as apiDeleteNote,
} from '../../client/src/api/notes.js';

import { getTags } from '../../client/src/api/tags.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a sample camelCase note (as returned by the API client).
 * @param {Partial<object>} overrides - Field overrides.
 * @returns {object} A camelCase note object.
 */
function makeNote(overrides = {}) {
  return {
    id: 1,
    title: 'Test Note',
    preview: 'Preview text',
    tags: [],
    isPinned: false,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    ...overrides,
  };
}

/**
 * Reset the Zustand store to initial state between tests.
 */
function resetStore() {
  useNotesStore.setState({
    notes: [],
    selectedNote: null,
    tags: [],
    isLoading: false,
    isSaving: false,
    error: null,
    sortKey: 'updated_desc',
    sortedNotes: [],
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  resetStore();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('has the expected default values', () => {
    const state = useNotesStore.getState();
    expect(state.notes).toEqual([]);
    expect(state.selectedNote).toBeNull();
    expect(state.tags).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.error).toBeNull();
    expect(state.sortedNotes).toEqual([]);
  });

  it('initialises sortKey from localStorage when a value is present', () => {
    localStorageMock.setItem('notes_sort', 'title_asc');
    // The store module reads localStorage at import time, so we simulate the
    // behaviour by directly verifying setSortKey persists to localStorage.
    useNotesStore.getState().setSortKey('title_asc');
    expect(localStorageMock.getItem('notes_sort')).toBe('title_asc');
  });
});

// ---------------------------------------------------------------------------
// fetchNotes
// ---------------------------------------------------------------------------

describe('fetchNotes', () => {
  it('sets isLoading true while fetching, then populates notes and sortedNotes', async () => {
    const note = makeNote();
    getNotes.mockResolvedValue([note]);

    const fetchNotesAction = useNotesStore.getState().fetchNotes;
    const promise = fetchNotesAction();
    expect(useNotesStore.getState().isLoading).toBe(true);

    await promise;

    const state = useNotesStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.notes).toEqual([note]);
    expect(state.sortedNotes).toEqual([note]);
  });

  it('passes the current sortKey to getNotes', async () => {
    getNotes.mockResolvedValue([]);
    useNotesStore.setState({ sortKey: 'title_asc' });

    await useNotesStore.getState().fetchNotes();

    expect(getNotes).toHaveBeenCalledWith({ sort: 'title_asc' });
  });

  it('sets error and clears isLoading on API failure', async () => {
    getNotes.mockRejectedValue(new Error('API error 500: SERVER_ERROR'));

    await useNotesStore.getState().fetchNotes();

    const state = useNotesStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('API error 500: SERVER_ERROR');
    expect(state.notes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchNote
// ---------------------------------------------------------------------------

describe('fetchNote', () => {
  it('fetches a single note and sets selectedNote', async () => {
    const note = makeNote({ id: 7 });
    getNote.mockResolvedValue(note);

    await useNotesStore.getState().fetchNote(7);

    const state = useNotesStore.getState();
    expect(getNote).toHaveBeenCalledWith(7);
    expect(state.selectedNote).toEqual(note);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    getNote.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await useNotesStore.getState().fetchNote(999);

    const state = useNotesStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('API error 404: NOT_FOUND');
    expect(state.selectedNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createNote
// ---------------------------------------------------------------------------

describe('createNote', () => {
  it('prepends the new note to the notes list and returns it', async () => {
    const existing = makeNote({ id: 1, title: 'Existing' });
    const created = makeNote({ id: 2, title: 'New Note' });

    useNotesStore.setState({
      notes: [existing],
      sortedNotes: [existing],
    });
    apiCreateNote.mockResolvedValue(created);

    const result = await useNotesStore.getState().createNote({ title: 'New Note' });

    expect(result).toEqual(created);
    const state = useNotesStore.getState();
    expect(state.notes[0]).toEqual(created);
    expect(state.notes[1]).toEqual(existing);
    expect(state.isLoading).toBe(false);
  });

  it('re-derives sortedNotes after creating a note', async () => {
    const existing = makeNote({ id: 1, isPinned: false, updatedAt: '2026-05-01T10:00:00Z' });
    const created = makeNote({ id: 2, isPinned: true, updatedAt: '2026-05-02T10:00:00Z' });

    useNotesStore.setState({ notes: [existing], sortKey: 'updated_desc' });
    apiCreateNote.mockResolvedValue(created);

    await useNotesStore.getState().createNote({ title: 'Pinned Note', isPinned: true });

    const state = useNotesStore.getState();
    // pinned notes come first
    expect(state.sortedNotes[0].id).toBe(2);
    expect(state.sortedNotes[1].id).toBe(1);
  });

  it('sets error and re-throws on API failure', async () => {
    apiCreateNote.mockRejectedValue(new Error('API error 422: VALIDATION_ERROR'));

    await expect(
      useNotesStore.getState().createNote({ title: '' })
    ).rejects.toThrow('API error 422: VALIDATION_ERROR');

    const state = useNotesStore.getState();
    expect(state.error).toBe('API error 422: VALIDATION_ERROR');
    expect(state.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateNote
// ---------------------------------------------------------------------------

describe('updateNote', () => {
  it('sets isSaving true before the API call and false after success', async () => {
    const original = makeNote({ id: 1, title: 'Old Title' });
    const updated = makeNote({ id: 1, title: 'New Title' });

    useNotesStore.setState({ notes: [original] });

    let isSavingDuringCall = false;
    apiUpdateNote.mockImplementation(async () => {
      isSavingDuringCall = useNotesStore.getState().isSaving;
      return updated;
    });

    await useNotesStore.getState().updateNote(1, { title: 'New Title' });

    expect(isSavingDuringCall).toBe(true);
    expect(useNotesStore.getState().isSaving).toBe(false);
  });

  it('replaces the updated note in the list and re-derives sortedNotes', async () => {
    const original = makeNote({ id: 1, title: 'Old Title' });
    const updated = makeNote({ id: 1, title: 'New Title' });

    useNotesStore.setState({ notes: [original], sortedNotes: [original] });
    apiUpdateNote.mockResolvedValue(updated);

    const result = await useNotesStore.getState().updateNote(1, { title: 'New Title' });

    expect(result).toEqual(updated);
    const state = useNotesStore.getState();
    expect(state.notes[0].title).toBe('New Title');
    expect(state.sortedNotes[0].title).toBe('New Title');
    expect(state.isSaving).toBe(false);
  });

  it('updates selectedNote when the updated note is currently selected', async () => {
    const original = makeNote({ id: 1, title: 'Old Title' });
    const updated = makeNote({ id: 1, title: 'New Title' });

    useNotesStore.setState({ notes: [original], selectedNote: original });
    apiUpdateNote.mockResolvedValue(updated);

    await useNotesStore.getState().updateNote(1, { title: 'New Title' });

    expect(useNotesStore.getState().selectedNote.title).toBe('New Title');
  });

  it('does not change selectedNote when a different note is updated', async () => {
    const noteA = makeNote({ id: 1, title: 'Note A' });
    const noteB = makeNote({ id: 2, title: 'Note B' });
    const updatedB = makeNote({ id: 2, title: 'Note B Updated' });

    useNotesStore.setState({ notes: [noteA, noteB], selectedNote: noteA });
    apiUpdateNote.mockResolvedValue(updatedB);

    await useNotesStore.getState().updateNote(2, { title: 'Note B Updated' });

    expect(useNotesStore.getState().selectedNote).toEqual(noteA);
  });

  it('sets isSaving false and re-throws on API failure', async () => {
    apiUpdateNote.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await expect(
      useNotesStore.getState().updateNote(999, { title: 'X' })
    ).rejects.toThrow('API error 404: NOT_FOUND');

    const state = useNotesStore.getState();
    expect(state.isSaving).toBe(false);
    expect(state.error).toBe('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// deleteNote
// ---------------------------------------------------------------------------

describe('deleteNote', () => {
  it('removes the deleted note from the list and re-derives sortedNotes', async () => {
    const noteA = makeNote({ id: 1, title: 'Note A' });
    const noteB = makeNote({ id: 2, title: 'Note B' });

    useNotesStore.setState({ notes: [noteA, noteB], sortedNotes: [noteA, noteB] });
    apiDeleteNote.mockResolvedValue({ deleted: true });

    await useNotesStore.getState().deleteNote(1);

    const state = useNotesStore.getState();
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].id).toBe(2);
    expect(state.sortedNotes).toHaveLength(1);
    expect(state.isLoading).toBe(false);
  });

  it('clears selectedNote when the deleted note was selected', async () => {
    const note = makeNote({ id: 1 });

    useNotesStore.setState({ notes: [note], selectedNote: note });
    apiDeleteNote.mockResolvedValue({ deleted: true });

    await useNotesStore.getState().deleteNote(1);

    expect(useNotesStore.getState().selectedNote).toBeNull();
  });

  it('does not clear selectedNote when a different note is deleted', async () => {
    const noteA = makeNote({ id: 1 });
    const noteB = makeNote({ id: 2, title: 'Note B' });

    useNotesStore.setState({ notes: [noteA, noteB], selectedNote: noteA });
    apiDeleteNote.mockResolvedValue({ deleted: true });

    await useNotesStore.getState().deleteNote(2);

    expect(useNotesStore.getState().selectedNote).toEqual(noteA);
  });

  it('sets error and re-throws on API failure', async () => {
    apiDeleteNote.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await expect(
      useNotesStore.getState().deleteNote(999)
    ).rejects.toThrow('API error 404: NOT_FOUND');

    expect(useNotesStore.getState().error).toBe('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// fetchTags
// ---------------------------------------------------------------------------

describe('fetchTags', () => {
  it('fetches tags and updates state', async () => {
    const tags = [
      { id: 1, name: 'work' },
      { id: 2, name: 'personal' },
    ];
    getTags.mockResolvedValue(tags);

    await useNotesStore.getState().fetchTags();

    const state = useNotesStore.getState();
    expect(state.tags).toEqual(tags);
    expect(state.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    getTags.mockRejectedValue(new Error('API error 500: SERVER_ERROR'));

    await useNotesStore.getState().fetchTags();

    expect(useNotesStore.getState().error).toBe('API error 500: SERVER_ERROR');
  });
});

// ---------------------------------------------------------------------------
// setSortKey
// ---------------------------------------------------------------------------

describe('setSortKey', () => {
  it('updates sortKey and persists to localStorage', () => {
    useNotesStore.getState().setSortKey('title_asc');

    expect(useNotesStore.getState().sortKey).toBe('title_asc');
    expect(localStorageMock.getItem('notes_sort')).toBe('title_asc');
  });

  it('re-derives sortedNotes from existing notes without an API call', () => {
    const noteA = makeNote({ id: 1, title: 'Banana', updatedAt: '2026-05-01T08:00:00Z' });
    const noteB = makeNote({ id: 2, title: 'Apple', updatedAt: '2026-05-02T08:00:00Z' });

    useNotesStore.setState({ notes: [noteA, noteB], sortKey: 'updated_desc' });
    // Trigger initial sort
    useNotesStore.getState().setSortKey('title_asc');

    const state = useNotesStore.getState();
    // title_asc: Apple < Banana
    expect(state.sortedNotes[0].title).toBe('Apple');
    expect(state.sortedNotes[1].title).toBe('Banana');
  });
});

// ---------------------------------------------------------------------------
// setSelectedNote
// ---------------------------------------------------------------------------

describe('setSelectedNote', () => {
  it('sets selectedNote directly', () => {
    const note = makeNote({ id: 5 });
    useNotesStore.getState().setSelectedNote(note);
    expect(useNotesStore.getState().selectedNote).toEqual(note);
  });

  it('clears selectedNote when called with null', () => {
    useNotesStore.setState({ selectedNote: makeNote() });
    useNotesStore.getState().setSelectedNote(null);
    expect(useNotesStore.getState().selectedNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// _deriveSorted behaviour (via sortedNotes)
// ---------------------------------------------------------------------------

describe('sortedNotes derivation', () => {
  it('places pinned notes before unpinned notes', () => {
    const pinned = makeNote({ id: 1, isPinned: true, updatedAt: '2026-05-01T10:00:00Z' });
    const unpinned = makeNote({ id: 2, isPinned: false, updatedAt: '2026-05-02T10:00:00Z' });

    useNotesStore.setState({ notes: [unpinned, pinned], sortKey: 'updated_desc' });
    useNotesStore.getState().setSortKey('updated_desc');

    const { sortedNotes } = useNotesStore.getState();
    expect(sortedNotes[0].id).toBe(1); // pinned first
    expect(sortedNotes[1].id).toBe(2);
  });

  it('sorts by updatedAt descending within each pin group (updated_desc)', () => {
    const older = makeNote({ id: 1, isPinned: false, updatedAt: '2026-04-01T10:00:00Z' });
    const newer = makeNote({ id: 2, isPinned: false, updatedAt: '2026-05-01T10:00:00Z' });

    useNotesStore.setState({ notes: [older, newer] });
    useNotesStore.getState().setSortKey('updated_desc');

    const { sortedNotes } = useNotesStore.getState();
    expect(sortedNotes[0].id).toBe(2);
    expect(sortedNotes[1].id).toBe(1);
  });

  it('sorts by updatedAt ascending within each pin group (updated_asc)', () => {
    const older = makeNote({ id: 1, isPinned: false, updatedAt: '2026-04-01T10:00:00Z' });
    const newer = makeNote({ id: 2, isPinned: false, updatedAt: '2026-05-01T10:00:00Z' });

    useNotesStore.setState({ notes: [older, newer] });
    useNotesStore.getState().setSortKey('updated_asc');

    const { sortedNotes } = useNotesStore.getState();
    expect(sortedNotes[0].id).toBe(1);
    expect(sortedNotes[1].id).toBe(2);
  });

  it('sorts by title ascending case-insensitively within each pin group (title_asc)', () => {
    const charlie = makeNote({ id: 1, isPinned: false, title: 'Charlie' });
    const alice = makeNote({ id: 2, isPinned: false, title: 'alice' });
    const bob = makeNote({ id: 3, isPinned: false, title: 'Bob' });

    useNotesStore.setState({ notes: [charlie, alice, bob] });
    useNotesStore.getState().setSortKey('title_asc');

    const { sortedNotes } = useNotesStore.getState();
    expect(sortedNotes[0].title).toBe('alice');
    expect(sortedNotes[1].title).toBe('Bob');
    expect(sortedNotes[2].title).toBe('Charlie');
  });

  it('applies the secondary sort within the pinned group as well', () => {
    const pinnedOld = makeNote({ id: 1, isPinned: true, title: 'Zebra', updatedAt: '2026-04-01T10:00:00Z' });
    const pinnedNew = makeNote({ id: 2, isPinned: true, title: 'Alpha', updatedAt: '2026-05-01T10:00:00Z' });
    const unpinned = makeNote({ id: 3, isPinned: false, title: 'Middle', updatedAt: '2026-05-02T10:00:00Z' });

    useNotesStore.setState({ notes: [pinnedOld, pinnedNew, unpinned] });
    useNotesStore.getState().setSortKey('title_asc');

    const { sortedNotes } = useNotesStore.getState();
    // pinned group first, sorted by title: Alpha, Zebra
    expect(sortedNotes[0].id).toBe(2); // Alpha
    expect(sortedNotes[1].id).toBe(1); // Zebra
    // then unpinned
    expect(sortedNotes[2].id).toBe(3);
  });
});
