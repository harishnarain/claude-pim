/**
 * Unit tests for client/src/components/TimeColumn.jsx.
 *
 * Covers:
 *   - Renders exactly 24 rows.
 *   - Each row is 60 px tall (via the h-[60px] Tailwind class).
 *   - Labels are formatted in 12-hour AM/PM notation.
 *   - Midnight label is "12 AM", noon label is "12 PM".
 *   - The current-hour row has the bg-blue-50 highlight class.
 *   - Non-current-hour rows do not have the highlight class.
 *   - Component mounts without errors.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimeColumn from '../../client/src/components/TimeColumn.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render the TimeColumn component and return the rendered container element.
 *
 * @returns {HTMLElement} The root container element.
 */
function renderTimeColumn() {
  const { container } = render(<TimeColumn />);
  return container;
}

// ---------------------------------------------------------------------------
// Row count
// ---------------------------------------------------------------------------

describe('row count', () => {
  it('renders exactly 24 rows', () => {
    renderTimeColumn();
    // Each row carries a unique hour label; count all hour label spans.
    const labels = screen.getAllByText(/\d{1,2}\s+(AM|PM)/i);
    expect(labels).toHaveLength(24);
  });
});

// ---------------------------------------------------------------------------
// Row height
// ---------------------------------------------------------------------------

describe('row height', () => {
  it('every row has the h-[60px] Tailwind class', () => {
    const container = renderTimeColumn();
    // Direct children of the root wrapper are the hour rows.
    const rows = container.firstChild.children;
    expect(rows.length).toBe(24);
    for (const row of rows) {
      expect(row).toHaveClass('h-[60px]');
    }
  });
});

// ---------------------------------------------------------------------------
// Hour labels — 12-hour AM/PM format
// ---------------------------------------------------------------------------

describe('hour labels', () => {
  it('renders "12 AM" for midnight (hour 0)', () => {
    renderTimeColumn();
    expect(screen.getByText('12 AM')).toBeInTheDocument();
  });

  it('renders "1 AM" for hour 1', () => {
    renderTimeColumn();
    expect(screen.getByText('1 AM')).toBeInTheDocument();
  });

  it('renders "11 AM" for hour 11', () => {
    renderTimeColumn();
    expect(screen.getByText('11 AM')).toBeInTheDocument();
  });

  it('renders "12 PM" for noon (hour 12)', () => {
    renderTimeColumn();
    expect(screen.getByText('12 PM')).toBeInTheDocument();
  });

  it('renders "1 PM" for hour 13', () => {
    renderTimeColumn();
    expect(screen.getByText('1 PM')).toBeInTheDocument();
  });

  it('renders "11 PM" for hour 23', () => {
    renderTimeColumn();
    expect(screen.getByText('11 PM')).toBeInTheDocument();
  });

  it('applies text-xs and text-gray-400 classes to each label', () => {
    renderTimeColumn();
    const labels = screen.getAllByText(/\d{1,2}\s+(AM|PM)/i);
    for (const label of labels) {
      expect(label).toHaveClass('text-xs');
      expect(label).toHaveClass('text-gray-400');
    }
  });
});

// ---------------------------------------------------------------------------
// Current-hour highlight
// ---------------------------------------------------------------------------

describe('current-hour highlight', () => {
  beforeEach(() => {
    // Fix current hour to 9 AM for deterministic tests.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 8, 9, 30, 0)); // 2026-05-08 09:30
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies bg-blue-50 to the current-hour (9 AM) row', () => {
    const container = renderTimeColumn();
    const rows = container.firstChild.children;
    // Row index 9 corresponds to hour 9 (9 AM).
    expect(rows[9]).toHaveClass('bg-blue-50');
  });

  it('does not apply bg-blue-50 to a non-current-hour row', () => {
    const container = renderTimeColumn();
    const rows = container.firstChild.children;
    // Row index 10 corresponds to hour 10, which is not the current hour.
    expect(rows[10]).not.toHaveClass('bg-blue-50');
  });

  it('exactly one row has the bg-blue-50 highlight', () => {
    const container = renderTimeColumn();
    const rows = Array.from(container.firstChild.children);
    const highlighted = rows.filter((row) => row.classList.contains('bg-blue-50'));
    expect(highlighted).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Mounts without errors
// ---------------------------------------------------------------------------

describe('mounts without errors', () => {
  it('renders without throwing', () => {
    expect(() => renderTimeColumn()).not.toThrow();
  });
});
