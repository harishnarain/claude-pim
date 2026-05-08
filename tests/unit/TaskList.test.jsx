/**
 * Unit tests for client/src/components/TaskList.jsx.
 *
 * Covers:
 *   - Renders the correct number of TaskCard components.
 *   - Empty array renders nothing.
 *   - Undefined tasks renders nothing.
 *   - onSelect and onStatusChange are forwarded correctly to each TaskCard.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskList from '../../client/src/components/TaskList.jsx';

/** Sample tasks array used across tests. */
const SAMPLE_TASKS = [
  {
    id: 1,
    title: 'Alpha Task',
    bodyPreview: 'Preview of alpha.',
    isPinned: false,
    dueDate: null,
    priority: 'Low',
    status: 'Not Started',
    tags: [],
  },
  {
    id: 2,
    title: 'Beta Task',
    bodyPreview: 'Preview of beta.',
    isPinned: true,
    dueDate: '2099-06-01',
    priority: 'High',
    status: 'In Progress',
    tags: [{ id: 1, name: 'work' }],
  },
  {
    id: 3,
    title: 'Gamma Task',
    bodyPreview: 'Preview of gamma.',
    isPinned: false,
    dueDate: null,
    priority: 'Medium',
    status: 'Completed',
    tags: [],
  },
];

/**
 * Render TaskList with sensible defaults.
 *
 * @param {object} [props]                   - Prop overrides.
 * @param {object[]} [props.tasks]           - Tasks to display.
 * @param {Function} [props.onSelect]        - Selection handler mock.
 * @param {Function} [props.onStatusChange]  - Status-change handler mock.
 * @returns {{ onSelect: import('vitest').Mock, onStatusChange: import('vitest').Mock }}
 */
function renderList(props = {}) {
  const onSelect = props.onSelect ?? vi.fn();
  const onStatusChange = props.onStatusChange ?? vi.fn();
  const tasks = props.tasks !== undefined ? props.tasks : SAMPLE_TASKS;
  render(
    <TaskList
      tasks={tasks}
      onSelect={onSelect}
      onStatusChange={onStatusChange}
    />
  );
  return { onSelect, onStatusChange };
}

// ---------------------------------------------------------------------------
// Rendering tasks
// ---------------------------------------------------------------------------

describe('rendering tasks', () => {
  it('renders a <ul> list element', () => {
    renderList();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders one card per task', () => {
    renderList();
    // Each TaskCard renders a role="button" element
    expect(screen.getAllByRole('button').length).toBe(SAMPLE_TASKS.length);
  });

  it('renders the title of each task', () => {
    renderList();
    expect(screen.getByText('Alpha Task')).toBeInTheDocument();
    expect(screen.getByText('Beta Task')).toBeInTheDocument();
    expect(screen.getByText('Gamma Task')).toBeInTheDocument();
  });

  it('renders a single task when the array has one item', () => {
    renderList({ tasks: [SAMPLE_TASKS[0]] });
    expect(screen.getAllByRole('button').length).toBe(1);
    expect(screen.getByText('Alpha Task')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('renders nothing when tasks is an empty array', () => {
    const { container } = render(
      <TaskList tasks={[]} onSelect={vi.fn()} onStatusChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when tasks is undefined', () => {
    const { container } = render(
      <TaskList tasks={undefined} onSelect={vi.fn()} onStatusChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// onSelect forwarding
// ---------------------------------------------------------------------------

describe('onSelect forwarding', () => {
  it('calls onSelect with the correct task when a card is clicked', () => {
    const { onSelect } = renderList();
    fireEvent.click(screen.getByText('Alpha Task').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_TASKS[0]);
  });

  it('calls onSelect with the second task when the second card is clicked', () => {
    const { onSelect } = renderList();
    fireEvent.click(screen.getByText('Beta Task').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_TASKS[1]);
  });
});

// ---------------------------------------------------------------------------
// onStatusChange forwarding
// ---------------------------------------------------------------------------

describe('onStatusChange forwarding', () => {
  it('calls onStatusChange with the correct id and new status', () => {
    const { onStatusChange } = renderList();
    // Find the select for the first card (Alpha Task, id=1, current status "Not Started")
    const selects = screen.getAllByRole('combobox', { name: /change status/i });
    fireEvent.change(selects[0], { target: { value: 'In Progress' } });
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith(1, 'In Progress');
  });
});
