/**
 * Unit tests for:
 *   - client/src/components/ConfirmDialog.jsx
 *   - client/src/pages/ContactDetailPage.jsx
 *
 * The Zustand store and react-router-dom are fully mocked so tests run
 * in isolation without a real API or browser router.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared mock navigate function so tests can assert navigation calls. */
const mockNavigate = vi.fn();

/** Captured useParams return value — set per test. */
let mockParams = { id: '1' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

/** Mutable store state — reset in beforeEach. */
let storeState = {};

vi.mock('../../client/src/store/contactsStore.js', () => ({
  useContactsStore: () => storeState,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A fully populated contact fixture. */
const CONTACT = {
  id: 1,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '555-1234',
  company: 'Engine Co.',
  notes: 'Pioneer of computing',
  createdAt: '2026-04-28T10:00:00Z',
  updatedAt: '2026-04-28T10:00:00Z',
};

/**
 * Build a default store state, merging in overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
function buildStore(overrides = {}) {
  return {
    selectedContact: CONTACT,
    isLoading: false,
    error: null,
    fetchContact: vi.fn(),
    updateContact: vi.fn().mockResolvedValue(CONTACT),
    deleteContact: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

import ConfirmDialog from '../../client/src/components/ConfirmDialog.jsx';

describe('ConfirmDialog', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog and message when isOpen is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders Confirm and Cancel buttons', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        message="Delete?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onConfirm when Confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog isOpen={true} message="Delete?" onConfirm={onConfirm} onCancel={vi.fn()} />
    );
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog isOpen={true} message="Delete?" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ContactDetailPage
// ---------------------------------------------------------------------------

import ContactDetailPage from '../../client/src/pages/ContactDetailPage.jsx';

describe('ContactDetailPage', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '1' };
    mockNavigate.mockClear();
  });

  // -------------------------------------------------------------------------
  // Initial rendering / data loading
  // -------------------------------------------------------------------------

  it('calls fetchContact with the route param id on mount', () => {
    render(<ContactDetailPage />);
    expect(storeState.fetchContact).toHaveBeenCalledWith('1');
  });

  it('shows a loading indicator when isLoading is true', () => {
    storeState = buildStore({ isLoading: true, selectedContact: null });
    render(<ContactDetailPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders nothing when not loading and selectedContact is null (pre-fetch)', () => {
    storeState = buildStore({ selectedContact: null });
    const { container } = render(<ContactDetailPage />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the contact full name as a heading', () => {
    render(<ContactDetailPage />);
    expect(screen.getByRole('heading', { name: /ada lovelace/i })).toBeInTheDocument();
  });

  it('renders all contact fields in read mode', () => {
    render(<ContactDetailPage />);
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-1234')).toBeInTheDocument();
    expect(screen.getByText('Engine Co.')).toBeInTheDocument();
    expect(screen.getByText('Pioneer of computing')).toBeInTheDocument();
  });

  it('renders Edit and Delete buttons in read mode', () => {
    render(<ContactDetailPage />);
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 404 redirect
  // -------------------------------------------------------------------------

  it('navigates to /contacts when error contains "not found"', () => {
    storeState = buildStore({ error: 'Contact not found', selectedContact: null });
    render(<ContactDetailPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/contacts', {
      state: { toast: 'Contact not found.' },
    });
  });

  it('navigates to /contacts when error contains "404"', () => {
    storeState = buildStore({ error: '404: resource missing', selectedContact: null });
    render(<ContactDetailPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/contacts', {
      state: { toast: 'Contact not found.' },
    });
  });

  it('shows inline error alert for non-404 errors', () => {
    storeState = buildStore({ error: 'Network error', selectedContact: null });
    render(<ContactDetailPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  // -------------------------------------------------------------------------
  // Edit mode
  // -------------------------------------------------------------------------

  it('switches to edit mode when Edit button is clicked', async () => {
    render(<ContactDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    // ContactForm renders a Save button
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
  });

  it('hides Edit and Delete buttons while in edit mode', async () => {
    render(<ContactDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('exits edit mode and shows read mode when Cancel is clicked', async () => {
    render(<ContactDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
  });

  it('calls updateContact and exits edit mode on save', async () => {
    render(<ContactDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    // Submit the form directly (fields already pre-filled via initialValues)
    fireEvent.submit(screen.getByRole('button', { name: /^save$/i }).closest('form'));

    await waitFor(() => {
      expect(storeState.updateContact).toHaveBeenCalledWith(1, expect.objectContaining({
        firstName: 'Ada',
        lastName: 'Lovelace',
      }));
    });

    // Should exit edit mode after successful save
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Delete flow
  // -------------------------------------------------------------------------

  it('opens the ConfirmDialog when Delete is clicked', async () => {
    render(<ContactDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the ConfirmDialog when Cancel is clicked in the dialog', async () => {
    render(<ContactDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls deleteContact and navigates to /contacts on confirm', async () => {
    render(<ContactDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(storeState.deleteContact).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/contacts', {
        state: { toast: 'Contact deleted.' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Back navigation
  // -------------------------------------------------------------------------

  it('navigates to /contacts when Back is clicked', async () => {
    render(<ContactDetailPage />);
    await userEvent.click(screen.getByRole('button', { name: /back to contacts/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contacts');
  });
});
