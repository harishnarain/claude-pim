/**
 * useAutoSave — debounced auto-save hook for text content.
 *
 * Manages local content state that diverges from the store during typing.
 * Schedules a save after `debounceMs` of inactivity; exposes `flushSave` for
 * immediate saves on blur. Resets state whenever `resetKey` changes (e.g. new note ID).
 *
 * @module hooks/useAutoSave
 */

import { useState, useRef, useEffect } from 'react';

/**
 * @param {object} opts
 * @param {string}   opts.initialContent - Content to initialise (and reset to) when resetKey changes.
 * @param {unknown}  opts.resetKey       - When this value changes, local state is reset to initialContent.
 * @param {Function} opts.onSave         - Called with the current content string when a save fires.
 * @param {number}   opts.charLimit      - Saves are blocked when content exceeds this length.
 * @param {number}   opts.debounceMs     - Debounce delay in milliseconds.
 * @returns {{ localContent: string, handleContentChange: Function, handleEditorBlur: Function }}
 */
function useAutoSave({ initialContent, resetKey, onSave, charLimit, debounceMs }) {
  const [localContent, setLocalContent] = useState(initialContent ?? '');
  const hasUnsavedRef = useRef(false);
  const debounceTimerRef = useRef(null);

  // Reset local state when the note changes (resetKey = note id).
  useEffect(() => {
    setLocalContent(initialContent ?? '');
    hasUnsavedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  /**
   * Cancel any pending debounce and immediately save if there are unsaved changes.
   * @returns {void}
   */
  function flushSave() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (hasUnsavedRef.current && localContent.length <= charLimit) {
      hasUnsavedRef.current = false;
      onSave(localContent);
    }
  }

  /**
   * Handle a content change: update local state and schedule a debounced save.
   * @param {string} newContent
   * @returns {void}
   */
  function handleContentChange(newContent) {
    setLocalContent(newContent);
    hasUnsavedRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (newContent.length > charLimit) return;

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (hasUnsavedRef.current) {
        hasUnsavedRef.current = false;
        onSave(newContent);
      }
    }, debounceMs);
  }

  /**
   * Flush the debounce on editor blur.
   * @returns {void}
   */
  function handleEditorBlur() {
    flushSave();
  }

  return { localContent, handleContentChange, handleEditorBlur };
}

export default useAutoSave;
