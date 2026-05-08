/**
 * Unit tests for client/src/pages/TaskEditorPage.jsx.
 *
 * The Zustand store and react-router-dom are fully mocked so tests run in
 * isolation without a real API or browser router.
 *
 * Covered scenarios:
 *   - Create-mode: calls createTask immediately and redirects with replace
 *   - Edit-mode: calls fetchTask + fetchTaskTags on mount, renders all fields/tags/pin
 *   - Auto-save debounce fires after 800 ms of inactivity
 *   - Auto-save is suppressed when title is empty
 *   - Blur flushes the debounce immediately (calls updateTask synchronously)
 *   - Pin toggle calls setSelectedTask and updateTask with toggled isPinned immediately
 *   - Tag change calls updateTask with new tags then fetchTaskTags
 *   - Delete button opens ConfirmDialog; confirm calls deleteTask and navigates
 *   - Cancel in ConfirmDialog closes without deleting
 *   - 404 / not-found error redirects to /tasks
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared navigate mock. */
const mockNavigate = vi.fn();

/** Mutable params — set per test. */
let mockParams = { id: '42' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useMatch: (pattern) => (pattern === '/tasks/new' && mockParams.id === undefined ? {} : null),
}));

/** Mutable store state — reset in beforeEach. */
let storeState = {};

vi.mock('../../client/src/store/tasksStore.js', () => ({
  useTasksStore: () => storeState,
}));

// ---------------------------------------------------------------------------
// Mock child components so tests stay focused on TaskEditorPage logic.
// ---------------------------------------------------------------------------

vi.mock('../../client/src/components/TaskForm.jsx', () => ({
  default: ({ task, onChange, onBlur }) => (
    <div data-testid="task-form">
      <input
        aria-label="Task title"
        value={task?.title ?? ''}
        onChange={(e) => onChange({ title: e.target.value })}
        onBlur={onBlur}
      />
      <textarea
        aria-label="Task body"
        value={task?.body ?? ''}
        onChange={(e) => onChange({ body: e.target.value })}
        onBlur={onBlur}
      />
    </div>
  ),
}));

vi.mock('../../client/src/components/TaskToolbar.jsx', () => ({
  default: ({ isPinned, onTogglePin, onDelete, isSaving, saveStatus }) => (
    <div data-testid="task-toolbar">
      <button type="button" aria-pressed={isPinned} onClick={onTogglePin}>
        {isPinned ? 'Pinned' : 'Pin'}
      </button>
      <button type="button" onClick={onDelete}>Delete</button>
      {isSaving && <span>Saving...</span>}
      {saveStatus && <span data-testid="save-status">{saveStatus}</span>}
    </div>
  ),
}));

vi.mock('../../client/src/components/TagCombobox.jsx', () => ({
  default: ({ selected, available, onChange }) => (
    <div data-testid="tag-combobox">
      <button
        type="button"
        onClick={() => onChange([...selected, { id: 99, name: 'new-tag' }])}
      >
        Add Tag
      </button>
      <span data-testid="selected-tags">{JSON.stringify(selected)}</span>
      <span data-testid="available-tags">{JSON.stringify(available)}</span>
    </div>
  ),
}));

// ConfirmDialog is used as-is so we can test open/close behaviour.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A populated task fixture. */
const TASK = {
  id: 42,
  title: 'Fix the bug',
  body: 'Details here',
  priority: 'High',
  status: 'In Progress',
  dueDate: '2026-06-01',
  isPinned: false,
  tags: [{ id: 1, name: 'urgent' }],
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
};

/** Available task tags fixture. */
const TASK_TAGS = [{ id: 1, name: 'urgent' }, { id: 2, name: 'backlog' }];

