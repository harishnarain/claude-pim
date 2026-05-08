/**
 * Unit tests for client/src/components/PriorityBadge.jsx.
 *
 * Covers:
 *   - Renders the correct label for each valid priority value.
 *   - Applies the correct Tailwind colour classes for each valid priority.
 *   - Unknown priority values degrade gracefully (no crash, neutral styling).
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PriorityBadge from '../../client/src/components/PriorityBadge.jsx';

/**
 * Render PriorityBadge and return the rendered span element.
 *
 * @param {string} priority - Priority value to pass as the `priority` prop.
 * @returns {HTMLElement} The rendered span element.
 */
function renderBadge(priority) {
  render(<PriorityBadge priority={priority} />);
  return screen.getByText(priority);
}

// ---------------------------------------------------------------------------
// Label rendering
// ---------------------------------------------------------------------------

describe('label rendering', () => {
  it('renders the label "Low" for a Low priority', () => {
    renderBadge('Low');
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders the label "Medium" for a Medium priority', () => {
    renderBadge('Medium');
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders the label "High" for a High priority', () => {
    renderBadge('High');
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Colour classes
// ---------------------------------------------------------------------------

describe('colour classes', () => {
  it('applies grey classes for Low priority', () => {
    const el = renderBadge('Low');
    expect(el).toHaveClass('bg-gray-100');
    expect(el).toHaveClass('text-gray-600');
  });

  it('applies amber classes for Medium priority', () => {
    const el = renderBadge('Medium');
    expect(el).toHaveClass('bg-amber-100');
    expect(el).toHaveClass('text-amber-700');
  });

  it('applies red classes for High priority', () => {
    const el = renderBadge('High');
    expect(el).toHaveClass('bg-red-100');
    expect(el).toHaveClass('text-red-700');
  });
});

// ---------------------------------------------------------------------------
// Common classes
// ---------------------------------------------------------------------------

describe('common classes', () => {
  it('always applies inline-flex and rounded-full base classes', () => {
    const el = renderBadge('Low');
    expect(el).toHaveClass('inline-flex');
    expect(el).toHaveClass('rounded-full');
    expect(el).toHaveClass('text-xs');
    expect(el).toHaveClass('font-medium');
  });
});

// ---------------------------------------------------------------------------
// Unknown priority fallback
// ---------------------------------------------------------------------------

describe('unknown priority fallback', () => {
  it('does not crash when given an unknown priority value', () => {
    render(<PriorityBadge priority="Extreme" />);
    expect(screen.getByText('Extreme')).toBeInTheDocument();
  });

  it('applies neutral grey classes for an unknown priority value', () => {
    render(<PriorityBadge priority="Extreme" />);
    const el = screen.getByText('Extreme');
    expect(el).toHaveClass('bg-gray-100');
    expect(el).toHaveClass('text-gray-600');
  });
});
