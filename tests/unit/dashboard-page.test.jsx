/**
 * Unit tests for DashboardPage.
 *
 * useDashboardData and all widget/component imports are mocked so the tests
 * run in isolation without a real API server or browser router.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock useDashboardData
// ---------------------------------------------------------------------------

/** Mutable hook return — overridden per test in beforeEach. */
let mockHookReturn = {};

vi.mock('../../client/src/hooks/use-dashboard-data.js', () => ({
  useDashboardData: () => mockHookReturn,
}));

// ---------------------------------------------------------------------------
// Mock child components so tests focus on DashboardPage's own behaviour
// ---------------------------------------------------------------------------

vi.mock('../../client/src/components/WelcomeHeader.jsx', () => ({
  default: () => <div data-testid="welcome-header">WelcomeHeader</div>,
}));

vi.mock('../../client/src/components/TodayAgendaWidget.jsx', () => ({
  default: ({ todayEvents, todayTasks }) => (
    <div
      data-testid="today-agenda-widget"
      data-events={todayEvents.length}
      data-tasks={todayTasks.length}
    >
      TodayAgendaWidget
    </div>
  ),
}));

vi.mock('../../client/src/components/OverdueTasksWidget.jsx', () => ({
  default: ({ tasks, total }) => (
    <div
      data-testid="overdue-tasks-widget"
      data-tasks={tasks.length}
      data-total={total}
    >
      OverdueTasksWidget
    </div>
  ),
}));

vi.mock('../../client/src/components/UpcomingEventsWidget.jsx', () => ({
  default: ({ events, total }) => (
    <div
      data-testid="upcoming-events-widget"
      data-events={events.length}
      data-total={total}
    >
      UpcomingEventsWidget
    </div>
  ),
}));

vi.mock('../../client/src/components/UpcomingTasksWidget.jsx', () => ({
  default: ({ tasks, total }) => (
    <div
      data-testid="upcoming-tasks-widget"
      data-tasks={tasks.length}
      data-total={total}
    >
      UpcomingTasksWidget
    </div>
  ),
}));

