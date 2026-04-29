/**
 * Unit tests for client/src/store/contactsStore.js.
 * Mocks the API client module so no real HTTP requests are made.
 * Verifies that each action updates store state correctly and that
 * filteredContacts is derived accurately from contacts + searchQuery.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useContactsStore } from '../../client/src/store/contactsStore.js';

// ---------------------------------------------------------------------------
// Mock the API client
// ---------------------------------------------------------------------------

vi.mock('../../client/src/api/contacts.js', () => ({
  getContacts: vi.fn(),
  getContact: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
}));

import {
  getContacts,
  getContact,
  createContact as apiCreateContact,
  updateContact as apiUpdateContact,
  deleteContact as apiDeleteContact,
} from '../../client/src/api/contacts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a sample camelCase contact (as returned by the API client).
 * @param {Partial<object>} overrides - Field overrides.
 * @returns {object} A camelCase contact object.
 */
function makeContact(overrides = {}) {
  return {
    id: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: null,
    company: 'Analytical Engine Co.',
    notes: null,
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-04-28T10:00:00Z',
    ...overrides,
  };
}

/**
 * Reset the Zustand store to initial state between tests.
 */
function resetStore() {
  useContactsStore.setState({
    contacts: [],
    selectedContact: null,
    isLoading: false,
    error: null,
    searchQuery: '',
    filteredContacts: [],
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('has the expected default values', () => {
    const state = useContactsStore.getState();
    expect(state.contacts).toEqual([]);
    expect(state.selectedContact).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.searchQuery).toBe('');
    expect(state.filteredContacts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchContacts
// ---------------------------------------------------------------------------

describe('fetchContacts', () => {
  it('sets isLoading true while fetching, then populates contacts and filteredContacts', async () => {
    const contact = makeContact();
    getContacts.mockResolvedValue([contact]);

    const fetchContactsAction = useContactsStore.getState().fetchContacts;

    const promise = fetchContactsAction();
    expect(useContactsStore.getState().isLoading).toBe(true);

    await promise;

    const state = useContactsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.contacts).toEqual([contact]);
    expect(state.filteredContacts).toEqual([contact]);
  });

  it('sets error and clears isLoading on API failure', async () => {
    getContacts.mockRejectedValue(new Error('API error 500: SERVER_ERROR'));

    await useContactsStore.getState().fetchContacts();

    const state = useContactsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('API error 500: SERVER_ERROR');
    expect(state.contacts).toEqual([]);
  });

  it('respects an existing searchQuery when populating filteredContacts', async () => {
    const ada = makeContact({ id: 1, firstName: 'Ada', lastName: 'Lovelace' });
    const grace = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' });
    getContacts.mockResolvedValue([ada, grace]);

    // pre-set a search query
    useContactsStore.setState({ searchQuery: 'grace' });

    await useContactsStore.getState().fetchContacts();

    const state = useContactsStore.getState();
    expect(state.contacts).toHaveLength(2);
    expect(state.filteredContacts).toHaveLength(1);
    expect(state.filteredContacts[0].id).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// fetchContact
// ---------------------------------------------------------------------------

describe('fetchContact', () => {
  it('fetches a single contact and sets selectedContact', async () => {
    const contact = makeContact({ id: 7 });
    getContact.mockResolvedValue(contact);

    await useContactsStore.getState().fetchContact(7);

    const state = useContactsStore.getState();
    expect(getContact).toHaveBeenCalledWith(7);
    expect(state.selectedContact).toEqual(contact);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    getContact.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await useContactsStore.getState().fetchContact(999);

    const state = useContactsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('API error 404: NOT_FOUND');
    expect(state.selectedContact).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createContact
// ---------------------------------------------------------------------------

describe('createContact', () => {
  it('prepends the new contact to the contacts list and updates filteredContacts', async () => {
    const existing = makeContact({ id: 1 });
    const created = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper' });

    useContactsStore.setState({
      contacts: [existing],
      filteredContacts: [existing],
    });
    apiCreateContact.mockResolvedValue(created);

    const result = await useContactsStore.getState().createContact({ firstName: 'Grace', lastName: 'Hopper' });

    expect(result).toEqual(created);
    const state = useContactsStore.getState();
    expect(state.contacts).toEqual([created, existing]);
    expect(state.filteredContacts).toHaveLength(2);
    expect(state.isLoading).toBe(false);
  });

  it('sets error and re-throws on API failure', async () => {
    apiCreateContact.mockRejectedValue(new Error('API error 422: VALIDATION_ERROR'));

    await expect(
      useContactsStore.getState().createContact({ firstName: 'Ada' })
    ).rejects.toThrow('API error 422: VALIDATION_ERROR');

    const state = useContactsStore.getState();
    expect(state.error).toBe('API error 422: VALIDATION_ERROR');
    expect(state.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateContact
// ---------------------------------------------------------------------------

describe('updateContact', () => {
  it('replaces the updated contact in the list and updates filteredContacts', async () => {
    const original = makeContact({ id: 1, company: 'Old Co.' });
    const updated = makeContact({ id: 1, company: 'New Co.' });

    useContactsStore.setState({
      contacts: [original],
      filteredContacts: [original],
    });
    apiUpdateContact.mockResolvedValue(updated);

    const result = await useContactsStore.getState().updateContact(1, { company: 'New Co.' });

    expect(result).toEqual(updated);
    const state = useContactsStore.getState();
    expect(state.contacts[0].company).toBe('New Co.');
    expect(state.filteredContacts[0].company).toBe('New Co.');
    expect(state.isLoading).toBe(false);
  });

  it('updates selectedContact when the updated contact is currently selected', async () => {
    const original = makeContact({ id: 1, company: 'Old Co.' });
    const updated = makeContact({ id: 1, company: 'New Co.' });

    useContactsStore.setState({
      contacts: [original],
      filteredContacts: [original],
      selectedContact: original,
    });
    apiUpdateContact.mockResolvedValue(updated);

    await useContactsStore.getState().updateContact(1, { company: 'New Co.' });

    expect(useContactsStore.getState().selectedContact.company).toBe('New Co.');
  });

  it('does not change selectedContact when a different contact is updated', async () => {
    const contactA = makeContact({ id: 1 });
    const contactB = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper' });
    const updatedB = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper', company: 'US Navy' });

    useContactsStore.setState({
      contacts: [contactA, contactB],
      filteredContacts: [contactA, contactB],
      selectedContact: contactA,
    });
    apiUpdateContact.mockResolvedValue(updatedB);

    await useContactsStore.getState().updateContact(2, { company: 'US Navy' });

    expect(useContactsStore.getState().selectedContact).toEqual(contactA);
  });

  it('sets error and re-throws on API failure', async () => {
    apiUpdateContact.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await expect(
      useContactsStore.getState().updateContact(999, { company: 'Nobody' })
    ).rejects.toThrow('API error 404: NOT_FOUND');

    expect(useContactsStore.getState().error).toBe('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// deleteContact
// ---------------------------------------------------------------------------

describe('deleteContact', () => {
  it('removes the deleted contact from the list and updates filteredContacts', async () => {
    const contactA = makeContact({ id: 1 });
    const contactB = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper' });

    useContactsStore.setState({
      contacts: [contactA, contactB],
      filteredContacts: [contactA, contactB],
    });
    apiDeleteContact.mockResolvedValue({ deleted: true });

    await useContactsStore.getState().deleteContact(1);

    const state = useContactsStore.getState();
    expect(state.contacts).toHaveLength(1);
    expect(state.contacts[0].id).toBe(2);
    expect(state.filteredContacts).toHaveLength(1);
    expect(state.isLoading).toBe(false);
  });

  it('clears selectedContact when the deleted contact was selected', async () => {
    const contact = makeContact({ id: 1 });

    useContactsStore.setState({
      contacts: [contact],
      filteredContacts: [contact],
      selectedContact: contact,
    });
    apiDeleteContact.mockResolvedValue({ deleted: true });

    await useContactsStore.getState().deleteContact(1);

    expect(useContactsStore.getState().selectedContact).toBeNull();
  });

  it('does not clear selectedContact when a different contact is deleted', async () => {
    const contactA = makeContact({ id: 1 });
    const contactB = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper' });

    useContactsStore.setState({
      contacts: [contactA, contactB],
      filteredContacts: [contactA, contactB],
      selectedContact: contactA,
    });
    apiDeleteContact.mockResolvedValue({ deleted: true });

    await useContactsStore.getState().deleteContact(2);

    expect(useContactsStore.getState().selectedContact).toEqual(contactA);
  });

  it('sets error and re-throws on API failure', async () => {
    apiDeleteContact.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await expect(
      useContactsStore.getState().deleteContact(999)
    ).rejects.toThrow('API error 404: NOT_FOUND');

    expect(useContactsStore.getState().error).toBe('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// setSearchQuery
// ---------------------------------------------------------------------------

describe('setSearchQuery', () => {
  it('updates searchQuery and filters filteredContacts by first name', () => {
    const ada = makeContact({ id: 1, firstName: 'Ada', lastName: 'Lovelace' });
    const grace = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' });

    useContactsStore.setState({ contacts: [ada, grace] });

    useContactsStore.getState().setSearchQuery('grace');

    const state = useContactsStore.getState();
    expect(state.searchQuery).toBe('grace');
    expect(state.filteredContacts).toHaveLength(1);
    expect(state.filteredContacts[0].id).toBe(2);
  });

  it('filters by last name (case-insensitive)', () => {
    const ada = makeContact({ id: 1, firstName: 'Ada', lastName: 'Lovelace' });
    const grace = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' });

    useContactsStore.setState({ contacts: [ada, grace] });
    useContactsStore.getState().setSearchQuery('LOVE');

    const state = useContactsStore.getState();
    expect(state.filteredContacts).toHaveLength(1);
    expect(state.filteredContacts[0].id).toBe(1);
  });

  it('filters by email', () => {
    const ada = makeContact({ id: 1, email: 'ada@example.com' });
    const grace = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper', email: 'grace@navy.mil' });

    useContactsStore.setState({ contacts: [ada, grace] });
    useContactsStore.getState().setSearchQuery('navy');

    expect(useContactsStore.getState().filteredContacts).toHaveLength(1);
    expect(useContactsStore.getState().filteredContacts[0].id).toBe(2);
  });

  it('filters by company', () => {
    const ada = makeContact({ id: 1, company: 'Analytical Engine Co.' });
    const grace = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper', company: 'US Navy' });

    useContactsStore.setState({ contacts: [ada, grace] });
    useContactsStore.getState().setSearchQuery('us navy');

    expect(useContactsStore.getState().filteredContacts).toHaveLength(1);
    expect(useContactsStore.getState().filteredContacts[0].id).toBe(2);
  });

  it('returns all contacts when query is cleared', () => {
    const ada = makeContact({ id: 1 });
    const grace = makeContact({ id: 2, firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' });

    useContactsStore.setState({ contacts: [ada, grace], searchQuery: 'ada', filteredContacts: [ada] });

    useContactsStore.getState().setSearchQuery('');

    const state = useContactsStore.getState();
    expect(state.filteredContacts).toHaveLength(2);
  });

  it('returns empty array when no contacts match', () => {
    const ada = makeContact({ id: 1 });
    useContactsStore.setState({ contacts: [ada] });

    useContactsStore.getState().setSearchQuery('zzznomatch');

    expect(useContactsStore.getState().filteredContacts).toHaveLength(0);
  });
});
