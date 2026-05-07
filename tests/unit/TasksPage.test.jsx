/**
 * Unit tests for the TasksPage list view.
 *
 * The Zustand store and react-router-dom are fully mocked so tests run in
 * isolation without a real API or browser router.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared mock navigate function so tests can assert navigation calls. */
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

/** Mutable store state — reset in beforeEach. */
let storeState = {};

vi.mock('../../client/src/store/tasksStore.js', () => ({
  useTasksStore: () => storeState,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sample tasks fixture. */
const TASKS = [
  {
    id: 1,
    title: 'First Task',
    status: 'Not Started',
    priority: 'Medium',
    isPinned: false,
    dueDate: null,
    tags: [],
    updatedAt: '2025-01-01T12:00:00.000Z',
  },
  {
    id: 2,
    title: 'Second Task',
    status: 'In Progress',
    priority: 'High',
    isPinned: true,
    dueDate: '2025-02-01',
    tags: [{ name: 'urgent' }],
    updatedAt: '2025-01-02T12:00:00.000Z',
  },
];

/**
 * Build default store state, merging in overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
function buildStore(overrides = {}) {
  return {
    displayedTasks: TASKS,
    isLoading: false,
    error: null,
    sortKey: 'due_asc',
    statusFilter: [],
    priorityFilter: [],
    fetchTasks: vi.fn(),
    fetchTaskTags: vi.fn(),
    setSortKey: vi.fn(),
    setStatusFilter: vi.fn(),
    setPriorityFilter: vi.fn(),
    updateTask: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TasksPage tests
// ---------------------------------------------------------------------------

import TasksPage from '../../client/src/pages/TasksPage.jsx';

describe('TasksPage', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockNavigate.mockClear();
  });

  // -------------------------------------------------------------------------
  // Fetch on mount
  // -------------------------------------------------------------------------

  it('calls fetchTasks on mount', () => {
    render(<TasksPage />);
    expect(storeState.fetchTasks).toHaveBeenCalledTimes(1);
  });

  it('calls fetchTaskTags on mount', () => {
    render(<TasksPage />);
    expect(storeState.fetchTaskTags).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Page header
  // -------------------------------------------------------------------------

  it('renders the page heading', () => {
    render(<TasksPage />);
    expect(screen.getByRole('heading', { name: /tasks/i })).toBeInTheDocument();
  });

  it('renders the New Task button', () => {
    render(<TasksPage />);
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
  });

  it('navigates to /tasks/new when New Task is clicked', () => {
    render(<TasksPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /new task/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/new');
  });

  // -------------------------------------------------------------------------
  // Task list rendering
  // -------------------------------------------------------------------------

  it('renders a list of tasks when available', () => {
    render(<TasksPage />);
    expect(screen.getByText('First Task')).toBeInTheDocument();
    expect(screen.getByText('Second Task')).toBeInTheDocument();
  });

  it('navigates to /tasks/:id when a task card is clicked', () => {
    render(<TasksPage />);
    const firstCard = screen.getByText('First Task').closest('[role="button"]');
    fireEvent.click(firstCard);
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/1');
  });

  // -------------------------------------------------------------------------
  // Sort control wiring
  // -------------------------------------------------------------------------

  it('renders the SortControl when tasks are present', () => {
    render(<TasksPage />);
    expect(screen.getByRole('combobox', { name: /sort/i })).toBeInTheDocument();
  });

  it('renders task-specific sort options', () => {
    render(<TasksPage />);
    expect(screen.getByRole('option', { name: 'Due Date (Soonest)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Due Date (Latest)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Priority (High→Low)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last Modified' })).toBeInTheDocument();
  });

  it('calls setSortKey when the sort control changes', () => {
    render(<TasksPage />);
    const select = screen.getByRole('combobox', { name: /sort/i });
    fireEvent.change(select, { target: { value: 'priority_desc' } });
    expect(storeState.setSortKey).toHaveBeenCalledWith('priority_desc');
  });

  // -------------------------------------------------------------------------
  // Filter control wiring
  // -------------------------------------------------------------------------

  it('renders the FilterControl status buttons', () => {
    render(<TasksPage />);
    expect(screen.getByRole('button', { name: 'Not Started' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument();
  });

  it('calls setStatusFilter when a status button is toggled', () => {
    render(<TasksPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Not Started' }));
    expect(storeState.setStatusFilter).toHaveBeenCalledWith(['Not Started']);
  });

  it('calls setPriorityFilter when a priority button is toggled', () => {
    render(<TasksPage />);
    fireEvent.click(screen.getByRole('button', { name: 'High' }));
    expect(storeState.setPriorityFilter).toHaveBeenCalledWith(['High']);
  });

  // -------------------------------------------------------------------------
  // Status change on a card
  // -------------------------------------------------------------------------

  it('calls updateTask when status changes on a card', () => {
    render(<TasksPage />);
    // Find the status select for the first task by its aria-label
    const statusSelects = screen.getAllByRole('combobox', { name: /change status/i });
    fireEvent.change(statusSelects[0], { target: { value: 'In Progress' } });
    expect(storeState.updateTask).toHaveBeenCalledWith(TASKS[0].id, { status: 'In Progress' });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  it('shows a loading indicator when isLoading is true', () => {
    storeState = buildStore({ isLoading: true, displayedTasks: [] });
    render(<TasksPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('does not show the filter/sort controls while loading', () => {
    storeState = buildStore({ isLoading: true, displayedTasks: [] });
    render(<TasksPage />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error banner
  // -------------------------------------------------------------------------

  it('shows an error banner when error is set', () => {
    storeState = buildStore({ error: 'Failed to fetch tasks.', displayedTasks: [] });
    render(<TasksPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch tasks.');
  });

  it('does not show an error banner when there is no error', () => {
    render(<TasksPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Empty state (no tasks, no active filters)
  // -------------------------------------------------------------------------

  it('shows the empty state when displayedTasks is empty and no filters are active', () => {
    storeState = buildStore({ displayedTasks: [], statusFilter: [], priorityFilter: [] });
    render(<TasksPage />);
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it('shows a New Task button inside the empty state', () => {
    storeState = buildStore({ displayedTasks: [], statusFilter: [], priorityFilter: [] });
    render(<TasksPage />);
    const newTaskButtons = screen.getAllByRole('button', { name: /new task/i });
    expect(newTaskButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('navigates to /tasks/new when the empty state New Task button is clicked', () => {
    storeState = buildStore({ displayedTasks: [], statusFilter: [], priorityFilter: [] });
    render(<TasksPage />);
    const newTaskButtons = screen.getAllByRole('button', { name: /new task/i });
    fireEvent.click(newTaskButtons[newTaskButtons.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/new');
  });

  // -------------------------------------------------------------------------
  // Filtered-empty message (tasks exist but none match filters)
  // -------------------------------------------------------------------------

  it('shows "No tasks match your filters" when displayedTasks is empty and filters are active', () => {
    storeState = buildStore({
      displayedTasks: [],
      statusFilter: ['Completed'],
      priorityFilter: [],
    });
    render(<TasksPage />);
    expect(screen.getByText(/no tasks match your filters/i)).toBeInTheDocument();
  });

  it('does not show EmptyState when filters are active but results are empty', () => {
    storeState = buildStore({
      displayedTasks: [],
      statusFilter: ['Completed'],
      priorityFilter: [],
    });
    render(<TasksPage />);
    expect(screen.queryByText(/no tasks yet/i)).not.toBeInTheDocument();
  });
});
