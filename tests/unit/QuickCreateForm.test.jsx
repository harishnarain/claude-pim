/**
 * Unit tests for client/src/components/QuickCreateForm.jsx.
 *
 * The Zustand calendar store is fully mocked so tests run in isolation
 * without a real API.
 *
 * Covered scenarios:
 *   - Form renders with the title input, all-day checkbox, and action buttons.
 *   - Title input is pre-focused and empty on first render.
 *   - When initialHour is provided, the all-day checkbox is unchecked.
 *   - When initialHour is null, the all-day checkbox is checked.
 *   - Start/end time inputs are hidden when allDay is true.
 *   - Start/end time inputs are visible when allDay is false.
 *   - Start time is pre-filled from initialDate + initialHour.
 *   - End time defaults to startAt + 1 hour.
 *   - Cancel button calls onClose without creating an event.
 *   - Save with empty title shows an inline title error and does NOT call createEvent.
 *   - Save with a valid title calls createEvent and then onSave with the created event.
 *   - Expand with a valid title calls createEvent and then onExpand with the event id.
 *   - API error on Save shows an inline error message.
 *   - API error on Expand shows an inline error message.
 *   - Save and Expand buttons are disabled while isSaving is true.
 *   - Button labels show 'Saving…' while isSaving is true.
 *   - ColorPicker renders with the default blue color selected.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock the calendar store
// ---------------------------------------------------------------------------

/** Mutable store state — reset in beforeEach. */
let mockCreateEvent;
let mockIsSaving;

vi.mock('../../client/src/store/calendarStore.js', () => ({
  useCalendarStore: (selector) =>
    selector({
      createEvent: (...args) => mockCreateEvent(...args),
      isSaving: mockIsSaving,
    }),
}));

// ---------------------------------------------------------------------------
// Mock ColorPicker so we can assert it rendered without full Tailwind
// ---------------------------------------------------------------------------

vi.mock('../../client/src/components/ColorPicker.jsx', () => ({
  default: ({ value, onChange }) => (
    <div data-testid="color-picker">
      <button
        type="button"
        aria-label="Select blue color"
        aria-pressed={value === 'blue'}
        onClick={() => onChange('blue')}
      />
      <button
        type="button"
        aria-label="Select red color"
        aria-pressed={value === 'red'}
        onClick={() => onChange('red')}
      />
    </div>
  ),
}));

import QuickCreateForm from '../../client/src/components/QuickCreateForm.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A timed date: 2026-05-08. */
const INITIAL_DATE = new Date(2026, 4, 8); // May 8, 2026

/** A timed hour: 9 AM. */
const INITIAL_HOUR = 9;

