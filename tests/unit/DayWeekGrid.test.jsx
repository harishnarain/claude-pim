/**
 * Unit tests for client/src/components/DayWeekGrid.jsx.
 *
 * Covers:
 *   - Renders the AllDayBanner.
 *   - Renders TimeColumn.
 *   - Renders one DayColumn per entry in `columns`.
 *   - Items are routed to the correct DayColumn by date.
 *   - Items with no matching date do not appear.
 *   - Scroll container scrolls to 8 AM (480 px) on mount.
 *   - onSlotClick, onEventClick, onTaskClick, onEventDelete callbacks propagate.
 *   - Works with an empty items array.
 *   - Works with an empty columns array.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DayWeekGrid from '../../client/src/components/DayWeekGrid.jsx';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Column dates: Friday and Saturday, May 2026. */
const COL_FRI = new Date(2026, 4, 8, 0, 0, 0); // 2026-05-08
const COL_SAT = new Date(2026, 4, 9, 0, 0, 0); // 2026-05-09
const COLUMNS = [COL_FRI, COL_SAT];

/** A timed event on Friday. */
const TIMED_EVENT_FRI = {
  id: 1,
  title: 'Team Standup',
  startAt: '2026-05-08T09:00:00',
  endAt: '2026-05-08T09:30:00',
  color: 'blue',
  allDay: false,
};

/** An all-day event on Friday. */
const ALL_DAY_EVENT_FRI = {
  id: 2,
  title: 'Company Holiday',
  startAt: '2026-05-08T00:00:00',
  endAt: '2026-05-09T00:00:00',
  color: 'green',
  allDay: true,
};

/** A timed task on Saturday. */
const TIMED_TASK_SAT = {
  id: 101,
  title: 'Submit Report',
  dueDate: '2026-05-09',
  dueTime: '14:00',
  status: 'open',
};

/** A timeless task on Friday (no dueTime). */
const TIMELESS_TASK_FRI = {
  id: 102,
  title: 'Review PRs',
  dueDate: '2026-05-08',
  dueTime: null,
  status: 'open',
};

/** An event on a date NOT in the columns array — should not appear. */
const UNRELATED_EVENT = {
  id: 3,
  title: 'Unrelated Meeting',
  startAt: '2026-05-10T10:00:00',
  endAt: '2026-05-10T11:00:00',
  color: 'red',
  allDay: false,
};

/**
 * Render DayWeekGrid with sensible defaults merged with optional overrides.
 *
 * @param {object} [propOverrides] - Optional prop overrides.
 * @returns {{ onSlotClick, onEventClick, onTaskClick, onEventDelete, container }}
 */
