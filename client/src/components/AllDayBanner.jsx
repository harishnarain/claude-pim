/**
 * AllDayBanner — sticky banner row rendered above the timed grid in day/week views.
 *
 * Displays all-day calendar events and timeless tasks (tasks that have a dueDate
 * but no dueTime) in column slots that correspond to the dates visible in the
 * current view. Each column aligns with a DayColumn, and a fixed-width left
 * spacer (w-12 / 48 px) matches the TimeColumn width so the banner columns
 * stay in alignment with the timed grid below.
 *
 * Items are filtered per-column: for a given column date, the banner renders
 * — EventChip (with style={{}}) for events where `allDay === true` and the
 *   event's date matches the column date.
 * — TaskChip (with style={{}}) for tasks where `dueDate` equals the column's
 *   ISO date string and `dueTime` is absent / falsy.
 *
 * If no all-day items exist in any column the banner still renders at minimal
 * height (min-h-[2rem]) to preserve grid alignment.
 *
 * Sticky positioning: `sticky top-0 z-10 bg-white border-b border-gray-200`.
 *
 * @module AllDayBanner
 */

import React from 'react';
import EventChip from './EventChip.jsx';
import TaskChip from './TaskChip.jsx';

/**
 * Convert a Date object to an ISO date string ("YYYY-MM-DD") in local time.
 *
 * @param {Date} date - The date to format.
 * @returns {string} ISO date string in local time (e.g. "2026-05-08").
 */
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Determine whether an all-day event falls on the given column date.
 *
 * An all-day event's startAt is compared (in local time) to the column's
 * ISO date string.
 *
 * @param {object} event      - Calendar event object.
 * @param {string} event.startAt - ISO 8601 datetime string.
 * @param {boolean} event.allDay - Must be true for an all-day event.
 * @param {string} columnDateStr - ISO date string of the column (e.g. "2026-05-08").
 * @returns {boolean} True when the event is all-day and falls on the column date.
 */
function eventFallsOnDate(event, columnDateStr) {
  if (!event.allDay) return false;
  const eventDate = toLocalDateStr(new Date(event.startAt));
  return eventDate === columnDateStr;
}

/**
 * Determine whether a task is a timeless task that falls on the given column date.
 *
 * A timeless task has a dueDate matching the column date and no dueTime.
 *
 * @param {object} task          - Task data object.
 * @param {string} [task.dueDate]  - Due date string (ISO date "YYYY-MM-DD" or ISO datetime).
 * @param {string} [task.dueTime]  - Due time string; absent or falsy for timeless tasks.
 * @param {string} columnDateStr - ISO date string of the column (e.g. "2026-05-08").
 * @returns {boolean} True when the task is timeless and falls on the column date.
 */
function taskFallsOnDate(task, columnDateStr) {
  if (!task.dueDate || task.dueTime) return false;
  // dueDate may be a plain "YYYY-MM-DD" string or an ISO datetime; normalise it.
  const taskDateStr = task.dueDate.length > 10
    ? toLocalDateStr(new Date(task.dueDate))
    : task.dueDate;
  return taskDateStr === columnDateStr;
}

/**
 * AllDayBanner — sticky all-day row rendered above the timed calendar grid.
 *
 * @param {object}     props
 * @param {Date[]}     props.columns          - Ordered array of Date objects for visible columns.
 * @param {object[]}   props.items            - Mixed array of event and task objects.
 * @param {Function}   props.onEventClick     - Called with the event object when an EventChip is clicked.
 * @param {Function}   props.onTaskClick      - Called with the task object when a TaskChip is clicked.
 * @param {Function}   props.onEventDelete    - Called with the event's id when an EventChip delete is triggered.
 * @returns {JSX.Element}
 */
function AllDayBanner({ columns, items, onEventClick, onTaskClick, onEventDelete }) {
  return (
    <div
      className="sticky top-0 z-10 flex min-h-[2rem] border-b border-gray-200 bg-white"
      aria-label="All-day events"
    >
      {/* Left spacer — aligns with the TimeColumn (w-12 = 48 px) */}
      <div className="w-12 flex-none border-r border-gray-200" aria-hidden="true" />

      {/* One slot per column */}
      {columns.map((columnDate) => {
        const columnDateStr = toLocalDateStr(columnDate);

        const columnEvents = items.filter(
          (item) => item.allDay !== undefined && eventFallsOnDate(item, columnDateStr)
        );

        const columnTasks = items.filter(
          (item) => item.allDay === undefined && taskFallsOnDate(item, columnDateStr)
        );

        return (
          <div
            key={columnDateStr}
            className="flex min-w-0 flex-1 flex-col gap-0.5 border-r border-gray-200 p-1"
          >
            {columnEvents.map((event) => (
              <EventChip
                key={`event-${event.id}`}
                event={event}
                style={{}}
                onClick={() => onEventClick(event)}
                onDelete={() => onEventDelete(event.id)}
              />
            ))}

            {columnTasks.map((task) => (
              <TaskChip
                key={`task-${task.id}`}
                task={task}
                style={{}}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default AllDayBanner;
