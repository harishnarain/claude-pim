/**
 * TaskToolbar — toolbar strip rendered at the top of TaskEditorPage.
 *
 * Renders a single flex row containing:
 *   - A pin toggle button that switches between "Pinned" (blue) and "Pin"
 *     (grey) based on the `isPinned` prop.
 *   - A save status indicator that reflects the current `saveStatus` value:
 *       'saving'  → "Saving..."
 *       'saved'   → "Saved"
 *       'error'   → "Save failed" (red)
 *       'idle'    → nothing
 *   - A red Delete button.
 *
 * Unlike NoteToolbar, the saved/error state management is owned by the store
 * and passed in directly via the `saveStatus` prop; this component is purely
 * presentational.
 *
 * @param {object}   props
 * @param {boolean}  props.isPinned    - Current pin state of the task.
 * @param {Function} props.onTogglePin - Called when the pin button is clicked.
 * @param {Function} props.onDelete    - Called when the Delete button is clicked.
 * @param {boolean}  props.isSaving    - True while a save request is in-flight.
 * @param {string}   props.saveStatus  - One of 'idle' | 'saving' | 'saved' | 'error'.
 * @returns {JSX.Element}
 */

import React from 'react';

/**
 * TaskToolbar renders the pin toggle, save status indicator, and Delete button.
 *
 * @param {object} props - See module-level JSDoc for prop details.
 * @returns {JSX.Element}
 */
function TaskToolbar({ isPinned, onTogglePin, onDelete, isSaving, saveStatus }) {
  /**
   * Resolve the save status indicator element to render, or null when idle.
   *
   * @returns {JSX.Element|null}
   */
  function renderSaveStatus() {
    if (saveStatus === 'saving') {
      return (
        <span aria-live="polite" className="text-sm text-gray-500">
          Saving...
        </span>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <span aria-live="polite" className="text-sm text-gray-500">
          Saved
        </span>
      );
    }
    if (saveStatus === 'error') {
      return (
        <span aria-live="polite" className="text-sm text-red-600">
          Save failed
        </span>
      );
    }
    return <span aria-live="polite" className="text-sm text-gray-500" />;
  }

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
      {/* Pin toggle */}
      <button
        type="button"
        onClick={onTogglePin}
        aria-pressed={isPinned}
        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isPinned
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {isPinned ? 'Pinned' : 'Pin'}
      </button>

      {/* Save status indicator */}
      {renderSaveStatus()}

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

export default TaskToolbar;
