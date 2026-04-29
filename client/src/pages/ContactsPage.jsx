/**
 * ContactsPage — list view for the Contacts module.
 * Fetches all contacts on mount, provides a live search input that filters
 * the list client-side, and offers an "Add Contact" button for creating new ones.
 *
 * Routing:
 *   - Clicking a contact row navigates to /contacts/:id
 *   - "Add Contact" navigates to /contacts/new
 *
 * @returns {JSX.Element}
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContactsStore } from '../store/contactsStore.js';
import ContactList from '../components/ContactList.jsx';
import ContactSearch from '../components/ContactSearch.jsx';
import EmptyState from '../components/EmptyState.jsx';

/**
 * ContactsPage fetches contacts on mount and displays a searchable list.
 * @returns {JSX.Element}
 */
function ContactsPage() {
  const navigate = useNavigate();
  const {
    filteredContacts,
    isLoading,
    error,
    searchQuery,
    fetchContacts,
    setSearchQuery,
  } = useContactsStore();

  /** Fetch all contacts when the page first mounts. */
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  /**
   * Navigate to the contact detail page when a row is selected.
   * @param {object} contact - The clicked contact object.
   */
  function handleSelect(contact) {
    navigate(`/contacts/${contact.id}`);
  }

  /** Navigate to the create contact page. */
  function handleAddContact() {
    navigate('/contacts/new');
  }

  const hasContacts = filteredContacts.length > 0;
  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <button
          type="button"
          onClick={handleAddContact}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add Contact
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <ContactSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Body */}
      {isLoading && (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      )}

      {!isLoading && error && (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && hasContacts && (
        <ContactList contacts={filteredContacts} onSelect={handleSelect} />
      )}

      {!isLoading && !error && !hasContacts && (
        <EmptyState
          title={isSearchActive ? 'No contacts match your search' : 'No contacts yet'}
          message={
            isSearchActive
              ? 'Try a different search term.'
              : 'Get started by adding your first contact.'
          }
          action={
            !isSearchActive && (
              <button
                type="button"
                onClick={handleAddContact}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Contact
              </button>
            )
          }
        />
      )}
    </div>
  );
}

export default ContactsPage;
