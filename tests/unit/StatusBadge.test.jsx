/**
 * Unit tests for client/src/components/StatusBadge.jsx.
 *
 * Covers:
 *   - Renders the correct label for each of the five valid status values.
 *   - Applies the correct Tailwind colour classes for each valid status.
 *   - Unknown status values degrade gracefully (no crash, neutral styling).
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBadge from '../../client/src/components/StatusBadge.jsx';

/**
 * Render StatusBadge and return the rendered span element.
 *
 * @param {string} status - Status value to pass as the `status` prop.
 * @returns {HTMLElement} The rendered span element.
 */
function renderBadge(status) {
  render(<StatusBadge status={status} />);
  return screen.getByText(status);
}

// ---------------------------------------------------------------------------
// Label rendering
// ---------------------------------------------------------------------------

describe('label rendering', () => {
  it('renders the label "Not Started"', () => {
    renderBadge('Not Started');
    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });

  it('renders the label "Blocked"', () => {
    renderBadge('Blocked');
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('renders the label "In Progress"', () => {
    renderBadge('In Progress');
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders the label "Completed"', () => {
    renderBadge('Completed');
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders the label "Cancelled"', () => {
    renderBadge('Cancelled');
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Colour classes
// ---------------------------------------------------------------------------

describe('colour classes', () => {
  it('applies grey classes for Not Started status', () => {
    const el = renderBadge('Not Started');
    expect(el).toHaveClass('bg-gray-100');
    expect(el).toHaveClass('text-gray-600');
  });

  it('applies orange classes for Blocked status', () => {
    const el = renderBadge('Blocked');
    expect(el).toHaveClass('bg-orange-100');
    expect(el).toHaveClass('text-orange-700');
  });

  it('applies blue classes for In Progress status', () => {
    const el = renderBadge('In Progress');
    expect(el).toHaveClass('bg-blue-100');
    expect(el).toHaveClass('text-blue-700');
  });

  it('applies green classes for Completed status', () => {
    const el = renderBadge('Completed');
    expect(el).toHaveClass('bg-green-100');
    expect(el).toHaveClass('text-green-700');
  });

  it('applies slate classes for Cancelled status', () => {
    const el = renderBadge('Cancelled');
    expect(el).toHaveClass('bg-slate-100');
    expect(el).toHaveClass('text-slate-500');
  });
});

// ---------------------------------------------------------------------------
// Common classes
// ---------------------------------------------------------------------------

describe('common classes', () => {
  it('always applies inline-flex and rounded-full base classes', () => {
    const el = renderBadge('Completed');
    expect(el).toHaveClass('inline-flex');
    expect(el).toHaveClass('rounded-full');
    expect(el).toHaveClass('text-xs');
    expect(el).toHaveClass('font-medium');
  });
});

// ---------------------------------------------------------------------------
// Unknown status fallback
// ---------------------------------------------------------------------------

describe('unknown status fallback', () => {
  it('does not crash when given an unknown status value', () => {
    render(<StatusBadge status="Pending Review" />);
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });

  it('applies neutral grey classes for an unknown status value', () => {
    render(<StatusBadge status="Pending Review" />);
    const el = screen.getByText('Pending Review');
    expect(el).toHaveClass('bg-gray-100');
    expect(el).toHaveClass('text-gray-600');
  });
});
