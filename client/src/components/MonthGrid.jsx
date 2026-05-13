/**
 * MonthGrid — month-view calendar grid component.
 *
 * Renders a 7-column Sunday-anchored month grid, including a header row with
 * day-of-week labels (Sun–Sat) and up to 6 weeks of cells.  Each cell shows:
 *   - The day number (muted for days outside the current month).
 *   - Today highlighted with a filled circle.
 *   - Up to 3 chips (EventChip or TaskChip) filtered from `items`.
 *   - A "+N more" link when the cell has more than 3 items.
 *
 * Clicking an empty cell calls `onDayClick(date)` to navigate to Day view.
 * Clicking a chip calls `onEventClick` or `onTaskClick`.
 * Clicking the delete icon on an EventChip calls `onEventDelete`.
 *
 * Item-to-date matching:
 *   - Events: `item.startAt.slice(0, 10)` compared to the cell's YYYY-MM-DD string.
 *   - Tasks:  `item.dueDate` compared to the cell's YYYY-MM-DD string.
 *
 * @module MonthGrid
 */

import React from 'react';
import { getViewColumns } from '../utils/calendar-layout.js';
import EventChip from './EventChip.jsx';
import TaskChip from './TaskChip.jsx';

/** Maximum number of item chips rendered before showing "+N more". */
const MAX_VISIBLE_CHIPS = 3;

/** Ordered day-of-week header labels, starting on Sunday. */
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Convert a Date to a local-time ISO date string ("YYYY-MM-DD").
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
 * Return today's local-time ISO date string ("YYYY-MM-DD").
 *
 * @returns {string}
 */
function todayStr() {
  return toLocalDateStr(new Date());
}

/**
 * Filter `items` to those whose date matches the given ISO date string.
 *
 * Events are matched via `item.startAt.slice(0, 10)`.
 * Tasks (with or without dueTime) are matched via `item.dueDate`.
 *
 * @param {object[]} items       - Mixed array of event and task objects.
 * @param {string}   dateStr     - Target ISO date string ("YYYY-MM-DD").
 * @returns {object[]} Items that fall on the given date.
 */
function itemsForDate(items, dateStr) {
  return items.filter((item) => {
    if (item.startAt) {
      return item.startAt.slice(0, 10) === dateStr;
    }
    if (item.dueDate) {
      return item.dueDate === dateStr;
    }
    return false;
  });
}

/**
 * Determine whether an item is an event (has `startAt`) or a task (has `dueDate`).
 *
 * @param {object} item - An event or task object.
 * @returns {'event' | 'task'} The item type.
 */
function itemType(item) {
  return item.startAt ? 'event' : 'task';
}

/**
 * MonthCell — renders a single day cell in the month grid.
 *
 * @param {object}   props
 * @param {Date}     props.date           - The date this cell represents.
 * @param {boolean}  props.isCurrentMonth - True when the date is in the viewed month.
 * @param {object[]} props.items          - All calendar items; filtered internally by date.
 * @param {Function} props.onDayClick     - Called with `date` when the cell background is clicked.
 * @param {Function} props.onEventClick   - Called with the event object when an EventChip is clicked.
 * @param {Function} props.onTaskClick    - Called with the task object when a TaskChip is clicked.
 * @param {Function} props.onEventDelete  - Called with the event's id when the delete icon is clicked.
 * @returns {JSX.Element}
 */
function MonthCell({ date, isCurrentMonth, items, onDayClick, onEventClick, onTaskClick, onEventDelete }) {
  const dateStr = toLocalDateStr(date);
  const isToday = dateStr === todayStr();
  const cellItems = itemsForDate(items, dateStr);

  const visibleItems = cellItems.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenCount = cellItems.length - visibleItems.length;

  /**
   * Handle click on the cell background.
   * Navigates to the Day view for this date.
   * Chip wrappers stop propagation so this does not fire when chips are clicked.
   */
  function handleCellClick() {
    onDayClick(date);
  }

  /**
   * Handle click on the "+N more" link without bubbling to the cell.
   *
   * @param {React.MouseEvent} e
   */
  function handleMoreClick(e) {
    e.stopPropagation();
    onDayClick(date);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={dateStr}
      onClick={handleCellClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCellClick();
        }
      }}
      className={[
        'flex min-h-24 cursor-pointer flex-col gap-0.5 border-b border-r border-gray-200 p-1 text-left',
        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400',
        isCurrentMonth ? 'bg-white' : 'bg-gray-50',
      ].join(' ')}
    >
      {/* Day number */}
      <span
        className={[
          'flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-semibold',
          isToday
            ? 'bg-blue-600 text-white'
            : isCurrentMonth
              ? 'text-gray-800'
              : 'text-gray-400',
        ].join(' ')}
      >
        {date.getDate()}
      </span>

      {/* Item chips — wrapped in a div that stops propagation so cell click is not triggered */}
      {visibleItems.map((item) => {
        if (itemType(item) === 'event') {
          return (
            <div
              key={`event-${item.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <EventChip
                event={item}
                onClick={() => onEventClick(item)}
                onDelete={() => onEventDelete(item.id)}
              />
            </div>
          );
        }
        return (
          <div
            key={`task-${item.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <TaskChip
              task={item}
              onClick={() => onTaskClick(item)}
            />
          </div>
        );
      })}

      {/* "+N more" overflow link */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={handleMoreClick}
          className="self-start truncate text-xs font-medium text-blue-600 hover:underline focus:outline-none focus:underline"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}

/**
 * MonthGrid — full month grid view.
 *
 * Uses `getViewColumns(currentDate, 'month')` to obtain the ordered array of
 * Date objects for the grid (28–42 cells, always Sunday-anchored).
 *
 * @param {object}   props
 * @param {Date}     props.currentDate     - Any date within the month to display.
 * @param {object[]} props.items           - Mixed array of event and task objects.
 * @param {Function} props.onDayClick      - Called with a Date when a cell is clicked.
 * @param {Function} props.onEventClick    - Called with the event object when an EventChip is clicked.
 * @param {Function} props.onTaskClick     - Called with the task object when a TaskChip is clicked.
 * @param {Function} props.onEventDelete   - Called with the event's id when the delete icon is clicked.
 * @returns {JSX.Element}
 */
function MonthGrid({ currentDate, items, onDayClick, onEventClick, onTaskClick, onEventDelete }) {
  /** Convert currentDate prop (Date) to the ISO string expected by getViewColumns. */
  const currentDateStr = toLocalDateStr(currentDate);

  /** All cells for the visible grid, ordered Sunday → Saturday across all weeks. */
  const gridDates = getViewColumns(currentDateStr, 'month');

  /** The calendar month we are displaying (0-based). */
  const viewMonth = currentDate.getMonth();
  const viewYear = currentDate.getFullYear();

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Day-of-week header row */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar cells — 7-column grid */}
      <div className="grid flex-1 grid-cols-7 overflow-auto">
        {gridDates.map((date) => {
          const isCurrentMonth =
            date.getMonth() === viewMonth && date.getFullYear() === viewYear;

          return (
            <MonthCell
              key={toLocalDateStr(date)}
              date={date}
              isCurrentMonth={isCurrentMonth}
              items={items ?? []}
              onDayClick={onDayClick}
              onEventClick={onEventClick}
              onTaskClick={onTaskClick}
              onEventDelete={onEventDelete}
            />
          );
        })}
      </div>
    </div>
  );
}

export default MonthGrid;
