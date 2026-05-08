/**
 * TaskList — renders a list of TaskCard components.
 * When `tasks` is empty the component renders nothing; the parent is responsible
 * for showing an EmptyState placeholder in that case.
 *
 * @param {object}   props
 * @param {object[]} props.tasks            - Array of task objects to display.
 * @param {Function} props.onSelect         - Callback invoked with a task object when a card is clicked.
 * @param {Function} props.onStatusChange   - Callback invoked with (id, status) when status is changed.
 * @returns {JSX.Element|null}
 */
import React from 'react';
import TaskCard from './TaskCard.jsx';

/**
 * TaskList renders an unordered list of TaskCard rows, one per task.
 *
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element|null}
 */
function TaskList({ tasks, onSelect, onStatusChange }) {
  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <ul
      role="list"
      className="flex flex-col gap-2"
    >
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            onSelect={onSelect}
            onStatusChange={onStatusChange}
          />
        </li>
      ))}
    </ul>
  );
}

export default TaskList;