/**
 * Build a default store state, merging in overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
function buildStore(overrides = {}) {
  return {
    selectedTask: TASK,
    taskTags: TASK_TAGS,
    isLoading: false,
    isSaving: false,
    saveStatus: 'idle',
    error: null,
    fetchTask: vi.fn().mockResolvedValue(undefined),
    fetchTaskTags: vi.fn().mockResolvedValue(undefined),
    createTask: vi.fn().mockResolvedValue({ ...TASK, id: 99 }),
    updateTask: vi.fn().mockResolvedValue({ ...TASK }),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    setSelectedTask: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import the component under test (after mocks are set up)
// ---------------------------------------------------------------------------

import TaskEditorPage from '../../client/src/pages/TaskEditorPage.jsx';

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('TaskEditorPage — create mode (id === "new")', () => {
  beforeEach(() => {
    storeState = buildStore({ selectedTask: null });
    mockParams = { id: 'new' };
    mockNavigate.mockClear();
  });

  it('shows a "Creating task…" spinner while creating', async () => {
    let resolveCreate;
    storeState.createTask = vi.fn(
      () => new Promise((resolve) => { resolveCreate = resolve; })
    );

    render(<TaskEditorPage />);
    expect(screen.getByText(/creating task/i)).toBeInTheDocument();

    // Clean up by resolving
    await act(async () => resolveCreate({ ...TASK, id: 99 }));
  });

  it('calls createTask with correct defaults on mount and navigates with replace', async () => {
    render(<TaskEditorPage />);

    await waitFor(() => {
      expect(storeState.createTask).toHaveBeenCalledWith({
        title: 'New Task',
        priority: 'Low',
        status: 'Not Started',
        isPinned: false,
        tags: [],
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tasks/99', { replace: true });
    });
  });

  it('navigates to /tasks if createTask throws', async () => {
    storeState.createTask = vi.fn().mockRejectedValue(new Error('fail'));
    render(<TaskEditorPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tasks');
    });
  });
});

describe('TaskEditorPage — edit mode (rendering)', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('calls fetchTask and fetchTaskTags with the route param id on mount', async () => {
    render(<TaskEditorPage />);

    await waitFor(() => {
      expect(storeState.fetchTask).toHaveBeenCalledWith('42');
    });
    await waitFor(() => {
      expect(storeState.fetchTaskTags).toHaveBeenCalled();
    });
  });

  it('renders the task title in the input', () => {
    render(<TaskEditorPage />);
    expect(screen.getByRole('textbox', { name: /task title/i })).toHaveValue('Fix the bug');
  });

  it('renders the pin state from the task', () => {
    render(<TaskEditorPage />);
    const pinBtn = screen.getByRole('button', { name: /^pin$/i });
    expect(pinBtn).toBeInTheDocument();
  });

  it('renders the selected tags from the task', () => {
    render(<TaskEditorPage />);
    const tagDisplay = screen.getByTestId('selected-tags');
    expect(tagDisplay.textContent).toContain('urgent');
  });

  it('renders the available task tags from the store', () => {
    render(<TaskEditorPage />);
    const availableTags = screen.getByTestId('available-tags');
    expect(availableTags.textContent).toContain('backlog');
  });

  it('shows a loading indicator when isLoading is true and task is not yet available', () => {
    storeState = buildStore({ selectedTask: null, isLoading: true });
    render(<TaskEditorPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders nothing (no form) when task is null and not loading', () => {
    storeState = buildStore({ selectedTask: null, isLoading: false, error: null });
    render(<TaskEditorPage />);
    expect(screen.queryByTestId('task-form')).not.toBeInTheDocument();
  });
});

describe('TaskEditorPage — auto-save debounce', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('does NOT call updateTask immediately on field change', () => {
    render(<TaskEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /task title/i });

    fireEvent.change(titleInput, { target: { value: 'New title' } });

    expect(storeState.updateTask).not.toHaveBeenCalled();
  });

  it('calls updateTask with merged localTask after 800 ms debounce', () => {
    render(<TaskEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /task title/i });

    fireEvent.change(titleInput, { target: { value: 'Debounced title' } });

    act(() => { vi.advanceTimersByTime(799); });
    expect(storeState.updateTask).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });

    expect(storeState.updateTask).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: 'Debounced title' })
    );
  });

  it('resets the debounce timer on each change (only fires once)', () => {
    render(<TaskEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /task title/i });

    fireEvent.change(titleInput, { target: { value: 'First' } });
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.change(titleInput, { target: { value: 'Second' } });
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.change(titleInput, { target: { value: 'Third' } });
    act(() => { vi.advanceTimersByTime(800); });

    expect(storeState.updateTask).toHaveBeenCalledTimes(1);
    expect(storeState.updateTask).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: 'Third' })
    );
  });

  it('suppresses auto-save when title is empty', () => {
    render(<TaskEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /task title/i });

    fireEvent.change(titleInput, { target: { value: '' } });
    act(() => { vi.advanceTimersByTime(1000); });

    expect(storeState.updateTask).not.toHaveBeenCalled();
  });

  it('suppresses auto-save when title is whitespace-only', () => {
    render(<TaskEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /task title/i });

    fireEvent.change(titleInput, { target: { value: '   ' } });
    act(() => { vi.advanceTimersByTime(1000); });

    expect(storeState.updateTask).not.toHaveBeenCalled();
  });
});

describe('TaskEditorPage — blur flush', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('calls updateTask immediately on blur when there are unsaved changes', () => {
    render(<TaskEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /task title/i });

    fireEvent.change(titleInput, { target: { value: 'Unsaved title' } });

    act(() => { vi.advanceTimersByTime(400); });
    expect(storeState.updateTask).not.toHaveBeenCalled();

    fireEvent.blur(titleInput);

    expect(storeState.updateTask).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ title: 'Unsaved title' })
    );
  });

  it('does NOT call updateTask on blur when title is empty', () => {
    render(<TaskEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /task title/i });

    fireEvent.change(titleInput, { target: { value: '' } });

    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.blur(titleInput);

    expect(storeState.updateTask).not.toHaveBeenCalled();
  });
});

describe('TaskEditorPage — pin toggle', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('calls setSelectedTask and updateTask with toggled isPinned immediately', async () => {
    render(<TaskEditorPage />);
    const pinBtn = screen.getByRole('button', { name: /^pin$/i });

    await userEvent.click(pinBtn);

    expect(storeState.setSelectedTask).toHaveBeenCalledWith(
      expect.objectContaining({ isPinned: true })
    );
    expect(storeState.updateTask).toHaveBeenCalledWith(42, { isPinned: true });
  });

  it('toggles isPinned to false when the task is already pinned', async () => {
    storeState = buildStore({ selectedTask: { ...TASK, isPinned: true } });
    render(<TaskEditorPage />);
    const pinBtn = screen.getByRole('button', { name: /^pinned$/i });

    await userEvent.click(pinBtn);

    expect(storeState.updateTask).toHaveBeenCalledWith(42, { isPinned: false });
  });
});

describe('TaskEditorPage — tag change', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('calls updateTask with new tags and then fetchTaskTags on tag change', async () => {
    render(<TaskEditorPage />);
    const addTagBtn = screen.getByRole('button', { name: /add tag/i });

    await userEvent.click(addTagBtn);

    await waitFor(() => {
      expect(storeState.updateTask).toHaveBeenCalledWith(
        42,
        { tags: expect.arrayContaining([{ id: 99, name: 'new-tag' }]) }
      );
    });

    await waitFor(() => {
      expect(storeState.fetchTaskTags).toHaveBeenCalled();
    });
  });
});

describe('TaskEditorPage — delete flow', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('shows the ConfirmDialog when Delete is clicked', async () => {
    render(<TaskEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hides the ConfirmDialog when Cancel is clicked', async () => {
    render(<TaskEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls deleteTask and navigates to /tasks on confirm', async () => {
    render(<TaskEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(storeState.deleteTask).toHaveBeenCalledWith(42);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tasks');
    });
  });
});

describe('TaskEditorPage — 404 redirect', () => {
  beforeEach(() => {
    mockParams = { id: '42' };
    mockNavigate.mockClear();
  });

  it('redirects to /tasks with toast when error contains "not found"', async () => {
    storeState = buildStore({
      selectedTask: null,
      error: 'Task not found',
    });
    render(<TaskEditorPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tasks', {
        state: { toast: 'Task not found.' },
      });
    });
  });

  it('redirects to /tasks with toast when error contains "404"', async () => {
    storeState = buildStore({
      selectedTask: null,
      error: '404: resource not found',
    });
    render(<TaskEditorPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tasks', {
        state: { toast: 'Task not found.' },
      });
    });
  });
});
