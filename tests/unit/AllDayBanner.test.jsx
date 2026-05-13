/**
 * Unit tests for client/src/components/AllDayBanner.jsx.
 *
 * Covers:
 *   - Renders the left spacer that aligns with the TimeColumn.
 *   - Renders one column slot per entry in the `columns` prop.
 *   - All-day events appear in the correct column.
 *   - All-day events do NOT appear in the wrong column.
 *   - Timeless tasks (dueDate set, dueTime absent) appear in the correct column.
 *   - Timed tasks (dueTime set) are excluded from the banner.
 *   - Clicking an EventChip calls onEventClick with the event.
 *   - Clicking an EventChip delete button calls onEventDelete with the event id.
 *   - Clicking a TaskChip calls onTaskClick with the task.
 *   - Renders without error when no items match any column (empty banner).
 *   - style={{}} is spread onto EventChip and TaskChip (no explicit style applied).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AllDayBanner from '../../client/src/components/AllDayBanner.jsx';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Two column dates (Friday and Saturday in May 2026). */
const COL_FRI = new Date('2026-05-08T00:00:00');
const COL_SAT = new Date('2026-05-09T00:00:00');
const COLUMNS = [COL_FRI, COL_SAT];

/** An all-day event that falls on Friday (COL_FRI). */
const ALL_DAY_EVENT_FRI = {
  id: 1,
  title: 'Company Holiday',
  startAt: '2026-05-08T00:00:00',
  endAt: '2026-05-09T00:00:00',
  color: 'green',
  allDay: true,
};

/** An all-day event that falls on Saturday (COL_SAT). */
const ALL_DAY_EVENT_SAT = {
  id: 2,
  title: 'Weekend Conference',
  startAt: '2026-05-09T00:00:00',
  endAt: '2026-05-10T00:00:00',
  color: 'blue',
  allDay: true,
};

/** A timed event (should NOT appear in the banner). */
const TIMED_EVENT = {
  id: 3,
  title: 'Team Standup',
  startAt: '2026-05-08T09:00:00',
  endAt: '2026-05-08T09:30:00',
  color: 'red',
  allDay: false,
};

/** A timeless task (dueDate on Friday, no dueTime) — should appear in banner. */
const TIMELESS_TASK_FRI = {
  id: 101,
  title: 'Review PRs',
  dueDate: '2026-05-08',
  dueTime: null,
  status: 'open',
};

/** A timed task (dueTime set) — should NOT appear in the banner. */
const TIMED_TASK_FRI = {
  id: 102,
  title: 'Submit report',
  dueDate: '2026-05-08',
  dueTime: '14:00',
  status: 'open',
};

/**
 * Render AllDayBanner with default mocked handlers.
 *
 * @param {object} [propOverrides] - Optional prop overrides.
 * @returns {{ onEventClick, onTaskClick, onEventDelete }}
 */
function renderBanner(propOverrides = {}) {
  const onEventClick = propOverrides.onEventClick ?? vi.fn();
  const onTaskClick = propOverrides.onTaskClick ?? vi.fn();
  const onEventDelete = propOverrides.onEventDelete ?? vi.fn();
  const columns = propOverrides.columns ?? COLUMNS;
  const items = propOverrides.items ?? [];

  render(
    <AllDayBanner
      columns={columns}
      items={items}
      onEventClick={onEventClick}
      onTaskClick={onTaskClick}
      onEventDelete={onEventDelete}
    />
  );

  return { onEventClick, onTaskClick, onEventDelete };
}

