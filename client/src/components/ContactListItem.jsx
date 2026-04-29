/**
 * ContactListItem — single row in the contacts list.
 * Displays the contact's full name, email, and company.
 * Calls onClick when the row is clicked, enabling navigation to the detail page.
 *
 * @param {object}   props
 * @param {object}   props.contact           - Contact data object.
 * @param {number}   props.contact.id        - Unique contact ID.
 * @param {string}   props.contact.firstName - Contact's first name.
 * @param {string}   props.contact.lastName  - Contact's last name.
 * @param {string|null} [props.contact.email]   - Contact's email address.
 * @param {string|null} [props.contact.company] - Contact's company name.
 * @param {Function} props.onClick           - Callback invoked when row is clicked.
 * @returns {JSX.Element}
 */
import React from 'react';

/**
 * ContactListItem renders one contact row with name, email, and company.
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function ContactListItem({ contact, onClick }) {
  const { firstName, lastName, email, company } = contact;
  const fullName = `${firstName} ${lastName}`;

  /**
   * Handle keyboard activation (Enter / Space) for accessibility.
   * @param {React.KeyboardEvent} e
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(contact);
    }
  }

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onClick(contact)}
      onKeyDown={handleKeyDown}
      className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{fullName}</p>
        {(email || company) && (
          <p className="truncate text-xs text-gray-500">
            {[email, company].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <svg
        className="ml-3 h-4 w-4 flex-shrink-0 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </li>
  );
}

export default ContactListItem;