/** Created event returned by the mocked createEvent. */
const CREATED_EVENT = {
  id: 42,
  title: 'New Event',
  startAt: '2026-05-08T09:00',
  endAt: '2026-05-08T10:00',
  allDay: false,
  color: 'blue',
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Render QuickCreateForm with sensible defaults merged with overrides.
 *
 * @param {object} [props]                    - Prop overrides.
 * @param {Date}          [props.initialDate] - Defaults to INITIAL_DATE.
 * @param {number|null}   [props.initialHour] - Defaults to INITIAL_HOUR.
 * @param {Function}      [props.onSave]
 * @param {Function}      [props.onExpand]
 * @param {Function}      [props.onClose]
 * @returns {{ onSave, onExpand, onClose }} — the mock callbacks used.
 */
function renderForm(props = {}) {
  const onSave = props.onSave ?? vi.fn();
  const onExpand = props.onExpand ?? vi.fn();
  const onClose = props.onClose ?? vi.fn();

  render(
    <QuickCreateForm
      initialDate={INITIAL_DATE}
      initialHour={INITIAL_HOUR}
      onSave={onSave}
      onExpand={onExpand}
      onClose={onClose}
      {...props}
    />
  );

  return { onSave, onExpand, onClose };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockIsSaving = false;
  mockCreateEvent = vi.fn().mockResolvedValue(CREATED_EVENT);
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('rendering', () => {
  it('renders the title input', () => {
    renderForm();
    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
  });

  it('renders the all-day checkbox', () => {
    renderForm();
    expect(screen.getByLabelText(/all day/i)).toBeInTheDocument();
  });

  it('renders Save, Expand, and Cancel buttons', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /save event/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand event editor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders the ColorPicker', () => {
    renderForm();
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('title input is empty on first render', () => {
    renderForm();
    expect(screen.getByLabelText(/event title/i)).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// All-day toggle initial state
// ---------------------------------------------------------------------------

describe('all-day toggle initial state', () => {
  it('unchecks all-day when initialHour is a number', () => {
    renderForm({ initialHour: 9 });
    expect(screen.getByLabelText(/all day/i)).not.toBeChecked();
  });

  it('checks all-day when initialHour is null', () => {
    renderForm({ initialHour: null });
    expect(screen.getByLabelText(/all day/i)).toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// Time inputs visibility
// ---------------------------------------------------------------------------

describe('time inputs visibility', () => {
  it('shows start and end time inputs when allDay is false', () => {
    renderForm({ initialHour: 9 });
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });

  it('hides start and end time inputs when allDay is true', () => {
    renderForm({ initialHour: null });
    expect(screen.queryByLabelText(/start time/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/end time/i)).not.toBeInTheDocument();
  });

  it('hides time inputs after toggling allDay on', () => {
    renderForm({ initialHour: 9 });
    fireEvent.click(screen.getByLabelText(/all day/i));
    expect(screen.queryByLabelText(/start time/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/end time/i)).not.toBeInTheDocument();
  });

  it('shows time inputs after toggling allDay off', () => {
    renderForm({ initialHour: null });
    fireEvent.click(screen.getByLabelText(/all day/i));
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Pre-fill from props
// ---------------------------------------------------------------------------

describe('pre-fill from props', () => {
  it('pre-fills startAt from initialDate + initialHour', () => {
    renderForm({ initialHour: 9 });
    const startInput = screen.getByLabelText(/start time/i);
    expect(startInput).toHaveValue('2026-05-08T09:00');
  });

  it('pre-fills endAt as startAt + 1 hour', () => {
    renderForm({ initialHour: 9 });
    const endInput = screen.getByLabelText(/end time/i);
    expect(endInput).toHaveValue('2026-05-08T10:00');
  });

  it('handles hour 0 (midnight) correctly', () => {
    renderForm({ initialHour: 0 });
    const startInput = screen.getByLabelText(/start time/i);
    expect(startInput).toHaveValue('2026-05-08T00:00');
  });

  it('pre-fills endAt one hour ahead when startAt is 23:00', () => {
    renderForm({ initialHour: 23 });
    const endInput = screen.getByLabelText(/end time/i);
    // 23 + 1 = next day 00:00
    expect(endInput).toHaveValue('2026-05-09T00:00');
  });
});

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

describe('cancel button', () => {
  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call createEvent when Cancel is clicked', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Validation — empty title
// ---------------------------------------------------------------------------

describe('title validation', () => {
  it('shows an inline title error when Save is clicked with empty title', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('does not call createEvent when title is empty', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('shows an inline title error when Expand is clicked with empty title', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /expand event editor/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('does not call createEvent when Expand is clicked with empty title', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /expand event editor/i }));
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('clears the title error once the user types a non-empty title', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Save (happy path)
// ---------------------------------------------------------------------------

describe('save action', () => {
  it('calls createEvent with correct payload on Save', async () => {
    renderForm({ initialHour: 9 });

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    await waitFor(() => expect(mockCreateEvent).toHaveBeenCalledTimes(1));
    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Event', allDay: false })
    );
  });

  it('calls onSave with the created event after Save', async () => {
    const { onSave } = renderForm({ initialHour: 9 });

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(CREATED_EVENT);
  });

  it('calls createEvent with allDay:true payload when allDay is toggled on', async () => {
    renderForm({ initialHour: 9 });

    fireEvent.click(screen.getByLabelText(/all day/i)); // toggle allDay on
    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'Holiday' } });
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    await waitFor(() => expect(mockCreateEvent).toHaveBeenCalledTimes(1));
    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Holiday', allDay: true })
    );
  });
});

// ---------------------------------------------------------------------------
// Expand (happy path)
// ---------------------------------------------------------------------------

describe('expand action', () => {
  it('calls createEvent on Expand', async () => {
    renderForm({ initialHour: 9 });

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByRole('button', { name: /expand event editor/i }));

    await waitFor(() => expect(mockCreateEvent).toHaveBeenCalledTimes(1));
  });

  it('calls onExpand with the created event id after Expand', async () => {
    const { onExpand } = renderForm({ initialHour: 9 });

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByRole('button', { name: /expand event editor/i }));

    await waitFor(() => expect(onExpand).toHaveBeenCalledTimes(1));
    expect(onExpand).toHaveBeenCalledWith(CREATED_EVENT.id);
  });
});

// ---------------------------------------------------------------------------
// API error handling
// ---------------------------------------------------------------------------

describe('API error handling', () => {
  it('shows an inline error on Save when createEvent rejects', async () => {
    mockCreateEvent = vi.fn().mockRejectedValue(new Error('Server error'));
    renderForm({ initialHour: 9 });

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    await waitFor(() =>
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    );
  });

  it('does not call onSave when createEvent rejects', async () => {
    mockCreateEvent = vi.fn().mockRejectedValue(new Error('Network error'));
    const { onSave } = renderForm({ initialHour: 9 });

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByRole('button', { name: /save event/i }));

    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows an inline error on Expand when createEvent rejects', async () => {
    mockCreateEvent = vi.fn().mockRejectedValue(new Error('Timeout'));
    renderForm({ initialHour: 9 });

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByRole('button', { name: /expand event editor/i }));

    await waitFor(() =>
      expect(screen.getByText(/timeout/i)).toBeInTheDocument()
    );
  });

  it('does not call onExpand when createEvent rejects', async () => {
    mockCreateEvent = vi.fn().mockRejectedValue(new Error('Timeout'));
    const { onExpand } = renderForm({ initialHour: 9 });

    fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'My Event' } });
    fireEvent.click(screen.getByRole('button', { name: /expand event editor/i }));

    await waitFor(() => expect(screen.getByText(/timeout/i)).toBeInTheDocument());
    expect(onExpand).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('loading / isSaving state', () => {
  it('disables the Save button while isSaving is true', () => {
    mockIsSaving = true;
    renderForm();
    expect(screen.getByRole('button', { name: /save event/i })).toBeDisabled();
  });

  it('disables the Expand button while isSaving is true', () => {
    mockIsSaving = true;
    renderForm();
    expect(screen.getByRole('button', { name: /expand event editor/i })).toBeDisabled();
  });

  it('shows "Saving…" label on Save button while isSaving is true', () => {
    mockIsSaving = true;
    renderForm();
    expect(screen.getByRole('button', { name: /save event/i })).toHaveTextContent('Saving…');
  });

  it('shows "Saving…" label on Expand button while isSaving is true', () => {
    mockIsSaving = true;
    renderForm();
    expect(screen.getByRole('button', { name: /expand event editor/i })).toHaveTextContent('Saving…');
  });
});

// ---------------------------------------------------------------------------
// ColorPicker default
// ---------------------------------------------------------------------------

describe('color picker', () => {
  it('defaults to blue color selected', () => {
    renderForm();
    const blueBtn = screen.getByRole('button', { name: /select blue color/i });
    expect(blueBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
