/**
 * Unit tests for client/src/components/TodayAgendaWidget.jsx.
 *
 * Covers:
 *   - Card title "Today's Agenda" is rendered.
 *   - "Events today" sub-section label is rendered.
 *   - "Tasks due today" sub-section label is rendered.
 *   - Empty state messages when arrays are empty.
 *   - Event rows render formatted start time, title, and optional location.
 *   - Event rows link to /calendar.
 *   - Location is omitted when not set on an event.
 *   - Task rows render title, PriorityBadge, and StatusBadge.
 *   - Task rows link to /tasks/:id.
 *   - "View all" link appears for events only when more than 5 items exist.
 *   - "View all tasks" link appears for tasks only when more than 5 items exist.
 *   - Only first 5 events and 5 tasks are shown.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock react-router-dom Link
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

import TodayAgendaWidget from '../../client/src/components/TodayAgendaWidget.jsx';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

/**
 * Build a calendar event fixture.
 *
 * @param {object} [overrides] - Property overrides.
 * @returns {object}
 */
function makeEvent(overrides = {}) {
  return {
    id: 1,
    title: 'Team standup',
    start_at: '2026-05-15T09:30:00',
    location: null,
    ...overrides,
  };
}

/**
 * Build a task fixture.
 *
 * @param {object} [overrides] - Property overrides.
 * @returns {object}
 */
function makeTask(overrides = {}) {
  return {
    id: 1,
    title: 'Write tests',
    priority: 'High',
    status: 'In Progress',
    ...overrides,
  };
}

