/**
 * Unit tests for client/src/components/DayColumn.jsx.
 *
 * Covers:
 *   - Renders exactly 24 slot rows.
 *   - Each slot row has the h-[60px] Tailwind class.
 *   - Clicking a slot calls onSlotClick with (date, hour).
 *   - Keyboard Enter / Space on a slot fires onSlotClick.
 *   - A timed event matching the column date is rendered as an EventChip.
 *   - A timed event on a different date is NOT rendered.
 *   - An all-day event (allDay=true) is NOT rendered.
 *   - A timed task (dueTime present) matching the column date is rendered as a TaskChip.
 *   - A timeless task (dueTime absent) is NOT rendered.
 *   - Clicking an EventChip calls onEventClick with the event.
 *   - Clicking the EventChip delete button calls onEventDelete with the event id.
 *   - Clicking a TaskChip calls onTaskClick with the task.
 *   - Two overlapping events render side-by-side (lane=0 and lane=1).
 *   - The column root has the `relative` and `overflow-hidden` classes.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DayColumn from '../../client/src/components/DayColumn.jsx';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Friday 8 May 2026 at local midnight. */
const COL_DATE = new Date(2026, 4, 8, 0, 0, 0); // 2026-05-08

/** A timed event on the column date (9:00–9:30). */
const TIMED_EVENT = {
  id: 1,
  title: 'Team Standup',
  startAt: '2026-05-08T09:00:00',
  endAt: '2026-05-08T09:30:00',
  color: 'blue',
  allDay: false,
};

/** A timed event on a different date — should NOT render. */
const OTHER_DATE_EVENT = {
  id: 2,
  title: 'Other Day Event',
  startAt: '2026-05-09T10:00:00',
  endAt: '2026-05-09T11:00:00',
  color: 'red',
  allDay: false,
};

/** An all-day event — should NOT render in the timed column. */
const ALL_DAY_EVENT = {
  id: 3,
  title: 'Company Holiday',
  startAt: '2026-05-08T00:00:00',
  endAt: '2026-05-09T00:00:00',
  color: 'green',
  allDay: true,
};

/** A timed task on the column date. */
const TIMED_TASK = {
  id: 101,
  title: 'Submit Report',
  dueDate: '2026-05-08',
  dueTime: '14:00',
  status: 'open',
};

/** A timeless task (no dueTime) — should NOT render in the timed column. */
const TIMELESS_TASK = {
  id: 102,
  title: 'Review PRs',
  dueDate: '2026-05-08',
  dueTime: null,
  status: 'open',
};

/** A second overlapping event on the column date (9:00–9:45). */
const OVERLAPPING_EVENT = {
  id: 4,
  title: 'Design Review',
  startAt: '2026-05-08T09:00:00',
  endAt: '2026-05-08T09:45:00',
  color: 'purple',
  allDay: false,
};

/**
 * Render DayColumn with sensible defaults plus optional overrides.
 *
 * @param {object} [propOverrides] - Optional prop overrides.
 * @returns {{ onSlotClick, onEventClick, onTaskClick, onEventDelete, container }}
 */
function renderColumn(propOverrides = {}) {
  const onSlotClick = propOverrides.onSlotClick ?? vi.fn();
  const onEventClick = propOverrides.onEventClick ?? vi.fn();
  const onTaskClick = propOverrides.onTaskClick ?? vi.fn();
  const onEventDelete = propOverrides.onEventDelete ?? vi.fn();
  const date = propOverrides.date ?? COL_DATE;
  const items = propOverrides.items ?? [];

  const { container } = render(
    <DayColumn
      date={date}
      items={items}
      onSlotClick={onSlotClick}
      onEventClick={onEventClick}
      onTaskClick={onTaskClick}
      onEventDelete={onEventDelete}
    />
  );

  return { onSlotClick, onEventClick, onTaskClick, onEventDelete, container };
}

