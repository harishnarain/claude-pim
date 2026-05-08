/**
 * Unit tests for client/src/components/TaskForm.jsx.
 *
 * Covers:
 *   - All five fields render as controlled inputs.
 *   - onChange fires for each field with only the changed field.
 *   - onBlur fires when any field loses focus.
 *   - Character counters for title (max 255) and body (max 10,000) are accurate.
 *   - Title counter turns red at the limit; body counter turns red at the limit.
 *   - An inline validation error appears when title is empty.
 *   - Validation error is absent when title is non-empty.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskForm from '../../client/src/components/TaskForm.jsx';

/** Default task object with all fields populated. */
const DEFAULT_TASK = {
  title: 'Buy groceries',
  body: 'Milk, eggs, bread',
  dueDate: '2026-06-01',
  priority: 'Medium',
  status: 'Not Started',
};

/**
 * Render TaskForm with sensible defaults merged with any prop overrides.
 *
 * @param {object} [props] - Prop overrides.
 * @param {object|null} [props.task=DEFAULT_TASK] - Task object.
 * @param {Function}    [props.onChange]           - Change handler mock.
 * @param {Function}    [props.onBlur]             - Blur handler mock.
 * @returns {{ onChange: import('vitest').Mock, onBlur: import('vitest').Mock }}
 */
function renderForm(props = {}) {
  const onChange = props.onChange ?? vi.fn();
  const onBlur = props.onBlur ?? vi.fn();
  render(
    <TaskForm
      task={DEFAULT_TASK}
      onChange={onChange}
      onBlur={onBlur}
      {...props}
    />
  );
  return { onChange, onBlur };
}

// ---------------------------------------------------------------------------
// Field rendering
// ---------------------------------------------------------------------------

describe('field rendering', () => {
  it('renders the title input', () => {
    renderForm();
    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
  });

  it('renders the body textarea', () => {
    renderForm();
    expect(screen.getByLabelText(/task body/i)).toBeInTheDocument();
  });

  it('renders the due date input', () => {
    renderForm();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });

  it('renders the priority select', () => {
    renderForm();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('renders the status select', () => {
    renderForm();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('displays the task title value', () => {
    renderForm();
    expect(screen.getByLabelText(/task title/i)).toHaveValue('Buy groceries');
  });

  it('displays the task body value', () => {
    renderForm();
    expect(screen.getByLabelText(/task body/i)).toHaveValue('Milk, eggs, bread');
  });

  it('displays the task dueDate value', () => {
    renderForm();
    expect(screen.getByLabelText(/due date/i)).toHaveValue('2026-06-01');
  });

  it('displays the task priority value', () => {
    renderForm();
    expect(screen.getByLabelText(/priority/i)).toHaveValue('Medium');
  });

  it('displays the task status value', () => {
    renderForm();
    expect(screen.getByLabelText(/status/i)).toHaveValue('Not Started');
  });

  it('renders all priority options', () => {
    renderForm();
    const select = screen.getByLabelText(/priority/i);
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['Low', 'Medium', 'High']);
  });

  it('renders all status options', () => {
    renderForm();
    const select = screen.getByLabelText(/status/i);
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual([
      'Not Started',
      'Blocked',
      'In Progress',
      'Completed',
      'Cancelled',
    ]);
  });

  it('uses default field values when task is null', () => {
    renderForm({ task: null });
    expect(screen.getByLabelText(/task title/i)).toHaveValue('');
    expect(screen.getByLabelText(/task body/i)).toHaveValue('');
    expect(screen.getByLabelText(/priority/i)).toHaveValue('Low');
    expect(screen.getByLabelText(/status/i)).toHaveValue('Not Started');
  });
});

// ---------------------------------------------------------------------------
// onChange fires with only the changed field
// ---------------------------------------------------------------------------

describe('onChange handler', () => {
  it('calls onChange with { title } when the title input changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'New title' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ title: 'New title' });
  });

  it('calls onChange with { body } when the body textarea changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/task body/i), {
      target: { value: 'Updated body' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ body: 'Updated body' });
  });

  it('calls onChange with { dueDate } when the date input changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/due date/i), {
      target: { value: '2026-12-31' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ dueDate: '2026-12-31' });
  });

  it('calls onChange with { priority } when the priority select changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/priority/i), {
      target: { value: 'High' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ priority: 'High' });
  });

  it('calls onChange with { status } when the status select changes', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'In Progress' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ status: 'In Progress' });
  });

  it('calls onChange with only the changed field — not the full task object', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Solo field' },
    });
    const arg = onChange.mock.calls[0][0];
    expect(Object.keys(arg)).toEqual(['title']);
  });
});

