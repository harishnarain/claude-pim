/**
 * Unit tests for client/src/components/FilterControl.jsx.
 *
 * Covers:
 *   - Status toggle buttons are rendered.
 *   - Priority toggle buttons are rendered.
 *   - Clicking a value toggles it on (adds to filter array).
 *   - Clicking an active value toggles it off (removes from filter array).
 *   - Active count badge shows the correct number when filters are applied.
 *   - "Clear" button resets the filter array to [].
 *   - aria-pressed attribute reflects the active state correctly.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterControl from '../../client/src/components/FilterControl.jsx';

/** All status values exposed by the component. */
const ALL_STATUS_VALUES = [
  'Not Started',
  'Blocked',
  'In Progress',
  'Completed',
  'Cancelled',
];

/** All priority values exposed by the component. */
const ALL_PRIORITY_VALUES = ['Low', 'Medium', 'High'];

/**
 * Render FilterControl with sensible defaults merged with any prop overrides.
 *
 * @param {object}   [props]
 * @param {string[]} [props.statusFilter=[]]       - Active status filters.
 * @param {string[]} [props.priorityFilter=[]]     - Active priority filters.
 * @param {Function} [props.onStatusChange]        - Status change mock.
 * @param {Function} [props.onPriorityChange]      - Priority change mock.
 * @returns {{ onStatusChange: import('vitest').Mock, onPriorityChange: import('vitest').Mock }}
 */
function renderControl(props = {}) {
  const onStatusChange = props.onStatusChange ?? vi.fn();
  const onPriorityChange = props.onPriorityChange ?? vi.fn();
  render(
    <FilterControl
      statusFilter={props.statusFilter ?? []}
      priorityFilter={props.priorityFilter ?? []}
      onStatusChange={onStatusChange}
      onPriorityChange={onPriorityChange}
    />
  );
  return { onStatusChange, onPriorityChange };
}

// ---------------------------------------------------------------------------
// Button rendering
// ---------------------------------------------------------------------------

describe('button rendering', () => {
  it('renders a toggle button for each status value', () => {
    renderControl();
    for (const value of ALL_STATUS_VALUES) {
      expect(screen.getByRole('button', { name: value })).toBeInTheDocument();
    }
  });

  it('renders a toggle button for each priority value', () => {
    renderControl();
    for (const value of ALL_PRIORITY_VALUES) {
      expect(screen.getByRole('button', { name: value })).toBeInTheDocument();
    }
  });

  it('renders the "Status" section label', () => {
    renderControl();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders the "Priority" section label', () => {
    renderControl();
    expect(screen.getByText('Priority')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Toggle on — adding a value to the filter
// ---------------------------------------------------------------------------

describe('toggle on', () => {
  it('calls onStatusChange with the toggled-on value when clicking an inactive status', () => {
    const { onStatusChange } = renderControl({ statusFilter: [] });
    fireEvent.click(screen.getByRole('button', { name: 'In Progress' }));
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith(['In Progress']);
  });

  it('calls onPriorityChange with the toggled-on value when clicking an inactive priority', () => {
    const { onPriorityChange } = renderControl({ priorityFilter: [] });
    fireEvent.click(screen.getByRole('button', { name: 'High' }));
    expect(onPriorityChange).toHaveBeenCalledTimes(1);
    expect(onPriorityChange).toHaveBeenCalledWith(['High']);
  });

  it('appends to an existing non-empty status filter', () => {
    const { onStatusChange } = renderControl({ statusFilter: ['Blocked'] });
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(onStatusChange).toHaveBeenCalledWith(['Blocked', 'Completed']);
  });
});

// ---------------------------------------------------------------------------
// Toggle off — removing a value from the filter
// ---------------------------------------------------------------------------

describe('toggle off', () => {
  it('calls onStatusChange without the value when clicking an active status', () => {
    const { onStatusChange } = renderControl({
      statusFilter: ['Blocked', 'In Progress'],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Blocked' }));
    expect(onStatusChange).toHaveBeenCalledWith(['In Progress']);
  });

  it('calls onPriorityChange without the value when clicking an active priority', () => {
    const { onPriorityChange } = renderControl({
      priorityFilter: ['Low', 'High'],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Low' }));
    expect(onPriorityChange).toHaveBeenCalledWith(['High']);
  });
});

// ---------------------------------------------------------------------------
// Active count badge
// ---------------------------------------------------------------------------

describe('active count badge', () => {
  it('does not show a status count badge when no status filters are active', () => {
    renderControl({ statusFilter: [] });
    // Find all "N active" badges; none should exist for status when filter is empty
    const badges = screen.queryAllByText(/\d+ active/);
    expect(badges).toHaveLength(0);
  });

  it('shows "1 active" badge when one status filter is active', () => {
    renderControl({ statusFilter: ['Blocked'] });
    expect(screen.getByText('1 active')).toBeInTheDocument();
  });

  it('shows "2 active" badge when two status filters are active', () => {
    renderControl({ statusFilter: ['Blocked', 'Completed'] });
    expect(screen.getByText('2 active')).toBeInTheDocument();
  });

  it('shows separate count badges for status and priority simultaneously', () => {
    renderControl({
      statusFilter: ['Blocked'],
      priorityFilter: ['High', 'Medium'],
    });
    const badges = screen.getAllByText(/\d+ active/);
    expect(badges).toHaveLength(2);
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('2 active')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Clear button
// ---------------------------------------------------------------------------

describe('clear button', () => {
  it('does not render a Clear button when status filter is empty', () => {
    renderControl({ statusFilter: [] });
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('renders a Clear button when status filter has at least one value', () => {
    renderControl({ statusFilter: ['Blocked'] });
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('calls onStatusChange([]) when the status Clear button is clicked', () => {
    const { onStatusChange } = renderControl({ statusFilter: ['Blocked'] });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onStatusChange).toHaveBeenCalledWith([]);
  });

  it('calls onPriorityChange([]) when the priority Clear button is clicked', () => {
    const { onPriorityChange } = renderControl({ priorityFilter: ['High'] });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onPriorityChange).toHaveBeenCalledWith([]);
  });
});

// ---------------------------------------------------------------------------
// aria-pressed accessibility
// ---------------------------------------------------------------------------

describe('aria-pressed attribute', () => {
  it('sets aria-pressed="false" on an inactive status button', () => {
    renderControl({ statusFilter: [] });
    const btn = screen.getByRole('button', { name: 'In Progress' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets aria-pressed="true" on an active status button', () => {
    renderControl({ statusFilter: ['In Progress'] });
    const btn = screen.getByRole('button', { name: 'In Progress' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets aria-pressed="false" on an inactive priority button', () => {
    renderControl({ priorityFilter: [] });
    const btn = screen.getByRole('button', { name: 'High' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets aria-pressed="true" on an active priority button', () => {
    renderControl({ priorityFilter: ['High'] });
    const btn = screen.getByRole('button', { name: 'High' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});
