/**
 * Unit tests for client/src/components/WidgetCard.jsx.
 *
 * Covers:
 *   - Title heading is rendered with the supplied text.
 *   - Children are rendered inside the card body.
 *   - "View all" link is rendered only when viewAllTo is a non-null string.
 *   - "View all" link navigates to the correct path (href attribute).
 *   - Custom viewAllLabel overrides the default "View all" text.
 *   - viewAllTo=null suppresses the link.
 *   - viewAllTo omitted (undefined) suppresses the link.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock react-router-dom Link so tests run without a Router context.
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => {
  /**
   * Minimal Link mock that renders an <a> element, making href and text
   * assertions straightforward.
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

import WidgetCard from '../../client/src/components/WidgetCard.jsx';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Render WidgetCard with the given props.
 *
 * @param {object} [props] - Props forwarded to WidgetCard.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderCard(props = {}) {
  const { title = 'Test Widget', viewAllTo, viewAllLabel, children } = props;
  return render(
    <WidgetCard
      title={title}
      viewAllTo={viewAllTo}
      viewAllLabel={viewAllLabel}
    >
      {children ?? <p>Card body content</p>}
    </WidgetCard>,
  );
}

// ---------------------------------------------------------------------------
// Title rendering
// ---------------------------------------------------------------------------

describe('title rendering', () => {
  it('renders the supplied title text', () => {
    renderCard({ title: 'Overdue Tasks' });
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
  });

  it('renders the title inside an h2 element', () => {
    renderCard({ title: 'Upcoming Events' });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Upcoming Events');
  });
});

// ---------------------------------------------------------------------------
// Children rendering
// ---------------------------------------------------------------------------

describe('children rendering', () => {
  it('renders children inside the card', () => {
    renderCard({ children: <span>Widget body</span> });
    expect(screen.getByText('Widget body')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    renderCard({
      children: (
        <>
          <p>First item</p>
          <p>Second item</p>
        </>
      ),
    });
    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "View all" link — visibility
// ---------------------------------------------------------------------------

describe('"View all" link visibility', () => {
  it('renders the "View all" link when viewAllTo is a non-null string', () => {
    renderCard({ viewAllTo: '/tasks' });
    expect(screen.getByRole('link', { name: /view all/i })).toBeInTheDocument();
  });

  it('does not render the "View all" link when viewAllTo is null', () => {
    renderCard({ viewAllTo: null });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('does not render the "View all" link when viewAllTo is omitted', () => {
    renderCard();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('does not render the "View all" link when viewAllTo is undefined', () => {
    renderCard({ viewAllTo: undefined });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "View all" link — href and label
// ---------------------------------------------------------------------------

describe('"View all" link href and label', () => {
  it('link href matches the supplied viewAllTo path', () => {
    renderCard({ viewAllTo: '/calendar' });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/calendar');
  });

  it('link text defaults to "View all"', () => {
    renderCard({ viewAllTo: '/notes' });
    expect(screen.getByRole('link')).toHaveTextContent('View all');
  });

  it('link text uses viewAllLabel when provided', () => {
    renderCard({ viewAllTo: '/tasks', viewAllLabel: 'View all tasks' });
    expect(screen.getByRole('link')).toHaveTextContent('View all tasks');
  });

  it('link text uses a custom viewAllLabel even with a different path', () => {
    renderCard({ viewAllTo: '/calendar', viewAllLabel: 'View calendar' });
    expect(screen.getByRole('link')).toHaveTextContent('View calendar');
  });
});

// ---------------------------------------------------------------------------
// Card structure
// ---------------------------------------------------------------------------

describe('card structure', () => {
  it('renders a separator between the heading and the body', () => {
    const { container } = renderCard({ title: 'My Widget' });
    const hr = container.querySelector('hr');
    expect(hr).toBeInTheDocument();
  });

  it('applies rounded-xl to the outer container', () => {
    const { container } = renderCard();
    const card = container.firstChild;
    expect(card).toHaveClass('rounded-xl');
  });

  it('applies border border-gray-200 to the outer container', () => {
    const { container } = renderCard();
    const card = container.firstChild;
    expect(card).toHaveClass('border', 'border-gray-200');
  });

  it('applies bg-white to the outer container', () => {
    const { container } = renderCard();
    const card = container.firstChild;
    expect(card).toHaveClass('bg-white');
  });
});
