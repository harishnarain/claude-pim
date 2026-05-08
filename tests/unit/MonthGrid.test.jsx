/**
 * Unit tests for client/src/components/MonthGrid.jsx.
 *
 * Covers:
 *   - Renders 7 day-of-week header labels (Sun–Sat).
 *   - Renders 28–42 day cells for various months.
 *   - Today's date has the highlighted day number.
 *   - Days outside the current month render with a different style class.
 *   - Items appear in the correct cell by date (events by startAt, tasks by dueDate).
 *   - Items not in the visible month grid do not appear.
 *   - At most 3 chips are shown per cell; remaining items produce "+N more".
 *   - Clicking a cell calls onDayClick with the correct Date.
 *   - Clicking an EventChip calls onEventClick with the event object.
 *   - Clicking a TaskChip calls onTaskClick with the task object.
 *   - Clicking the delete button on an EventChip calls onEventDelete with the event id.
 *   - Clicking "+N more" calls onDayClick with the cell date.
 *   - Works with an empty items array.
 */

import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MonthGrid from '../../client/src/components/MonthGrid.jsx';

// ---------------------------------------------------------------------------
// Freeze "today" so todayStr() is deterministic across test runs.
// We set today to 2026-05-08 (a Friday).
// ---------------------------------------------------------------------------

const FAKE_TODAY = new Date(2026, 4, 8, 12, 0, 0); // 2026-05-08

let realDateNow;
beforeAll(() => {
  realDateNow = Date;
  // Intercept `new Date()` with no args so todayStr() returns a fixed value.
  // Calls with arguments pass through to the real constructor.
  class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(FAKE_TODAY.getTime());
      } else {
        super(...args);
      }
    }
  }
  global.Date = MockDate;
});

