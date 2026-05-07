/**
 * Unit tests for client/src/components/NoteToolbar.jsx.
 *
 * Covers:
 *   - Pin button renders the correct label and colour classes for both states.
 *   - Pin button calls onTogglePin when clicked.
 *   - "Saving..." appears while isSaving is true.
 *   - "Saved" appears for ~2 seconds after isSaving transitions true → false.
 *   - "Saved" clears after 2 seconds (via fake timers).
 *   - Delete button renders and calls onDelete when clicked.
 */

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteToolbar from '../../client/src/components/NoteToolbar.jsx';

/**
 * Render NoteToolbar with sensible defaults merged with any prop overrides.
 *
 * @param {object} [props] - Prop overrides.
 * @param {boolean}  [props.isPinned=false]
 * @param {Function} [props.onTogglePin]
 * @param {Function} [props.onDelete]
 * @param {boolean}  [props.isSaving=false]
 * @returns {{ onTogglePin: import('vitest').Mock, onDelete: import('vitest').Mock }}
 */
function renderToolbar(props = {}) {
  const onTogglePin = props.onTogglePin ?? vi.fn();
  const onDelete = props.onDelete ?? vi.fn();
  render(
    <NoteToolbar
      isPinned={false}
      isSaving={false}
      onTogglePin={onTogglePin}
      onDelete={onDelete}
      {...props}
    />
  );
  return { onTogglePin, onDelete };
}

// ---------------------------------------------------------------------------
// Pin button — label and colour
// ---------------------------------------------------------------------------

describe('pin button', () => {
  it('shows "Pin" label when isPinned is false', () => {
    renderToolbar({ isPinned: false });
    expect(screen.getByRole('button', { name: /pin/i })).toHaveTextContent('Pin');
  });

  it('shows "Pinned" label when isPinned is true', () => {
    renderToolbar({ isPinned: true });
    expect(screen.getByRole('button', { name: /pinned/i })).toHaveTextContent('Pinned');
  });

  it('applies amber colour classes when isPinned is true', () => {
    renderToolbar({ isPinned: true });
    const btn = screen.getByRole('button', { name: /pinned/i });
    expect(btn).toHaveClass('bg-amber-100');
    expect(btn).toHaveClass('text-amber-700');
  });

  it('applies grey colour classes when isPinned is false', () => {
    renderToolbar({ isPinned: false });
    const btn = screen.getByRole('button', { name: /pin/i });
    expect(btn).toHaveClass('bg-gray-100');
    expect(btn).toHaveClass('text-gray-600');
  });

  it('sets aria-pressed to true when isPinned is true', () => {
    renderToolbar({ isPinned: true });
    expect(screen.getByRole('button', { name: /pinned/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets aria-pressed to false when isPinned is false', () => {
    renderToolbar({ isPinned: false });
    expect(screen.getByRole('button', { name: /pin/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onTogglePin when the pin button is clicked', () => {
    const { onTogglePin } = renderToolbar({ isPinned: false });
    fireEvent.click(screen.getByRole('button', { name: /pin/i }));
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

// ---------------------------------------------------------------------------
// Save status indicator
// ---------------------------------------------------------------------------

describe('save status indicator', () => {
  it('shows "Saving..." while isSaving is true', () => {
    renderToolbar({ isSaving: true });
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('does not show "Saving..." when isSaving is false', () => {
    renderToolbar({ isSaving: false });
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  });

  it('does not show "Saved" on initial render with isSaving false (no save yet)', () => {
    renderToolbar({ isSaving: false });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "Saved" transient label — uses fake timers
// ---------------------------------------------------------------------------

describe('"Saved" appears after isSaving transitions true → false', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * A small wrapper component that lets us toggle isSaving from outside React.
   * Starts with isSaving=true then flips to false when button is clicked.
   *
   * @returns {JSX.Element}
   */
  function ToggleWrapper() {
    const [saving, setSaving] = useState(true);
    return (
      <>
        <button onClick={() => setSaving(false)}>Stop saving</button>
        <NoteToolbar
          isPinned={false}
          isSaving={saving}
          onTogglePin={vi.fn()}
          onDelete={vi.fn()}
        />
      </>
    );
  }

  it('shows "Saved" immediately after isSaving flips from true to false', () => {
    render(<ToggleWrapper />);
    // Currently saving
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Transition isSaving → false
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /stop saving/i }));
    });

    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  });

  it('clears "Saved" after 2 seconds', () => {
    render(<ToggleWrapper />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /stop saving/i }));
    });

    expect(screen.getByText('Saved')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('does not clear "Saved" before 2 seconds have elapsed', () => {
    render(<ToggleWrapper />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /stop saving/i }));
    });

    act(() => {
      vi.advanceTimersByTime(1999);
    });

    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('clears "Saved" immediately when a new save starts (isSaving goes true again)', () => {
    /**
     * Wrapper that can toggle isSaving on and off repeatedly.
     * @returns {JSX.Element}
     */
    function FullCycleWrapper() {
      const [saving, setSaving] = useState(true);
      return (
        <>
          <button onClick={() => setSaving(false)}>Stop saving</button>
          <button onClick={() => setSaving(true)}>Start saving</button>
          <NoteToolbar
            isPinned={false}
            isSaving={saving}
            onTogglePin={vi.fn()}
            onDelete={vi.fn()}
          />
        </>
      );
    }

    render(<FullCycleWrapper />);

    // Complete first save cycle
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /stop saving/i }));
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();

    // A new save begins before the 2-second window expires
    act(() => {
      vi.advanceTimersByTime(500);
      fireEvent.click(screen.getByRole('button', { name: /start saving/i }));
    });

    // "Saved" should be gone; "Saving..." should be back
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});
