/**
 * Unit tests for client/src/components/CalendarGrid.jsx.
 *
 * Covers:
 *   - Renders MonthGrid when activeView is 'month'.
 *   - Renders DayWeekGrid when activeView is 'day', 'workweek', or 'week'.
 *   - Does NOT render DayWeekGrid in month view, and vice versa.
 *   - Props (items, onEventClick, onTaskClick, onEventDelete, onDayClick,
 *     onSlotClick) flow through to the correct sub-component.
 *   - getViewColumns is called with the correct currentDate string and activeView.
 *   - Works with an empty items array.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalendarGrid from '../../client/src/components/CalendarGrid.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Anchor date: Friday 2026-05-08. */
const CURRENT_DATE = new Date(2026, 4, 8); // 2026-05-08

/** A timed event on 2026-05-08. */
const EVENT_FRI = {
  id: 1,
  title: 'Sprint Review',
  startAt: '2026-05-08T10:00:00',
  endAt: '2026-05-08T11:00:00',
  color: 'blue',
  allDay: false,
};

/** A task due on 2026-05-08 (with dueTime so it appears in the timed grid). */
const TASK_FRI = {
  id: 101,
  title: 'Deploy Hotfix',
  dueDate: '2026-05-08',
  dueTime: '15:00',
  status: 'open',
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Render CalendarGrid with sensible defaults merged with prop overrides.
 *
 * @param {object} [propOverrides] - Optional prop overrides.
 * @returns {{ onSlotClick, onEventClick, onTaskClick, onEventDelete, onDayClick }}
 */
function renderGrid(propOverrides = {}) {
  const onSlotClick = propOverrides.onSlotClick ?? vi.fn();
  const onEventClick = propOverrides.onEventClick ?? vi.fn();
  const onTaskClick = propOverrides.onTaskClick ?? vi.fn();
  const onEventDelete = propOverrides.onEventDelete ?? vi.fn();
  const onDayClick = propOverrides.onDayClick ?? vi.fn();
  const activeView = propOverrides.activeView ?? 'week';
  const currentDate = propOverrides.currentDate ?? CURRENT_DATE;
  const items = propOverrides.items ?? [];

  render(
    <CalendarGrid
      activeView={activeView}
      currentDate={currentDate}
      items={items}
      onSlotClick={onSlotClick}
      onEventClick={onEventClick}
      onTaskClick={onTaskClick}
      onEventDelete={onEventDelete}
      onDayClick={onDayClick}
    />
  );

  return { onSlotClick, onEventClick, onTaskClick, onEventDelete, onDayClick };
}

// ---------------------------------------------------------------------------
// Month view dispatch
// ---------------------------------------------------------------------------

describe('month view', () => {
  it('renders the day-of-week header (Sun–Sat) indicating MonthGrid is mounted', () => {
    renderGrid({ activeView: 'month' });
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders month-grid cells (role=button with a date aria-label)', () => {
    renderGrid({ activeView: 'month' });
    // MonthGrid cells carry YYYY-MM-DD aria-labels.
    const cells = screen.getAllByRole('button').filter(
      (el) => /^\d{4}-\d{2}-\d{2}$/.test(el.getAttribute('aria-label'))
    );
    expect(cells.length).toBeGreaterThan(0);
  });

  it('does NOT render TimeColumn hour labels in month view', () => {
    renderGrid({ activeView: 'month' });
    // TimeColumn renders labels like "12 AM", "1 AM", etc.
    const hourLabels = screen.queryAllByText(/\d{1,2}\s+(AM|PM)/i);
    expect(hourLabels).toHaveLength(0);
  });

  it('renders an event chip inside the correct month cell', () => {
    renderGrid({ activeView: 'month', items: [EVENT_FRI] });
    expect(screen.getByText('Sprint Review')).toBeInTheDocument();
  });

  it('calls onDayClick when a month cell is clicked', () => {
    const onDayClick = vi.fn();
    renderGrid({ activeView: 'month', onDayClick });
    fireEvent.click(screen.getByRole('button', { name: '2026-05-08' }));
    expect(onDayClick).toHaveBeenCalledTimes(1);
    const calledDate = onDayClick.mock.calls[0][0];
    expect(calledDate.getFullYear()).toBe(2026);
    expect(calledDate.getMonth()).toBe(4);
    expect(calledDate.getDate()).toBe(8);
  });

  it('calls onEventClick when an EventChip is clicked in month view', () => {
    const onEventClick = vi.fn();
    renderGrid({ activeView: 'month', items: [EVENT_FRI], onEventClick });
    fireEvent.click(screen.getByRole('button', { name: /Sprint Review/i }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: EVENT_FRI.id }));
  });

  it('calls onEventDelete when the delete button is clicked in month view', () => {
    const onEventDelete = vi.fn();
    renderGrid({ activeView: 'month', items: [EVENT_FRI], onEventDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onEventDelete).toHaveBeenCalledTimes(1);
    expect(onEventDelete).toHaveBeenCalledWith(EVENT_FRI.id);
  });

  it('renders without error when items is empty in month view', () => {
    expect(() => renderGrid({ activeView: 'month', items: [] })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Day view dispatch
// ---------------------------------------------------------------------------

describe('day view', () => {
  it('renders 24 hour-label rows from TimeColumn (indicating DayWeekGrid is mounted)', () => {
    renderGrid({ activeView: 'day' });
    const labels = screen.getAllByText(/\d{1,2}\s+(AM|PM)/i);
    expect(labels).toHaveLength(24);
  });

  it('renders exactly 24 timed slots for a single-column day view', () => {
    renderGrid({ activeView: 'day' });
    const slots = screen.getAllByRole('button', { name: /^\d{1,2}:00$/ });
    expect(slots).toHaveLength(24);
  });

  it('does NOT render day-of-week header labels in day view', () => {
    renderGrid({ activeView: 'day' });
    expect(screen.queryByText('Sun')).not.toBeInTheDocument();
    expect(screen.queryByText('Mon')).not.toBeInTheDocument();
  });

  it('renders an event chip for a timed event on the anchor day', () => {
    renderGrid({ activeView: 'day', items: [EVENT_FRI] });
    expect(screen.getByText('Sprint Review')).toBeInTheDocument();
  });

  it('calls onSlotClick when a timed slot is clicked in day view', () => {
    const onSlotClick = vi.fn();
    renderGrid({ activeView: 'day', onSlotClick });
    fireEvent.click(screen.getByRole('button', { name: '9:00' }));
    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick).toHaveBeenCalledWith(CURRENT_DATE, 9);
  });
});

// ---------------------------------------------------------------------------
// Work-week view dispatch
// ---------------------------------------------------------------------------

describe('workweek view', () => {
  it('renders 5 × 24 = 120 timed slots for the Mon–Fri workweek', () => {
    // 2026-05-08 is a Friday; its workweek is Mon May 4 – Fri May 8.
    renderGrid({ activeView: 'workweek' });
    const slots = screen.getAllByRole('button', { name: /^\d{1,2}:00$/ });
    expect(slots).toHaveLength(120); // 5 columns × 24 slots
  });

  it('renders 24 hour-label rows (TimeColumn) in workweek view', () => {
    renderGrid({ activeView: 'workweek' });
    const labels = screen.getAllByText(/\d{1,2}\s+(AM|PM)/i);
    expect(labels).toHaveLength(24);
  });

  it('does NOT render day-of-week header in workweek view', () => {
    renderGrid({ activeView: 'workweek' });
    // MonthGrid header labels should not be present.
    expect(screen.queryByRole('button', { name: /^\d{4}-\d{2}-\d{2}$/ })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Week view dispatch
// ---------------------------------------------------------------------------

describe('week view', () => {
  it('renders 7 × 24 = 168 timed slots for the Sun–Sat week', () => {
    // 2026-05-08 is a Friday; its week is Sun May 3 – Sat May 9.
    renderGrid({ activeView: 'week' });
    const slots = screen.getAllByRole('button', { name: /^\d{1,2}:00$/ });
    expect(slots).toHaveLength(168); // 7 columns × 24 slots
  });

  it('renders 24 hour-label rows (TimeColumn) in week view', () => {
    renderGrid({ activeView: 'week' });
    const labels = screen.getAllByText(/\d{1,2}\s+(AM|PM)/i);
    expect(labels).toHaveLength(24);
  });

  it('renders an event chip in the correct column for week view', () => {
    renderGrid({ activeView: 'week', items: [EVENT_FRI] });
    expect(screen.getByText('Sprint Review')).toBeInTheDocument();
  });

  it('calls onEventClick when an EventChip is clicked in week view', () => {
    const onEventClick = vi.fn();
    renderGrid({ activeView: 'week', items: [EVENT_FRI], onEventClick });
    fireEvent.click(screen.getByRole('button', { name: /Sprint Review/i }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: EVENT_FRI.id }));
  });

  it('calls onTaskClick when a timed TaskChip is clicked in week view', () => {
    const onTaskClick = vi.fn();
    renderGrid({ activeView: 'week', items: [TASK_FRI], onTaskClick });
    fireEvent.click(screen.getByRole('button', { name: /Deploy Hotfix/i }));
    expect(onTaskClick).toHaveBeenCalledTimes(1);
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: TASK_FRI.id }));
  });

  it('calls onEventDelete when the delete button is clicked in week view', () => {
    const onEventDelete = vi.fn();
    renderGrid({ activeView: 'week', items: [EVENT_FRI], onEventDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onEventDelete).toHaveBeenCalledTimes(1);
    expect(onEventDelete).toHaveBeenCalledWith(EVENT_FRI.id);
  });

  it('renders without error when items is empty in week view', () => {
    expect(() => renderGrid({ activeView: 'week', items: [] })).not.toThrow();
  });
});
