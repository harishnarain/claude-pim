/**
 * Unit tests for client/src/components/NoteList.jsx.
 *
 * Covers:
 *   - Renders one NoteCard per note.
 *   - Each card is keyed by note.id (verified via rendered count).
 *   - Returns null / renders nothing when notes array is empty.
 *   - onSelect is forwarded correctly to each NoteCard.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteList from '../../client/src/components/NoteList.jsx';

/** Sample notes array used across tests. */
const SAMPLE_NOTES = [
  {
    id: 1,
    title: 'Alpha Note',
    preview: 'Preview of alpha.',
    isPinned: false,
    tags: [],
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    title: 'Beta Note',
    preview: 'Preview of beta.',
    isPinned: true,
    tags: [{ id: 1, name: 'work' }],
    updatedAt: '2025-02-01T00:00:00.000Z',
  },
  {
    id: 3,
    title: 'Gamma Note',
    preview: 'Preview of gamma.',
    isPinned: false,
    tags: [],
    updatedAt: '2025-03-01T00:00:00.000Z',
  },
];

/**
 * Render NoteList with sensible defaults merged with any prop overrides.
 *
 * @param {object} [props] - Prop overrides.
 * @param {object[]} [props.notes=SAMPLE_NOTES] - Notes to display.
 * @param {Function} [props.onSelect]           - Selection handler mock.
 * @returns {{ onSelect: import('vitest').Mock }}
 */
function renderList(props = {}) {
  const onSelect = props.onSelect ?? vi.fn();
  render(
    <NoteList
      notes={SAMPLE_NOTES}
      onSelect={onSelect}
      {...props}
    />
  );
  return { onSelect };
}

// ---------------------------------------------------------------------------
// Rendering notes
// ---------------------------------------------------------------------------

describe('rendering notes', () => {
  it('renders a <ul> list element', () => {
    renderList();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders one card per note', () => {
    renderList();
    // Each NoteCard renders a role="button" list item
    expect(screen.getAllByRole('button').length).toBe(SAMPLE_NOTES.length);
  });

  it('renders the title of each note', () => {
    renderList();
    expect(screen.getByText('Alpha Note')).toBeInTheDocument();
    expect(screen.getByText('Beta Note')).toBeInTheDocument();
    expect(screen.getByText('Gamma Note')).toBeInTheDocument();
  });

  it('renders a single note when the array has one item', () => {
    renderList({ notes: [SAMPLE_NOTES[0]] });
    expect(screen.getAllByRole('button').length).toBe(1);
    expect(screen.getByText('Alpha Note')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('renders nothing when notes is an empty array', () => {
    const { container } = render(<NoteList notes={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when notes is undefined', () => {
    const { container } = render(<NoteList notes={undefined} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// onSelect forwarding
// ---------------------------------------------------------------------------

describe('onSelect forwarding', () => {
  it('calls onSelect with the correct note when a card is clicked', () => {
    const { onSelect } = renderList();
    // Click the first card
    fireEvent.click(screen.getByText('Alpha Note').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_NOTES[0]);
  });

  it('calls onSelect with the second note when the second card is clicked', () => {
    const { onSelect } = renderList();
    fireEvent.click(screen.getByText('Beta Note').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_NOTES[1]);
  });
});
