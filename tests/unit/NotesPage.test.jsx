/**
 * Unit tests for the NotesPage list view.
 *
 * The Zustand store and react-router-dom are fully mocked so tests run in
 * isolation without a real API or browser router.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared mock navigate function so tests can assert navigation calls. */
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

/** Mutable store state — reset in beforeEach. */
let storeState = {};

vi.mock('../../client/src/store/notesStore.js', () => ({
  useNotesStore: () => storeState,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sample notes fixture. */
const NOTES = [
  {
    id: 1,
    title: 'First Note',
    preview: 'Preview of the first note',
    isPinned: false,
    tags: [],
    updatedAt: '2025-01-01T12:00:00.000Z',
  },
  {
    id: 2,
    title: 'Second Note',
    preview: 'Preview of the second note',
    isPinned: true,
    tags: [{ name: 'important' }],
    updatedAt: '2025-01-02T12:00:00.000Z',
  },
];

/**
 * Build default store state, merging in overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
function buildStore(overrides = {}) {
  return {
    sortedNotes: NOTES,
    isLoading: false,
    error: null,
    sortKey: 'updated_desc',
    fetchNotes: vi.fn(),
    fetchTags: vi.fn(),
    setSortKey: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// NotesPage tests
// ---------------------------------------------------------------------------

import NotesPage from '../../client/src/pages/NotesPage.jsx';

describe('NotesPage', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockNavigate.mockClear();
  });

  it('calls fetchNotes on mount', () => {
    render(<NotesPage />);
    expect(storeState.fetchNotes).toHaveBeenCalledTimes(1);
  });

  it('calls fetchTags on mount', () => {
    render(<NotesPage />);
    expect(storeState.fetchTags).toHaveBeenCalledTimes(1);
  });

  it('renders the page heading', () => {
    render(<NotesPage />);
    expect(screen.getByRole('heading', { name: /notes/i })).toBeInTheDocument();
  });

  it('renders the New Note button', () => {
    render(<NotesPage />);
    expect(screen.getByRole('button', { name: /new note/i })).toBeInTheDocument();
  });

  it('renders a list of notes when available', () => {
    render(<NotesPage />);
    expect(screen.getByText('First Note')).toBeInTheDocument();
    expect(screen.getByText('Second Note')).toBeInTheDocument();
  });

  it('renders the SortControl when notes are present', () => {
    render(<NotesPage />);
    expect(screen.getByRole('combobox', { name: /sort notes by/i })).toBeInTheDocument();
  });

  it('calls setSortKey when the sort control changes', () => {
    render(<NotesPage />);
    const select = screen.getByRole('combobox', { name: /sort notes by/i });
    fireEvent.change(select, { target: { value: 'title_asc' } });
    expect(storeState.setSortKey).toHaveBeenCalledWith('title_asc');
  });

  it('navigates to /notes/new when New Note is clicked', () => {
    render(<NotesPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /new note/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/notes/new');
  });

  it('navigates to /notes/:id when a note card is clicked', () => {
    render(<NotesPage />);
    const firstCard = screen.getByText('First Note').closest('[role="button"]');
    fireEvent.click(firstCard);
    expect(mockNavigate).toHaveBeenCalledWith('/notes/1');
  });

  it('shows a loading indicator when isLoading is true', () => {
    storeState = buildStore({ isLoading: true, sortedNotes: [] });
    render(<NotesPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an error banner when error is set', () => {
    storeState = buildStore({ error: 'Failed to fetch notes.', sortedNotes: [] });
    render(<NotesPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch notes.');
  });

  it('shows the empty state when sortedNotes is empty and not loading', () => {
    storeState = buildStore({ sortedNotes: [] });
    render(<NotesPage />);
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });

  it('shows New Note button inside the empty state', () => {
    storeState = buildStore({ sortedNotes: [] });
    render(<NotesPage />);
    // Header button + empty state button
    const newNoteButtons = screen.getAllByRole('button', { name: /new note/i });
    expect(newNoteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('navigates to /notes/new when the empty state New Note button is clicked', () => {
    storeState = buildStore({ sortedNotes: [] });
    render(<NotesPage />);
    const newNoteButtons = screen.getAllByRole('button', { name: /new note/i });
    fireEvent.click(newNoteButtons[newNoteButtons.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith('/notes/new');
  });

  it('does not show error banner when there is no error', () => {
    render(<NotesPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not show the sort control when loading', () => {
    storeState = buildStore({ isLoading: true, sortedNotes: [] });
    render(<NotesPage />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('does not show the sort control when notes list is empty', () => {
    storeState = buildStore({ sortedNotes: [] });
    render(<NotesPage />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