/**
 * Render TodayAgendaWidget with the given arrays.
 *
 * @param {object[]} [todayEvents=[]] - Events array.
 * @param {object[]} [todayTasks=[]]  - Tasks array.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderWidget(todayEvents = [], todayTasks = []) {
  return render(
    <TodayAgendaWidget todayEvents={todayEvents} todayTasks={todayTasks} />,
  );
}

// ---------------------------------------------------------------------------
// Card title
// ---------------------------------------------------------------------------

describe('card title', () => {
  it('renders the "Today\'s Agenda" heading', () => {
    renderWidget();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent("Today's Agenda");
  });
});

// ---------------------------------------------------------------------------
// Sub-section labels
// ---------------------------------------------------------------------------

describe('sub-section labels', () => {
  it('renders an "Events today" sub-section label', () => {
    renderWidget();
    expect(screen.getByText('Events today')).toBeInTheDocument();
  });

  it('renders a "Tasks due today" sub-section label', () => {
    renderWidget();
    expect(screen.getByText('Tasks due today')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

describe('empty states', () => {
  it('renders "No events today" when todayEvents is empty', () => {
    renderWidget([], []);
    expect(screen.getByText('No events today')).toBeInTheDocument();
  });

  it('renders "No tasks due today" when todayTasks is empty', () => {
    renderWidget([], []);
    expect(screen.getByText('No tasks due today')).toBeInTheDocument();
  });

  it('does not render "No events today" when events are present', () => {
    renderWidget([makeEvent()], []);
    expect(screen.queryByText('No events today')).not.toBeInTheDocument();
  });

  it('does not render "No tasks due today" when tasks are present', () => {
    renderWidget([], [makeTask()]);
    expect(screen.queryByText('No tasks due today')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Event rows
// ---------------------------------------------------------------------------

describe('event rows', () => {
  it('renders the event title', () => {
    renderWidget([makeEvent({ title: 'Design review' })]);
    expect(screen.getByText('Design review')).toBeInTheDocument();
  });

  it('renders the formatted start time (HH:MM)', () => {
    renderWidget([makeEvent({ start_at: '2026-05-15T14:00:00' })]);
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('renders the location when set', () => {
    renderWidget([makeEvent({ location: 'Conference Room A' })]);
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
  });

  it('does not render a location element when location is null', () => {
    renderWidget([makeEvent({ location: null })]);
    // No location text in DOM at all for this event
    expect(screen.queryByText('Conference Room A')).not.toBeInTheDocument();
  });

  it('event row links to /calendar', () => {
    renderWidget([makeEvent({ title: 'Sprint planning' })]);
    const link = screen.getByRole('link', { name: /Sprint planning/ });
    expect(link).toHaveAttribute('href', '/calendar');
  });
});

// ---------------------------------------------------------------------------
// Task rows
// ---------------------------------------------------------------------------

describe('task rows', () => {
  it('renders the task title', () => {
    renderWidget([], [makeTask({ title: 'Ship feature' })]);
    expect(screen.getByText('Ship feature')).toBeInTheDocument();
  });

  it('renders the PriorityBadge with the task priority', () => {
    renderWidget([], [makeTask({ priority: 'Medium' })]);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders the StatusBadge with the task status', () => {
    renderWidget([], [makeTask({ status: 'Blocked' })]);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('task row links to /tasks/:id', () => {
    renderWidget([], [makeTask({ id: 42, title: 'Fix bug' })]);
    const link = screen.getByRole('link', { name: /Fix bug/ });
    expect(link).toHaveAttribute('href', '/tasks/42');
  });
});

// ---------------------------------------------------------------------------
// Slicing — only first 5 items shown
// ---------------------------------------------------------------------------

describe('slicing to first 5 items', () => {
  it('renders exactly 5 event rows when 6 events are supplied', () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      makeEvent({ id: i + 1, title: `Event ${i + 1}`, start_at: `2026-05-15T0${i}:00:00` }),
    );
    renderWidget(events);
    // Event 6 should not appear
    expect(screen.queryByText('Event 6')).not.toBeInTheDocument();
    expect(screen.getByText('Event 5')).toBeInTheDocument();
  });

  it('renders exactly 5 task rows when 6 tasks are supplied', () => {
    const tasks = Array.from({ length: 6 }, (_, i) =>
      makeTask({ id: i + 1, title: `Task ${i + 1}` }),
    );
    renderWidget([], tasks);
    expect(screen.queryByText('Task 6')).not.toBeInTheDocument();
    expect(screen.getByText('Task 5')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "View all" event link
// ---------------------------------------------------------------------------

describe('"View all" event link', () => {
  it('does not render when there are exactly 5 events', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: i + 1, title: `Event ${i + 1}`, start_at: `2026-05-15T0${i}:00:00` }),
    );
    renderWidget(events);
    // There are links for each row + no extra "View all" link beyond row links
    const allLinks = screen.getAllByRole('link');
    const viewAllLink = allLinks.find((l) => l.textContent === 'View all');
    expect(viewAllLink).toBeUndefined();
  });

  it('renders a "View all" link to /calendar when more than 5 events exist', () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      makeEvent({ id: i + 1, title: `Event ${i + 1}`, start_at: `2026-05-15T0${i}:00:00` }),
    );
    renderWidget(events);
    const viewAllLink = screen.getByRole('link', { name: 'View all' });
    expect(viewAllLink).toHaveAttribute('href', '/calendar');
  });
});

// ---------------------------------------------------------------------------
// "View all tasks" link
// ---------------------------------------------------------------------------

describe('"View all tasks" link', () => {
  it('does not render when there are exactly 5 tasks', () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: i + 1, title: `Task ${i + 1}` }),
    );
    renderWidget([], tasks);
    expect(screen.queryByText('View all tasks')).not.toBeInTheDocument();
  });

  it('renders a "View all tasks" link to /tasks when more than 5 tasks exist', () => {
    const tasks = Array.from({ length: 6 }, (_, i) =>
      makeTask({ id: i + 1, title: `Task ${i + 1}` }),
    );
    renderWidget([], tasks);
    const viewAllLink = screen.getByRole('link', { name: 'View all tasks' });
    expect(viewAllLink).toHaveAttribute('href', '/tasks');
  });
});
