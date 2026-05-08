/**
 * Unit tests for client/src/components/TaskCard.jsx.
 *
 * Covers:
 *   - Full render: all fields are displayed.
 *   - Done visual treatment: line-through and grey background for Completed/Cancelled.
 *   - Overdue date colouring: red when due date is in the past and task is active.
 *   - Status change via the inline <select>: calls onStatusChange; does not trigger onSelect.
 *   - Click navigation: onSelect is called on card click.
 *   - Keyboard navigation: onSelect is called on Enter / Space key.
 *   - Pin icon visibility: shown when isPinned is true; hidden otherwise.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCard from '../../client/src/components/TaskCard.jsx';

/** A past date guaranteed to be in the past. */
const PAST_DATE = '2020-01-01';

/** A future date guaranteed to be in the future. */
const FUTURE_DATE = '2099-12-31';

/** A complete sample task used as a base across tests. */
const SAMPLE_TASK = {
  id: 42,
  title: 'Buy groceries',
  bodyPreview: 'Milk, eggs, bread.',
  isPinned: false,
  dueDate: FUTURE_DATE,
  priority: 'Medium',
  status: 'Not Started',
  tags: [{ id: 1, name: 'personal' }, { id: 2, name: 'errands' }],
};

/**
 * Render TaskCard with sensible defaults merged with any overrides.
 *
 * @param {object} [taskOverrides]         - Fields to merge into SAMPLE_TASK.
 * @param {object} [props]                 - Additional component props.
 * @param {Function} [props.onSelect]      - onSelect handler mock.
 * @param {Function} [props.onStatusChange] - onStatusChange handler mock.
 * @returns {{ onSelect: import('vitest').Mock, onStatusChange: import('vitest').Mock }}
 */
function renderCard(taskOverrides = {}, props = {}) {
  const onSelect = props.onSelect ?? vi.fn();
  const onStatusChange = props.onStatusChange ?? vi.fn();
  const task = { ...SAMPLE_TASK, ...taskOverrides };
  render(
    <TaskCard
      task={task}
      onSelect={onSelect}
      onStatusChange={onStatusChange}
    />
  );
  return { onSelect, onStatusChange };
}

// ---------------------------------------------------------------------------
// Full render
// ---------------------------------------------------------------------------

