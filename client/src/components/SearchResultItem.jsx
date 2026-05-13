/**
 * SearchResultItem — a single result row used in both the search dropdown and
 * the full results page.
 *
 * Displays a type icon (via TypeIcon), a bold title on the first line, and a
 * muted, truncated subtitle on the second line. The row is fully keyboard-
 * accessible: pressing Enter or Space triggers the onClick callback.
 *
 * @param {object}   props
 * @param {object}   props.result            - A SearchResult object.
 * @param {string}   props.result.kind       - One of 'contact'|'note'|'task'|'event'.
 * @param {number}   props.result.id         - Unique ID of the result item.
 * @param {string}   props.result.title      - Primary display text.
 * @param {string}   props.result.subtitle   - Secondary display text shown below title.
 * @param {string}   props.result.url        - Navigation URL for the result.
 * @param {string}   props.result.updatedAt  - ISO timestamp of last update.
 * @param {boolean}  props.result.isPinned   - Whether the result is pinned.
 * @param {Function} props.onClick           - Callback invoked when the row is activated.
 * @returns {JSX.Element}
 */
import React from 'react';
import TypeIcon from '../components/TypeIcon.jsx';

/**
 * SearchResultItem renders one search result row with icon, title and subtitle.
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function SearchResultItem({ result, onClick }) {
  const { kind, title, subtitle } = result;

  /**
   * Handle keyboard activation (Enter / Space) for accessibility.
   * @param {React.KeyboardEvent} e
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(result);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(result)}
      onKeyDown={handleKeyDown}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
    >
      <TypeIcon kind={kind} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default SearchResultItem;
