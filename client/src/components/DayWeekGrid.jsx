/**
 * DayWeekGrid — scrollable timed grid container for Day, Work Week, and Week views.
 *
 * Renders an `AllDayBanner` at the top (sticky), then a vertically-scrollable
 * area containing a `TimeColumn` on the left followed by one `DayColumn` per
 * date supplied in `columns`.
 *
 * On mount the scroll container is programmatically scrolled to 08:00 (480 px
 * from the top, computed as 8 hours × 60 px per hour) so that the working day
 * is immediately visible without manual scrolling.
 *
 * Items are distributed to each `DayColumn` by date-matching:
 *   - Events are matched by comparing `item.startAt.slice(0, 10)` to the column
 *     date's ISO string.
 *   - Tasks are matched by comparing `item.dueDate` to the column date's ISO
 *     string.
 * Each `DayColumn` receives only the items that belong to its date; cross-date
 * filtering (all-day vs timed) is handled inside the child components.
 *
 * @module DayWeekGrid
 */

import React, { useEffect, useRef } from 'react';
import AllDayBanner from './AllDayBanner.jsx';
import TimeColumn from './TimeColumn.jsx';
import DayColumn from './DayColumn.jsx';

/** Number of pixels to scroll on mount (8 hours × 60 px / hour). */
const SCROLL_TO_8AM_PX = 8 * 60;

/**
 * Convert a Date object to a local-time ISO date string ("YYYY-MM-DD").
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
 * Filter `items` to those that belong to a specific column date.
 *
 * Events are matched via `startAt.slice(0, 10)`; tasks are matched via
 * `dueDate`. Items that lack both fields are excluded.
 *
 * @param {object[]} items         - Mixed array of event and task objects.
 * @param {string}   columnDateStr - ISO date string of the target column (e.g. "2026-05-08").
 * @returns {object[]} Items that belong to the given column date.
 */
function itemsForColumn(items, columnDateStr) {
  return items.filter((item) => {
    if (item.startAt) {
      return item.startAt.slice(0, 10) === columnDateStr;
    }
    if (item.dueDate) {
      return item.dueDate === columnDateStr;
    }
    return false;
  });
}

/**
 * DayWeekGrid — scrollable timed calendar grid for day and week views.
 *
 * @param {object}   props
 * @param {Date[]}   props.columns        - Ordered array of Date objects representing visible columns.
 * @param {object[]} props.items          - Mixed array of event and task objects.
 * @param {Function} props.onSlotClick    - Called with (date, hour) when an empty slot is clicked.
 * @param {Function} props.onEventClick   - Called with the event object when an EventChip is clicked.
 * @param {Function} props.onTaskClick    - Called with the task object when a TaskChip is clicked.
 * @param {Function} props.onEventDelete  - Called with the event's id when an EventChip delete is triggered.
 * @returns {JSX.Element}
 */
function DayWeekGrid({ columns, items, onSlotClick, onEventClick, onTaskClick, onEventDelete }) {
  /** Ref attached to the scrollable container so we can imperatively set scrollTop. */
  const scrollRef = useRef(null);

  /**
   * Scroll the timed grid to 08:00 on initial mount.
   * Uses a ref to avoid triggering re-renders.
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_8AM_PX;
    }
  }, []);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* All-day / timeless-task banner — sticky at the top of the grid */}
      <AllDayBanner
        columns={columns}
        items={items ?? []}
        onEventClick={onEventClick}
        onTaskClick={onTaskClick}
        onEventDelete={onEventDelete}
      />

      {/* Scrollable timed grid */}
      <div ref={scrollRef} className="flex overflow-y-auto">
        {/* Fixed-width time labels column */}
        <TimeColumn />

        {/* One DayColumn per date in columns */}
        {(columns ?? []).map((columnDate) => {
          const columnDateStr = toLocalDateStr(columnDate);
          const columnItems = itemsForColumn(items ?? [], columnDateStr);

          return (
            <DayColumn
              key={columnDateStr}
              date={columnDate}
              items={columnItems}
              onSlotClick={onSlotClick}
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

export default DayWeekGrid;
