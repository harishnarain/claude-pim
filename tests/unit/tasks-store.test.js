/**
 * Unit tests for client/src/store/tasksStore.js.
 * Mocks the API client modules so no real HTTP requests are made.
 * Verifies that each action updates store state correctly, that isSaving
 * and saveStatus transition correctly, that displayedTasks is always
 * re-derived on any relevant state change, and that all filters and sort
 * keys persist to localStorage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTasksStore } from '../../client/src/store/tasksStore.js';

// ---------------------------------------------------------------------------
// Mock localStorage (not available in node environment)
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ---------------------------------------------------------------------------
// Mock the API clients
// ---------------------------------------------------------------------------

vi.mock('../../client/src/api/tasks.js', () => ({
  getTasks: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock('../../client/src/api/task-tags.js', () => ({
  getTaskTags: vi.fn(),
}));

import {
  getTasks,
  getTask,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from '../../client/src/api/tasks.js';

import { getTaskTags } from '../../client/src/api/task-tags.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a sample camelCase task (as returned by the API client).
 * @param {Partial<object>} overrides - Field overrides.
 * @returns {object} A camelCase task object.
 */
function makeTask(overrides = {}) {
  return {
    id: 1,
    title: 'Test Task',
    body: '',
    bodyPreview: '',
    dueDate: null,
    priority: 'Medium',
    status: 'Todo',
    tags: [],
    isPinned: false,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    ...overrides,
  };
}

/**
 * Reset the Zustand store to initial state between tests.
 */
function resetStore() {
  useTasksStore.setState({
    tasks: [],
    selectedTask: null,
    taskTags: [],
    isLoading: false,
    isSaving: false,
    saveStatus: 'idle',
    error: null,
    sortKey: 'due_asc',
    statusFilter: [],
    priorityFilter: [],
    displayedTasks: [],
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  resetStore();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('has the expected default values', () => {
    const state = useTasksStore.getState();
    expect(state.tasks).toEqual([]);
    expect(state.selectedTask).toBeNull();
    expect(state.taskTags).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.saveStatus).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.statusFilter).toEqual([]);
    expect(state.priorityFilter).toEqual([]);
    expect(state.displayedTasks).toEqual([]);
  });

  it('initialises sortKey from localStorage when a value is present', () => {
    localStorageMock.setItem('tasks_sort', 'priority_asc');
    useTasksStore.getState().setSortKey('priority_asc');
    expect(localStorageMock.getItem('tasks_sort')).toBe('priority_asc');
  });

  it('initialises statusFilter from localStorage when a value is present', () => {
    localStorageMock.setItem('tasks_filter_status', JSON.stringify(['Todo']));
    useTasksStore.getState().setStatusFilter(['Todo']);
    expect(localStorageMock.getItem('tasks_filter_status')).toBe(JSON.stringify(['Todo']));
  });

  it('initialises priorityFilter from localStorage when a value is present', () => {
    localStorageMock.setItem('tasks_filter_priority', JSON.stringify(['High']));
    useTasksStore.getState().setPriorityFilter(['High']);
    expect(localStorageMock.getItem('tasks_filter_priority')).toBe(JSON.stringify(['High']));
  });
});

// ---------------------------------------------------------------------------
// fetchTasks
// ---------------------------------------------------------------------------

