/**
 * Unit tests for the ContactsPage list view and its sub-components:
 *   - ContactsPage.jsx
 *   - ContactList.jsx
 *   - ContactListItem.jsx
 *   - ContactSearch.jsx
 *   - EmptyState.jsx
 *
 * The Zustand store and react-router-dom are fully mocked so tests run in
 * isolation without a real API or browser router.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared mock navigate function so tests can assert navigation calls. */
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

/** Mutable store state — reset in beforeEach. */
let storeState = {};

vi.mock('../../client/src/store/contactsStore.js', () => ({
  useContactsStore: () => storeState,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sample contacts fixture. */
const CONTACTS = [
  { id: 1, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', company: 'Engine Co.' },
  { id: 2, firstName: 'Alan', lastName: 'Turing', email: null, company: null },
];

/**
 * Build default store state, merging in overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
function buildStore(overrides = {}) {
  return {
    contacts: CONTACTS,
    filteredContacts: CONTACTS,
    isLoading: false,
    error: null,
    searchQuery: '',
    fetchContacts: vi.fn(),
    setSearchQuery: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

import EmptyState from '../../client/src/components/EmptyState.jsx';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No contacts yet" />);
    expect(screen.getByText('No contacts yet')).toBeInTheDocument();
  });

  it('renders an optional message', () => {
    render(<EmptyState title="No contacts yet" message="Add one to get started." />);
    expect(screen.getByText('Add one to get started.')).toBeInTheDocument();
  });

  it('renders an optional action element', () => {
    render(
      <EmptyState
        title="Empty"
        action={<button>Add Contact</button>}
      />
    );
    expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument();
  });

  it('does not render message or action when omitted', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ContactSearch
// ---------------------------------------------------------------------------

import ContactSearch from '../../client/src/components/ContactSearch.jsx';

describe('ContactSearch', () => {
  it('renders an input with the provided value', () => {
    render(<ContactSearch value="ada" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toHaveValue('ada');
  });

  it('calls onChange with the new value when user types', async () => {
    const onChange = vi.fn();
    render(<ContactSearch value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('searchbox'), 'A');
    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('has an accessible label', () => {
    render(<ContactSearch value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText(/search contacts/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ContactListItem
// ---------------------------------------------------------------------------

import ContactListItem from '../../client/src/components/ContactListItem.jsx';

describe('ContactListItem', () => {
  const contact = CONTACTS[0];

  it('renders the full name', () => {
    render(<ContactListItem contact={contact} onClick={vi.fn()} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('renders email and company when present', () => {
    render(<ContactListItem contact={contact} onClick={vi.fn()} />);
    expect(screen.getByText(/ada@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Engine Co\./)).toBeInTheDocument();
  });

  it('calls onClick with the contact when the row is clicked', () => {
    const onClick = vi.fn();
    render(<ContactListItem contact={contact} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(contact);
  });

  it('calls onClick when Enter is pressed', () => {
    const onClick = vi.fn();
    render(<ContactListItem contact={contact} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith(contact);
  });

  it('calls onClick when Space is pressed', () => {
    const onClick = vi.fn();
    render(<ContactListItem contact={contact} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledWith(contact);
  });

  it('renders only the name when email and company are absent', () => {
    render(<ContactListItem contact={CONTACTS[1]} onClick={vi.fn()} />);
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ContactList
// ---------------------------------------------------------------------------

import ContactList from '../../client/src/components/ContactList.jsx';

describe('ContactList', () => {
  it('renders a list item for each contact', () => {
    render(<ContactList contacts={CONTACTS} onSelect={vi.fn()} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
  });

  it('sorts contacts alphabetically by last name then first name', () => {
    const unsorted = [
      { id: 3, firstName: 'Zara', lastName: 'Turing', email: null, company: null },
      { id: 1, firstName: 'Ada', lastName: 'Lovelace', email: null, company: null },
      { id: 2, firstName: 'Alan', lastName: 'Turing', email: null, company: null },
    ];
    render(<ContactList contacts={unsorted} onSelect={vi.fn()} />);
    const items = screen.getAllByRole('button');
    expect(items[0]).toHaveTextContent('Ada Lovelace');
    expect(items[1]).toHaveTextContent('Alan Turing');
    expect(items[2]).toHaveTextContent('Zara Turing');
  });

  it('calls onSelect with the contact when a row is clicked', () => {
    const onSelect = vi.fn();
    render(<ContactList contacts={[CONTACTS[0]]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(CONTACTS[0]);
  });
});

// ---------------------------------------------------------------------------
// ContactsPage
// ---------------------------------------------------------------------------

import ContactsPage from '../../client/src/pages/ContactsPage.jsx';

describe('ContactsPage', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockNavigate.mockClear();
  });

  it('calls fetchContacts on mount', () => {
    render(<ContactsPage />);
    expect(storeState.fetchContacts).toHaveBeenCalledTimes(1);
  });

  it('renders the page heading', () => {
    render(<ContactsPage />);
    expect(screen.getByRole('heading', { name: /contacts/i })).toBeInTheDocument();
  });

  it('renders the Add Contact button', () => {
    render(<ContactsPage />);
    expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<ContactsPage />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders a list of contacts when available', () => {
    render(<ContactsPage />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
  });

  it('navigates to /contacts/:id when a contact row is clicked', () => {
    render(<ContactsPage />);
    const buttons = screen.getAllByRole('button');
    // Contact list items are rendered after the "Add Contact" button
    // Find the row for Ada Lovelace
    const adaRow = screen.getByText('Ada Lovelace').closest('[role="button"]');
    fireEvent.click(adaRow);
    expect(mockNavigate).toHaveBeenCalledWith('/contacts/1');
  });

  it('navigates to /contacts/new when Add Contact is clicked', () => {
    render(<ContactsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /add contact/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/contacts/new');
  });

  it('shows a loading indicator when isLoading is true', () => {
    storeState = buildStore({ isLoading: true, filteredContacts: [] });
    render(<ContactsPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an error message when error is set', () => {
    storeState = buildStore({ error: 'Something went wrong.', filteredContacts: [] });
    render(<ContactsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
  });

  it('shows the empty state when filteredContacts is empty and no search is active', () => {
    storeState = buildStore({ filteredContacts: [], searchQuery: '' });
    render(<ContactsPage />);
    expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument();
  });

  it('shows a search-specific empty state when query matches nothing', () => {
    storeState = buildStore({ filteredContacts: [], searchQuery: 'xyz' });
    render(<ContactsPage />);
    expect(screen.getByText(/no contacts match your search/i)).toBeInTheDocument();
  });

  it('calls setSearchQuery when the search input changes', async () => {
    render(<ContactsPage />);
    await userEvent.type(screen.getByRole('searchbox'), 'Ada');
    expect(storeState.setSearchQuery).toHaveBeenCalled();
  });

  it('shows Add Contact button in empty state when no search is active', () => {
    storeState = buildStore({ filteredContacts: [], searchQuery: '' });
    render(<ContactsPage />);
    // There should be two "Add Contact" buttons — header + empty state
    const addButtons = screen.getAllByRole('button', { name: /add contact/i });
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('does not show Add Contact in empty state when search is active', () => {
    storeState = buildStore({ filteredContacts: [], searchQuery: 'xyz' });
    render(<ContactsPage />);
    // Only the header Add Contact button should appear
    const addButtons = screen.getAllByRole('button', { name: /add contact/i });
    expect(addButtons).toHaveLength(1);
  });
});