describe('full render', () => {
  it('renders the task title', () => {
    renderCard();
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders the body preview', () => {
    renderCard();
    expect(screen.getByText('Milk, eggs, bread.')).toBeInTheDocument();
  });

  it('renders the priority badge', () => {
    renderCard();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders the status badge', () => {
    renderCard();
    // There are multiple "Not Started" elements (badge + select option); at least one is present.
    expect(screen.getAllByText('Not Started').length).toBeGreaterThan(0);
  });

  it('renders all tag pills', () => {
    renderCard();
    expect(screen.getByText('personal')).toBeInTheDocument();
    expect(screen.getByText('errands')).toBeInTheDocument();
  });

  it('renders the inline status select', () => {
    renderCard();
    expect(screen.getByRole('combobox', { name: /change status/i })).toBeInTheDocument();
  });

  it('renders the due date when provided', () => {
    renderCard({ dueDate: '2099-12-31' });
    // The formatted date includes the year
    expect(screen.getByText(/2099/)).toBeInTheDocument();
  });

  it('does not render a due date when dueDate is null', () => {
    renderCard({ dueDate: null });
    expect(screen.queryByText(/2099/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Done visual treatment
// ---------------------------------------------------------------------------

describe('done visual treatment', () => {
  it('applies line-through to the title for Completed status', () => {
    renderCard({ status: 'Completed' });
    const title = screen.getByText('Buy groceries');
    expect(title).toHaveClass('line-through');
  });

  it('applies line-through to the title for Cancelled status', () => {
    renderCard({ status: 'Cancelled' });
    const title = screen.getByText('Buy groceries');
    expect(title).toHaveClass('line-through');
  });

  it('applies text-gray-400 to the title for done tasks', () => {
    renderCard({ status: 'Completed' });
    const title = screen.getByText('Buy groceries');
    expect(title).toHaveClass('text-gray-400');
  });

  it('applies bg-gray-50 card background for Completed tasks', () => {
    renderCard({ status: 'Completed' });
    const card = screen.getByRole('button');
    expect(card).toHaveClass('bg-gray-50');
  });

  it('applies bg-gray-50 card background for Cancelled tasks', () => {
    renderCard({ status: 'Cancelled' });
    const card = screen.getByRole('button');
    expect(card).toHaveClass('bg-gray-50');
  });

  it('applies bg-white card background for non-done tasks', () => {
    renderCard({ status: 'In Progress' });
    const card = screen.getByRole('button');
    expect(card).toHaveClass('bg-white');
  });

  it('does not apply line-through for an active task', () => {
    renderCard({ status: 'In Progress' });
    const title = screen.getByText('Buy groceries');
    expect(title).not.toHaveClass('line-through');
  });
});

// ---------------------------------------------------------------------------
// Overdue date colouring
// ---------------------------------------------------------------------------

describe('overdue date colouring', () => {
  it('applies text-red-600 to an overdue date for an active task', () => {
    renderCard({ dueDate: PAST_DATE, status: 'Not Started' });
    const dateLine = screen.getByText(/2020/);
    expect(dateLine).toHaveClass('text-red-600');
  });

  it('does not apply text-red-600 to a future due date', () => {
    renderCard({ dueDate: FUTURE_DATE, status: 'Not Started' });
    const dateLine = screen.getByText(/2099/);
    expect(dateLine).not.toHaveClass('text-red-600');
  });

  it('does not apply text-red-600 to an overdue date when task is Completed', () => {
    renderCard({ dueDate: PAST_DATE, status: 'Completed' });
    const dateLine = screen.getByText(/2020/);
    expect(dateLine).not.toHaveClass('text-red-600');
  });

  it('does not apply text-red-600 to an overdue date when task is Cancelled', () => {
    renderCard({ dueDate: PAST_DATE, status: 'Cancelled' });
    const dateLine = screen.getByText(/2020/);
    expect(dateLine).not.toHaveClass('text-red-600');
  });
});

// ---------------------------------------------------------------------------
// Inline status select
// ---------------------------------------------------------------------------

describe('inline status select', () => {
  it('calls onStatusChange with the task id and new status when the select changes', () => {
    const { onStatusChange } = renderCard({ status: 'Not Started' });
    const select = screen.getByRole('combobox', { name: /change status/i });
    fireEvent.change(select, { target: { value: 'In Progress' } });
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith(42, 'In Progress');
  });

  it('does not call onSelect when the status select changes', () => {
    const { onSelect, onStatusChange } = renderCard({ status: 'Not Started' });
    const select = screen.getByRole('combobox', { name: /change status/i });
    fireEvent.change(select, { target: { value: 'Completed' } });
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not call onSelect when the select is clicked', () => {
    const { onSelect } = renderCard();
    const select = screen.getByRole('combobox', { name: /change status/i });
    fireEvent.click(select);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('has the current task status pre-selected', () => {
    renderCard({ status: 'Blocked' });
    const select = screen.getByRole('combobox', { name: /change status/i });
    expect(select).toHaveValue('Blocked');
  });
});

// ---------------------------------------------------------------------------
// Click navigation
// ---------------------------------------------------------------------------

describe('click navigation', () => {
  it('calls onSelect with the task object when the card is clicked', () => {
    const { onSelect } = renderCard();
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({ ...SAMPLE_TASK });
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('keyboard navigation', () => {
  it('calls onSelect when Enter is pressed on the card', () => {
    const { onSelect } = renderCard();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({ ...SAMPLE_TASK });
  });

  it('calls onSelect when Space is pressed on the card', () => {
    const { onSelect } = renderCard();
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({ ...SAMPLE_TASK });
  });

  it('does not call onSelect when an unrelated key is pressed', () => {
    const { onSelect } = renderCard();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Pin icon visibility
// ---------------------------------------------------------------------------

describe('pin icon visibility', () => {
  it('shows the pin icon when isPinned is true', () => {
    renderCard({ isPinned: true });
    expect(screen.getByRole('img', { name: /pinned/i })).toBeInTheDocument();
  });

  it('does not show the pin icon when isPinned is false', () => {
    renderCard({ isPinned: false });
    expect(screen.queryByRole('img', { name: /pinned/i })).not.toBeInTheDocument();
  });
});
