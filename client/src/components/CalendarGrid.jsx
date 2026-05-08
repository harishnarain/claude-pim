/**
 * CalendarGrid — dispatcher component that renders the correct calendar sub-grid.
 *
 * Delegates to either `MonthGrid` or `DayWeekGrid` based on the `activeView`
 * prop:
 *   - `'month'`    → renders `<MonthGrid>` directly; all month-specific props
 *                    are forwarded.
 *   - `'day'`      → calls `getViewColumns` to get a single-element columns
 *                    array, then renders `<DayWeekGrid>`.
 *   - `'workweek'` → calls `getViewColumns` for Mon–Fri columns, then renders
 *                    `<DayWeekGrid>`.
 *   - `'week'`     → calls `getViewColumns` for Sun–Sat columns, then renders
 *                    `<DayWeekGrid>`.
 *
 * This component holds no local state; it is a pure dispatcher.
 *
 * @module CalendarGrid
 */

import React from 'react';
import MonthGrid from './MonthGrid.jsx';
import DayWeekGrid from './DayWeekGrid.jsx';
import { getViewColumns } from '../utils/calendar-layout.js';

/**
 * Convert a Date object to a local-time ISO date string ("YYYY-MM-DD").
 *
 * Required because `getViewColumns` expects a string, but `currentDate` is a
 * Date.
 *
 * @param {Date} date - The date to format.
 * @returns {string} ISO date string, e.g. "2026-05-08".
 */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * CalendarGrid — renders either MonthGrid or DayWeekGrid based on activeView.
 *
 * @param {object}   props
 * @param {string}   props.activeView      - One of 'day' | 'workweek' | 'week' | 'month'.
 * @param {Date}     props.currentDate     - The anchor date for the current view.
 * @param {object[]} props.items           - Mixed array of event and task objects.
 * @param {Function} props.onSlotClick     - Called with (date, hour) when an empty timed slot is clicked (day/week views only).
 * @param {Function} props.onEventClick    - Called with the event object when an EventChip is clicked.
 * @param {Function} props.onTaskClick     - Called with the task object when a TaskChip is clicked.
 * @param {Function} props.onEventDelete   - Called with the event's id when an EventChip delete is triggered.
 * @param {Function} props.onDayClick      - Called with a Date when a month cell is clicked (month view only).
 * @returns {JSX.Element}
 */
function CalendarGrid({
  activeView,
  currentDate,
  items,
  onSlotClick,
  onEventClick,
  onTaskClick,
  onEventDelete,
  onDayClick,
}) {
  if (activeView === 'month') {
    return (
      <MonthGrid
        currentDate={currentDate}
        items={items}
        onDayClick={onDayClick}
        onEventClick={onEventClick}
        onTaskClick={onTaskClick}
        onEventDelete={onEventDelete}
      />
    );
  }

  // For 'day', 'workweek', and 'week' views, compute the columns to display.
  const currentDateStr = toLocalDateStr(currentDate);
  const columns = getViewColumns(currentDateStr, activeView);

  return (
    <DayWeekGrid
      columns={columns}
      items={items}
      onSlotClick={onSlotClick}
      onEventClick={onEventClick}
      onTaskClick={onTaskClick}
      onEventDelete={onEventDelete}
    />
  );
}

export default CalendarGrid;
