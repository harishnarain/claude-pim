/**
 * ContactList — renders a sorted, scrollable list of ContactListItem rows.
 * Contacts are sorted alphabetically by last name, then first name.
 * Delegates click handling to the parent via the onSelect callback.
 *
 * @param {object}   props
 * @param {object[]} props.contacts  - Array of contact objects to display.
 * @param {Function} props.onSelect  - Callback invoked with a contact object when a row is clicked.
 * @returns {JSX.Element}
 */
import React from 'react';
import ContactListItem from './ContactListItem.jsx';

/**
 * Sort contacts alphabetically by last name, then first name (case-insensitive).
 * @param {object[]} contacts - Array of contact objects.
 * @returns {object[]} New sorted array.
 */
function sortContacts(contacts) {
  return [...contacts].sort((a, b) => {
    const lastCmp = (a.lastName ?? '').toLowerCase().localeCompare((b.lastName ?? '').toLowerCase());
    if (lastCmp !== 0) return lastCmp;
    return (a.firstName ?? '').toLowerCase().localeCompare((b.firstName ?? '').toLowerCase());
  });
}

/**
 * ContactList renders an ordered list of contact rows.
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function ContactList({ contacts, onSelect }) {
  const sorted = sortContacts(contacts);

  return (
    <ul
      role="list"
      className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white shadow-sm"
    >
      {sorted.map((contact) => (
        <ContactListItem
          key={contact.id}
          contact={contact}
          onClick={onSelect}
        />
      ))}
    </ul>
  );
}

export default ContactList;
