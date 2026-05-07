/**
 * Unit tests for client/src/pages/NoteEditorPage.jsx.
 *
 * The Zustand store and react-router-dom are fully mocked so tests run in
 * isolation without a real API or browser router.
 *
 * Covered scenarios:
 *   - Create-mode: calls createNote immediately and redirects with replace
 *   - Edit-mode: calls fetchNote + fetchTags on mount, renders content/tags/pin
 *   - Auto-save debounce fires after 800 ms of inactivity
 *   - Blur flushes the debounce immediately (calls updateNote synchronously)
 *   - Pin toggle calls updateNote with isPinned immediately
 *   - Tag change calls updateNote with new tags then fetchTags
 *   - Delete button opens ConfirmDialog; confirm calls deleteNote and navigates
 *   - Cancel in ConfirmDialog closes without deleting
 *   - 404 / not-found error redirects to /notes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared navigate mock. */
const mockNavigate = vi.fn();

/** Mutable params — set per test. */
let mockParams = { id: '42' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useMatch: (pattern) => (pattern === '/notes/new' && mockParams.id === undefined ? {} : null),
}));

/** Mutable store state — reset in beforeEach. */
let storeState = {};

vi.mock('../../client/src/store/notesStore.js', () => ({
  useNotesStore: () => storeState,
}));

// ---------------------------------------------------------------------------
// Mock child components so tests stay focused on NoteEditorPage logic.
// ---------------------------------------------------------------------------

vi.mock('../../client/src/components/NoteEditor.jsx', () => ({
  default: ({ content, onChange, charLimit }) => (
    <textarea
      aria-label="Note content"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      data-charlimit={charLimit}
    />
  ),
}));

vi.mock('../../client/src/components/MarkdownView.jsx', () => ({
  default: ({ content }) => <div data-testid="markdown-view">{content}</div>,
}));

vi.mock('../../client/src/components/NoteToolbar.jsx', () => ({
  default: ({ isPinned, onTogglePin, onDelete, isSaving }) => (
    <div data-testid="note-toolbar">
      <button type="button" aria-pressed={isPinned} onClick={onTogglePin}>
        {isPinned ? 'Pinned' : 'Pin'}
      </button>
      <button type="button" onClick={onDelete}>Delete</button>
      {isSaving && <span>Saving...</span>}
    </div>
  ),
}));

vi.mock('../../client/src/components/TagCombobox.jsx', () => ({
  default: ({ selected, available, onChange }) => (
    <div data-testid="tag-combobox">
      <button
        type="button"
        onClick={() => onChange([...selected, { id: 99, name: 'new-tag' }])}
      >
        Add Tag
      </button>
      <span data-testid="selected-tags">{JSON.stringify(selected)}</span>
      <span data-testid="available-tags">{JSON.stringify(available)}</span>
    </div>
  ),
}));

// ConfirmDialog is used as-is so we can test open/close behaviour.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A populated note fixture. */
const NOTE = {
  id: 42,
  content: 'Hello world',
  isPinned: false,
  tags: [{ id: 1, name: 'work' }],
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
};

/** Available tags fixture. */
const TAGS = [{ id: 1, name: 'work' }, { id: 2, name: 'personal' }];

