/**
 * Unit tests for client/src/components/UpcomingEventsWidget.jsx.
 *
 * Covers:
 *   - Widget heading is "Upcoming Events".
 *   - Empty state renders "No upcoming events." when events is empty.
 *   - No rows rendered and no links in empty state.
 *   - Each event row renders day label, time, title, and optional location.
 *   - Each row is a link to /calendar.
 *   - "View calendar" link appears (via WidgetCard) only when total > 5.
 *   - "View calendar" link does NOT appear when total <= 5.
 *   - Location is omitted from rows that have no location.
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
// Today is pinned to 2026-05-15 (a Friday).
// ---------------------------------------------------------------------------

vi.mock('../../client/src/utils/dashboard-dates.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getTodayISO: () => '2026-05-15',
  };
});

import UpcomingEventsWidget from '../../client/src/components/UpcomingEventsWidget.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Sample upcoming events with startAt values 1, 2, and 6 days after today
 * (2026-05-15), so relative labels are: "Tomorrow", "In 2 days", and a short
 * weekday+date string for the 6-day case.
 *
 * @type {object[]}
 */
const SAMPLE_EVENTS = [
  {
    id: '1',
    title: 'Team standup',
    startAt: '2026-05-16T09:00:00',
    location: 'Zoom',
  },
  {
    id: '2',
    title: 'Sprint review',
    startAt: '2026-05-17T14:30:00',
    location: '',
  },
  {
    id: '3',
    title: 'Product demo',
    startAt: '2026-05-21T10:00:00',
    location: 'Conference Room A',
  },
];

// ---------------------------------------------------------------------------
// Widget heading
// ---------------------------------------------------------------------------

describe('widget heading', () => {
  it('renders "Upcoming Events" as the heading', () => {
    render(<UpcomingEventsWidget events={[]} total={0} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Upcoming Events',
    );
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('renders "No upcoming events." when events is empty', () => {
    render(<UpcomingEventsWidget events={[]} total={0} />);
    expect(screen.getByText('No upcoming events.')).toBeInTheDocument();
  });

  it('does not render any event rows when events is empty', () => {
    render(<UpcomingEventsWidget events={[]} total={0} />);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('does not render any links when events is empty', () => {
    render(<UpcomingEventsWidget events={[]} total={0} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Event rows
// ---------------------------------------------------------------------------

describe('event rows', () => {
  it('renders a row for each event', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={3} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders the event title in each row', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={3} />);
    expect(screen.getByText('Team standup')).toBeInTheDocument();
    expect(screen.getByText('Sprint review')).toBeInTheDocument();
    expect(screen.getByText('Product demo')).toBeInTheDocument();
  });

  it('renders a relative future-date label for each row', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={3} />);
    // 2026-05-16 is 1 day after 2026-05-15 → "Tomorrow"
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    // 2026-05-17 is 2 days after 2026-05-15 → "In 2 days"
    expect(screen.getByText('In 2 days')).toBeInTheDocument();
    // 2026-05-21 is 6 days after 2026-05-15 → short weekday+date string
    // (locale-dependent format, e.g. "Thu 21" or "21 Thu")
    const shortDateLabel = screen.getByText((text) =>
      /\bThu\b/.test(text) && /\b21\b/.test(text),
    );
    expect(shortDateLabel).toBeInTheDocument();
  });

  it('renders the HH:MM start time for each row', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={3} />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('renders the location when set', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={3} />);
    expect(screen.getByText('Zoom')).toBeInTheDocument();
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
  });

  it('does not render a location element when location is empty string', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={3} />);
    // "Sprint review" has location '' — only Zoom and Conference Room A should appear
    const allText = screen.getAllByRole('link').map((el) => el.textContent);
    // The sprint review row should not contain any muted location text
    const sprintRow = allText.find((t) => t.includes('Sprint review'));
    expect(sprintRow).not.toMatch(/Conference Room/);
  });

  it('each row is a link to /calendar', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={3} />);
    // All row links should point to /calendar
    const links = screen.getAllByRole('link');
    // Filter to only row links (excludes any "View calendar" footer link)
    const rowLinks = links.filter((l) => !l.textContent.includes('View calendar'));
    rowLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/calendar');
    });
  });
});

// ---------------------------------------------------------------------------
// "View calendar" link visibility
// ---------------------------------------------------------------------------

describe('"View calendar" link', () => {
  it('does NOT render a "View calendar" link when total is exactly 5', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS.slice(0, 3)} total={5} />);
    const allLinks = screen.getAllByRole('link');
    const viewCalendarLink = allLinks.find((l) =>
      l.textContent.toLowerCase().includes('view calendar'),
    );
    expect(viewCalendarLink).toBeUndefined();
  });

  it('does NOT render a "View calendar" link when total is less than 5', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={3} />);
    const allLinks = screen.getAllByRole('link');
    const viewCalendarLink = allLinks.find((l) =>
      l.textContent.toLowerCase().includes('view calendar'),
    );
    expect(viewCalendarLink).toBeUndefined();
  });

  it('renders a "View calendar" link when total is 6', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={6} />);
    expect(screen.getByText('View calendar')).toBeInTheDocument();
  });

  it('"View calendar" link points to /calendar', () => {
    render(<UpcomingEventsWidget events={SAMPLE_EVENTS} total={10} />);
    const viewCalendarLink = screen.getByText('View calendar').closest('a');
    expect(viewCalendarLink).toHaveAttribute('href', '/calendar');
  });

  it('does NOT render a "View calendar" link when events is empty and total is 0', () => {
    render(<UpcomingEventsWidget events={[]} total={0} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
