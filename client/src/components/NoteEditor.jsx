/**
 * NoteEditor — controlled textarea pane for editing note content.
 *
 * Displays a resizable textarea and a live character counter below it.
 * When the content length reaches the charLimit, the textarea becomes
 * read-only and the counter turns red with an inline warning.
 * When the content length is within 10% of charLimit, the counter turns
 * amber as an early warning.
 *
 * The side-by-side layout with MarkdownView is handled by the parent page;
 * this component owns only the textarea + counter UI.
 *
 * @param {object}   props
 * @param {string}   props.content   - Controlled value for the textarea.
 * @param {Function} props.onChange  - Called with the new string on every keystroke.
 * @param {number}   props.charLimit - Maximum allowed characters (e.g. 25000).
 * @returns {JSX.Element}
 */

import React from 'react';

/** Fraction of charLimit at which the amber warning activates. */
const WARN_THRESHOLD = 0.9;

/**
 * NoteEditor — textarea + character-counter component.
 * @param {object} props - See module-level JSDoc for prop details.
 * @returns {JSX.Element}
 */
function NoteEditor({ content, onChange, charLimit }) {
  const length = content.length;
  const isAtLimit = length >= charLimit;
  const isNearLimit = length >= WARN_THRESHOLD * charLimit;

  /**
   * Resolve the Tailwind colour class for the counter text.
   * @returns {string} Tailwind text-colour class.
   */
  function counterColourClass() {
    if (isAtLimit) return 'text-red-600';
    if (isNearLimit) return 'text-amber-500';
    return 'text-gray-500';
  }

  /**
   * Handle textarea change events and forward the new value to the parent.
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e
   */
  function handleChange(e) {
    onChange(e.target.value);
  }

  return (
    <div className="flex flex-col h-full">
      <textarea
        value={content}
        onChange={handleChange}
        readOnly={isAtLimit}
        aria-label="Note content"
        className={`flex-1 w-full resize-none rounded-md border px-3 py-2 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isAtLimit
            ? 'border-red-400 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300'
        }`}
      />

      <div className={`mt-1 flex items-center gap-2 text-xs ${counterColourClass()}`}>
        <span aria-live="polite">
          {length.toLocaleString()} / {charLimit.toLocaleString()}
        </span>
        {isAtLimit && (
          <span role="alert" className="font-medium">
            Character limit reached
          </span>
        )}
      </div>
    </div>
  );
}

export default NoteEditor;
