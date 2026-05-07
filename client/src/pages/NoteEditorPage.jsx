/**
 * NoteEditorPage — create / edit page for a single note.
 *
 * Create mode (`/notes/new`):
 *   Creates a blank note immediately on mount, then replaces the URL with
 *   `/notes/<id>` so the browser back button skips `/notes/new`.
 *
 * Edit mode (`/notes/:id`):
 *   Fetches the note and available tags on mount. If the note is not found
 *   (404 or null selectedNote after loading), redirects to `/notes` with a
 *   toast in router state.
 *
 * Auto-save:
 *   A 800 ms debounce fires after each `NoteEditor` onChange. On blur,
 *   the debounce is flushed immediately. Content longer than 25 000 characters
 *   is not sent to the API.
 *
 * Pin and tags:
 *   Both are saved immediately (no debounce). Tag changes also refresh the
 *   available tag list via `fetchTags`.
 *
 * Delete:
 *   `NoteToolbar.onDelete` opens a `ConfirmDialog`. On confirm, calls
 *   `deleteNote` and navigates to `/notes`.
 *
 * Layout:
 *   `NoteEditor` and `MarkdownView` are stacked on narrow screens and
 *   side-by-side on `md` and wider. `NoteToolbar` sits above them and
 *   `TagCombobox` sits below.
 *
 * @returns {JSX.Element}
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotesStore } from '../store/notesStore.js';
import NoteToolbar from '../components/NoteToolbar.jsx';
import NoteEditor from '../components/NoteEditor.jsx';
import MarkdownView from '../components/MarkdownView.jsx';
import TagCombobox from '../components/TagCombobox.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

/** Maximum allowed content length (characters). Saves are blocked above this. */
const CHAR_LIMIT = 25000;

/** Auto-save debounce delay in milliseconds. */
const DEBOUNCE_MS = 800;

/**
 * NoteEditorPage — create/edit page for a single note.
 * @returns {JSX.Element}
 */
function NoteEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    selectedNote,
    tags,
    isLoading,
    isSaving,
    error,
    fetchNote,
    fetchTags,
    createNote,
    updateNote,
    deleteNote,
  } = useNotesStore();

  /** True while we are creating the initial blank note in create mode. */
  const [isCreating, setIsCreating] = useState(false);

  /** Local content that diverges from the store during typing. */
  const [localContent, setLocalContent] = useState('');

  /** Whether local content has unsaved changes pending a debounce flush. */
  const hasUnsavedRef = useRef(false);

  /** Debounce timer ref — cleared and reset on every keystroke. */
  const debounceTimerRef = useRef(null);

  /** Whether the delete ConfirmDialog is open. */
  const [showConfirm, setShowConfirm] = useState(false);

  /** True once the selectedNote has been loaded so we can show a 404 redirect. */
  const [hasLoaded, setHasLoaded] = useState(false);

  const isCreateMode = id === 'new';

  // ---------------------------------------------------------------------------
  // Create mode — create a blank note and redirect to its URL.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isCreateMode) return;

    let cancelled = false;

    /**
     * Create a blank note then navigate to its permanent URL.
     * @returns {Promise<void>}
     */
    async function initCreate() {
      setIsCreating(true);
      try {
        const created = await createNote({ content: '', is_pinned: false, tags: [] });
        if (!cancelled) {
          navigate(`/notes/${created.id}`, { replace: true });
        }
      } catch {
        // If creation fails, navigate back to the list.
        if (!cancelled) {
          navigate('/notes');
        }
      }
    }

    initCreate();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Edit mode — fetch note and tags on mount.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isCreateMode) return;

    /**
     * Load the note and available tags.
     * @returns {Promise<void>}
     */
    async function load() {
      await fetchNote(id);
      await fetchTags();
      setHasLoaded(true);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------------------------
  // Sync local content from the store when selectedNote first arrives.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (selectedNote) {
      setLocalContent(selectedNote.content ?? '');
      hasUnsavedRef.current = false;
    }
  }, [selectedNote?.id]);

  // ---------------------------------------------------------------------------
  // 404 redirect — when the note is not found after loading completes.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      hasLoaded &&
      !isCreateMode &&
      !isLoading &&
      !selectedNote &&
      (error === null || error === undefined || error.includes('404') || error.toLowerCase().includes('not found'))
    ) {
      navigate('/notes', { state: { toast: 'Note not found.' } });
    }
  }, [hasLoaded, isLoading, selectedNote, error, isCreateMode, navigate]);

  useEffect(() => {
    if (
      !isCreateMode &&
      error &&
      (error.includes('404') || error.toLowerCase().includes('not found'))
    ) {
      navigate('/notes', { state: { toast: 'Note not found.' } });
    }
  }, [error, isCreateMode, navigate]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Flush any pending debounce and save the current local content immediately.
   * @returns {void}
   */
  function flushSave() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (hasUnsavedRef.current && selectedNote) {
      if (localContent.length <= CHAR_LIMIT) {
        hasUnsavedRef.current = false;
        updateNote(Number(id), { content: localContent });
      }
    }
  }

  /**
   * Handle content changes from NoteEditor — update local state and schedule
   * a debounced save.
   * @param {string} newContent - Updated content string.
   * @returns {void}
   */
  function handleContentChange(newContent) {
    setLocalContent(newContent);
    hasUnsavedRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (newContent.length > CHAR_LIMIT) {
      // Block the save client-side.
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (hasUnsavedRef.current) {
        hasUnsavedRef.current = false;
        updateNote(Number(id), { content: newContent });
      }
    }, DEBOUNCE_MS);
  }

  /**
   * On NoteEditor blur, flush the debounce immediately.
   * @returns {void}
   */
  function handleEditorBlur() {
    flushSave();
  }

  /**
   * Toggle the pin state of the current note immediately.
   * @returns {void}
   */
  function handleTogglePin() {
    if (!selectedNote) return;
    updateNote(Number(id), { is_pinned: !selectedNote.isPinned });
  }

  /**
   * Handle tag list changes from TagCombobox.
   * Saves immediately, then refreshes the available tag list.
   * @param {Array<string|{id:number,name:string}>} newTags
   * @returns {Promise<void>}
   */
  async function handleTagsChange(newTags) {
    await updateNote(Number(id), { tags: newTags });
    await fetchTags();
  }

  /**
   * Open the delete confirmation dialog.
   * @returns {void}
   */
  function handleDelete() {
    setShowConfirm(true);
  }

  /**
   * Cancel the delete — close the dialog without deleting.
   * @returns {void}
   */
  function handleCancelDelete() {
    setShowConfirm(false);
  }

  /**
   * Confirm the delete — call deleteNote then navigate to /notes.
   * @returns {Promise<void>}
   */
  async function handleConfirmDelete() {
    setShowConfirm(false);
    await deleteNote(Number(id));
    navigate('/notes');
  }

  // ---------------------------------------------------------------------------
  // Render — create mode spinner
  // ---------------------------------------------------------------------------

  if (isCreateMode || isCreating) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Creating note…</p>
      </div>
    );
  }

  // Render — loading state
  if (isLoading && !selectedNote) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  // Render — note not yet available (avoids flash before 404 redirect fires)
  if (!selectedNote) {
    return null;
  }

  const isPinned = selectedNote.isPinned ?? false;
  const selectedTags = selectedNote.tags ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <NoteToolbar
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onDelete={handleDelete}
        isSaving={isSaving}
      />

      {/* Editor / Preview columns */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:flex-row">
        {/* Left — editable textarea (onBlur on the wrapper flushes debounce) */}
        <div
          className="flex flex-1 flex-col overflow-hidden"
          onBlur={handleEditorBlur}
        >
          <NoteEditor
            content={localContent}
            onChange={handleContentChange}
            charLimit={CHAR_LIMIT}
          />
        </div>

        {/* Right — markdown preview */}
        <div className="flex-1 overflow-auto rounded-md border border-gray-200 bg-white p-3">
          <MarkdownView content={localContent} />
        </div>
      </div>

      {/* Tag combobox */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <TagCombobox
          selected={selectedTags}
          available={tags}
          onChange={handleTagsChange}
        />
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        message="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default NoteEditorPage;