// ---------------------------------------------------------------------------
// Structural tests
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('renders exactly 24 slot rows', () => {
    renderColumn();
    const slots = screen.getAllByRole('button', { name: /^\d{1,2}:00$/ });
    expect(slots).toHaveLength(24);
  });

  it('every slot row has the h-[60px] class', () => {
    const { container } = renderColumn();
    // The slot rows are the direct children of the root div.
    const root = container.firstChild;
    // There may be additional non-slot children (chips); only count slots by label.
    const slots = screen.getAllByRole('button', { name: /^\d{1,2}:00$/ });
    for (const slot of slots) {
      expect(slot).toHaveClass('h-[60px]');
    }
    expect(slots.length).toBe(24);
  });

  it('root element has the `relative` class', () => {
    const { container } = renderColumn();
    expect(container.firstChild).toHaveClass('relative');
  });

  it('root element has the `overflow-hidden` class', () => {
    const { container } = renderColumn();
    expect(container.firstChild).toHaveClass('overflow-hidden');
  });

  it('renders without error when items is empty', () => {
    expect(() => renderColumn({ items: [] })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Slot click interactions
// ---------------------------------------------------------------------------

describe('slot click interactions', () => {
  it('calls onSlotClick with (date, 0) when the midnight slot is clicked', () => {
    const onSlotClick = vi.fn();
    renderColumn({ onSlotClick });
    const midnightSlot = screen.getByRole('button', { name: '0:00' });
    fireEvent.click(midnightSlot);
    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick).toHaveBeenCalledWith(COL_DATE, 0);
  });

  it('calls onSlotClick with (date, 9) when the 9 AM slot is clicked', () => {
    const onSlotClick = vi.fn();
    renderColumn({ onSlotClick });
    const slot9 = screen.getByRole('button', { name: '9:00' });
    fireEvent.click(slot9);
    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick).toHaveBeenCalledWith(COL_DATE, 9);
  });

  it('calls onSlotClick when Enter is pressed on a slot', () => {
    const onSlotClick = vi.fn();
    renderColumn({ onSlotClick });
    const slot = screen.getByRole('button', { name: '12:00' });
    fireEvent.keyDown(slot, { key: 'Enter' });
    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick).toHaveBeenCalledWith(COL_DATE, 12);
  });

  it('calls onSlotClick when Space is pressed on a slot', () => {
    const onSlotClick = vi.fn();
    renderColumn({ onSlotClick });
    const slot = screen.getByRole('button', { name: '15:00' });
    fireEvent.keyDown(slot, { key: ' ' });
    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick).toHaveBeenCalledWith(COL_DATE, 15);
  });

  it('does not call onSlotClick for unrelated keys', () => {
    const onSlotClick = vi.fn();
    renderColumn({ onSlotClick });
    const slot = screen.getByRole('button', { name: '8:00' });
    fireEvent.keyDown(slot, { key: 'Tab' });
    expect(onSlotClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Event rendering
// ---------------------------------------------------------------------------

describe('event rendering', () => {
  it('renders a timed event matching the column date', () => {
    renderColumn({ items: [TIMED_EVENT] });
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
  });

  it('does NOT render a timed event on a different date', () => {
    renderColumn({ items: [OTHER_DATE_EVENT] });
    expect(screen.queryByText('Other Day Event')).not.toBeInTheDocument();
  });

  it('does NOT render an all-day event (allDay=true)', () => {
    renderColumn({ items: [ALL_DAY_EVENT] });
    expect(screen.queryByText('Company Holiday')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Task rendering
// ---------------------------------------------------------------------------

describe('task rendering', () => {
  it('renders a timed task matching the column date', () => {
    renderColumn({ items: [TIMED_TASK] });
    expect(screen.getByText('Submit Report')).toBeInTheDocument();
  });

  it('does NOT render a timeless task (dueTime absent)', () => {
    renderColumn({ items: [TIMELESS_TASK] });
    expect(screen.queryByText('Review PRs')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Interaction callbacks
// ---------------------------------------------------------------------------

describe('interaction callbacks', () => {
  it('calls onEventClick with the event when an EventChip is clicked', () => {
    const onEventClick = vi.fn();
    renderColumn({ items: [TIMED_EVENT], onEventClick });
    fireEvent.click(screen.getByRole('button', { name: /Team Standup/i }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: TIMED_EVENT.id }));
  });

  it('calls onEventDelete with the event id when the delete button is clicked', () => {
    const onEventDelete = vi.fn();
    renderColumn({ items: [TIMED_EVENT], onEventDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onEventDelete).toHaveBeenCalledTimes(1);
    expect(onEventDelete).toHaveBeenCalledWith(TIMED_EVENT.id);
  });

  it('calls onTaskClick with the task when a TaskChip is clicked', () => {
    const onTaskClick = vi.fn();
    renderColumn({ items: [TIMED_TASK], onTaskClick });
    fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: TIMED_TASK.id }));
  });
});

// ---------------------------------------------------------------------------
// Overlap layout
// ---------------------------------------------------------------------------

describe('overlap layout', () => {
  it('renders two overlapping events side by side (width narrower than 100%)', () => {
    renderColumn({ items: [TIMED_EVENT, OVERLAPPING_EVENT] });

    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.getByText('Design Review')).toBeInTheDocument();

    // Both chips should have a width of 50% (1/2 lanes).
    const standupChip = screen.getByRole('button', { name: /Team Standup/i });
    const reviewChip = screen.getByRole('button', { name: /Design Review/i });

    expect(standupChip).toHaveStyle({ width: '50%' });
    expect(reviewChip).toHaveStyle({ width: '50%' });
  });

  it('renders two overlapping events with different left offsets', () => {
    renderColumn({ items: [TIMED_EVENT, OVERLAPPING_EVENT] });

    const standupChip = screen.getByRole('button', { name: /Team Standup/i });
    const reviewChip = screen.getByRole('button', { name: /Design Review/i });

    // Lane 0 → left: 0%; Lane 1 → left: 50%.
    const leftValues = [standupChip.style.left, reviewChip.style.left];
    expect(leftValues).toContain('0%');
    expect(leftValues).toContain('50%');
  });

  it('renders a single (non-overlapping) event at full width', () => {
    renderColumn({ items: [TIMED_EVENT] });
    const chip = screen.getByRole('button', { name: /Team Standup/i });
    expect(chip).toHaveStyle({ width: '100%' });
  });
});

// ---------------------------------------------------------------------------
// Chip positioning
// ---------------------------------------------------------------------------

describe('chip positioning', () => {
  it('positions an event chip at the correct top offset', () => {
    // TIMED_EVENT starts at 09:00 → top = 9 * 60 = 540px.
    renderColumn({ items: [TIMED_EVENT] });
    const chip = screen.getByRole('button', { name: /Team Standup/i });
    expect(chip).toHaveStyle({ top: '540px' });
  });

  it('gives a timed task chip a minimum height of 30px', () => {
    // Tasks are zero-duration; height should be clamped to MIN_CHIP_HEIGHT_PX.
    renderColumn({ items: [TIMED_TASK] });
    const chip = screen.getByRole('button', { name: /Submit Report/i });
    expect(chip).toHaveStyle({ height: '30px' });
  });

  it('positions a chip with style.position absolute', () => {
    renderColumn({ items: [TIMED_EVENT] });
    const chip = screen.getByRole('button', { name: /Team Standup/i });
    expect(chip).toHaveStyle({ position: 'absolute' });
  });
});