function renderGrid(propOverrides = {}) {
  const onSlotClick = propOverrides.onSlotClick ?? vi.fn();
  const onEventClick = propOverrides.onEventClick ?? vi.fn();
  const onTaskClick = propOverrides.onTaskClick ?? vi.fn();
  const onEventDelete = propOverrides.onEventDelete ?? vi.fn();
  const columns = propOverrides.columns ?? COLUMNS;
  const items = propOverrides.items ?? [];

  const { container } = render(
    <DayWeekGrid
      columns={columns}
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
  it('renders the AllDayBanner landmark', () => {
    renderGrid();
    expect(screen.getByLabelText('All-day events')).toBeInTheDocument();
  });

  it('renders 24 hour-label rows from TimeColumn', () => {
    renderGrid();
    const labels = screen.getAllByText(/\d{1,2}\s+(AM|PM)/i);
    expect(labels).toHaveLength(24);
  });

  it('renders exactly 24 slot rows per DayColumn (2 columns = 48 total slots)', () => {
    renderGrid({ columns: COLUMNS });
    const slots = screen.getAllByRole('button', { name: /^\d{1,2}:00$/ });
    // 2 DayColumns × 24 slots each = 48
    expect(slots).toHaveLength(48);
  });

  it('renders exactly 24 slot rows for a single-column (Day) view', () => {
    renderGrid({ columns: [COL_FRI] });
    const slots = screen.getAllByRole('button', { name: /^\d{1,2}:00$/ });
    expect(slots).toHaveLength(24);
  });

  it('renders without error when columns is empty', () => {
    expect(() => renderGrid({ columns: [] })).not.toThrow();
  });

  it('renders without error when items is empty', () => {
    expect(() => renderGrid({ items: [] })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Item routing
// ---------------------------------------------------------------------------

describe('item routing', () => {
  it('routes a timed event to the correct DayColumn by startAt date', () => {
    renderGrid({ items: [TIMED_EVENT_FRI] });
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
  });

  it('routes an all-day event to the AllDayBanner', () => {
    renderGrid({ items: [ALL_DAY_EVENT_FRI] });
    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
  });

  it('routes a timeless task to the AllDayBanner', () => {
    renderGrid({ items: [TIMELESS_TASK_FRI] });
    expect(screen.getByText('Review PRs')).toBeInTheDocument();
  });

  it('routes a timed task to the correct DayColumn by dueDate', () => {
    renderGrid({ items: [TIMED_TASK_SAT] });
    expect(screen.getByText('Submit Report')).toBeInTheDocument();
  });

  it('does not render an item whose date is outside the visible columns', () => {
    renderGrid({ items: [UNRELATED_EVENT] });
    expect(screen.queryByText('Unrelated Meeting')).not.toBeInTheDocument();
  });

  it('renders multiple items across different columns', () => {
    renderGrid({ items: [TIMED_EVENT_FRI, TIMED_TASK_SAT] });
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.getByText('Submit Report')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Scroll-to-8am on mount
// ---------------------------------------------------------------------------

describe('scroll to 8 AM on mount', () => {
  it('sets scrollTop to 480 on the scroll container after mounting', () => {
    const { container } = renderGrid();
    // The scrollable div is the second child of the root (after AllDayBanner).
    const root = container.firstChild;
    const scrollContainer = root.children[1];
    expect(scrollContainer.scrollTop).toBe(480);
  });
});

// ---------------------------------------------------------------------------
// Callback propagation
// ---------------------------------------------------------------------------

describe('callback propagation', () => {
  it('propagates onSlotClick when a slot is clicked', () => {
    const onSlotClick = vi.fn();
    renderGrid({ columns: [COL_FRI], onSlotClick });
    const slot9 = screen.getByRole('button', { name: '9:00' });
    fireEvent.click(slot9);
    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick).toHaveBeenCalledWith(COL_FRI, 9);
  });

  it('propagates onEventClick when a timed EventChip is clicked', () => {
    const onEventClick = vi.fn();
    renderGrid({ items: [TIMED_EVENT_FRI], onEventClick });
    fireEvent.click(screen.getByRole('button', { name: /Team Standup/i }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: TIMED_EVENT_FRI.id }));
  });

  it('propagates onEventDelete when a timed EventChip delete button is clicked', () => {
    const onEventDelete = vi.fn();
    renderGrid({ items: [TIMED_EVENT_FRI], onEventDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onEventDelete).toHaveBeenCalledTimes(1);
    expect(onEventDelete).toHaveBeenCalledWith(TIMED_EVENT_FRI.id);
  });

  it('propagates onTaskClick when a timed TaskChip is clicked', () => {
    const onTaskClick = vi.fn();
    renderGrid({ items: [TIMED_TASK_SAT], onTaskClick });
    fireEvent.click(screen.getByRole('button', { name: /Submit Report/i }));
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: TIMED_TASK_SAT.id }));
  });

  it('propagates onEventClick from the AllDayBanner when an all-day EventChip is clicked', () => {
    const onEventClick = vi.fn();
    renderGrid({ items: [ALL_DAY_EVENT_FRI], onEventClick });
    fireEvent.click(screen.getByRole('button', { name: /Company Holiday/i }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(ALL_DAY_EVENT_FRI);
  });

  it('propagates onTaskClick from the AllDayBanner when a timeless TaskChip is clicked', () => {
    const onTaskClick = vi.fn();
    renderGrid({ items: [TIMELESS_TASK_FRI], onTaskClick });
    fireEvent.click(screen.getByRole('button', { name: /Review PRs/i }));
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(TIMELESS_TASK_FRI);
  });
});
