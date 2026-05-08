/**
 * Zustand store for the Tasks module.
 * Manages the list of tasks, the currently selected task, available task tags,
 * sort state, active filters, loading/saving/error status, and all CRUD actions
 * that delegate to the API client. Derived `displayedTasks` is always
 * pinned-first, active-before-done, within the chosen sort order.
 * @module store/tasksStore
 */

import { create } from 'zustand';
import {
  getTasks,
  getTask,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from '../api/tasks.js';
import { getTaskTags } from '../api/task-tags.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @type {string[]} Statuses that represent a "done" task. */
const DONE_STATUSES = ['Completed', 'Cancelled'];

/** @type {number} Milliseconds before saveStatus resets from 'saved' to 'idle'. */
const SAVE_IDLE_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Return a priority rank number for sorting (lower = higher priority).
 * @param {string|undefined} priority - Task priority string.
 * @returns {number} Numeric rank for comparison.
 */
function _priorityRank(priority) {
  if (priority === 'High') return 0;
  if (priority === 'Medium') return 1;
  return 2; // Low or undefined
}

/**
 * Derive a sorted and filtered array of tasks from the full list, applying
 * status/priority filters, pinned-first ordering, and active-before-done
 * grouping within each pin tier.
 *
 * Sorting rules per sortKey:
 *   - `due_asc`      — dueDate ascending; null dates treated as '9999-12-31'
 *   - `due_desc`     — dueDate descending; null dates treated as '0000-01-01'
 *   - `priority_asc` — High → Medium → Low
 *   - `updated_desc` — updatedAt descending
 *
 * Final order: [pinnedActive, pinnedDone, unpinnedActive, unpinnedDone].
 *
 * @param {object[]} tasks          - Full array of camelCase task objects.
 * @param {string}   sortKey        - Active sort key.
 * @param {string[]} statusFilter   - Allowed status values; empty means allow all.
 * @param {string[]} priorityFilter - Allowed priority values; empty means allow all.
 * @returns {object[]} Filtered and sorted task array.
 */
function _deriveDisplayed(tasks, sortKey, statusFilter, priorityFilter) {
  // 1. Apply statusFilter
  let filtered = tasks;
  if (statusFilter.length > 0) {
    filtered = filtered.filter((t) => statusFilter.includes(t.status));
  }

  // 2. Apply priorityFilter
  if (priorityFilter.length > 0) {
    filtered = filtered.filter((t) => priorityFilter.includes(t.priority));
  }

  // 3. Separate into four buckets
  const isDone = (t) => DONE_STATUSES.includes(t.status);
  const pinnedActive = filtered.filter((t) => t.isPinned && !isDone(t));
  const pinnedDone = filtered.filter((t) => t.isPinned && isDone(t));
  const unpinnedActive = filtered.filter((t) => !t.isPinned && !isDone(t));
  const unpinnedDone = filtered.filter((t) => !t.isPinned && isDone(t));

  /**
   * Return a comparator for the given sort key.
   * Ties are broken by id descending (most recently created first) so equal-key
   * tasks always appear in a stable, predictable order.
   * @param {string} key - Sort key string.
   * @returns {(a: object, b: object) => number} Comparator function.
   */
  function comparator(key) {
    const tiebreak = (a, b) => b.id - a.id;

    if (key === 'due_asc') {
      return (a, b) => {
        const da = a.dueDate ?? '9999-12-31';
        const db = b.dueDate ?? '9999-12-31';
        return da < db ? -1 : da > db ? 1 : tiebreak(a, b);
      };
    }
    if (key === 'due_desc') {
      return (a, b) => {
        const da = a.dueDate ?? '0000-01-01';
        const db = b.dueDate ?? '0000-01-01';
        return da > db ? -1 : da < db ? 1 : tiebreak(a, b);
      };
    }
    if (key === 'priority_desc') {
      return (a, b) =>
        _priorityRank(a.priority) - _priorityRank(b.priority) || tiebreak(a, b);
    }
    // default: updated_desc
    return (a, b) => {
      const diff = new Date(b.updatedAt) - new Date(a.updatedAt);
      return diff !== 0 ? diff : tiebreak(a, b);
    };
  }

  // 4. Sort each bucket
  const cmp = comparator(sortKey);
  const sortBucket = (bucket) => [...bucket].sort(cmp);

  // 5. Concatenate
  return [
    ...sortBucket(pinnedActive),
    ...sortBucket(pinnedDone),
    ...sortBucket(unpinnedActive),
    ...sortBucket(unpinnedDone),
  ];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Zustand store hook for managing tasks state and actions.
 *
 * State shape:
 *   tasks          {object[]}    - Full list of tasks from the last fetch.
 *   selectedTask   {object|null} - Currently viewed/edited task.
 *   taskTags       {object[]}    - All available task tags.
 *   isLoading      {boolean}     - True while a fetch action is in flight.
 *   isSaving       {boolean}     - True while an updateTask call is in flight.
 *   saveStatus     {string}      - One of 'idle', 'saving', 'saved', 'error'.
 *   error          {string|null} - Last error message, or null if none.
 *   sortKey        {string}      - Active sort key, persisted to localStorage.
 *   statusFilter   {string[]}    - Active status filter values, persisted to localStorage.
 *   priorityFilter {string[]}    - Active priority filter values, persisted to localStorage.
 *   displayedTasks {object[]}    - Derived: filtered and sorted view of `tasks`.
 *
 * Actions:
 *   fetchTasks()                  - Load all tasks from the API.
 *   fetchTask(id)                 - Load a single task and set selectedTask.
 *   createTask(data)              - POST a new task and prepend to list.
 *   updateTask(id, data)          - PATCH a task; manages isSaving and saveStatus.
 *   deleteTask(id)                - DELETE a task and remove from list.
 *   fetchTaskTags()               - Load all task tags from the API.
 *   setSortKey(key)               - Update sortKey and persist to localStorage.
 *   setStatusFilter(values)       - Update statusFilter and persist to localStorage.
 *   setPriorityFilter(values)     - Update priorityFilter and persist to localStorage.
 *   setSelectedTask(task)         - Set selectedTask directly (no API call).
 *
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<object>>}
 */
export const useTasksStore = create((set, get) => ({
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  tasks: [],
  selectedTask: null,
  taskTags: [],
  isLoading: false,
  isSaving: false,
  saveStatus: 'idle',
  error: null,
  sortKey:
    (typeof localStorage !== 'undefined' && localStorage.getItem('tasks_sort')) ?? 'due_asc',
  statusFilter: (() => {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('tasks_filter_status') ?? '[]');
    } catch {
      return [];
    }
  })(),
  priorityFilter: (() => {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('tasks_filter_priority') ?? '[]');
    } catch {
      return [];
    }
  })(),
  displayedTasks: [],

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Fetch all tasks from the API and update state.
   * All filtering and sorting is done client-side; no query params are sent.
   * Sets `isLoading` around the request and re-derives `displayedTasks`.
   * @returns {Promise<void>}
   */
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await getTasks();
      const { sortKey, statusFilter, priorityFilter } = get();
      set({
        tasks,
        displayedTasks: _deriveDisplayed(tasks, sortKey, statusFilter, priorityFilter),
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /**
   * Fetch a single task by ID and store it as selectedTask.
   * @param {number} id - The task ID to fetch.
   * @returns {Promise<void>}
   */
  fetchTask: async (id) => {
    set({ isLoading: true, error: null, selectedTask: null, saveStatus: 'idle' });
    try {
      const task = await getTask(id);
      set({ selectedTask: task, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  /**
   * Create a new task via the API, then prepend it to the tasks list.
   * Re-derives `displayedTasks` after the update.
   * @param {object} data - camelCase task fields (title required).
   * @returns {Promise<object>} The newly created task object.
   */
  createTask: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const created = await apiCreateTask(data);
      const tasks = [created, ...get().tasks];
      const { sortKey, statusFilter, priorityFilter } = get();
      set({
        tasks,
        displayedTasks: _deriveDisplayed(tasks, sortKey, statusFilter, priorityFilter),
        isLoading: false,
      });
      return created;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Update an existing task via the API, then refresh its entry in the list.
   * Sets `isSaving = true` and `saveStatus = 'saving'` before the API call.
   * On success: sets `isSaving = false`, `saveStatus = 'saved'`, then schedules
   * a reset to `saveStatus = 'idle'` after 2 seconds.
   * On error: sets `isSaving = false` and `saveStatus = 'error'`.
   * Also updates selectedTask if it matches the updated ID.
   * @param {number} id   - The task ID to update.
   * @param {object} data - Partial camelCase task fields to update.
   * @returns {Promise<object>} The updated task object.
   */
  updateTask: async (id, data) => {
    set({ isSaving: true, saveStatus: 'saving', error: null });
    try {
      const updated = await apiUpdateTask(id, data);
      const { selectedTask, sortKey, statusFilter, priorityFilter } = get();
      const tasks = get().tasks.map((t) => (t.id === id ? updated : t));
      set({
        tasks,
        displayedTasks: _deriveDisplayed(tasks, sortKey, statusFilter, priorityFilter),
        selectedTask: selectedTask && selectedTask.id === id ? updated : selectedTask,
        isSaving: false,
        saveStatus: 'saved',
      });
      setTimeout(() => {
        set({ saveStatus: 'idle' });
      }, SAVE_IDLE_DELAY_MS);
      return updated;
    } catch (err) {
      set({ isSaving: false, saveStatus: 'error', error: err.message });
      throw err;
    }
  },

  /**
   * Delete a task by ID via the API, then remove it from the list.
   * Clears selectedTask if it matches the deleted ID.
   * @param {number} id - The task ID to delete.
   * @returns {Promise<void>}
   */
  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteTask(id);
      const { selectedTask, sortKey, statusFilter, priorityFilter } = get();
      const tasks = get().tasks.filter((t) => t.id !== id);
      set({
        tasks,
        displayedTasks: _deriveDisplayed(tasks, sortKey, statusFilter, priorityFilter),
        selectedTask: selectedTask && selectedTask.id === id ? null : selectedTask,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  /**
   * Fetch all available task tags from the API and update state.
   * @returns {Promise<void>}
   */
  fetchTaskTags: async () => {
    set({ error: null });
    try {
      const taskTags = await getTaskTags();
      set({ taskTags });
    } catch (err) {
      set({ error: err.message });
    }
  },

  /**
   * Update the sort key, persist it to localStorage, and re-derive displayedTasks.
   * No API call is made — sorting is applied to the already-fetched tasks.
   * @param {string} key - One of `due_asc`, `due_desc`, `priority_asc`, `updated_desc`.
   * @returns {void}
   */
  setSortKey: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('tasks_sort', key);
    const { tasks, statusFilter, priorityFilter } = get();
    set({
      sortKey: key,
      displayedTasks: _deriveDisplayed(tasks, key, statusFilter, priorityFilter),
    });
  },

  /**
   * Update the status filter, persist it to localStorage, and re-derive displayedTasks.
   * @param {string[]} values - Array of status strings to filter by; empty means show all.
   * @returns {void}
   */
  setStatusFilter: (values) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tasks_filter_status', JSON.stringify(values));
    }
    const { tasks, sortKey, priorityFilter } = get();
    set({
      statusFilter: values,
      displayedTasks: _deriveDisplayed(tasks, sortKey, values, priorityFilter),
    });
  },

  /**
   * Update the priority filter, persist it to localStorage, and re-derive displayedTasks.
   * @param {string[]} values - Array of priority strings to filter by; empty means show all.
   * @returns {void}
   */
  setPriorityFilter: (values) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tasks_filter_priority', JSON.stringify(values));
    }
    const { tasks, sortKey, statusFilter } = get();
    set({
      priorityFilter: values,
      displayedTasks: _deriveDisplayed(tasks, sortKey, statusFilter, values),
    });
  },

  /**
   * Set selectedTask directly without making an API call.
   * @param {object|null} task - The task to select, or null to deselect.
   * @returns {void}
   */
  setSelectedTask: (task) => {
    set({ selectedTask: task });
  },
}));
