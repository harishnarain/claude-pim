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
 * @returns {JSX.Element}
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useMatch } from 'react-router-dom';
import { useNotesStore } from '../store/notesStore.js';
import NoteToolbar from '../components/NoteToolbar.jsx';
import NoteEditor from '../components/NoteEditor.jsx';
import MarkdownView from '../components/MarkdownView.jsx';
import TagCombobox from '../components/TagCombobox.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import useAutoSave from '../hooks/useAutoSave.js';

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

  /** Whether the delete ConfirmDialog is open. */
  const [showConfirm, setShowConfirm] = useState(false);

  /** True once the selectedNote has been loaded so we can show a 404 redirect. */
  const [hasLoaded, setHasLoaded] = useState(false);

  const isCreateMode = !!useMatch('/notes/new') || id === 'new';

  const { localContent, handleContentChange, handleEditorBlur } = useAutoSave({
    initialContent: selectedNote?.content ?? '',
    resetKey: selectedNote?.id,
    onSave: (content) => updateNote(Number(id), { content }),
    charLimit: CHAR_LIMIT,
    debounceMs: DEBOUNCE_MS,
  });

  // ---------------------------------------------------------------------------
  // Create mode — create a blank note and redirect to its URL.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isCreateMode) return;

    let cancelled = false;

    async function initCreate() {
      setIsCreating(true);
      try {
        const created = await createNote({ content: '', isPinned: false, tags: [] });
        if (!cancelled) {
          setIsCreating(false);
          navigate(`/notes/${created.id}`, { replace: true });
        } else {
          deleteNote(created.id);
        }
      } catch {
        if (!cancelled) {
          setIsCreating(false);
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

    async function load() {
      await fetchNote(id);
      await fetchTags();
      setHasLoaded(true);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------------------------
  // 404 redirect — when the note is not found after loading completes.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (hasLoaded && !isCreateMode && !isLoading && !selectedNote) {
      navigate('/notes', { state: { toast: 'Note not found.' } });
    }
  }, [hasLoaded, isLoading, selectedNote, isCreateMode, navigate]);

  useEffect(() => {
    if (!isCreateMode && error && (error.includes('404') || error.toLowerCase().includes('not found'))) {
      navigate('/notes', { state: { toast: 'Note not found.' } });
    }
  }, [error, isCreateMode, navigate]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Toggle the pin state of the current note immediately. */
  function handleTogglePin() {
    if (!selectedNote) return;
    updateNote(Number(id), { isPinned: !selectedNote.isPinned });
  }

  /**
   * Handle tag list changes — save immediately, then refresh available tags.
   * @param {Array<string|{id:number,name:string}>} newTags
   */
  async function handleTagsChange(newTags) {
    await updateNote(Number(id), { tags: newTags });
    await fetchTags();
  }

  async function handleConfirmDelete() {
    setShowConfirm(false);
    await deleteNote(Number(id));
    navigate('/notes');
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isCreateMode || isCreating) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Creating note…</p>
      </div>
    );
  }

  if (isLoading && !selectedNote) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!selectedNote) return null;

  const isPinned = selectedNote.isPinned ?? false;
  const selectedTags = selectedNote.tags ?? [];

  return (
    <div className="flex h-full flex-col">
      <NoteToolbar
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onDelete={() => setShowConfirm(true)}
        isSaving={isSaving}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:flex-row">
        <div className="flex flex-1 flex-col overflow-hidden" onBlur={handleEditorBlur}>
          <NoteEditor
            content={localContent}
            onChange={handleContentChange}
            charLimit={CHAR_LIMIT}
          />
        </div>

        <div className="flex-1 overflow-auto rounded-md border border-gray-200 bg-white p-3">
          <MarkdownView content={localContent} />
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <TagCombobox
          selected={selectedTags}
          available={tags}
          onChange={handleTagsChange}
        />
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        message="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

export default NoteEditorPage;
