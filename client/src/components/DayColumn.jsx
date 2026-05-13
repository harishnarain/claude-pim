/**
 * DayColumn — a single-day timed-slot column for the calendar week/day view.
 *
 * Renders 24 one-hour slot rows (each h-[60px]).  Clicking an empty slot calls
 * `onSlotClick(date, hour)`.  Timed events (allDay === false) and timed tasks
 * (dueTime present) that fall on this column's date are filtered from `items`,
 * annotated with overlap lane/laneCount data via `layoutItems`, and rendered as
 * absolutely-positioned `EventChip` / `TaskChip` chips inside the column.
 *
 * Chip positioning is computed from the normalised startAt / endAt of each item:
 *   top    = (startHour + startMin/60) * 60   [px]
 *   height = max(duration_in_minutes / 60 * 60, 30)  [px]
 *   left   = lane / laneCount * 100%
 *   width  = 1 / laneCount * 100%
 *
 * @module DayColumn
 */

import React from 'react';
import { layoutItems } from '../utils/calendar-layout.js';
import EventChip from './EventChip.jsx';
import TaskChip from './TaskChip.jsx';

/** Number of hours in a day. */
const HOURS_IN_DAY = 24;

/** Height of each one-hour slot in pixels — must match the h-[60px] class. */
const SLOT_HEIGHT_PX = 60;

/** Minimum chip height in pixels so very short events remain clickable. */
const MIN_CHIP_HEIGHT_PX = 30;

/**
 * Convert a Date object to an ISO date string ("YYYY-MM-DD") in local time.
 *
 * @param {Date} date - The date to format.
 * @returns {string} ISO date string (e.g. "2026-05-08").
 */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute the absolute-positioning style object for a chip from its annotated
 * layout fields.
 *
 * @param {string} startAt    - ISO 8601 datetime string for the item start.
 * @param {string} endAt      - ISO 8601 datetime string for the item end.
 * @param {number} lane       - Zero-based lane index assigned by layoutItems.
 * @param {number} laneCount  - Total lanes in the overlap cluster.
 * @returns {React.CSSProperties} Style object for absolute positioning.
 */
function computeChipStyle(startAt, endAt, lane, laneCount) {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  const startHour = startDate.getHours();
  const startMin = startDate.getMinutes();
  const durationMs = endDate - startDate;
  const durationMinutes = durationMs / 60000;

  const top = (startHour + startMin / 60) * SLOT_HEIGHT_PX;
  const height = Math.max((durationMinutes / 60) * SLOT_HEIGHT_PX, MIN_CHIP_HEIGHT_PX);
  const left = `${(lane / laneCount) * 100}%`;
  const width = `${(1 / laneCount) * 100}%`;

  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${height}px`,
    left,
    width,
  };
}

/**
 * DayColumn — renders a single day's timed grid column.
 *
 * @param {object}     props
 * @param {Date}       props.date             - The calendar date this column represents.
 * @param {object[]}   props.items            - Mixed array of event and task objects.
 * @param {Function}   props.onSlotClick      - Called with (date, hour) when an empty slot is clicked.
 * @param {Function}   props.onEventClick     - Called with the event object when an EventChip is clicked.
 * @param {Function}   props.onTaskClick      - Called with the task object when a TaskChip is clicked.
 * @param {Function}   props.onEventDelete    - Called with the event's id when the delete button is clicked.
 * @returns {JSX.Element}
 */
function DayColumn({ date, items, onSlotClick, onEventClick, onTaskClick, onEventDelete }) {
  const columnDateStr = toLocalDateStr(date);

  // Filter timed events that fall on this column's date.
  const columnEvents = (items ?? []).filter(
    (item) => item.allDay === false && item.startAt && item.startAt.slice(0, 10) === columnDateStr
  );

  // Filter timed tasks that fall on this column's date.
  const columnTasks = (items ?? []).filter(
    (item) => item.allDay === undefined && item.dueDate === columnDateStr && item.dueTime
  );

  // Normalise timed tasks so layoutItems can compute their startAt/endAt.
  const normalisedTasks = columnTasks.map((task) => {
    const startAt = `${task.dueDate}T${task.dueTime}`;
    return { ...task, startAt, endAt: startAt };
  });

  // Annotate all timed items with lane / laneCount for overlap layout.
  const laidOutItems = layoutItems([...columnEvents, ...normalisedTasks]);

  // Separate annotated events from annotated tasks (tasks have no allDay field).
  const laidOutEvents = laidOutItems.filter((item) => item.allDay === false);
  const laidOutTasks = laidOutItems.filter((item) => item.allDay === undefined);

  /**
   * Build an array of 24 hour indices [0 … 23].
   *
   * @type {number[]}
   */
  const hours = Array.from({ length: HOURS_IN_DAY }, (_, i) => i);

  return (
    <div className="relative flex-1 overflow-hidden border-r border-gray-200">
      {/* 24 one-hour slot rows */}
      {hours.map((hour) => (
        <div
          key={hour}
          role="button"
          tabIndex={0}
          aria-label={`${hour}:00`}
          className="h-[60px] cursor-pointer border-b border-gray-100 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
          onClick={() => onSlotClick(date, hour)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSlotClick(date, hour);
            }
          }}
        />
      ))}

      {/* Absolutely positioned EventChips */}
      {laidOutEvents.map((event) => (
        <EventChip
          key={`event-${event.id}`}
          event={event}
          style={computeChipStyle(event.startAt, event.endAt, event.lane, event.laneCount)}
          onClick={() => onEventClick(event)}
          onDelete={() => onEventDelete(event.id)}
        />
      ))}

      {/* Absolutely positioned TaskChips */}
      {laidOutTasks.map((task) => (
        <TaskChip
          key={`task-${task.id}`}
          task={task}
          style={computeChipStyle(task.startAt, task.endAt, task.lane, task.laneCount)}
          onClick={() => onTaskClick(task)}
        />
      ))}
    </div>
  );
}

export default DayColumn;
