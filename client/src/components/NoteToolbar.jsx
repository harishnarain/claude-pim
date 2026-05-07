/**
 * NoteToolbar — toolbar strip rendered at the top of NoteEditorPage.
 *
 * Contains the pin toggle button, an auto-save status indicator, and a
 * Delete button. All layout is handled with Tailwind flex utilities; no
 * inline styles are used.
 *
 * @param {object}   props
 * @param {boolean}  props.isPinned      - Current pin state for the note.
 * @param {Function} props.onTogglePin   - Called when the pin button is clicked.
 * @param {Function} props.onDelete      - Called when the Delete button is clicked.
 * @param {boolean}  props.isSaving      - When true, "Saving…" is shown; when it
 *                                         transitions to false the "Saved" label
 *                                         appears for 2 seconds then clears.
 * @returns {JSX.Element}
 */

import React, { useState, useEffect, useRef } from 'react';

/**
 * NoteToolbar renders the pin toggle, save status indicator, and Delete button.
 *
 * @param {object}   props - See module-level JSDoc for prop details.
 * @returns {JSX.Element}
 */
function NoteToolbar({ isPinned, onTogglePin, onDelete, isSaving }) {
  /**
   * Whether the "Saved" confirmation label is currently visible.
   * Set to true briefly after isSaving transitions from true → false.
   */
  const [showSaved, setShowSaved] = useState(false);

  /**
   * Tracks whether at least one save cycle has ever completed.
   * Used to avoid showing "Saved" on the initial render before any save occurs.
   */
  const hasSavedOnce = useRef(false);

  /**
   * Tracks the previous value of isSaving so we can detect the
   * true → false transition that signals a completed save.
   */
  const prevIsSaving = useRef(isSaving);

  useEffect(() => {
    const wasJustSaved = prevIsSaving.current === true && isSaving === false;
    prevIsSaving.current = isSaving;

    if (isSaving) {
      // A new save started — clear any lingering "Saved" label immediately.
      setShowSaved(false);
      return;
    }

    if (wasJustSaved) {
      hasSavedOnce.current = true;
      setShowSaved(true);

      const timerId = setTimeout(() => {
        setShowSaved(false);
      }, 2000);

      return () => clearTimeout(timerId);
    }
  }, [isSaving]);

  /**
   * Resolve the save-status text to display.
   * Returns null when nothing should be shown.
   *
   * @returns {string|null}
   */
  function saveStatusText() {
    if (isSaving) return 'Saving...';
    if (showSaved) return 'Saved';
    return null;
  }

  const statusText = saveStatusText();

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
      {/* Pin toggle */}
      <button
        type="button"
        onClick={onTogglePin}
        aria-pressed={isPinned}
        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isPinned
            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <span aria-hidden="true">📌</span>
        {isPinned ? 'Pinned' : 'Pin'}
      </button>

      {/* Save status indicator */}
      <span
        aria-live="polite"
        className="ml-1 text-sm text-gray-500"
      >
        {statusText}
      </span>

      {/* Spacer pushes Delete to the right */}
      <div className="flex-1" />

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Delete
      </button>
    </div>
  );
}

export default NoteToolbar;
