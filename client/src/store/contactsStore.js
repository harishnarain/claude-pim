/**
 * Zustand store for the Contacts module.
 * Manages the list of contacts, the currently selected contact, search state,
 * loading/error status, and all CRUD actions that delegate to the API client.
 * @module store/contactsStore
 */

import { create } from 'zustand';
import {
  getContacts,
  getContact,
  createContact as apiCreateContact,
  updateContact as apiUpdateContact,
  deleteContact as apiDeleteContact,
} from '../api/contacts.js';

/**
 * Derive a filtered contacts array from the full list using a case-insensitive
 * search against first name, last name, email, and company fields.
 * @param {object[]} contacts - Full array of camelCase contact objects.
 * @param {string} searchQuery - The current search string.
 * @returns {object[]} Contacts that match the search query.
 */
function deriveFilteredContacts(contacts, searchQuery) {
  if (!searchQuery.trim()) return contacts;
  const lower = searchQuery.toLowerCase();
  return contacts.filter(
    (c) =>
      (c.firstName && c.firstName.toLowerCase().includes(lower)) ||
      (c.lastName && c.lastName.toLowerCase().includes(lower)) ||
      (c.email && c.email.toLowerCase().includes(lower)) ||
      (c.company && c.company.toLowerCase().includes(lower))
  );
}

/**
 * Zustand store hook for managing contacts state and actions.
 *
 * State shape:
 *   contacts        {object[]} - Full list of contacts from the last fetch.
 *   selectedContact {object|null} - Currently viewed/edited contact.
 *   isLoading       {boolean} - True while an async action is in flight.
 *   error           {string|null} - Last error message, or null if none.
 *   searchQuery     {string} - Live search string for client-side filtering.
 *   filteredContacts {object[]} - Derived subset of contacts matching searchQuery.
 *
 * Actions:
 *   fetchContacts()          - Load all contacts from the API.
 *   fetchContact(id)         - Load a single contact and set selectedContact.
 *   createContact(data)      - POST a new contact and prepend to list.
 *   updateContact(id, data)  - PATCH an existing contact and refresh list.
 *   deleteContact(id)        - DELETE a contact and remove from list.
 *   setSearchQuery(query)    - Update searchQuery (updates filteredContacts immediately).
 *
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<object>>}
 */
export const useContactsStore = create((set, get) => ({
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  contacts: [],
  selectedContact: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredContacts: [],

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Fetch all contacts from the API and update state.
   * Replaces the full contacts list and refreshes filteredContacts.
   * @returns {Promise<void>}
   */
  fetchContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const contacts = await getContacts();
      const { searchQuery } = get();
      set({
        contacts,
        filteredContacts: deriveFilteredContacts(contacts, searchQuery),
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /**
   * Fetch a single contact by ID and store it as selectedContact.
   * @param {number} id - The contact ID to fetch.
   * @returns {Promise<void>}
   */
  fetchContact: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const contact = await getContact(id);
      set({ selectedContact: contact, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /**
   * Create a new contact via the API, then prepend it to the contacts list.
   * @param {object} data - camelCase contact fields (firstName, lastName required).
   * @returns {Promise<object>} The newly created contact object.
   */
  createContact: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const created = await apiCreateContact(data);
      const contacts = [created, ...get().contacts];
      const { searchQuery } = get();
      set({
        contacts,
        filteredContacts: deriveFilteredContacts(contacts, searchQuery),
        isLoading: false,
      });
      return created;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Update an existing contact via the API, then refresh its entry in the list.
   * Also updates selectedContact if it matches the updated ID.
   * @param {number} id - The contact ID to update.
   * @param {object} data - Partial camelCase contact fields to update.
   * @returns {Promise<object>} The updated contact object.
   */
  updateContact: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateContact(id, data);
      const contacts = get().contacts.map((c) => (c.id === id ? updated : c));
      const { searchQuery, selectedContact } = get();
      set({
        contacts,
        filteredContacts: deriveFilteredContacts(contacts, searchQuery),
        selectedContact: selectedContact && selectedContact.id === id ? updated : selectedContact,
        isLoading: false,
      });
      return updated;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Delete a contact by ID via the API, then remove it from the list.
   * Clears selectedContact if it matches the deleted ID.
   * @param {number} id - The contact ID to delete.
   * @returns {Promise<void>}
   */
  deleteContact: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteContact(id);
      const contacts = get().contacts.filter((c) => c.id !== id);
      const { searchQuery, selectedContact } = get();
      set({
        contacts,
        filteredContacts: deriveFilteredContacts(contacts, searchQuery),
        selectedContact: selectedContact && selectedContact.id === id ? null : selectedContact,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Update the search query and recompute filteredContacts client-side.
   * No API call is made — filtering is done against the already-fetched contacts.
   * @param {string} query - The new search string.
   * @returns {void}
   */
  setSearchQuery: (query) => {
    const { contacts } = get();
    set({
      searchQuery: query,
      filteredContacts: deriveFilteredContacts(contacts, query),
    });
  },
}));