afterAll(() => {
  global.Date = realDateNow;
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A date inside the test month: May 2026. */
const CURRENT_DATE = new Date(2026, 4, 15); // 2026-05-15

/** An event on May 12, 2026. */
const EVENT_MAY12 = {
  id: 1,
  title: 'Dentist Appointment',
  startAt: '2026-05-12T10:00:00',
  endAt: '2026-05-12T11:00:00',
  color: 'blue',
  allDay: false,
};

/** A task due on May 20, 2026 (with dueTime). */
const TASK_MAY20_TIMED = {
  id: 101,
  title: 'Submit Tax Return',
  dueDate: '2026-05-20',
  dueTime: '17:00',
  status: 'open',
};

/** A timeless task due on May 25, 2026. */
const TASK_MAY25_TIMELESS = {
  id: 102,
  title: 'Buy Birthday Gift',
  dueDate: '2026-05-25',
  dueTime: null,
  status: 'open',
};

/** An event on a date outside May 2026 (outside grid entirely). */
const EVENT_JULY = {
  id: 2,
  title: 'Summer BBQ',
  startAt: '2026-07-04T18:00:00',
  endAt: '2026-07-04T21:00:00',
  color: 'green',
  allDay: false,
};

/**
 * Render MonthGrid with sensible defaults merged with optional overrides.
 *
 * @param {object} [propOverrides] - Optional prop overrides.
 * @returns {{ onDayClick, onEventClick, onTaskClick, onEventDelete, container }}
 */
function renderGrid(propOverrides = {}) {
  const onDayClick = propOverrides.onDayClick ?? vi.fn();
  const onEventClick = propOverrides.onEventClick ?? vi.fn();
  const onTaskClick = propOverrides.onTaskClick ?? vi.fn();
  const onEventDelete = propOverrides.onEventDelete ?? vi.fn();
  const currentDate = propOverrides.currentDate ?? CURRENT_DATE;
  const items = propOverrides.items ?? [];

  const { container } = render(
    <MonthGrid
      currentDate={currentDate}
      items={items}
      onDayClick={onDayClick}
      onEventClick={onEventClick}
      onTaskClick={onTaskClick}
      onEventDelete={onEventDelete}
    />
  );

  return { onDayClick, onEventClick, onTaskClick, onEventDelete, container };
}

// ---------------------------------------------------------------------------
// Header row
// ---------------------------------------------------------------------------

describe('header row', () => {
  it('renders all 7 day-of-week labels', () => {
    renderGrid();
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Grid size
// ---------------------------------------------------------------------------

describe('grid size', () => {
  it('renders 42 cells for May 2026 (6 display weeks: Apr 26 – Jun 6)', () => {
    // May 1 2026 is a Friday → grid starts Sun Apr 26, ends Sat Jun 6 → 6 weeks = 42 cells.
    renderGrid({ currentDate: new Date(2026, 4, 1) });
    // Each cell has a role="button" with aria-label matching a date.
    const cells = screen.getAllByRole('button').filter(
      (el) => /^\d{4}-\d{2}-\d{2}$/.test(el.getAttribute('aria-label'))
    );
    expect(cells).toHaveLength(42);
  });

  it('renders 35 cells for October 2026 (5 display weeks: Sep 27 – Oct 31)', () => {
    // October 1 2026 is a Thursday → grid starts Sun Sep 27, ends Sat Oct 31 → 5 weeks = 35 cells.
    renderGrid({ currentDate: new Date(2026, 9, 1) });
    const cells = screen.getAllByRole('button').filter(
      (el) => /^\d{4}-\d{2}-\d{2}$/.test(el.getAttribute('aria-label'))
    );
    expect(cells).toHaveLength(35);
  });
});

// ---------------------------------------------------------------------------
// Today highlighting
// ---------------------------------------------------------------------------

describe('today highlighting', () => {
  it('highlights today (2026-05-08) with a filled circle class', () => {
    renderGrid();
    // Find the cell for 2026-05-08.
    const todayCell = screen.getByRole('button', { name: '2026-05-08' });
    // The day number span inside should have the bg-blue-600 highlight class.
    const dayNumber = todayCell.querySelector('span');
    expect(dayNumber).toHaveClass('bg-blue-600');
  });

  it('does not highlight any other day with the today class', () => {
    renderGrid();
    const otherCell = screen.getByRole('button', { name: '2026-05-09' });
    const dayNumber = otherCell.querySelector('span');
    expect(dayNumber).not.toHaveClass('bg-blue-600');
  });
});

// ---------------------------------------------------------------------------
// Out-of-month days
// ---------------------------------------------------------------------------

describe('out-of-month days', () => {
  it('renders leading days from the previous month in the grid', () => {
    // May 2026 starts on Friday, so Sun Apr 26 – Thu Apr 30 appear in row 1.
    renderGrid();
    expect(screen.getByRole('button', { name: '2026-04-26' })).toBeInTheDocument();
  });

  it('applies a muted day-number class to out-of-month cells', () => {
    renderGrid();
    const outCell = screen.getByRole('button', { name: '2026-04-26' });
    const dayNumber = outCell.querySelector('span');
    expect(dayNumber).toHaveClass('text-gray-400');
  });

  it('does not apply the muted class to in-month cells', () => {
    renderGrid();
    const inCell = screen.getByRole('button', { name: '2026-05-01' });
    const dayNumber = inCell.querySelector('span');
    expect(dayNumber).not.toHaveClass('text-gray-400');
  });
});

// ---------------------------------------------------------------------------
// Item rendering
// ---------------------------------------------------------------------------

describe('item rendering — events', () => {
  it('renders an event chip on the correct cell date (startAt matching)', () => {
    renderGrid({ items: [EVENT_MAY12] });
    expect(screen.getByText('Dentist Appointment')).toBeInTheDocument();
  });

  it('does not render an event chip on the wrong date', () => {
    renderGrid({ items: [EVENT_MAY12] });
    // The chip should be inside the May 12 cell, not the May 13 cell.
    const may13Cell = screen.getByRole('button', { name: '2026-05-13' });
    expect(within(may13Cell).queryByText('Dentist Appointment')).not.toBeInTheDocument();
  });

  it('does not render an event whose date is outside the visible grid', () => {
    renderGrid({ items: [EVENT_JULY] });
    expect(screen.queryByText('Summer BBQ')).not.toBeInTheDocument();
  });
});

describe('item rendering — tasks', () => {
  it('renders a timed task chip on the correct cell date (dueDate matching)', () => {
    renderGrid({ items: [TASK_MAY20_TIMED] });
    expect(screen.getByText('Submit Tax Return')).toBeInTheDocument();
  });

  it('renders a timeless task chip on the correct cell date', () => {
    renderGrid({ items: [TASK_MAY25_TIMELESS] });
    expect(screen.getByText('Buy Birthday Gift')).toBeInTheDocument();
  });

  it('renders both events and tasks when provided together', () => {
    renderGrid({ items: [EVENT_MAY12, TASK_MAY20_TIMED, TASK_MAY25_TIMELESS] });
    expect(screen.getByText('Dentist Appointment')).toBeInTheDocument();
    expect(screen.getByText('Submit Tax Return')).toBeInTheDocument();
    expect(screen.getByText('Buy Birthday Gift')).toBeInTheDocument();
  });
});

describe('item rendering — empty items', () => {
  it('renders without error when items is empty', () => {
    expect(() => renderGrid({ items: [] })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// "+N more" overflow
// ---------------------------------------------------------------------------

describe('overflow "+N more" link', () => {
  /** Build 4 events all on the same date (May 12 2026). */
  const EVENT_A = { id: 10, title: 'Event A', startAt: '2026-05-12T08:00:00', endAt: '2026-05-12T09:00:00', color: 'blue', allDay: false };
  const EVENT_B = { id: 11, title: 'Event B', startAt: '2026-05-12T09:00:00', endAt: '2026-05-12T10:00:00', color: 'blue', allDay: false };
  const EVENT_C = { id: 12, title: 'Event C', startAt: '2026-05-12T10:00:00', endAt: '2026-05-12T11:00:00', color: 'blue', allDay: false };
  const EVENT_D = { id: 13, title: 'Event D', startAt: '2026-05-12T11:00:00', endAt: '2026-05-12T12:00:00', color: 'blue', allDay: false };

  it('shows all 3 chips when there are exactly 3 items', () => {
    renderGrid({ items: [EVENT_A, EVENT_B, EVENT_C] });
    expect(screen.getByText('Event A')).toBeInTheDocument();
    expect(screen.getByText('Event B')).toBeInTheDocument();
    expect(screen.getByText('Event C')).toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });

  it('shows "+1 more" when there are 4 items on the same date', () => {
    renderGrid({ items: [EVENT_A, EVENT_B, EVENT_C, EVENT_D] });
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('hides the 4th item chip when overflow is present', () => {
    renderGrid({ items: [EVENT_A, EVENT_B, EVENT_C, EVENT_D] });
    expect(screen.queryByText('Event D')).not.toBeInTheDocument();
  });

  it('shows "+2 more" when there are 5 items on the same date', () => {
    const EVENT_E = { id: 14, title: 'Event E', startAt: '2026-05-12T12:00:00', endAt: '2026-05-12T13:00:00', color: 'blue', allDay: false };
    renderGrid({ items: [EVENT_A, EVENT_B, EVENT_C, EVENT_D, EVENT_E] });
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Callback propagation
// ---------------------------------------------------------------------------

describe('callback — onDayClick', () => {
  it('calls onDayClick with the correct Date when a cell is clicked', () => {
    const onDayClick = vi.fn();
    renderGrid({ onDayClick });
    fireEvent.click(screen.getByRole('button', { name: '2026-05-15' }));
    expect(onDayClick).toHaveBeenCalledTimes(1);
    const calledDate = onDayClick.mock.calls[0][0];
    expect(calledDate.getFullYear()).toBe(2026);
    expect(calledDate.getMonth()).toBe(4); // May (0-based)
    expect(calledDate.getDate()).toBe(15);
  });

  it('calls onDayClick when "+N more" is clicked', () => {
    const onDayClick = vi.fn();
    const ITEMS = [
      { id: 20, title: 'A', startAt: '2026-05-12T08:00:00', endAt: '2026-05-12T09:00:00', color: 'blue', allDay: false },
      { id: 21, title: 'B', startAt: '2026-05-12T09:00:00', endAt: '2026-05-12T10:00:00', color: 'blue', allDay: false },
      { id: 22, title: 'C', startAt: '2026-05-12T10:00:00', endAt: '2026-05-12T11:00:00', color: 'blue', allDay: false },
      { id: 23, title: 'D', startAt: '2026-05-12T11:00:00', endAt: '2026-05-12T12:00:00', color: 'blue', allDay: false },
    ];
    renderGrid({ items: ITEMS, onDayClick });
    fireEvent.click(screen.getByText('+1 more'));
    expect(onDayClick).toHaveBeenCalledTimes(1);
    const calledDate = onDayClick.mock.calls[0][0];
    expect(calledDate.getDate()).toBe(12);
  });
});

describe('callback — onEventClick', () => {
  it('calls onEventClick with the event object when an EventChip is clicked', () => {
    const onEventClick = vi.fn();
    renderGrid({ items: [EVENT_MAY12], onEventClick });
    // The chip body role="button" has the title text as its accessible name.
    fireEvent.click(screen.getByRole('button', { name: /Dentist Appointment/i }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: EVENT_MAY12.id }));
  });
});

describe('callback — onTaskClick', () => {
  it('calls onTaskClick with the task object when a TaskChip is clicked', () => {
    const onTaskClick = vi.fn();
    renderGrid({ items: [TASK_MAY20_TIMED], onTaskClick });
    fireEvent.click(screen.getByRole('button', { name: /Submit Tax Return/i }));
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: TASK_MAY20_TIMED.id }));
  });
});

describe('callback — onEventDelete', () => {
  it('calls onEventDelete with the event id when the delete button is clicked', () => {
    const onEventDelete = vi.fn();
    renderGrid({ items: [EVENT_MAY12], onEventDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onEventDelete).toHaveBeenCalledTimes(1);
    expect(onEventDelete).toHaveBeenCalledWith(EVENT_MAY12.id);
  });

  it('does not trigger onDayClick when the delete button is clicked', () => {
    const onDayClick = vi.fn();
    const onEventDelete = vi.fn();
    renderGrid({ items: [EVENT_MAY12], onDayClick, onEventDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onDayClick).not.toHaveBeenCalled();
  });
});