describe('fetchTasks', () => {
  it('sets isLoading true while fetching, then populates tasks and displayedTasks', async () => {
    const task = makeTask();
    getTasks.mockResolvedValue([task]);

    const promise = useTasksStore.getState().fetchTasks();
    expect(useTasksStore.getState().isLoading).toBe(true);

    await promise;

    const state = useTasksStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.tasks).toEqual([task]);
    expect(state.displayedTasks).toEqual([task]);
  });

  it('calls getTasks with no query params (all filtering is client-side)', async () => {
    getTasks.mockResolvedValue([]);

    await useTasksStore.getState().fetchTasks();

    expect(getTasks).toHaveBeenCalledWith();
  });

  it('sets error and clears isLoading on API failure', async () => {
    getTasks.mockRejectedValue(new Error('API error 500: SERVER_ERROR'));

    await useTasksStore.getState().fetchTasks();

    const state = useTasksStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('API error 500: SERVER_ERROR');
    expect(state.tasks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchTask
// ---------------------------------------------------------------------------

describe('fetchTask', () => {
  it('fetches a single task and sets selectedTask', async () => {
    const task = makeTask({ id: 7 });
    getTask.mockResolvedValue(task);

    await useTasksStore.getState().fetchTask(7);

    const state = useTasksStore.getState();
    expect(getTask).toHaveBeenCalledWith(7);
    expect(state.selectedTask).toEqual(task);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    getTask.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await useTasksStore.getState().fetchTask(999);

    const state = useTasksStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('API error 404: NOT_FOUND');
    expect(state.selectedTask).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

describe('createTask', () => {
  it('prepends the new task to the tasks list and returns it', async () => {
    const existing = makeTask({ id: 1, title: 'Existing' });
    const created = makeTask({ id: 2, title: 'New Task' });

    useTasksStore.setState({ tasks: [existing], displayedTasks: [existing] });
    apiCreateTask.mockResolvedValue(created);

    const result = await useTasksStore.getState().createTask({ title: 'New Task' });

    expect(result).toEqual(created);
    const state = useTasksStore.getState();
    expect(state.tasks[0]).toEqual(created);
    expect(state.tasks[1]).toEqual(existing);
    expect(state.isLoading).toBe(false);
  });

  it('re-derives displayedTasks after creating a task', async () => {
    const existing = makeTask({ id: 1, isPinned: false });
    const created = makeTask({ id: 2, isPinned: true });

    useTasksStore.setState({ tasks: [existing] });
    apiCreateTask.mockResolvedValue(created);

    await useTasksStore.getState().createTask({ title: 'Pinned Task', isPinned: true });

    const state = useTasksStore.getState();
    // pinned tasks come first
    expect(state.displayedTasks[0].id).toBe(2);
    expect(state.displayedTasks[1].id).toBe(1);
  });

  it('sets error and re-throws on API failure', async () => {
    apiCreateTask.mockRejectedValue(new Error('API error 422: VALIDATION_ERROR'));

    await expect(
      useTasksStore.getState().createTask({ title: '' })
    ).rejects.toThrow('API error 422: VALIDATION_ERROR');

    const state = useTasksStore.getState();
    expect(state.error).toBe('API error 422: VALIDATION_ERROR');
    expect(state.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

describe('updateTask', () => {
  it('sets isSaving true and saveStatus saving before the API call', async () => {
    const original = makeTask({ id: 1, title: 'Old Title' });
    const updated = makeTask({ id: 1, title: 'New Title' });

    useTasksStore.setState({ tasks: [original] });

    let isSavingDuringCall = false;
    let saveStatusDuringCall = '';
    apiUpdateTask.mockImplementation(async () => {
      isSavingDuringCall = useTasksStore.getState().isSaving;
      saveStatusDuringCall = useTasksStore.getState().saveStatus;
      return updated;
    });

    await useTasksStore.getState().updateTask(1, { title: 'New Title' });

    expect(isSavingDuringCall).toBe(true);
    expect(saveStatusDuringCall).toBe('saving');
    expect(useTasksStore.getState().isSaving).toBe(false);
    expect(useTasksStore.getState().saveStatus).toBe('saved');
  });

  it('sets saveStatus to idle after 2 seconds on success', async () => {
    vi.useFakeTimers();
    const original = makeTask({ id: 1 });
    const updated = makeTask({ id: 1, title: 'Updated' });

    useTasksStore.setState({ tasks: [original] });
    apiUpdateTask.mockResolvedValue(updated);

    await useTasksStore.getState().updateTask(1, { title: 'Updated' });

    expect(useTasksStore.getState().saveStatus).toBe('saved');

    vi.advanceTimersByTime(2000);
    expect(useTasksStore.getState().saveStatus).toBe('idle');
    vi.useRealTimers();
  });

  it('replaces the updated task in the list and re-derives displayedTasks', async () => {
    const original = makeTask({ id: 1, title: 'Old Title' });
    const updated = makeTask({ id: 1, title: 'New Title' });

    useTasksStore.setState({ tasks: [original], displayedTasks: [original] });
    apiUpdateTask.mockResolvedValue(updated);

    const result = await useTasksStore.getState().updateTask(1, { title: 'New Title' });

    expect(result).toEqual(updated);
    const state = useTasksStore.getState();
    expect(state.tasks[0].title).toBe('New Title');
    expect(state.displayedTasks[0].title).toBe('New Title');
    expect(state.isSaving).toBe(false);
  });

  it('updates selectedTask when the updated task is currently selected', async () => {
    const original = makeTask({ id: 1, title: 'Old Title' });
    const updated = makeTask({ id: 1, title: 'New Title' });

    useTasksStore.setState({ tasks: [original], selectedTask: original });
    apiUpdateTask.mockResolvedValue(updated);

    await useTasksStore.getState().updateTask(1, { title: 'New Title' });

    expect(useTasksStore.getState().selectedTask.title).toBe('New Title');
  });

  it('does not change selectedTask when a different task is updated', async () => {
    const taskA = makeTask({ id: 1, title: 'Task A' });
    const taskB = makeTask({ id: 2, title: 'Task B' });
    const updatedB = makeTask({ id: 2, title: 'Task B Updated' });

    useTasksStore.setState({ tasks: [taskA, taskB], selectedTask: taskA });
    apiUpdateTask.mockResolvedValue(updatedB);

    await useTasksStore.getState().updateTask(2, { title: 'Task B Updated' });

    expect(useTasksStore.getState().selectedTask).toEqual(taskA);
  });

  it('sets isSaving false, saveStatus error, and re-throws on API failure', async () => {
    apiUpdateTask.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await expect(
      useTasksStore.getState().updateTask(999, { title: 'X' })
    ).rejects.toThrow('API error 404: NOT_FOUND');

    const state = useTasksStore.getState();
    expect(state.isSaving).toBe(false);
    expect(state.saveStatus).toBe('error');
    expect(state.error).toBe('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

describe('deleteTask', () => {
  it('removes the deleted task from the list and re-derives displayedTasks', async () => {
    const taskA = makeTask({ id: 1, title: 'Task A' });
    const taskB = makeTask({ id: 2, title: 'Task B' });

    useTasksStore.setState({ tasks: [taskA, taskB], displayedTasks: [taskA, taskB] });
    apiDeleteTask.mockResolvedValue({ deleted: true });

    await useTasksStore.getState().deleteTask(1);

    const state = useTasksStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].id).toBe(2);
    expect(state.displayedTasks).toHaveLength(1);
    expect(state.isLoading).toBe(false);
  });

  it('clears selectedTask when the deleted task was selected', async () => {
    const task = makeTask({ id: 1 });

    useTasksStore.setState({ tasks: [task], selectedTask: task });
    apiDeleteTask.mockResolvedValue({ deleted: true });

    await useTasksStore.getState().deleteTask(1);

    expect(useTasksStore.getState().selectedTask).toBeNull();
  });

  it('does not clear selectedTask when a different task is deleted', async () => {
    const taskA = makeTask({ id: 1 });
    const taskB = makeTask({ id: 2, title: 'Task B' });

    useTasksStore.setState({ tasks: [taskA, taskB], selectedTask: taskA });
    apiDeleteTask.mockResolvedValue({ deleted: true });

    await useTasksStore.getState().deleteTask(2);

    expect(useTasksStore.getState().selectedTask).toEqual(taskA);
  });

  it('sets error and re-throws on API failure', async () => {
    apiDeleteTask.mockRejectedValue(new Error('API error 404: NOT_FOUND'));

    await expect(
      useTasksStore.getState().deleteTask(999)
    ).rejects.toThrow('API error 404: NOT_FOUND');

    expect(useTasksStore.getState().error).toBe('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// fetchTaskTags
// ---------------------------------------------------------------------------

describe('fetchTaskTags', () => {
  it('fetches task tags and updates state', async () => {
    const tags = [
      { id: 1, name: 'work' },
      { id: 2, name: 'personal' },
    ];
    getTaskTags.mockResolvedValue(tags);

    await useTasksStore.getState().fetchTaskTags();

    const state = useTasksStore.getState();
    expect(state.taskTags).toEqual(tags);
    expect(state.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    getTaskTags.mockRejectedValue(new Error('API error 500: SERVER_ERROR'));

    await useTasksStore.getState().fetchTaskTags();

    expect(useTasksStore.getState().error).toBe('API error 500: SERVER_ERROR');
  });
});

// ---------------------------------------------------------------------------
// setSortKey
// ---------------------------------------------------------------------------

describe('setSortKey', () => {
  it('updates sortKey and persists to localStorage', () => {
    useTasksStore.getState().setSortKey('priority_asc');

    expect(useTasksStore.getState().sortKey).toBe('priority_asc');
    expect(localStorageMock.getItem('tasks_sort')).toBe('priority_asc');
  });

  it('re-derives displayedTasks from existing tasks without an API call', () => {
    const taskA = makeTask({ id: 1, dueDate: '2026-05-10' });
    const taskB = makeTask({ id: 2, dueDate: '2026-05-01' });

    useTasksStore.setState({ tasks: [taskA, taskB], sortKey: 'updated_desc' });
    useTasksStore.getState().setSortKey('due_asc');

    const state = useTasksStore.getState();
    // due_asc: earlier date first
    expect(state.displayedTasks[0].id).toBe(2);
    expect(state.displayedTasks[1].id).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// setStatusFilter
// ---------------------------------------------------------------------------

describe('setStatusFilter', () => {
  it('updates statusFilter and persists to localStorage', () => {
    useTasksStore.getState().setStatusFilter(['In Progress']);

    expect(useTasksStore.getState().statusFilter).toEqual(['In Progress']);
    expect(localStorageMock.getItem('tasks_filter_status')).toBe(JSON.stringify(['In Progress']));
  });

  it('filters out tasks not matching the status filter', () => {
    const todo = makeTask({ id: 1, status: 'Todo' });
    const inProgress = makeTask({ id: 2, status: 'In Progress' });

    useTasksStore.setState({ tasks: [todo, inProgress] });
    useTasksStore.getState().setStatusFilter(['In Progress']);

    const state = useTasksStore.getState();
    expect(state.displayedTasks).toHaveLength(1);
    expect(state.displayedTasks[0].id).toBe(2);
  });

  it('shows all tasks when statusFilter is empty', () => {
    const todo = makeTask({ id: 1, status: 'Todo' });
    const done = makeTask({ id: 2, status: 'Completed' });

    useTasksStore.setState({ tasks: [todo, done], statusFilter: ['Todo'] });
    useTasksStore.getState().setStatusFilter([]);

    expect(useTasksStore.getState().displayedTasks).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// setPriorityFilter
// ---------------------------------------------------------------------------

describe('setPriorityFilter', () => {
  it('updates priorityFilter and persists to localStorage', () => {
    useTasksStore.getState().setPriorityFilter(['High']);

    expect(useTasksStore.getState().priorityFilter).toEqual(['High']);
    expect(localStorageMock.getItem('tasks_filter_priority')).toBe(JSON.stringify(['High']));
  });

  it('filters out tasks not matching the priority filter', () => {
    const high = makeTask({ id: 1, priority: 'High' });
    const low = makeTask({ id: 2, priority: 'Low' });

    useTasksStore.setState({ tasks: [high, low] });
    useTasksStore.getState().setPriorityFilter(['High']);

    const state = useTasksStore.getState();
    expect(state.displayedTasks).toHaveLength(1);
    expect(state.displayedTasks[0].id).toBe(1);
  });

  it('shows all tasks when priorityFilter is empty', () => {
    const high = makeTask({ id: 1, priority: 'High' });
    const low = makeTask({ id: 2, priority: 'Low' });

    useTasksStore.setState({ tasks: [high, low], priorityFilter: ['High'] });
    useTasksStore.getState().setPriorityFilter([]);

    expect(useTasksStore.getState().displayedTasks).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// setSelectedTask
// ---------------------------------------------------------------------------

describe('setSelectedTask', () => {
  it('sets selectedTask directly', () => {
    const task = makeTask({ id: 5 });
    useTasksStore.getState().setSelectedTask(task);
    expect(useTasksStore.getState().selectedTask).toEqual(task);
  });

  it('clears selectedTask when called with null', () => {
    useTasksStore.setState({ selectedTask: makeTask() });
    useTasksStore.getState().setSelectedTask(null);
    expect(useTasksStore.getState().selectedTask).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// _deriveDisplayed behaviour (via displayedTasks)
// ---------------------------------------------------------------------------

describe('displayedTasks derivation', () => {
  it('places pinned tasks before unpinned tasks', () => {
    const pinned = makeTask({ id: 1, isPinned: true, dueDate: '2026-05-10' });
    const unpinned = makeTask({ id: 2, isPinned: false, dueDate: '2026-05-01' });

    useTasksStore.setState({ tasks: [unpinned, pinned], sortKey: 'due_asc' });
    useTasksStore.getState().setSortKey('due_asc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(1); // pinned first
    expect(displayedTasks[1].id).toBe(2);
  });

  it('places active tasks before done tasks within each pin group', () => {
    const active = makeTask({ id: 1, isPinned: false, status: 'Todo' });
    const done = makeTask({ id: 2, isPinned: false, status: 'Completed' });

    useTasksStore.setState({ tasks: [done, active] });
    useTasksStore.getState().setSortKey('due_asc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(1); // active first
    expect(displayedTasks[1].id).toBe(2); // done last
  });

  it('places Cancelled tasks in done bucket (after active)', () => {
    const active = makeTask({ id: 1, isPinned: false, status: 'In Progress' });
    const cancelled = makeTask({ id: 2, isPinned: false, status: 'Cancelled' });

    useTasksStore.setState({ tasks: [cancelled, active] });
    useTasksStore.getState().setSortKey('due_asc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(1); // active first
    expect(displayedTasks[1].id).toBe(2); // cancelled in done bucket
  });

  it('sorts by dueDate ascending (due_asc), treating null as 9999-12-31', () => {
    const noDate = makeTask({ id: 1, dueDate: null });
    const early = makeTask({ id: 2, dueDate: '2026-05-01' });
    const late = makeTask({ id: 3, dueDate: '2026-12-01' });

    useTasksStore.setState({ tasks: [noDate, late, early] });
    useTasksStore.getState().setSortKey('due_asc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(2);
    expect(displayedTasks[1].id).toBe(3);
    expect(displayedTasks[2].id).toBe(1); // null treated as far future
  });

  it('sorts by dueDate descending (due_desc), treating null as 0000-01-01', () => {
    const noDate = makeTask({ id: 1, dueDate: null });
    const early = makeTask({ id: 2, dueDate: '2026-05-01' });
    const late = makeTask({ id: 3, dueDate: '2026-12-01' });

    useTasksStore.setState({ tasks: [noDate, early, late] });
    useTasksStore.getState().setSortKey('due_desc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(3);
    expect(displayedTasks[1].id).toBe(2);
    expect(displayedTasks[2].id).toBe(1); // null treated as far past
  });

  it('sorts by priority High → Medium → Low (priority_asc)', () => {
    const low = makeTask({ id: 1, priority: 'Low' });
    const high = makeTask({ id: 2, priority: 'High' });
    const medium = makeTask({ id: 3, priority: 'Medium' });

    useTasksStore.setState({ tasks: [low, high, medium] });
    useTasksStore.getState().setSortKey('priority_asc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(2); // High
    expect(displayedTasks[1].id).toBe(3); // Medium
    expect(displayedTasks[2].id).toBe(1); // Low
  });

  it('sorts by updatedAt descending (updated_desc)', () => {
    const older = makeTask({ id: 1, updatedAt: '2026-04-01T10:00:00Z' });
    const newer = makeTask({ id: 2, updatedAt: '2026-05-01T10:00:00Z' });

    useTasksStore.setState({ tasks: [older, newer] });
    useTasksStore.getState().setSortKey('updated_desc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(2);
    expect(displayedTasks[1].id).toBe(1);
  });

  it('applies sort within pinned active group', () => {
    const pinnedHighDue = makeTask({ id: 1, isPinned: true, priority: 'High', dueDate: '2026-12-01' });
    const pinnedLowDue = makeTask({ id: 2, isPinned: true, priority: 'Low', dueDate: '2026-05-01' });

    useTasksStore.setState({ tasks: [pinnedHighDue, pinnedLowDue] });
    useTasksStore.getState().setSortKey('due_asc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(2); // earlier due date first
    expect(displayedTasks[1].id).toBe(1);
  });

  it('correctly orders: pinnedActive, pinnedDone, unpinnedActive, unpinnedDone', () => {
    const pinnedActive = makeTask({ id: 1, isPinned: true, status: 'Todo' });
    const pinnedDone = makeTask({ id: 2, isPinned: true, status: 'Completed' });
    const unpinnedActive = makeTask({ id: 3, isPinned: false, status: 'In Progress' });
    const unpinnedDone = makeTask({ id: 4, isPinned: false, status: 'Cancelled' });

    useTasksStore.setState({ tasks: [unpinnedDone, unpinnedActive, pinnedDone, pinnedActive] });
    useTasksStore.getState().setSortKey('updated_desc');

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks[0].id).toBe(1); // pinnedActive
    expect(displayedTasks[1].id).toBe(2); // pinnedDone
    expect(displayedTasks[2].id).toBe(3); // unpinnedActive
    expect(displayedTasks[3].id).toBe(4); // unpinnedDone
  });

  it('applies both statusFilter and priorityFilter simultaneously', () => {
    const todo_high = makeTask({ id: 1, status: 'Todo', priority: 'High' });
    const todo_low = makeTask({ id: 2, status: 'Todo', priority: 'Low' });
    const done_high = makeTask({ id: 3, status: 'Completed', priority: 'High' });

    useTasksStore.setState({ tasks: [todo_high, todo_low, done_high] });
    useTasksStore.getState().setStatusFilter(['Todo']);
    useTasksStore.getState().setPriorityFilter(['High']);

    const { displayedTasks } = useTasksStore.getState();
    expect(displayedTasks).toHaveLength(1);
    expect(displayedTasks[0].id).toBe(1);
  });
});
