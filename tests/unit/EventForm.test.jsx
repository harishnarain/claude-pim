/**
 * Unit tests for client/src/components/EventForm.jsx.
 *
 * Covers:
 *   - All fields render as controlled inputs with correct values.
 *   - onChange fires for each field with only the changed field.
 *   - onBlur fires when any field loses focus.
 *   - Character counters for title (max 255) and description (max 10,000).
 *   - Title counter turns red at the limit; description counter turns red at the limit.
 *   - Inline title required error shows when title is empty.
 *   - Per-field API errors from `errors` prop are displayed below each field.
 *   - allDay toggle adjusts startAt to T00:00 and endAt to T23:59.
 *   - ColorPicker is wired to onChange.
 *   - Default values when event is null.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock ColorPicker so tests run without real Tailwind
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

import EventForm from '../../client/src/components/EventForm.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Default event object with all fields populated. */
const DEFAULT_EVENT = {
  title:       'Team Sync',
  description: 'Weekly team sync meeting',
  location:    'Conference Room A',
  allDay:      false,
  startAt:     '2026-06-01T09:00',
  endAt:       '2026-06-01T10:00',
  color:       'blue',
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Render EventForm with sensible defaults merged with any prop overrides.
 *
 * @param {object} [props]             - Prop overrides.
 * @param {object|null} [props.event]  - Event object (defaults to DEFAULT_EVENT).
 * @param {Function}    [props.onChange] - Change handler mock.
 * @param {Function}    [props.onBlur]   - Blur handler mock.
 * @param {object}      [props.errors]   - Per-field error strings.
 * @returns {{ onChange: import('vitest').Mock, onBlur: import('vitest').Mock }}
 */
function renderForm(props = {}) {
  const onChange = props.onChange ?? vi.fn();
  const onBlur   = props.onBlur   ?? vi.fn();
  render(
    <EventForm
      event={DEFAULT_EVENT}
      onChange={onChange}
      onBlur={onBlur}
      errors={{}}
      {...props}
    />
  );
  return { onChange, onBlur };
}

// ---------------------------------------------------------------------------
// Field rendering — values
// ---------------------------------------------------------------------------

describe('field rendering', () => {
  it('renders the title input', () => {
    renderForm();
    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
  });

  it('renders the description textarea', () => {
    renderForm();
    expect(screen.getByLabelText(/event description/i)).toBeInTheDocument();
  });

  it('renders the location input', () => {
    renderForm();
    expect(screen.getByLabelText(/event location/i)).toBeInTheDocument();
  });

  it('renders the all-day checkbox', () => {
    renderForm();
    expect(screen.getByLabelText(/all day/i)).toBeInTheDocument();
  });

  it('renders the start datetime input', () => {
    renderForm();
    expect(screen.getByLabelText(/event start/i)).toBeInTheDocument();
  });

  it('renders the end datetime input', () => {
    renderForm();
    expect(screen.getByLabelText(/event end/i)).toBeInTheDocument();
  });

  it('renders the ColorPicker', () => {
    renderForm();
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('displays the event title value', () => {
    renderForm();
    expect(screen.getByLabelText(/event title/i)).toHaveValue('Team Sync');
  });

  it('displays the event description value', () => {
    renderForm();
    expect(screen.getByLabelText(/event description/i)).toHaveValue('Weekly team sync meeting');
  });

  it('displays the event location value', () => {
    renderForm();
    expect(screen.getByLabelText(/event location/i)).toHaveValue('Conference Room A');
  });

  it('reflects allDay=false on the checkbox', () => {
    renderForm();
    expect(screen.getByLabelText(/all day/i)).not.toBeChecked();
  });

  it('reflects allDay=true on the checkbox', () => {
    renderForm({ event: { ...DEFAULT_EVENT, allDay: true } });
    expect(screen.getByLabelText(/all day/i)).toBeChecked();
  });

  it('displays the startAt value', () => {
    renderForm();
    expect(screen.getByLabelText(/event start/i)).toHaveValue('2026-06-01T09:00');
  });

  it('displays the endAt value', () => {
    renderForm();
    expect(screen.getByLabelText(/event end/i)).toHaveValue('2026-06-01T10:00');
  });

  it('uses default field values when event is null', () => {
    renderForm({ event: null });
    expect(screen.getByLabelText(/event title/i)).toHaveValue('');
    expect(screen.getByLabelText(/event description/i)).toHaveValue('');
    expect(screen.getByLabelText(/event location/i)).toHaveValue('');
    expect(screen.getByLabelText(/all day/i)).not.toBeChecked();
    expect(screen.getByLabelText(/event start/i)).toHaveValue('');
    expect(screen.getByLabelText(/event end/i)).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// onChange fires with only the changed field
// ---------------------------------------------------------------------------

describe('onChange handler', () => {
  it('calls onChange with { title } when the title input changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: 'New Event' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ title: 'New Event' });
  });

  it('calls onChange with { description } when the description textarea changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/event description/i), {
      target: { value: 'Updated description' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ description: 'Updated description' });
  });

  it('calls onChange with { location } when the location input changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/event location/i), {
      target: { value: 'Room B' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ location: 'Room B' });
  });

  it('calls onChange with { startAt } when the start input changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/event start/i), {
      target: { value: '2026-06-01T10:00' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ startAt: '2026-06-01T10:00' });
  });

  it('calls onChange with { endAt } when the end input changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/event end/i), {
      target: { value: '2026-06-01T11:00' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ endAt: '2026-06-01T11:00' });
  });

  it('calls onChange with only the changed field — not the full event object', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: 'Solo field' },
    });
    const arg = onChange.mock.calls[0][0];
    expect(Object.keys(arg)).toEqual(['title']);
  });

  it('calls onChange with { color } when a ColorPicker swatch is clicked', () => {
    const { onChange } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: /select red color/i }));
    expect(onChange).toHaveBeenCalledWith({ color: 'red' });
  });
});

