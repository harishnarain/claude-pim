/**
 * useDashboardData
 *
 * Custom React hook that fetches tasks, calendar events, and notes in parallel
 * and derives all dashboard widget data via client-side slicing/filtering.
 *
 * Fires three parallel API calls on mount:
 *   - getTasks()
 *   - getEvents({ start: todayISO, end: plusSevenISO })
 *   - getNotes()
 *
 * @module hooks/use-dashboard-data
 */

import { useState, useEffect } from 'react';
import { getTasks } from '../api/tasks.js';
import { getEvents } from '../api/events.js';
import { getNotes } from '../api/notes.js';
import { getTodayISO, addDays, PRIORITY_RANK } from '../utils/dashboard-dates.js';

/** @type {Set<string>} Statuses that mean a task is no longer actionable. */
const INACTIVE_STATUSES = new Set(['Completed', 'Cancelled']);

/**
 * Compare two tasks by due-date (ascending) then priority (descending).
 *
 * @param {object} a - Task with `dueDate` and `priority` fields.
 * @param {object} b - Task with `dueDate` and `priority` fields.
 * @returns {number} Negative if a < b, positive if a > b, 0 if equal.
 */
function compareDateThenPriorityDesc(a, b) {
  if (a.dueDate < b.dueDate) return -1;
  if (a.dueDate > b.dueDate) return 1;
  return (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
}

/**
 * Fetch tasks, events, and notes in parallel and derive all dashboard
 * widget datasets from the results.
 *
 * @returns {{
 *   isLoading: boolean,
 *   error: string|null,
 *   todayEvents: object[],
 *   todayTasks: object[],
 *   overdueTasksSlice: object[],
 *   overdueTasksTotal: number,
 *   upcomingEventsSlice: object[],
 *   upcomingEventsTotal: number,
 *   upcomingTasksSlice: object[],
 *   upcomingTasksTotal: number,
 *   pinnedItemsSlice: object[],
 *   pinnedItemsTotal: number,
 * }}
 */
export function useDashboardData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [todayEvents, setTodayEvents] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);

  const [overdueTasksSlice, setOverdueTasksSlice] = useState([]);
  const [overdueTasksTotal, setOverdueTasksTotal] = useState(0);

  const [upcomingEventsSlice, setUpcomingEventsSlice] = useState([]);
  const [upcomingEventsTotal, setUpcomingEventsTotal] = useState(0);

  const [upcomingTasksSlice, setUpcomingTasksSlice] = useState([]);
  const [upcomingTasksTotal, setUpcomingTasksTotal] = useState(0);

  const [pinnedItemsSlice, setPinnedItemsSlice] = useState([]);
  const [pinnedItemsTotal, setPinnedItemsTotal] = useState(0);

  useEffect(() => {
    const todayISO = getTodayISO();
    const plusSevenISO = addDays(todayISO, 7);
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [tasks, items, notes] = await Promise.all([
          getTasks(),
          getEvents({ start: todayISO, end: plusSevenISO }),
          getNotes(),
        ]);

        if (cancelled) return;

        // ------------------------------------------------------------------
        // todayEvents — events whose date matches today, sorted ascending
        // ------------------------------------------------------------------
        const todayEventsAll = items
          .filter(
            (item) =>
              item.kind === 'event' && item.startAt.slice(0, 10) === todayISO,
          )
          .sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0));

        setTodayEvents(todayEventsAll);

        // ------------------------------------------------------------------
        // todayTasks — active tasks due today, sorted by priority descending
        // ------------------------------------------------------------------
        const todayTasksAll = tasks
          .filter(
            (task) =>
              task.dueDate === todayISO && !INACTIVE_STATUSES.has(task.status),
          )
          .sort(
            (a, b) =>
              (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0),
          );

        setTodayTasks(todayTasksAll);

        // ------------------------------------------------------------------
        // overdueTasks — active tasks due before today, date asc / priority desc
        // ------------------------------------------------------------------
        const overdueTasks = tasks
          .filter(
            (task) =>
              task.dueDate < todayISO && !INACTIVE_STATUSES.has(task.status),
          )
          .sort(compareDateThenPriorityDesc);

        setOverdueTasksTotal(overdueTasks.length);
        setOverdueTasksSlice(overdueTasks.slice(0, 5));

        // ------------------------------------------------------------------
        // upcomingEvents — events after today, sorted ascending
        // ------------------------------------------------------------------
        const upcomingEvents = items
          .filter(
            (item) =>
              item.kind === 'event' && item.startAt.slice(0, 10) > todayISO,
          )
          .sort((a, b) => (a.startAt < b.startAt ? -1 : a.startAt > b.startAt ? 1 : 0));

        setUpcomingEventsTotal(upcomingEvents.length);
        setUpcomingEventsSlice(upcomingEvents.slice(0, 5));

        // ------------------------------------------------------------------
        // upcomingTasks — active tasks due tomorrow through +7 days,
        //                  date asc / priority desc
        // ------------------------------------------------------------------
        const upcomingTasks = tasks
          .filter(
            (task) =>
              task.dueDate > todayISO &&
              task.dueDate <= plusSevenISO &&
              !INACTIVE_STATUSES.has(task.status),
          )
          .sort(compareDateThenPriorityDesc);

        setUpcomingTasksTotal(upcomingTasks.length);
        setUpcomingTasksSlice(upcomingTasks.slice(0, 5));

        // ------------------------------------------------------------------
        // pinnedItems — pinned tasks + pinned notes, sorted by updatedAt desc
        // ------------------------------------------------------------------
        const pinnedTasks = tasks
          .filter((task) => task.isPinned === 1)
          .map((task) => ({ ...task, kind: 'task' }));

        const pinnedNotes = notes
          .filter((note) => note.isPinned === 1)
          .map((note) => ({ ...note, kind: 'note' }));

        const pinnedAll = [...pinnedTasks, ...pinnedNotes].sort((a, b) => {
          if (a.updatedAt > b.updatedAt) return -1;
          if (a.updatedAt < b.updatedAt) return 1;
          return 0;
        });

        setPinnedItemsTotal(pinnedAll.length);
        setPinnedItemsSlice(pinnedAll.slice(0, 6));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return {
    isLoading,
    error,
    todayEvents,
    todayTasks,
    overdueTasksSlice,
    overdueTasksTotal,
    upcomingEventsSlice,
    upcomingEventsTotal,
    upcomingTasksSlice,
    upcomingTasksTotal,
    pinnedItemsSlice,
    pinnedItemsTotal,
  };
}
