/**
 * Unit tests for client/src/components/EventChip.jsx.
 *
 * Covers:
 *   - Renders the event title.
 *   - Timed events show a formatted time range.
 *   - All-day events do not show a time range.
 *   - Background class is derived from event.color.
 *   - Unknown color falls back to bg-blue-500.
 *   - Clicking the chip body calls onClick.
 *   - Clicking the delete button calls onDelete (not onClick).
 *   - Keyboard Enter / Space on chip body triggers onClick.
 *   - style prop is spread onto the root element.
 *   - role="button" and tabIndex={0} present for accessibility.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventChip from '../../client/src/components/EventChip.jsx';

/** A timed sample event used as the default across most tests. */
const SAMPLE_EVENT = {
  id: 1,
  title: 'Team Standup',
  startAt: '2026-05-08T09:00:00',
  endAt: '2026-05-08T09:30:00',
  color: 'blue',
  allDay: false,
};

/** An all-day sample event. */
const ALL_DAY_EVENT = {
  id: 2,
  title: 'Company Holiday',
  startAt: '2026-05-08T00:00:00',
  endAt: '2026-05-09T00:00:00',
  color: 'green',
  allDay: true,
};

/**
 * Render EventChip with sensible defaults, merging any event or prop overrides.
 *
 * @param {object} [eventOverrides]  - Fields merged into SAMPLE_EVENT.
 * @param {object} [propOverrides]   - Additional component props (onClick, onDelete, style).
 * @returns {{ onClick: import('vitest').Mock, onDelete: import('vitest').Mock }}
 */
function renderChip(eventOverrides = {}, propOverrides = {}) {
  const onClick = propOverrides.onClick ?? vi.fn();
  const onDelete = propOverrides.onDelete ?? vi.fn();
  const event = { ...SAMPLE_EVENT, ...eventOverrides };
  render(
    <EventChip
      event={event}
      onClick={onClick}
      onDelete={onDelete}
      style={propOverrides.style}
    />
  );
  return { onClick, onDelete };
}

// ---------------------------------------------------------------------------
// Title rendering
// ---------------------------------------------------------------------------

describe('title rendering', () => {
  it('renders the event title', () => {
    renderChip();
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Time range — timed events
// ---------------------------------------------------------------------------

describe('time range — timed events', () => {
  it('renders a time range for timed events', () => {
    renderChip();
    expect(screen.getByText('9:00–9:30 AM')).toBeInTheDocument();
  });

  it('handles AM-to-PM crossing (e.g. 11:00 AM – 1:00 PM)', () => {
    renderChip({ startAt: '2026-05-08T11:00:00', endAt: '2026-05-08T13:00:00' });
    expect(screen.getByText('11:00 AM–1:00 PM')).toBeInTheDocument();
  });

  it('formats minutes with zero-padding (e.g. 9:05)', () => {
    renderChip({ startAt: '2026-05-08T09:05:00', endAt: '2026-05-08T09:35:00' });
    expect(screen.getByText('9:05–9:35 AM')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// All-day events
// ---------------------------------------------------------------------------

describe('all-day events', () => {
  it('does not render a time range for all-day events', () => {
    render(
      <EventChip
        event={ALL_DAY_EVENT}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByText(/AM|PM/)).not.toBeInTheDocument();
  });

  it('renders the all-day event title', () => {
    render(
      <EventChip
        event={ALL_DAY_EVENT}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Background color class
// ---------------------------------------------------------------------------

describe('background color class', () => {
  it('applies bg-blue-500 for color="blue"', () => {
    renderChip({ color: 'blue' });
    expect(screen.getByRole('button', { name: /Team Standup/i })).toHaveClass('bg-blue-500');
  });

  it('applies bg-green-500 for color="green"', () => {
    renderChip({ color: 'green' });
    expect(screen.getByRole('button', { name: /Team Standup/i })).toHaveClass('bg-green-500');
  });

  it('applies bg-red-500 for color="red"', () => {
    renderChip({ color: 'red' });
    expect(screen.getByRole('button', { name: /Team Standup/i })).toHaveClass('bg-red-500');
  });

  it('falls back to bg-blue-500 for an unknown color key', () => {
    renderChip({ color: 'unknown-color' });
    expect(screen.getByRole('button', { name: /Team Standup/i })).toHaveClass('bg-blue-500');
  });
});

// ---------------------------------------------------------------------------
// Click interactions
// ---------------------------------------------------------------------------

describe('click interactions', () => {
  it('calls onClick when the chip body is clicked', () => {
    const { onClick } = renderChip();
    fireEvent.click(screen.getByRole('button', { name: /Team Standup/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete button is clicked', () => {
    const { onDelete } = renderChip();
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when the delete button is clicked', () => {
    const { onClick } = renderChip();
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Keyboard interactions
// ---------------------------------------------------------------------------

describe('keyboard interactions', () => {
  it('calls onClick when Enter is pressed on the chip', () => {
    const { onClick } = renderChip();
    fireEvent.keyDown(screen.getByRole('button', { name: /Team Standup/i }), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space is pressed on the chip', () => {
    const { onClick } = renderChip();
    fireEvent.keyDown(screen.getByRole('button', { name: /Team Standup/i }), { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick for unrelated keys', () => {
    const { onClick } = renderChip();
    fireEvent.keyDown(screen.getByRole('button', { name: /Team Standup/i }), { key: 'Tab' });
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// style prop
// ---------------------------------------------------------------------------

describe('style prop', () => {
  it('applies the style prop to the root element', () => {
    renderChip({}, { style: { position: 'absolute', top: '60px', height: '30px' } });
    const chip = screen.getByRole('button', { name: /Team Standup/i });
    expect(chip).toHaveStyle({ position: 'absolute', top: '60px', height: '30px' });
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('accessibility', () => {
  it('has role="button" on the chip root', () => {
    renderChip();
    expect(screen.getByRole('button', { name: /Team Standup/i })).toBeInTheDocument();
  });

  it('has tabIndex={0} on the chip root', () => {
    renderChip();
    expect(screen.getByRole('button', { name: /Team Standup/i })).toHaveAttribute('tabindex', '0');
  });
});
