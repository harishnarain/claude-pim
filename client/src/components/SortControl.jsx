/**
 * SortControl — a controlled `<select>` that lets the user choose a sort order
 * for the notes list.
 *
 * @param {object}   props
 * @param {string}   props.value      - Currently selected sort key.
 * @param {Function} props.onChange   - Callback invoked with the new sort key string.
 * @returns {JSX.Element}
 */
import React from 'react';

/** Available sort options displayed in the dropdown. */
const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Last Modified' },
  { value: 'updated_asc', label: 'Oldest First' },
  { value: 'title_asc', label: 'Title A–Z' },
];

/**
 * SortControl renders a labelled select element for choosing note sort order.
 *
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function SortControl({ value, onChange }) {
  /**
   * Forward the select's native change event value to the parent callback.
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} e
   */
  function handleChange(e) {
    onChange(e.target.value);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="sr-only">Sort notes by</span>
      <select
        aria-label="Sort notes by"
        value={value}
        onChange={handleChange}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default SortControl;