vi.mock('../../client/src/components/PinnedItemsWidget.jsx', () => ({
  default: ({ items, total }) => (
    <div
      data-testid="pinned-items-widget"
      data-items={items.length}
      data-total={total}
    >
      PinnedItemsWidget
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks
// ---------------------------------------------------------------------------

import DashboardPage from '../../client/src/pages/dashboard-page.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a default successful hook return value, merging in any overrides.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function buildHookReturn(overrides = {}) {
  return {
    isLoading: false,
    error: null,
    todayEvents: [],
    todayTasks: [],
    overdueTasksSlice: [],
    overdueTasksTotal: 0,
    upcomingEventsSlice: [],
    upcomingEventsTotal: 0,
    upcomingTasksSlice: [],
    upcomingTasksTotal: 0,
    pinnedItemsSlice: [],
    pinnedItemsTotal: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardPage', () => {
  beforeEach(() => {
    mockHookReturn = buildHookReturn();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  it('renders a loading indicator when isLoading is true', () => {
    mockHookReturn = buildHookReturn({ isLoading: true });
    render(<DashboardPage />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('does not render widgets while loading', () => {
    mockHookReturn = buildHookReturn({ isLoading: true });
    render(<DashboardPage />);
    expect(screen.queryByTestId('welcome-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('today-agenda-widget')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  it('renders an error banner when error is set', () => {
    mockHookReturn = buildHookReturn({ error: 'Network failure' });
    render(<DashboardPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('error banner contains the expected message', () => {
    mockHookReturn = buildHookReturn({ error: 'Network failure' });
    render(<DashboardPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load dashboard data. Please refresh.',
    );
  });

  it('error banner has the correct Tailwind colour classes', () => {
    mockHookReturn = buildHookReturn({ error: 'oops' });
    render(<DashboardPage />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toMatch(/bg-red-50/);
    expect(banner.className).toMatch(/text-red-700/);
    expect(banner.className).toMatch(/border-red-200/);
  });

  it('does not render widgets when error is set', () => {
    mockHookReturn = buildHookReturn({ error: 'oops' });
    render(<DashboardPage />);
    expect(screen.queryByTestId('welcome-header')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Success state — structure
  // -------------------------------------------------------------------------

  it('renders WelcomeHeader when data loads successfully', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('welcome-header')).toBeInTheDocument();
  });

  it('renders TodayAgendaWidget', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('today-agenda-widget')).toBeInTheDocument();
  });

  it('renders OverdueTasksWidget', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('overdue-tasks-widget')).toBeInTheDocument();
  });

  it('renders UpcomingEventsWidget', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('upcoming-events-widget')).toBeInTheDocument();
  });

  it('renders UpcomingTasksWidget', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('upcoming-tasks-widget')).toBeInTheDocument();
  });

  it('renders PinnedItemsWidget', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('pinned-items-widget')).toBeInTheDocument();
  });

  it('does not render an alert when data loads successfully', () => {
    render(<DashboardPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Success state — prop forwarding
  // -------------------------------------------------------------------------

  it('passes todayEvents and todayTasks to TodayAgendaWidget', () => {
    const todayEvents = [{ id: 1 }, { id: 2 }];
    const todayTasks = [{ id: 10 }];
    mockHookReturn = buildHookReturn({ todayEvents, todayTasks });
    render(<DashboardPage />);
    const widget = screen.getByTestId('today-agenda-widget');
    expect(widget).toHaveAttribute('data-events', '2');
    expect(widget).toHaveAttribute('data-tasks', '1');
  });

  it('passes overdueTasksSlice and overdueTasksTotal to OverdueTasksWidget', () => {
    const overdueTasksSlice = [{ id: 1 }, { id: 2 }, { id: 3 }];
    mockHookReturn = buildHookReturn({ overdueTasksSlice, overdueTasksTotal: 8 });
    render(<DashboardPage />);
    const widget = screen.getByTestId('overdue-tasks-widget');
    expect(widget).toHaveAttribute('data-tasks', '3');
    expect(widget).toHaveAttribute('data-total', '8');
  });

  it('passes upcomingEventsSlice and upcomingEventsTotal to UpcomingEventsWidget', () => {
    const upcomingEventsSlice = [{ id: 5 }];
    mockHookReturn = buildHookReturn({ upcomingEventsSlice, upcomingEventsTotal: 12 });
    render(<DashboardPage />);
    const widget = screen.getByTestId('upcoming-events-widget');
    expect(widget).toHaveAttribute('data-events', '1');
    expect(widget).toHaveAttribute('data-total', '12');
  });

  it('passes upcomingTasksSlice and upcomingTasksTotal to UpcomingTasksWidget', () => {
    const upcomingTasksSlice = [{ id: 7 }, { id: 8 }];
    mockHookReturn = buildHookReturn({ upcomingTasksSlice, upcomingTasksTotal: 4 });
    render(<DashboardPage />);
    const widget = screen.getByTestId('upcoming-tasks-widget');
    expect(widget).toHaveAttribute('data-tasks', '2');
    expect(widget).toHaveAttribute('data-total', '4');
  });

  it('passes pinnedItemsSlice and pinnedItemsTotal to PinnedItemsWidget', () => {
    const pinnedItemsSlice = [{ id: 3, kind: 'note' }];
    mockHookReturn = buildHookReturn({ pinnedItemsSlice, pinnedItemsTotal: 3 });
    render(<DashboardPage />);
    const widget = screen.getByTestId('pinned-items-widget');
    expect(widget).toHaveAttribute('data-items', '1');
    expect(widget).toHaveAttribute('data-total', '3');
  });

  // -------------------------------------------------------------------------
  // Layout — two-column grid
  // -------------------------------------------------------------------------

  it('uses the required two-column grid Tailwind classes', () => {
    const { container } = render(<DashboardPage />);
    const grid = container.querySelector(
      '.grid.grid-cols-1.lg\\:grid-cols-2.gap-6',
    );
    expect(grid).not.toBeNull();
  });
});
