/**
 * EmptyState — reusable empty state display component.
 * Shown when a list has no items to display (e.g., no contacts match a search).
 *
 * @param {object}  props
 * @param {string}  props.title      - Primary heading text.
 * @param {string}  [props.message]  - Optional supporting message.
 * @param {React.ReactNode} [props.action] - Optional action element (e.g., a button or link).
 * @returns {JSX.Element}
 */
import React from 'react';

/**
 * EmptyState component for displaying a friendly placeholder when there is
 * no content to show in a list view.
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-6">
        <svg
          className="h-10 w-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {message && (
        <p className="mt-1 text-sm text-gray-500">{message}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default EmptyState;
