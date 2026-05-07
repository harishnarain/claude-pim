/**
 * TasksPage — list view for the Tasks module.
 * Fetches all tasks and task tags on mount, provides filter and sort controls,
 * and renders a card-based task list with an empty state when no tasks exist.
 *
 * Routing:
 *   - Clicking a TaskCard navigates to /tasks/:id
 *   - "New Task" navigates to /tasks/new
 *
 * @returns {JSX.Element}
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasksStore } from '../store/tasksStore.js';
import TaskList from '../components/TaskList.jsx';
import FilterControl from '../components/FilterControl.jsx';
import SortControl from '../components/SortControl.jsx';
import EmptyState from '../components/EmptyState.jsx';

/** Task-specific sort options passed to SortControl. */
const TASK_SORT_OPTIONS = [
  { value: 'due_asc', label: 'Due Date (Soonest)' },
  { value: 'due_desc', label: 'Due Date (Latest)' },
  { value: 'priority_desc', label: 'Priority (High→Low)' },
  { value: 'updated_desc', label: 'Last Modified' },
];

/**
 * TasksPage fetches tasks and tags on mount, and displays a sorted, filtered,
 * card-based list with inline status change support.
 *
 * @returns {JSX.Element}
 */
function TasksPage() {
  const navigate = useNavigate();
  const {
    displayedTasks,
    isLoading,
    error,
    sortKey,
    statusFilter,
    priorityFilter,
    fetchTasks,
    fetchTaskTags,
    setSortKey,
    setStatusFilter,
    setPriorityFilter,
    updateTask,
  } = useTasksStore();

  /** Fetch all tasks and tags when the page first mounts. */
  useEffect(() => {
    fetchTasks();
    fetchTaskTags();
  }, [fetchTasks, fetchTaskTags]);

  /**
   * Navigate to the task detail page when a card is selected.
   * @param {object} task - The clicked task object.
   */
  function handleSelect(task) {
    navigate(`/tasks/${task.id}`);
  }

  /** Navigate to the create task page. */
  function handleNewTask() {
    navigate('/tasks/new');
  }

  /**
   * Update the status of a task via the store.
   * @param {number} id     - ID of the task to update.
   * @param {string} status - New status value.
   */
  function handleStatusChange(id, status) {
    updateTask(id, { status });
  }

  /** True when at least one filter dimension is active. */
  const hasActiveFilters = statusFilter.length > 0 || priorityFilter.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button
          type="button"
          onClick={handleNewTask}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          New Task
        </button>
      </div>

      {/* Filter and sort controls */}
      {!isLoading && !error && (
        <div className="mb-4 flex flex-col gap-4">
          <FilterControl
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            onStatusChange={setStatusFilter}
            onPriorityChange={setPriorityFilter}
          />
          <div className="flex justify-end">
            <SortControl
              value={sortKey}
              onChange={setSortKey}
              options={TASK_SORT_OPTIONS}
            />
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <p className="text-center text-sm text-gray-500">Loading…</p>
      )}

      {/* Error banner */}
      {!isLoading && error && (
        <div
          className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Task list */}
      {!isLoading && !error && displayedTasks.length > 0 && (
        <TaskList
          tasks={displayedTasks}
          onSelect={handleSelect}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Empty state — no tasks at all, no active filters */}
      {!isLoading && !error && displayedTasks.length === 0 && !hasActiveFilters && (
        <EmptyState
          title="No tasks yet"
          message="Get started by creating your first task."
          action={
            <button
              type="button"
              onClick={handleNewTask}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              New Task
            </button>
          }
        />
      )}

      {/* Filtered empty message — tasks exist but none match filters */}
      {!isLoading && !error && displayedTasks.length === 0 && hasActiveFilters && (
        <p className="text-center text-sm text-gray-500">
          No tasks match your filters.
        </p>
      )}
    </div>
  );
}

export default TasksPage;
