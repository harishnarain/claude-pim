// @vitest-environment jsdom
/**
 * Unit tests for client/src/hooks/use-dashboard-data.js
 *
 * Mocks the three API modules so no real network calls are made.
 * Mocks the dashboard-dates utility so the date is pinned to a fixed value.
 * Verifies that:
 *   - isLoading transitions from true → false
 *   - all twelve return fields are present
 *   - filtering and slicing logic produces the expected counts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before the hook import so Vitest hoists them.
// We mock dashboard-dates to pin TODAY without using fake timers (fake timers
// would prevent waitFor's internal setInterval polling from firing).
// ---------------------------------------------------------------------------

vi.mock('../../client/src/api/tasks.js', () => ({
  getTasks: vi.fn(),
}));

vi.mock('../../client/src/api/events.js', () => ({
  getEvents: vi.fn(),
}));

vi.mock('../../client/src/api/notes.js', () => ({
  getNotes: vi.fn(),
}));

vi.mock('../../client/src/utils/dashboard-dates.js', () => ({
  getTodayISO: vi.fn(() => '2026-05-15'),
  addDays: vi.fn((iso, n) => {
    // Minimal real implementation sufficient for the +7 day window used in the hook.
    const ms = new Date(iso + 'T00:00:00').getTime() + n * 24 * 60 * 60 * 1000;
    return new Date(ms).toLocaleDateString('en-CA');
  }),
  PRIORITY_RANK: { High: 3, Medium: 2, Low: 1 },
}));

import { getTasks } from '../../client/src/api/tasks.js';
import { getEvents } from '../../client/src/api/events.js';
import { getNotes } from '../../client/src/api/notes.js';
import { useDashboardData } from '../../client/src/hooks/use-dashboard-data.js';

// ---------------------------------------------------------------------------
// Fixed reference date constants — must match what getTodayISO() mock returns.
// ---------------------------------------------------------------------------
const TODAY = '2026-05-15';
const YESTERDAY = '2026-05-14';
const TOMORROW = '2026-05-16';
const PLUS_3 = '2026-05-18';
const PLUS_7 = '2026-05-22';
const PLUS_8 = '2026-05-23'; // outside the 7-day window

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers to build fixture objects
// ---------------------------------------------------------------------------

/**
 * Build a minimal task fixture.
 * @param {Partial<object>} overrides
 * @returns {object}
 */
function makeTask(overrides) {
  return {
    id: Math.random(),
    title: 'Test task',
    dueDate: TODAY,
    priority: 'Medium',
    status: 'Open',
    isPinned: 0,
    updatedAt: '2026-05-15T10:00:00',
    ...overrides,
  };
}

/**
 * Build a minimal event fixture (kind === 'event').
 * @param {Partial<object>} overrides
 * @returns {object}
 */
function makeEvent(overrides) {
  return {
    id: Math.random(),
    title: 'Test event',
    startAt: `${TODAY}T09:00:00`,
    endAt: `${TODAY}T10:00:00`,
    kind: 'event',
    ...overrides,
  };
}

/**
 * Build a minimal note fixture.
 * @param {Partial<object>} overrides
 * @returns {object}
 */