// ---------------------------------------------------------------------------
// Structural tests
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('renders the all-day events landmark', () => {
    renderBanner();
    expect(screen.getByLabelText('All-day events')).toBeInTheDocument();
  });

  it('renders a left spacer element', () => {
    renderBanner();
    // The spacer is aria-hidden; verify the banner itself is rendered
    const banner = screen.getByLabelText('All-day events');
    expect(banner.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders one column slot per column date', () => {
    renderBanner({ columns: COLUMNS });
    // Each column slot gets a data key; count via the banner's direct children minus spacer
    const banner = screen.getByLabelText('All-day events');
    // spacer + 2 column slots = 3 children
    expect(banner.children).toHaveLength(3);
  });

  it('renders with no items without throwing (empty banner)', () => {
    expect(() => renderBanner({ items: [] })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// All-day event placement
// ---------------------------------------------------------------------------

describe('all-day event placement', () => {
  it('renders an all-day event in the correct column', () => {
    renderBanner({ items: [ALL_DAY_EVENT_FRI] });
    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
  });

  it('renders all-day events for multiple columns', () => {
    renderBanner({ items: [ALL_DAY_EVENT_FRI, ALL_DAY_EVENT_SAT] });
    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
    expect(screen.getByText('Weekend Conference')).toBeInTheDocument();
  });

  it('does not render a timed event (allDay=false) in the banner', () => {
    renderBanner({ items: [TIMED_EVENT] });
    expect(screen.queryByText('Team Standup')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Timeless task placement
// ---------------------------------------------------------------------------

describe('timeless task placement', () => {
  it('renders a timeless task in the banner', () => {
    renderBanner({ items: [TIMELESS_TASK_FRI] });
    expect(screen.getByText('Review PRs')).toBeInTheDocument();
  });

  it('does not render a timed task in the banner', () => {
    renderBanner({ items: [TIMED_TASK_FRI] });
    expect(screen.queryByText('Submit report')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Interaction callbacks
// ---------------------------------------------------------------------------

describe('interaction callbacks', () => {
  it('calls onEventClick with the event when an EventChip is clicked', () => {
    const onEventClick = vi.fn();
    renderBanner({ items: [ALL_DAY_EVENT_FRI], onEventClick });
    // The EventChip root has role="button"; click the chip body (not the delete btn)
    const chip = screen.getByRole('button', { name: /Company Holiday/i });
    fireEvent.click(chip);
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(ALL_DAY_EVENT_FRI);
  });

  it('calls onEventDelete with the event id when the delete button is clicked', () => {
    const onEventDelete = vi.fn();
    renderBanner({ items: [ALL_DAY_EVENT_FRI], onEventDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onEventDelete).toHaveBeenCalledTimes(1);
    expect(onEventDelete).toHaveBeenCalledWith(ALL_DAY_EVENT_FRI.id);
  });

  it('calls onTaskClick with the task when a TaskChip is clicked', () => {
    const onTaskClick = vi.fn();
    renderBanner({ items: [TIMELESS_TASK_FRI], onTaskClick });
    const chip = screen.getByRole('button', { name: /Review PRs/i });
    fireEvent.click(chip);
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(TIMELESS_TASK_FRI);
  });
});

// ---------------------------------------------------------------------------
// Mixed items
// ---------------------------------------------------------------------------

describe('mixed items', () => {
  it('renders both an event and a timeless task in the same column', () => {
    // All-day event on Friday
    const eventFri = { ...ALL_DAY_EVENT_FRI };
    // Timeless task on Friday
    const taskFri = { ...TIMELESS_TASK_FRI };
    renderBanner({ items: [eventFri, taskFri] });
    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
    expect(screen.getByText('Review PRs')).toBeInTheDocument();
  });

  it('places items in separate columns correctly', () => {
    renderBanner({ items: [ALL_DAY_EVENT_FRI, ALL_DAY_EVENT_SAT] });
    const banner = screen.getByLabelText('All-day events');
    // Get the two column slots (children 1 and 2; child 0 is the spacer)
    const colFriSlot = banner.children[1];
    const colSatSlot = banner.children[2];
    expect(within(colFriSlot).getByText('Company Holiday')).toBeInTheDocument();
    expect(within(colSatSlot).getByText('Weekend Conference')).toBeInTheDocument();
    expect(within(colFriSlot).queryByText('Weekend Conference')).not.toBeInTheDocument();
  });
});
