/**
 * ContactSearch — controlled search input for filtering the contacts list.
 * Calls onChange on every keystroke; no debounce (filtering is client-side).
 *
 * @param {object}   props
 * @param {string}   props.value      - Current search query string.
 * @param {Function} props.onChange   - Callback invoked with new string value on input.
 * @returns {JSX.Element}
 */
import React from 'react';

/**
 * ContactSearch renders a labelled text input for searching contacts.
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function ContactSearch({ value, onChange }) {
  /**
   * Handle input change and propagate plain string value to parent.
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  function handleChange(e) {
    onChange(e.target.value);
  }

  return (
    <div className="relative">
      <label htmlFor="contact-search" className="sr-only">
        Search contacts
      </label>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
      </div>
      <input
        id="contact-search"
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Search contacts…"
        className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default ContactSearch;
