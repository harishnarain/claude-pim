/**
 * Unit tests for client/src/components/ContactForm.jsx.
 *
 * Verifies:
 *   - All six fields render correctly.
 *   - Inline validation errors appear for missing required fields.
 *   - Valid email format is enforced when email is supplied.
 *   - onSubmit is called with trimmed camelCase data on a valid submission.
 *   - onSubmit is NOT called when required fields are missing.
 *   - onCancel is called when the Cancel button is clicked.
 *   - Submit button is disabled and shows "Saving…" text when isLoading is true.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ContactForm from '../../client/src/components/ContactForm.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render the ContactForm with sensible defaults, merging in any overrides.
 * @param {object} [props] - Prop overrides.
 * @returns {{ onSubmit: vi.Mock, onCancel: vi.Mock }}
 */
function renderForm(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const onCancel = props.onCancel ?? vi.fn();
  render(
    <ContactForm
      onSubmit={onSubmit}
      onCancel={onCancel}
      isLoading={false}
      {...props}
    />
  );
  return { onSubmit, onCancel };
}

/**
 * Fill in a form field by its label text.
 * @param {string} labelText - Accessible label of the input.
 * @param {string} value - Value to type.
 */
async function fillField(labelText, value) {
  const input = screen.getByLabelText(labelText, { exact: false });
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

// ---------------------------------------------------------------------------
// Field rendering
// ---------------------------------------------------------------------------

describe('field rendering', () => {
  it('renders all six form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('renders Save and Cancel buttons', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('pre-fills fields from initialValues in edit mode', () => {
    renderForm({
      initialValues: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '555-1234',
        company: 'Analytical Engine Co.',
        notes: 'Pioneer',
      },
    });
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Ada');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Lovelace');
    expect(screen.getByLabelText(/email/i)).toHaveValue('ada@example.com');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('555-1234');
    expect(screen.getByLabelText(/company/i)).toHaveValue('Analytical Engine Co.');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Pioneer');
  });
});

// ---------------------------------------------------------------------------
// Validation — required fields
// ---------------------------------------------------------------------------

describe('validation — required fields', () => {
  it('shows an error for firstName when submitted blank', async () => {
    renderForm();
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));
    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
  });

  it('shows an error for lastName when submitted blank', async () => {
    renderForm();
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));
    expect(await screen.findByText(/last name is required/i)).toBeInTheDocument();
  });

  it('does not call onSubmit when required fields are missing', async () => {
    const { onSubmit } = renderForm();
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('clears the firstName error once the user starts typing', async () => {
    renderForm();
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));
    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();

    await fillField('First Name', 'A');
    expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Validation — email format
// ---------------------------------------------------------------------------

describe('validation — email format', () => {
  it('shows an error for an invalid email when provided', async () => {
    renderForm();
    await fillField('First Name', 'Ada');
    await fillField('Last Name', 'Lovelace');
    await fillField('Email', 'not-an-email');
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('accepts a valid email without error', async () => {
    const { onSubmit } = renderForm();
    await fillField('First Name', 'Ada');
    await fillField('Last Name', 'Lovelace');
    await fillField('Email', 'ada@example.com');
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
  });

  it('does not validate email format when email is left blank', async () => {
    const { onSubmit } = renderForm();
    await fillField('First Name', 'Ada');
    await fillField('Last Name', 'Lovelace');
    // email left empty
    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Valid submission
// ---------------------------------------------------------------------------

describe('valid submission', () => {
  it('calls onSubmit with trimmed camelCase data on a successful submit', async () => {
    const { onSubmit } = renderForm();
    await fillField('First Name', '  Ada  ');
    await fillField('Last Name', '  Lovelace  ');
    await fillField('Email', 'ada@example.com');
    await fillField('Phone', '555-1234');
    await fillField('Company', 'Analytical Engine Co.');
    await fillField('Notes', 'Pioneer of computing');

    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '555-1234',
      company: 'Analytical Engine Co.',
      notes: 'Pioneer of computing',
    });
  });

  it('sends null for optional fields left blank', async () => {
    const { onSubmit } = renderForm();
    await fillField('First Name', 'Ada');
    await fillField('Last Name', 'Lovelace');

    fireEvent.submit(screen.getByRole('button', { name: /save/i }).closest('form'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: null,
      phone: null,
      company: null,
      notes: null,
    });
  });
});

// ---------------------------------------------------------------------------
// Cancel button
// ---------------------------------------------------------------------------

describe('cancel button', () => {
  it('calls onCancel when the Cancel button is clicked', async () => {
    const { onCancel } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('loading state', () => {
  it('disables the submit button when isLoading is true', () => {
    renderForm({ isLoading: true });
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('shows "Saving…" text on the submit button when isLoading is true', () => {
    renderForm({ isLoading: true });
    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
  });

  it('disables the cancel button when isLoading is true', () => {
    renderForm({ isLoading: true });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('disables all inputs when isLoading is true', () => {
    renderForm({ isLoading: true });
    expect(screen.getByLabelText(/first name/i)).toBeDisabled();
    expect(screen.getByLabelText(/last name/i)).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/phone/i)).toBeDisabled();
    expect(screen.getByLabelText(/company/i)).toBeDisabled();
    expect(screen.getByLabelText(/notes/i)).toBeDisabled();
  });
});
