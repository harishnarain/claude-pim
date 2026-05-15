/**
 * Unit tests for client/src/components/OverdueTasksWidget.jsx.
 *
 * Covers:
 *   - Empty state renders "You're all caught up." when tasks is empty.
 *   - No rows rendered and no "View all" link in empty state.
 *   - Each task row renders title, relative date label, and priority badge.
 *   - Each row is a link to /tasks/:id.
 *   - "View all tasks" link appears (via WidgetCard) only when total > 5.
 *   - "View all tasks" link does NOT appear when total <= 5.
 *   - The widget heading is "Overdue Tasks".
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock react-router-dom Link (no Router context needed in unit tests).
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => {
  /**
   * Minimal Link stub that renders an <a> element.
   *
   * @param {object}          props
   * @param {string}          props.to
   * @param {string}          [props.className]
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

// ---------------------------------------------------------------------------
// Mock getTodayISO so tests are date-independent.
// ---------------------------------------------------------------------------

vi.mock('../../client/src/utils/dashboard-dates.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getTodayISO: () => '2026-05-15',
  };
});

import OverdueTasksWidget from '../../client/src/components/OverdueTasksWidget.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** @type {object[]} Sample overdue tasks. */
const SAMPLE_TASKS = [
  { id: '1', title: 'Write report', dueDate: '2026-05-14', priority: 'High' },
  { id: '2', title: 'Send invoice', dueDate: '2026-05-13', priority: 'Medium' },
  { id: '3', title: 'Buy milk',     dueDate: '2026-05-10', priority: 'Low' },
];

// ---------------------------------------------------------------------------
// Widget heading
// ---------------------------------------------------------------------------

describe('widget heading', () => {
  it('renders "Overdue Tasks" as the heading', () => {
    render(<OverdueTasksWidget tasks={[]} total={0} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Overdue Tasks');
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('renders "You\'re all caught up." when tasks is empty', () => {
    render(<OverdueTasksWidget tasks={[]} total={0} />);
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
  });

  it('does not render any task rows when tasks is empty', () => {
    render(<OverdueTasksWidget tasks={[]} total={0} />);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('does not render a "View all" link when tasks is empty and total is 0', () => {
    render(<OverdueTasksWidget tasks={[]} total={0} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Task rows
// ---------------------------------------------------------------------------

describe('task rows', () => {
  it('renders a row for each task', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS} total={3} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders the task title in each row', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS} total={3} />);
    expect(screen.getByText('Write report')).toBeInTheDocument();
    expect(screen.getByText('Send invoice')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  it('renders a relative past-date label for each row', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS} total={3} />);
    // Today is 2026-05-15; dueDate 2026-05-14 → 1 day ago → "Yesterday"
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    // dueDate 2026-05-13 → 2 days ago → "2 days ago"
    expect(screen.getByText('2 days ago')).toBeInTheDocument();
    // dueDate 2026-05-10 → 5 days ago → "5 days ago"
    expect(screen.getByText('5 days ago')).toBeInTheDocument();
  });

  it('renders a PriorityBadge for each row', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS} total={3} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('each row is a link to /tasks/:id', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS} total={3} />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/tasks/1');
    expect(hrefs).toContain('/tasks/2');
    expect(hrefs).toContain('/tasks/3');
  });
});

// ---------------------------------------------------------------------------
// "View all" link visibility
// ---------------------------------------------------------------------------

describe('"View all" link', () => {
  it('does NOT render a "View all" link when total is exactly 5', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS.slice(0, 3)} total={5} />);
    const links = screen.getAllByRole('link');
    // All links should be task-row links (no "View all tasks" link)
    const viewAllLink = links.find((l) =>
      l.textContent.toLowerCase().includes('view all'),
    );
    expect(viewAllLink).toBeUndefined();
  });

  it('does NOT render a "View all" link when total is less than 5', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS} total={3} />);
    const allLinks = screen.getAllByRole('link');
    const viewAllLink = allLinks.find((l) =>
      l.textContent.toLowerCase().includes('view all'),
    );
    expect(viewAllLink).toBeUndefined();
  });

  it('renders a "View all tasks" link when total is 6', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS} total={6} />);
    const viewAllLink = screen.getByText('View all tasks');
    expect(viewAllLink).toBeInTheDocument();
  });

  it('"View all tasks" link points to /tasks', () => {
    render(<OverdueTasksWidget tasks={SAMPLE_TASKS} total={10} />);
    const viewAllLink = screen.getByText('View all tasks').closest('a');
    expect(viewAllLink).toHaveAttribute('href', '/tasks');
  });

  it('does NOT render a "View all" link when tasks is empty (total = 0)', () => {
    render(<OverdueTasksWidget tasks={[]} total={0} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
