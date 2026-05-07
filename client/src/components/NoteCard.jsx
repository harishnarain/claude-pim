/**
 * NoteCard — clickable card that represents a single note in the notes list.
 * Displays the note's title, pin status, preview, tags, and last-modified date.
 *
 * @param {object}   props
 * @param {object}   props.note              - Note data object (camelCase).
 * @param {number}   props.note.id           - Unique note ID.
 * @param {string}   props.note.title        - Note title (may be empty).
 * @param {string}   props.note.preview      - Plain-text preview of the note body.
 * @param {boolean}  props.note.isPinned     - Whether the note is pinned.
 * @param {Array}    props.note.tags         - Array of tag objects or strings.
 * @param {string}   props.note.updatedAt    - ISO date string of last update.
 * @param {Function} props.onSelect          - Callback invoked with the note object on click.
 * @returns {JSX.Element}
 */
import React from 'react';

/** Maximum number of characters shown in the preview snippet. */
const PREVIEW_MAX_LENGTH = 100;

/**
 * Extract a display-friendly tag name from a tag value that may be an object
 * or a plain string.
 *
 * @param {object|string} tag - A tag object with a `name` property or a string.
 * @returns {string}
 */
function getTagName(tag) {
  return typeof tag === 'string' ? tag : tag.name;
}

/**
 * Format an ISO date string into a short, locale-sensitive date string.
 *
 * @param {string} isoString - ISO 8601 date string.
 * @returns {string} Short date representation (e.g. "Jan 1, 2025").
 */
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * NoteCard renders a single note as a clickable summary card.
 *
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function NoteCard({ note, onSelect }) {
  const { title, preview, isPinned, tags = [], updatedAt } = note;

  const displayTitle = title && title.trim() ? title : 'Untitled';
  const truncatedPreview =
    preview && preview.length > PREVIEW_MAX_LENGTH
      ? `${preview.slice(0, PREVIEW_MAX_LENGTH)}…`
      : preview;

  /**
   * Handle keyboard activation (Enter / Space) for accessibility.
   *
   * @param {React.KeyboardEvent} e
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(note);
    }
  }

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onSelect(note)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-bold text-gray-900">{displayTitle}</p>
        {isPinned && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            📌 Pinned
          </span>
        )}
      </div>

      {truncatedPreview && (
        <p className="mt-1 text-sm text-gray-500">{truncatedPreview}</p>
      )}

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => {
            const name = getTagName(tag);
            return (
              <span
                key={name}
                className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                {name}
              </span>
            );
          })}
        </div>
      )}

      {updatedAt && (
        <p className="mt-2 text-xs text-gray-400">{formatDate(updatedAt)}</p>
      )}
    </li>
  );
}

export default NoteCard;