function makeNote(overrides) {
  return {
    id: Math.random(),
    title: 'Test note',
    isPinned: 0,
    updatedAt: '2026-05-15T09:00:00',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useDashboardData', () => {
  it('returns all twelve fields immediately (before resolution)', () => {
    // Never-resolving promise so we stay in loading state
    getTasks.mockReturnValue(new Promise(() => {}));
    getEvents.mockReturnValue(new Promise(() => {}));
    getNotes.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDashboardData());

    const keys = [
      'isLoading',
      'error',
      'todayEvents',
      'todayTasks',
      'overdueTasksSlice',
      'overdueTasksTotal',
      'upcomingEventsSlice',
      'upcomingEventsTotal',
      'upcomingTasksSlice',
      'upcomingTasksTotal',
      'pinnedItemsSlice',
      'pinnedItemsTotal',
    ];

    keys.forEach((key) => {
      expect(result.current).toHaveProperty(key);
    });
  });

  it('sets isLoading to true initially, then false after resolution', async () => {
    getTasks.mockResolvedValue([]);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('sets error to null on success', async () => {
    getTasks.mockResolvedValue([]);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('sets error message when a fetch rejects', async () => {
    getTasks.mockRejectedValue(new Error('Network failure'));
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network failure');
  });

  it('todayEvents: includes only events with startAt on today and kind=event', async () => {
    const todayEvt = makeEvent({ startAt: `${TODAY}T09:00:00`, kind: 'event' });
    const tomorrowEvt = makeEvent({ startAt: `${TOMORROW}T09:00:00`, kind: 'event' });
    const taskChip = makeEvent({ startAt: `${TODAY}T09:00:00`, kind: 'task' });

    getTasks.mockResolvedValue([]);
    getEvents.mockResolvedValue([todayEvt, tomorrowEvt, taskChip]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todayEvents).toHaveLength(1);
    expect(result.current.todayEvents[0].id).toBe(todayEvt.id);
  });

  it('todayEvents: sorted ascending by startAt', async () => {
    const late = makeEvent({ startAt: `${TODAY}T15:00:00`, kind: 'event' });
    const early = makeEvent({ startAt: `${TODAY}T08:00:00`, kind: 'event' });

    getTasks.mockResolvedValue([]);
    getEvents.mockResolvedValue([late, early]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todayEvents[0].id).toBe(early.id);
    expect(result.current.todayEvents[1].id).toBe(late.id);
  });

  it('todayTasks: includes only active tasks due today', async () => {
    const todayOpen = makeTask({ dueDate: TODAY, status: 'Open' });
    const todayCompleted = makeTask({ dueDate: TODAY, status: 'Completed' });
    const todayCancelled = makeTask({ dueDate: TODAY, status: 'Cancelled' });
    const overdueTask = makeTask({ dueDate: YESTERDAY, status: 'Open' });

    getTasks.mockResolvedValue([todayOpen, todayCompleted, todayCancelled, overdueTask]);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todayTasks).toHaveLength(1);
    expect(result.current.todayTasks[0].id).toBe(todayOpen.id);
  });

  it('overdueTasksSlice: max 5, overdueTasksTotal shows full count', async () => {
    const overdueTasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({ dueDate: YESTERDAY, status: 'Open', id: i }),
    );

    getTasks.mockResolvedValue(overdueTasks);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overdueTasksSlice).toHaveLength(5);
    expect(result.current.overdueTasksTotal).toBe(8);
  });

  it('overdueTasksSlice: excludes Completed and Cancelled tasks', async () => {
    const active = makeTask({ dueDate: YESTERDAY, status: 'Open' });
    const done = makeTask({ dueDate: YESTERDAY, status: 'Completed' });
    const cancelled = makeTask({ dueDate: YESTERDAY, status: 'Cancelled' });

    getTasks.mockResolvedValue([active, done, cancelled]);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overdueTasksTotal).toBe(1);
    expect(result.current.overdueTasksSlice[0].id).toBe(active.id);
  });

  it('upcomingEventsSlice: max 5, upcomingEventsTotal shows full count', async () => {
    const upcomingEvts = Array.from({ length: 7 }, (_, i) =>
      makeEvent({ startAt: `${TOMORROW}T09:00:00`, kind: 'event', id: i }),
    );

    getTasks.mockResolvedValue([]);
    getEvents.mockResolvedValue(upcomingEvts);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.upcomingEventsSlice).toHaveLength(5);
    expect(result.current.upcomingEventsTotal).toBe(7);
  });

  it('upcomingTasksSlice: includes tasks due tomorrow through +7 days', async () => {
    const tomorrowTask = makeTask({ dueDate: TOMORROW, status: 'Open' });
    const plus3Task = makeTask({ dueDate: PLUS_3, status: 'Open' });
    const plus7Task = makeTask({ dueDate: PLUS_7, status: 'Open' });
    const plus8Task = makeTask({ dueDate: PLUS_8, status: 'Open' }); // outside window
    const todayTask = makeTask({ dueDate: TODAY, status: 'Open' }); // not upcoming

    getTasks.mockResolvedValue([tomorrowTask, plus3Task, plus7Task, plus8Task, todayTask]);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.upcomingTasksTotal).toBe(3);
    expect(result.current.upcomingTasksSlice).toHaveLength(3);
  });

  it('upcomingTasksSlice: max 5, upcomingTasksTotal shows full count', async () => {
    const upcomingTasks = Array.from({ length: 6 }, (_, i) =>
      makeTask({ dueDate: TOMORROW, status: 'Open', id: i }),
    );

    getTasks.mockResolvedValue(upcomingTasks);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.upcomingTasksSlice).toHaveLength(5);
    expect(result.current.upcomingTasksTotal).toBe(6);
  });

  it('pinnedItemsSlice: merges pinned tasks (kind=task) and pinned notes (kind=note)', async () => {
    const pinnedTask = makeTask({ isPinned: 1, updatedAt: '2026-05-15T10:00:00' });
    const unpinnedTask = makeTask({ isPinned: 0 });
    const pinnedNote = makeNote({ isPinned: 1, updatedAt: '2026-05-15T09:00:00' });
    const unpinnedNote = makeNote({ isPinned: 0 });

    getTasks.mockResolvedValue([pinnedTask, unpinnedTask]);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([pinnedNote, unpinnedNote]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pinnedItemsTotal).toBe(2);
    expect(result.current.pinnedItemsSlice).toHaveLength(2);

    const kinds = result.current.pinnedItemsSlice.map((item) => item.kind);
    expect(kinds).toContain('task');
    expect(kinds).toContain('note');
  });

  it('pinnedItemsSlice: max 6, pinnedItemsTotal shows full count', async () => {
    const pinnedTasks = Array.from({ length: 4 }, (_, i) =>
      makeTask({ isPinned: 1, updatedAt: `2026-05-15T0${i}:00:00`, id: `t${i}` }),
    );
    const pinnedNotes = Array.from({ length: 4 }, (_, i) =>
      makeNote({ isPinned: 1, updatedAt: `2026-05-14T0${i}:00:00`, id: `n${i}` }),
    );

    getTasks.mockResolvedValue(pinnedTasks);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue(pinnedNotes);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pinnedItemsSlice).toHaveLength(6);
    expect(result.current.pinnedItemsTotal).toBe(8);
  });

  it('pinnedItemsSlice: sorted by updatedAt descending', async () => {
    const older = makeTask({ isPinned: 1, updatedAt: '2026-05-14T08:00:00', id: 'older' });
    const newer = makeTask({ isPinned: 1, updatedAt: '2026-05-15T08:00:00', id: 'newer' });

    getTasks.mockResolvedValue([older, newer]);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pinnedItemsSlice[0].id).toBe('newer');
    expect(result.current.pinnedItemsSlice[1].id).toBe('older');
  });

  it('empty data: all slice arrays are empty and totals are 0', async () => {
    getTasks.mockResolvedValue([]);
    getEvents.mockResolvedValue([]);
    getNotes.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todayEvents).toEqual([]);
    expect(result.current.todayTasks).toEqual([]);
    expect(result.current.overdueTasksSlice).toEqual([]);
    expect(result.current.overdueTasksTotal).toBe(0);
    expect(result.current.upcomingEventsSlice).toEqual([]);
    expect(result.current.upcomingEventsTotal).toBe(0);
    expect(result.current.upcomingTasksSlice).toEqual([]);
    expect(result.current.upcomingTasksTotal).toBe(0);
    expect(result.current.pinnedItemsSlice).toEqual([]);
    expect(result.current.pinnedItemsTotal).toBe(0);
  });
});
