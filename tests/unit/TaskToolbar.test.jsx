/**
 * Unit tests for client/src/components/TaskToolbar.jsx.
 *
 * Covers:
 *   - All four saveStatus values ('idle', 'saving', 'saved', 'error') render
 *     the correct text (or nothing for 'idle').
 *   - 'error' status text is styled red.
 *   - Pin button renders "Pinned" (blue) when isPinned is true.
 *   - Pin button renders "Pin" (grey) when isPinned is false.
 *   - Pin button calls onTogglePin when clicked.
 *   - aria-pressed reflects the isPinned value.
 *   - Delete button renders and calls onDelete when clicked.
 *   - Delete button has red-toned Tailwind classes.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskToolbar from '../../client/src/components/TaskToolbar.jsx';

/**
 * Render TaskToolbar with sensible defaults merged with any prop overrides.
 *
 * @param {object}   [props]                  - Prop overrides.
 * @param {boolean}  [props.isPinned=false]
 * @param {Function} [props.onTogglePin]
 * @param {Function} [props.onDelete]
 * @param {boolean}  [props.isSaving=false]
 * @param {string}   [props.saveStatus='idle']
 * @returns {{ onTogglePin: import('vitest').Mock, onDelete: import('vitest').Mock }}
 */
function renderToolbar(props = {}) {
  const onTogglePin = props.onTogglePin ?? vi.fn();
  const onDelete = props.onDelete ?? vi.fn();
  render(
    <TaskToolbar
      isPinned={false}
      isSaving={false}
      saveStatus="idle"
      onTogglePin={onTogglePin}
      onDelete={onDelete}
      {...props}
    />
  );
  return { onTogglePin, onDelete };
}

// ---------------------------------------------------------------------------
// Save status indicator
// ---------------------------------------------------------------------------

describe('save status indicator', () => {
  it('shows "Saving..." when saveStatus is "saving"', () => {
    renderToolbar({ saveStatus: 'saving' });
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows "Saved" when saveStatus is "saved"', () => {
    renderToolbar({ saveStatus: 'saved' });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows "Save failed" when saveStatus is "error"', () => {
    renderToolbar({ saveStatus: 'error' });
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('does not show status text when saveStatus is "idle"', () => {
    renderToolbar({ saveStatus: 'idle' });
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.queryByText('Save failed')).not.toBeInTheDocument();
  });

  it('applies red styling to the "Save failed" indicator', () => {
    renderToolbar({ saveStatus: 'error' });
    expect(screen.getByText('Save failed')).toHaveClass('text-red-600');
  });

  it('does not apply red styling when saveStatus is "saving"', () => {
    renderToolbar({ saveStatus: 'saving' });
    expect(screen.getByText('Saving...')).not.toHaveClass('text-red-600');
  });
});

// ---------------------------------------------------------------------------
// Pin toggle button — label and colour
// ---------------------------------------------------------------------------

describe('pin button', () => {
  it('shows "Pin" label when isPinned is false', () => {
    renderToolbar({ isPinned: false });
    expect(screen.getByRole('button', { name: /^pin$/i })).toBeInTheDocument();
  });

  it('shows "Pinned" label when isPinned is true', () => {
    renderToolbar({ isPinned: true });
    expect(screen.getByRole('button', { name: /^pinned$/i })).toBeInTheDocument();
  });

  it('applies blue colour classes when isPinned is true', () => {
    renderToolbar({ isPinned: true });
    const btn = screen.getByRole('button', { name: /^pinned$/i });
    expect(btn).toHaveClass('bg-blue-100');
    expect(btn).toHaveClass('text-blue-700');
  });

  it('applies grey colour classes when isPinned is false', () => {
    renderToolbar({ isPinned: false });
    const btn = screen.getByRole('button', { name: /^pin$/i });
    expect(btn).toHaveClass('bg-gray-100');
    expect(btn).toHaveClass('text-gray-600');
  });

  it('sets aria-pressed to true when isPinned is true', () => {
    renderToolbar({ isPinned: true });
    expect(screen.getByRole('button', { name: /^pinned$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('sets aria-pressed to false when isPinned is false', () => {
    renderToolbar({ isPinned: false });
    expect(screen.getByRole('button', { name: /^pin$/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('calls onTogglePin when the pin button is clicked', () => {
    const { onTogglePin } = renderToolbar({ isPinned: false });
    fireEvent.click(screen.getByRole('button', { name: /^pin$/i }));
    expect(onTogglePin).toHaveBeenCalledTimes(1);
  });

  it('calls onTogglePin when the Pinned button is clicked', () => {
    const { onTogglePin } = renderToolbar({ isPinned: true });
    fireEvent.click(screen.getByRole('button', { name: /^pinned$/i }));
    expect(onTogglePin).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Delete button
// ---------------------------------------------------------------------------

describe('delete button', () => {
  it('renders a Delete button', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onDelete when the Delete button is clicked', () => {
    const { onDelete } = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('has red-toned Tailwind classes on the Delete button', () => {
    renderToolbar();
    const btn = screen.getByRole('button', { name: /delete/i });
    expect(btn).toHaveClass('bg-red-600');
    expect(btn).toHaveClass('text-white');
  });
});
