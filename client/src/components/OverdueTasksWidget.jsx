/**
 * OverdueTasksWidget — Dashboard widget that lists overdue tasks.
 *
 * Renders up to 5 overdue task rows (sorting/slicing is done by the hook
 * before the data reaches this component). Each row shows the task title,
 * a relative past-date label, and a priority badge, and is a clickable link
 * to the task detail page.
 *
 * A "View all tasks" footer link is passed to WidgetCard only when the total
 * overdue count exceeds 5 (i.e. items were capped by the hook).
 *
 * @param {object}   props
 * @param {object[]} props.tasks - Overdue task objects, already sorted and
 *                                 sliced to a maximum of 5 by the hook.
 * @param {number}   props.total - Total overdue count before the 5-item cap.
 * @returns {JSX.Element}
 */
import React from 'react';
import { Link } from 'react-router-dom';
import WidgetCard from './WidgetCard.jsx';
import PriorityBadge from './PriorityBadge.jsx';
import { formatRelativePastDate, getTodayISO } from '../utils/dashboard-dates.js';

/**
 * OverdueTasksWidget renders overdue task rows inside a WidgetCard shell.
 *
 * @param {object}   props        - Component props.
 * @param {object[]} props.tasks  - Overdue tasks (max 5, pre-sorted).
 * @param {number}   props.total  - Total overdue count before the 5-item cap.
 * @returns {JSX.Element}
 */
function OverdueTasksWidget({ tasks, total }) {
  const todayISO = getTodayISO();

  /** Only show the "View all" link when there are more than 5 overdue tasks. */
  const viewAllTo = total > 5 ? '/tasks' : null;
  const viewAllLabel = total > 5 ? 'View all tasks' : undefined;

  return (
    <WidgetCard
      title="Overdue Tasks"
      viewAllTo={viewAllTo}
      viewAllLabel={viewAllLabel}
    >
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500">You're all caught up.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                to={`/tasks/${task.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="flex-1 truncate font-medium text-gray-800">
                  {task.title}
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {formatRelativePastDate(task.dueDate, todayISO)}
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

export default OverdueTasksWidget;
