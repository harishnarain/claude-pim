/**
 * NotesPage — list view for the Notes module.
 * Fetches all notes and tags on mount, provides a sort control, and renders
 * a card-based note list with an empty state when no notes exist.
 *
 * Routing:
 *   - Clicking a NoteCard navigates to /notes/:id
 *   - "New Note" navigates to /notes/new
 *
 * @returns {JSX.Element}
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotesStore } from '../store/notesStore.js';
import NoteList from '../components/NoteList.jsx';
import SortControl from '../components/SortControl.jsx';
import EmptyState from '../components/EmptyState.jsx';

/**
 * NotesPage fetches notes and tags on mount, and displays a sorted, card-based list.
 * @returns {JSX.Element}
 */
function NotesPage() {
  const navigate = useNavigate();
  const {
    sortedNotes,
    isLoading,
    error,
    sortKey,
    fetchNotes,
    fetchTags,
    setSortKey,
  } = useNotesStore();

  /** Fetch all notes and tags when the page first mounts. */
  useEffect(() => {
    fetchNotes();
    fetchTags();
  }, [fetchNotes, fetchTags]);

  /**
   * Navigate to the note detail page when a card is selected.
   * @param {object} note - The clicked note object.
   */
  function handleSelect(note) {
    navigate(`/notes/${note.id}`);
  }

  /** Navigate to the create note page. */
  function handleNewNote() {
    navigate('/notes/new');
  }

  const hasNotes = sortedNotes.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        <button
          type="button"
          onClick={handleNewNote}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New Note
        </button>
      </div>

      {/* Sort control */}
      {!isLoading && !error && hasNotes && (
        <div className="mb-4 flex justify-end">
          <SortControl value={sortKey} onChange={setSortKey} />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      )}

      {/* Error banner */}
      {!isLoading && error && (
        <div
          className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Notes list */}
      {!isLoading && !error && hasNotes && (
        <NoteList notes={sortedNotes} onSelect={handleSelect} />
      )}

      {/* Empty state */}
      {!isLoading && !error && !hasNotes && (
        <EmptyState
          title="No notes yet"
          message="Get started by creating your first note."
          action={
            <button
              type="button"
              onClick={handleNewNote}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              New Note
            </button>
          }
        />
      )}
    </div>
  );
}

export default NotesPage;