// ---------------------------------------------------------------------------
// allDay toggle
// ---------------------------------------------------------------------------

describe('allDay toggle', () => {
  it('calls onChange with { allDay: true } when toggled on', () => {
    const { onChange } = renderForm({ event: { ...DEFAULT_EVENT, allDay: false } });
    fireEvent.click(screen.getByLabelText(/all day/i));
    expect(onChange).toHaveBeenCalledWith({ allDay: true });
  });

  it('calls onChange with { allDay: false } when toggled off', () => {
    const { onChange } = renderForm({ event: { ...DEFAULT_EVENT, allDay: true } });
    fireEvent.click(screen.getByLabelText(/all day/i));
    expect(onChange).toHaveBeenCalledWith({ allDay: false });
  });

  it('adjusts startAt to T00:00 when allDay is toggled on', () => {
    const { onChange } = renderForm({
      event: { ...DEFAULT_EVENT, allDay: false, startAt: '2026-06-01T09:00' },
    });
    fireEvent.click(screen.getByLabelText(/all day/i));
    expect(onChange).toHaveBeenCalledWith({ startAt: '2026-06-01T00:00' });
  });

  it('adjusts endAt to T23:59 when allDay is toggled on', () => {
    const { onChange } = renderForm({
      event: { ...DEFAULT_EVENT, allDay: false, endAt: '2026-06-01T10:00' },
    });
    fireEvent.click(screen.getByLabelText(/all day/i));
    expect(onChange).toHaveBeenCalledWith({ endAt: '2026-06-01T23:59' });
  });

  it('does not adjust times when allDay is toggled off', () => {
    const { onChange } = renderForm({ event: { ...DEFAULT_EVENT, allDay: true } });
    fireEvent.click(screen.getByLabelText(/all day/i));
    const calls = onChange.mock.calls.map((c) => c[0]);
    const startCall = calls.find((c) => 'startAt' in c);
    const endCall   = calls.find((c) => 'endAt'   in c);
    expect(startCall).toBeUndefined();
    expect(endCall).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// onBlur fires when any field loses focus
// ---------------------------------------------------------------------------

describe('onBlur handler', () => {
  it('calls onBlur when the title input loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/event title/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the description textarea loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/event description/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the location input loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/event location/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the all-day checkbox loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/all day/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the start input loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/event start/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the end input loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/event end/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Character counters — title (max 255)
// ---------------------------------------------------------------------------

describe('title character counter', () => {
  it('shows "x / 255" counter for the title', () => {
    renderForm({ event: { ...DEFAULT_EVENT, title: 'Hi' } });
    expect(screen.getByText('2 / 255')).toBeInTheDocument();
  });

  it('shows "0 / 255" when title is empty', () => {
    renderForm({ event: { ...DEFAULT_EVENT, title: '' } });
    expect(screen.getByText('0 / 255')).toBeInTheDocument();
  });

  it('counter turns red when title is at the 255 character limit', () => {
    const title = 'a'.repeat(255);
    renderForm({ event: { ...DEFAULT_EVENT, title } });
    const counter = screen.getByText('255 / 255');
    expect(counter).toHaveClass('text-red-600');
  });

  it('counter is grey when title is below the limit', () => {
    renderForm({ event: { ...DEFAULT_EVENT, title: 'short' } });
    const counter = screen.getByText('5 / 255');
    expect(counter).toHaveClass('text-gray-500');
  });
});

// ---------------------------------------------------------------------------
// Character counters — description (max 10,000)
// ---------------------------------------------------------------------------

describe('description character counter', () => {
  it('shows "x / 10,000" counter for the description', () => {
    renderForm({ event: { ...DEFAULT_EVENT, description: 'abc' } });
    expect(screen.getByText('3 / 10,000')).toBeInTheDocument();
  });

  it('shows "0 / 10,000" when description is empty', () => {
    renderForm({ event: { ...DEFAULT_EVENT, description: '' } });
    expect(screen.getByText('0 / 10,000')).toBeInTheDocument();
  });

  it('counter turns red when description reaches the 10,000 character limit', () => {
    const description = 'b'.repeat(10_000);
    renderForm({ event: { ...DEFAULT_EVENT, description } });
    const counter = screen.getByText('10,000 / 10,000');
    expect(counter).toHaveClass('text-red-600');
  });

  it('counter is grey when description is below the limit', () => {
    renderForm({ event: { ...DEFAULT_EVENT, description: 'hello' } });
    const counter = screen.getByText('5 / 10,000');
    expect(counter).toHaveClass('text-gray-500');
  });
});

// ---------------------------------------------------------------------------
// Title validation error (inline, no errors prop involved)
// ---------------------------------------------------------------------------

describe('title validation error (required)', () => {
  it('shows an inline error when title is empty', () => {
    renderForm({ event: { ...DEFAULT_EVENT, title: '' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('shows an inline error when title is only whitespace', () => {
    renderForm({ event: { ...DEFAULT_EVENT, title: '   ' } });
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('does not show a validation error when title is non-empty', () => {
    renderForm();
    expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument();
  });

  it('does not show the required error when event is null (title defaults to empty) but shows it', () => {
    renderForm({ event: null });
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Per-field API errors from the errors prop
// ---------------------------------------------------------------------------

describe('per-field error messages from errors prop', () => {
  it('shows errors.title below the title input', () => {
    renderForm({ errors: { title: 'Title must be unique.' } });
    expect(screen.getByText('Title must be unique.')).toBeInTheDocument();
  });

  it('shows errors.startAt below the start input', () => {
    renderForm({ errors: { startAt: 'Start time is invalid.' } });
    expect(screen.getByText('Start time is invalid.')).toBeInTheDocument();
  });

  it('shows errors.endAt below the end input', () => {
    renderForm({ errors: { endAt: 'End must be after start.' } });
    expect(screen.getByText('End must be after start.')).toBeInTheDocument();
  });

  it('shows errors.location below the location input', () => {
    renderForm({ errors: { location: 'Location too long.' } });
    expect(screen.getByText('Location too long.')).toBeInTheDocument();
  });

  it('shows errors.color below the color picker', () => {
    renderForm({ errors: { color: 'Invalid color.' } });
    expect(screen.getByText('Invalid color.')).toBeInTheDocument();
  });

  it('shows errors.description below the description textarea', () => {
    renderForm({ errors: { description: 'Description too long.' } });
    expect(screen.getByText('Description too long.')).toBeInTheDocument();
  });

  it('renders no error alerts when errors is empty', () => {
    renderForm({ event: { ...DEFAULT_EVENT }, errors: {} });
    // Only validate that the API-error alerts are absent; required-title error
    // may still appear since event has a non-empty title — it won't in this case.
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ColorPicker default color
// ---------------------------------------------------------------------------

describe('color picker', () => {
  it('defaults to blue when event.color is not set', () => {
    const eventNoColor = { ...DEFAULT_EVENT };
    delete eventNoColor.color;
    renderForm({ event: eventNoColor });
    expect(screen.getByRole('button', { name: /select blue color/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('reflects the event color on the picker', () => {
    renderForm({ event: { ...DEFAULT_EVENT, color: 'red' } });
    expect(screen.getByRole('button', { name: /select red color/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
