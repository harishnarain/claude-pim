/**
 * DashboardPage — top-level route component for the Dashboard.
 *
 * Calls useDashboardData() to fetch all widget data in parallel and owns
 * the loading and error states. While data is loading a centred loading
 * indicator is shown. When an error occurs a full-width error banner is
 * rendered. On success the WelcomeHeader and the five dashboard widgets
 * are laid out in a responsive two-column grid.
 *
 * Layout:
 *   Left column  — TodayAgendaWidget, OverdueTasksWidget
 *   Right column — UpcomingEventsWidget, UpcomingTasksWidget, PinnedItemsWidget
 *
 * @returns {JSX.Element}
 */
import React from 'react';
import { useDashboardData } from '../hooks/use-dashboard-data.js';
import WelcomeHeader from '../components/WelcomeHeader.jsx';
import TodayAgendaWidget from '../components/TodayAgendaWidget.jsx';
import OverdueTasksWidget from '../components/OverdueTasksWidget.jsx';
import UpcomingEventsWidget from '../components/UpcomingEventsWidget.jsx';
import UpcomingTasksWidget from '../components/UpcomingTasksWidget.jsx';
import PinnedItemsWidget from '../components/PinnedItemsWidget.jsx';

/**
 * DashboardPage fetches dashboard data and renders widgets when the data
 * is ready. Shows a loading indicator while fetching and an error banner
 * if the fetch fails.
 *
 * @returns {JSX.Element}
 */
function DashboardPage() {
  const {
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
  } = useDashboardData();

  /* Loading state */
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-gray-400">Loading dashboard…</p>
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className="p-6">
        <div
          className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          Could not load dashboard data. Please refresh.
        </div>
      </div>
    );
  }

  /* Success state */
  return (
    <div className="p-6">
      <WelcomeHeader />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <TodayAgendaWidget todayEvents={todayEvents} todayTasks={todayTasks} />
          <OverdueTasksWidget tasks={overdueTasksSlice} total={overdueTasksTotal} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <UpcomingEventsWidget events={upcomingEventsSlice} total={upcomingEventsTotal} />
          <UpcomingTasksWidget tasks={upcomingTasksSlice} total={upcomingTasksTotal} />
          <PinnedItemsWidget items={pinnedItemsSlice} total={pinnedItemsTotal} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
