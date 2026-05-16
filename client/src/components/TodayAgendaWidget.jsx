/**
 * TodayAgendaWidget — Dashboard widget showing today's calendar events
 * and tasks due today.
 *
 * Renders two labelled sub-sections inside a WidgetCard:
 *   1. "Events today" — up to 5 events with formatted start time, title, and
 *      optional location. Each row links to /calendar.
 *   2. "Tasks due today" — up to 5 tasks with title, PriorityBadge, and
 *      StatusBadge. Each row links to /tasks/:id.
 *
 * Empty-state messages are shown when either array is empty.
 * "View all" links appear below the list only when more than 5 items exist.
 *
 * @param {object}   props
 * @param {object[]} props.todayEvents - All of today's calendar events.
 * @param {object[]} props.todayTasks  - All tasks due today.
 * @returns {JSX.Element}
 */
import React from 'react';
import { Link } from 'react-router-dom';
import WidgetCard from './WidgetCard.jsx';
import PriorityBadge from './PriorityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatEventTime } from '../utils/dashboard-dates.js';

/** Maximum number of items shown per sub-section before a "View all" link. */
const MAX_ITEMS = 5;

/**
 * TodayAgendaWidget renders today's events and tasks in a shared card.
 *
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function TodayAgendaWidget({ todayEvents, todayTasks }) {
  const visibleEvents = todayEvents.slice(0, MAX_ITEMS);
  const visibleTasks = todayTasks.slice(0, MAX_ITEMS);

  return (
    <WidgetCard title="Today's Agenda">
      {/* ------------------------------------------------------------------ */}
      {/* Events today sub-section                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Events today
        </h3>

        {todayEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No events today</p>
        ) : (
          <ul className="space-y-1">
            {visibleEvents.map((event) => (
              <li key={event.id}>
                <Link
                  to="/calendar"
                  className="flex items-baseline gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50"
                >
                  <span className="w-10 shrink-0 font-mono text-xs text-gray-500">
                    {formatEventTime(event.startAt)}
                  </span>
                  <span className="font-medium text-gray-900">{event.title}</span>
                  {event.location && (
                    <span className="truncate text-xs text-gray-400">{event.location}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {todayEvents.length > MAX_ITEMS && (
          <div className="mt-2">
            <Link
              to="/calendar"
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
            >
              View all
            </Link>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tasks due today sub-section                                         */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Tasks due today
        </h3>

        {todayTasks.length === 0 ? (
          <p className="text-sm text-gray-400">No tasks due today</p>
        ) : (
          <ul className="space-y-1">
            {visibleTasks.map((task) => (
              <li key={task.id}>
                <Link
                  to={`/tasks/${task.id}`}
                  className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50"
                >
                  <span className="flex-1 font-medium text-gray-900">{task.title}</span>
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {todayTasks.length > MAX_ITEMS && (
          <div className="mt-2">
            <Link
              to="/tasks"
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
            >
              View all tasks
            </Link>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

export default TodayAgendaWidget;
