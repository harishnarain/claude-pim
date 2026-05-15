/**
 * Unit tests for client/src/components/UpcomingTasksWidget.jsx.
 *
 * Covers:
 *   - Empty state renders "No upcoming tasks." when tasks array is empty.
 *   - Task rows render title, relative date label, and PriorityBadge.
 *   - Each row is a Link to /tasks/:id.
 *   - "View all tasks" link is shown only when total > 5.
 *   - "View all tasks" link is absent when total <= 5.
 *   - Component is the default export.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock react-router-dom so tests run without a Router context.
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => {
  /**
   * Minimal Link mock that renders an <a> element.
   *
   * @param {object} props
   * @param {string} props.to
   * @param {string} [props.className]
   * @param {React.ReactNode} props.children
   * @returns {JSX.Element}
   */
  const Link = ({ to, className, children }) => (
    <a href={to} className={className}>
      {children}
    </a>
  );
  return { Link };
});

import UpcomingTasksWidget from '../../client/src/components/UpcomingTasksWidget.jsx';
import { getTodayISO, formatRelativeFutureDate, addDays } from '../../client/src/utils/dashboard-dates.js';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal task fixture.
 *
 * @param {Partial<{id: number, title: string, dueDate: string, priority: string}>} overrides
 * @returns {{ id: number, title: string, dueDate: string, priority: string }}
 */
function makeTask(overrides = {}) {
  return {
    id: 1,
    title: 'Test task',
    dueDate: addDays(getTodayISO(), 1),
    priority: 'Medium',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('renders "No upcoming tasks." when the tasks array is empty', () => {
    render(<UpcomingTasksWidget tasks={[]} total={0} />);
    expect(screen.getByText('No upcoming tasks.')).toBeInTheDocument();
  });

  it('does not render any list items when tasks is empty', () => {
    render(<UpcomingTasksWidget tasks={[]} total={0} />);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Task rows — title
// ---------------------------------------------------------------------------

describe('task row title', () => {
  it('renders the task title in each row', () => {
    const tasks = [makeTask({ id: 1, title: 'Buy groceries' })];
    render(<UpcomingTasksWidget tasks={tasks} total={1} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders titles for multiple tasks', () => {
    const today = getTodayISO();
    const tasks = [
      makeTask({ id: 1, title: 'Task Alpha', dueDate: addDays(today, 1) }),
      makeTask({ id: 2, title: 'Task Beta', dueDate: addDays(today, 2) }),
    ];
    render(<UpcomingTasksWidget tasks={tasks} total={2} />);
    expect(screen.getByText('Task Alpha')).toBeInTheDocument();
    expect(screen.getByText('Task Beta')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Task rows — relative date label
// ---------------------------------------------------------------------------

describe('task row relative date label', () => {
  it('renders the relative due-date label from formatRelativeFutureDate', () => {
    const today = getTodayISO();
    const dueDate = addDays(today, 1);
    const tasks = [makeTask({ id: 1, dueDate })];
    render(<UpcomingTasksWidget tasks={tasks} total={1} />);
    const label = formatRelativeFutureDate(dueDate, today);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders "In 3 days" label for a task due in 3 days', () => {
    const today = getTodayISO();
    const dueDate = addDays(today, 3);
    const tasks = [makeTask({ id: 1, dueDate })];
    render(<UpcomingTasksWidget tasks={tasks} total={1} />);
    expect(screen.getByText('In 3 days')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Task rows — priority badge
// ---------------------------------------------------------------------------

describe('task row priority badge', () => {
  it('renders a PriorityBadge with the correct priority for each task', () => {
    const today = getTodayISO();
    const tasks = [
      makeTask({ id: 1, priority: 'High', dueDate: addDays(today, 1) }),
      makeTask({ id: 2, priority: 'Low', dueDate: addDays(today, 2) }),
    ];
    render(<UpcomingTasksWidget tasks={tasks} total={2} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Task rows — Link to /tasks/:id
// ---------------------------------------------------------------------------

describe('task row links', () => {
  it('each row links to /tasks/:id', () => {
    const today = getTodayISO();
    const tasks = [makeTask({ id: 42, dueDate: addDays(today, 1) })];
    render(<UpcomingTasksWidget tasks={tasks} total={1} />);
    // The row link is the link to the task detail page
    const links = screen.getAllByRole('link');
    const taskLink = links.find((l) => l.getAttribute('href') === '/tasks/42');
    expect(taskLink).toBeInTheDocument();
  });

  it('renders correct links for multiple tasks', () => {
    const today = getTodayISO();
    const tasks = [
      makeTask({ id: 10, title: 'A', dueDate: addDays(today, 1) }),
      makeTask({ id: 20, title: 'B', dueDate: addDays(today, 2) }),
    ];
    render(<UpcomingTasksWidget tasks={tasks} total={2} />);
    expect(screen.getByRole('link', { name: /A/ })).toHaveAttribute('href', '/tasks/10');
    expect(screen.getByRole('link', { name: /B/ })).toHaveAttribute('href', '/tasks/20');
  });
});

// ---------------------------------------------------------------------------
// "View all tasks" link visibility
// ---------------------------------------------------------------------------

describe('"View all tasks" link visibility', () => {
  it('shows "View all tasks" link when total > 5', () => {
    const today = getTodayISO();
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: i + 1, title: `Task ${i + 1}`, dueDate: addDays(today, i + 1) }),
    );
    render(<UpcomingTasksWidget tasks={tasks} total={6} />);
    expect(screen.getByRole('link', { name: 'View all tasks' })).toBeInTheDocument();
  });

  it('"View all tasks" link points to /tasks', () => {
    const today = getTodayISO();
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: i + 1, title: `Task ${i + 1}`, dueDate: addDays(today, i + 1) }),
    );
    render(<UpcomingTasksWidget tasks={tasks} total={10} />);
    const link = screen.getByRole('link', { name: 'View all tasks' });
    expect(link).toHaveAttribute('href', '/tasks');
  });

  it('does not show "View all tasks" link when total === 5', () => {
    const today = getTodayISO();
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: i + 1, title: `Task ${i + 1}`, dueDate: addDays(today, i + 1) }),
    );
    render(<UpcomingTasksWidget tasks={tasks} total={5} />);
    expect(screen.queryByRole('link', { name: 'View all tasks' })).not.toBeInTheDocument();
  });

  it('does not show "View all tasks" link when total < 5', () => {
    const today = getTodayISO();
    const tasks = [makeTask({ id: 1, dueDate: addDays(today, 1) })];
    render(<UpcomingTasksWidget tasks={tasks} total={1} />);
    expect(screen.queryByRole('link', { name: 'View all tasks' })).not.toBeInTheDocument();
  });

  it('does not show "View all tasks" link when tasks array is empty', () => {
    render(<UpcomingTasksWidget tasks={[]} total={0} />);
    expect(screen.queryByRole('link', { name: 'View all tasks' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Card title
// ---------------------------------------------------------------------------

describe('card title', () => {
  it('renders the card title "Upcoming Tasks"', () => {
    render(<UpcomingTasksWidget tasks={[]} total={0} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Upcoming Tasks');
  });
});
