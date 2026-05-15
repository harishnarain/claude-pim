/**
 * UpcomingEventsWidget — Dashboard widget that lists upcoming calendar events.
 *
 * Renders up to 5 upcoming event rows (sorting/slicing is done by the hook
 * before the data reaches this component). Each row shows a relative day
 * label, the event's start time, title, and optional location, and is a
 * clickable link to the calendar page.
 *
 * A "View calendar" footer link is passed to WidgetCard only when the total
 * upcoming event count exceeds 5 (i.e. items were capped by the hook).
 *
 * @param {object}   props
 * @param {object[]} props.events - Upcoming event objects, already sorted and
 *                                  sliced to a maximum of 5 by the hook.
 * @param {number}   props.total  - Total upcoming event count before the cap.
 * @returns {JSX.Element}
 */
import React from 'react';
import { Link } from 'react-router-dom';
import WidgetCard from './WidgetCard.jsx';
import {
  formatRelativeFutureDate,
  formatEventTime,
  getTodayISO,
} from '../utils/dashboard-dates.js';

/**
 * UpcomingEventsWidget renders upcoming event rows inside a WidgetCard shell.
 *
 * @param {object}   props        - Component props.
 * @param {object[]} props.events - Upcoming events (max 5, pre-sorted).
 * @param {number}   props.total  - Total upcoming event count before the cap.
 * @returns {JSX.Element}
 */
function UpcomingEventsWidget({ events, total }) {
  const todayISO = getTodayISO();

  /** Only show the "View calendar" link when there are more than 5 upcoming events. */
  const viewAllTo = total > 5 ? '/calendar' : null;
  const viewAllLabel = total > 5 ? 'View calendar' : undefined;

  return (
    <WidgetCard
      title="Upcoming Events"
      viewAllTo={viewAllTo}
      viewAllLabel={viewAllLabel}
    >
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming events.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                to="/calendar"
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="w-16 shrink-0 text-xs font-medium text-indigo-600">
                  {formatRelativeFutureDate(event.startAt.slice(0, 10), todayISO)}
                </span>
                <span className="w-10 shrink-0 font-mono text-xs text-gray-500">
                  {formatEventTime(event.startAt)}
                </span>
                <span className="flex-1 truncate font-medium text-gray-800">
                  {event.title}
                </span>
                {event.location && (
                  <span className="truncate text-xs text-gray-400">
                    {event.location}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export default UpcomingEventsWidget;
