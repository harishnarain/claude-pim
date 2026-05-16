/**
 * UpcomingTasksWidget — Dashboard widget listing upcoming tasks.
 *
 * Displays up to 5 upcoming tasks inside a WidgetCard. Each row shows
 * the task title, a relative due-date label, and a priority badge.
 * Rows are wrapped in a react-router-dom Link to `/tasks/:id`.
 *
 * A "View all tasks" footer link is shown only when `total > 5`.
 *
 * @param {object}   props
 * @param {object[]} props.tasks  - Upcoming task objects already sorted and
 *                                  sliced to a maximum of 5 by the caller.
 * @param {number}   props.total  - Total upcoming task count before the 5-item cap.
 * @returns {JSX.Element}
 */
import React from 'react';
import { Link } from 'react-router-dom';
import WidgetCard from './WidgetCard.jsx';
import PriorityBadge from './PriorityBadge.jsx';
import { formatRelativeFutureDate, getTodayISO } from '../utils/dashboard-dates.js';

/**
 * UpcomingTasksWidget renders a WidgetCard listing upcoming tasks.
 *
 * @param {object}   props
 * @param {object[]} props.tasks  - Up to 5 upcoming task objects.
 * @param {number}   props.total  - Total upcoming task count (pre-cap).
 * @returns {JSX.Element}
 */
function UpcomingTasksWidget({ tasks, total }) {
  const todayISO = getTodayISO();

  const viewAllTo = total > 5 ? '/tasks' : null;
  const viewAllLabel = 'View all tasks';

  return (
    <WidgetCard
      title="Upcoming Tasks"
      viewAllTo={viewAllTo}
      viewAllLabel={viewAllLabel}
    >
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming tasks.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                to={`/tasks/${task.id}`}
                className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-gray-50"
              >
                <span className="flex-1 truncate text-sm text-gray-900">
                  {task.title}
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {formatRelativeFutureDate(task.dueDate, todayISO)}
                </span>
                <PriorityBadge priority={task.priority} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export default UpcomingTasksWidget;