/**
 * Build a default store state, merging in overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
function buildStore(overrides = {}) {
  return {
    selectedNote: NOTE,
    tags: TAGS,
    isLoading: false,
    isSaving: false,
    error: null,
    fetchNote: vi.fn().mockResolvedValue(undefined),
    fetchTags: vi.fn().mockResolvedValue(undefined),
    createNote: vi.fn().mockResolvedValue({ ...NOTE, id: 99 }),
    updateNote: vi.fn().mockResolvedValue({ ...NOTE }),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import the component under test (after mocks are set up)
// ---------------------------------------------------------------------------

import NoteEditorPage from '../../client/src/pages/NoteEditorPage.jsx';

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('NoteEditorPage — create mode (id === "new")', () => {
  beforeEach(() => {
    storeState = buildStore({ selectedNote: null });
    mockParams = { id: 'new' };
    mockNavigate.mockClear();
  });

  it('shows a "Creating note…" spinner while creating', async () => {
    // Keep createNote pending so we stay in the creating state
    let resolveCreate;
    storeState.createNote = vi.fn(
      () => new Promise((resolve) => { resolveCreate = resolve; })
    );

    render(<NoteEditorPage />);
    expect(screen.getByText(/creating note/i)).toBeInTheDocument();

    // Clean up by resolving
    await act(async () => resolveCreate({ ...NOTE, id: 99 }));
  });

  it('calls createNote with blank content on mount and navigates with replace', async () => {
    render(<NoteEditorPage />);

    await waitFor(() => {
      expect(storeState.createNote).toHaveBeenCalledWith({
        content: '',
        isPinned: false,
        tags: [],
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notes/99', { replace: true });
    });
  });

  it('navigates to /notes if createNote throws', async () => {
    storeState.createNote = vi.fn().mockRejectedValue(new Error('fail'));
    render(<NoteEditorPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notes');
    });
  });
});

describe('NoteEditorPage — edit mode (rendering)', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('calls fetchNote and fetchTags with the route param id on mount', async () => {
    render(<NoteEditorPage />);

    await waitFor(() => {
      expect(storeState.fetchNote).toHaveBeenCalledWith('42');
    });
    await waitFor(() => {
      expect(storeState.fetchTags).toHaveBeenCalled();
    });
  });

  it('renders note content in the textarea', () => {
    render(<NoteEditorPage />);
    expect(screen.getByRole('textbox', { name: /note content/i })).toHaveValue('Hello world');
  });

  it('renders the pin state from the note', () => {
    render(<NoteEditorPage />);
    const pinBtn = screen.getByRole('button', { name: /^pin$/i });
    expect(pinBtn).toBeInTheDocument();
  });

  it('renders the selected tags from the note', () => {
    render(<NoteEditorPage />);
    const tagDisplay = screen.getByTestId('selected-tags');
    expect(tagDisplay.textContent).toContain('work');
  });

  it('renders the markdown preview via MarkdownView', () => {
    render(<NoteEditorPage />);
    expect(screen.getByTestId('markdown-view')).toHaveTextContent('Hello world');
  });

  it('shows a loading indicator when isLoading is true and note is not yet available', () => {
    storeState = buildStore({ selectedNote: null, isLoading: true });
    render(<NoteEditorPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders nothing (no editor) when note is null and not loading', () => {
    storeState = buildStore({ selectedNote: null, isLoading: false, error: null });
    render(<NoteEditorPage />);
    expect(screen.queryByRole('textbox', { name: /note content/i })).not.toBeInTheDocument();
  });
});

describe('NoteEditorPage — auto-save debounce', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('does NOT call updateNote immediately on content change', () => {
    render(<NoteEditorPage />);
    const textarea = screen.getByRole('textbox', { name: /note content/i });

    fireEvent.change(textarea, { target: { value: 'New text' } });

    expect(storeState.updateNote).not.toHaveBeenCalled();
  });

  it('calls updateNote with content after 800 ms debounce', () => {
    render(<NoteEditorPage />);
    const textarea = screen.getByRole('textbox', { name: /note content/i });

    fireEvent.change(textarea, { target: { value: 'Debounced text' } });

    // Advance to just before debounce fires
    act(() => { vi.advanceTimersByTime(799); });
    expect(storeState.updateNote).not.toHaveBeenCalledWith(42, { content: 'Debounced text' });

    // Fire the debounce — callback executes synchronously inside act
    act(() => { vi.advanceTimersByTime(1); });

    // updateNote is called synchronously by the timer callback
    expect(storeState.updateNote).toHaveBeenCalledWith(42, { content: 'Debounced text' });
  });

  it('resets the debounce timer on each keystroke (only fires once)', () => {
    render(<NoteEditorPage />);
    const textarea = screen.getByRole('textbox', { name: /note content/i });

    fireEvent.change(textarea, { target: { value: 'First' } });
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.change(textarea, { target: { value: 'Second' } });
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.change(textarea, { target: { value: 'Third' } });
    act(() => { vi.advanceTimersByTime(800); });

    expect(storeState.updateNote).toHaveBeenCalledTimes(1);
    expect(storeState.updateNote).toHaveBeenCalledWith(42, { content: 'Third' });
  });

  it('blocks auto-save when content exceeds 25000 characters', async () => {
    render(<NoteEditorPage />);
    const textarea = screen.getByRole('textbox', { name: /note content/i });

    const overLimitContent = 'x'.repeat(25001);
    fireEvent.change(textarea, { target: { value: overLimitContent } });
    act(() => vi.advanceTimersByTime(1000));

    // updateNote should NOT be called with the over-limit content
    expect(storeState.updateNote).not.toHaveBeenCalledWith(
      42,
      { content: overLimitContent }
    );
  });
});

describe('NoteEditorPage — blur flush', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('calls updateNote immediately on blur when there are unsaved changes', () => {
    render(<NoteEditorPage />);
    const textarea = screen.getByRole('textbox', { name: /note content/i });

    fireEvent.change(textarea, { target: { value: 'Unsaved text' } });

    // Advance partially — debounce should not have fired yet
    act(() => { vi.advanceTimersByTime(400); });
    expect(storeState.updateNote).not.toHaveBeenCalled();

    // Blur flushes the debounce immediately (synchronous call)
    fireEvent.blur(textarea);

    expect(storeState.updateNote).toHaveBeenCalledWith(42, { content: 'Unsaved text' });
  });
});

describe('NoteEditorPage — pin toggle', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('calls updateNote with toggled isPinned immediately when pin button is clicked', async () => {
    render(<NoteEditorPage />);
    const pinBtn = screen.getByRole('button', { name: /^pin$/i });

    await userEvent.click(pinBtn);

    expect(storeState.updateNote).toHaveBeenCalledWith(42, { isPinned: true });
  });

  it('toggles isPinned to false when the note is already pinned', async () => {
    storeState = buildStore({ selectedNote: { ...NOTE, isPinned: true } });
    render(<NoteEditorPage />);
    const pinBtn = screen.getByRole('button', { name: /^pinned$/i });

    await userEvent.click(pinBtn);

    expect(storeState.updateNote).toHaveBeenCalledWith(42, { isPinned: false });
  });
});

describe('NoteEditorPage — tag change', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('calls updateNote with new tags and then fetchTags on tag change', async () => {
    render(<NoteEditorPage />);
    const addTagBtn = screen.getByRole('button', { name: /add tag/i });

    await userEvent.click(addTagBtn);

    await waitFor(() => {
      expect(storeState.updateNote).toHaveBeenCalledWith(
        42,
        { tags: expect.arrayContaining([{ id: 99, name: 'new-tag' }]) }
      );
    });

    await waitFor(() => {
      expect(storeState.fetchTags).toHaveBeenCalled();
    });
  });
});

describe('NoteEditorPage — delete flow', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('shows the ConfirmDialog when Delete is clicked', async () => {
    render(<NoteEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hides the ConfirmDialog when Cancel is clicked', async () => {
    render(<NoteEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls deleteNote and navigates to /notes on confirm', async () => {
    render(<NoteEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(storeState.deleteNote).toHaveBeenCalledWith(42);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notes');
    });
  });
});

describe('NoteEditorPage — 404 redirect', () => {
  beforeEach(() => {
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('redirects to /notes with toast when error contains "not found"', async () => {
    storeState = buildStore({
      selectedNote: null,
      error: 'Note not found',
    });
    render(<NoteEditorPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notes', {
        state: { toast: 'Note not found.' },
      });
    });
  });

  it('redirects to /notes with toast when error contains "404"', async () => {
    storeState = buildStore({
      selectedNote: null,
      error: '404: resource not found',
    });
    render(<NoteEditorPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notes', {
        state: { toast: 'Note not found.' },
      });
    });
  });
});