// ---------------------------------------------------------------------------
// onBlur fires when any field loses focus
// ---------------------------------------------------------------------------

describe('onBlur handler', () => {
  it('calls onBlur when the title input loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/task title/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the body textarea loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/task body/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the due date input loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/due date/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the priority select loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/priority/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when the status select loses focus', () => {
    const { onBlur } = renderForm();
    fireEvent.blur(screen.getByLabelText(/status/i));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Character counters — title (max 255)
// ---------------------------------------------------------------------------

describe('title character counter', () => {
  it('shows "x / 255" counter for the title', () => {
    renderForm({ task: { ...DEFAULT_TASK, title: 'Hi' } });
    expect(screen.getByText('2 / 255')).toBeInTheDocument();
  });

  it('shows "0 / 255" counter when title is empty', () => {
    renderForm({ task: { ...DEFAULT_TASK, title: '' } });
    expect(screen.getByText('0 / 255')).toBeInTheDocument();
  });

  it('counter turns red when title is at the 255 character limit', () => {
    const title = 'a'.repeat(255);
    renderForm({ task: { ...DEFAULT_TASK, title } });
    const counter = screen.getByText('255 / 255');
    expect(counter).toHaveClass('text-red-600');
  });

  it('counter is grey when title is below the limit', () => {
    renderForm({ task: { ...DEFAULT_TASK, title: 'short' } });
    const counter = screen.getByText('5 / 255');
    expect(counter).toHaveClass('text-gray-500');
  });
});

// ---------------------------------------------------------------------------
// Character counters — body (max 10,000)
// ---------------------------------------------------------------------------

describe('body character counter', () => {
  it('shows "x / 10,000" counter for the body', () => {
    renderForm({ task: { ...DEFAULT_TASK, body: 'abc' } });
    expect(screen.getByText('3 / 10,000')).toBeInTheDocument();
  });

  it('shows "0 / 10,000" counter when body is empty', () => {
    renderForm({ task: { ...DEFAULT_TASK, body: '' } });
    expect(screen.getByText('0 / 10,000')).toBeInTheDocument();
  });

  it('counter turns red when body reaches the 10,000 character limit', () => {
    const body = 'b'.repeat(10_000);
    renderForm({ task: { ...DEFAULT_TASK, body } });
    const counter = screen.getByText('10,000 / 10,000');
    expect(counter).toHaveClass('text-red-600');
  });

  it('counter is grey when body is below the limit', () => {
    renderForm({ task: { ...DEFAULT_TASK, body: 'hello' } });
    const counter = screen.getByText('5 / 10,000');
    expect(counter).toHaveClass('text-gray-500');
  });
});

// ---------------------------------------------------------------------------
// Title validation error
// ---------------------------------------------------------------------------

describe('title validation error', () => {
  it('shows an inline error when title is empty', () => {
    renderForm({ task: { ...DEFAULT_TASK, title: '' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('shows an inline error when title is only whitespace', () => {
    renderForm({ task: { ...DEFAULT_TASK, title: '   ' } });
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('does not show a validation error when title is non-empty', () => {
    renderForm({ task: { ...DEFAULT_TASK, title: 'A task' } });
    expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument();
  });

  it('does not show a validation error when task is null (empty defaults)', () => {
    // task=null means title defaults to '', but the error should still appear.
    renderForm({ task: null });
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });
});
