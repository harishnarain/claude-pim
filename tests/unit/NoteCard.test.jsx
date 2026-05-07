/**
 * Unit tests for client/src/components/NoteCard.jsx.
 *
 * Covers:
 *   - Title is displayed in bold; "Untitled" is shown when title is blank.
 *   - Pin badge is visible when isPinned is true; hidden when false.
 *   - Preview is truncated to ~100 characters with an ellipsis.
 *   - Tags are rendered as individual badges.
 *   - updatedAt is displayed as a formatted date string.
 *   - onSelect is called with the note object when the card is clicked.
 *   - onSelect is called via keyboard (Enter / Space).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteCard from '../../client/src/components/NoteCard.jsx';

/** A complete sample note used as a base across tests. */
const SAMPLE_NOTE = {
  id: 1,
  title: 'My First Note',
  preview: 'This is a preview of the note content.',
  isPinned: false,
  tags: [{ id: 1, name: 'react' }, { id: 2, name: 'javascript' }],
  updatedAt: '2025-01-15T10:00:00.000Z',
};

/**
 * Render NoteCard with sensible defaults merged with any prop overrides.
 *
 * @param {object} [noteOverrides]   - Overrides applied on top of SAMPLE_NOTE.
 * @param {object} [props]           - Additional component props.
 * @param {Function} [props.onSelect] - onSelect handler mock.
 * @returns {{ onSelect: import('vitest').Mock }}
 */
function renderCard(noteOverrides = {}, props = {}) {
  const onSelect = props.onSelect ?? vi.fn();
  const note = { ...SAMPLE_NOTE, ...noteOverrides };
  render(<NoteCard note={note} onSelect={onSelect} />);
  return { onSelect };
}

// ---------------------------------------------------------------------------
// Title display
// ---------------------------------------------------------------------------

describe('title display', () => {
  it('renders the note title in bold', () => {
    renderCard();
    const title = screen.getByText('My First Note');
    expect(title).toHaveClass('font-bold');
  });

  it('renders "Untitled" when title is an empty string', () => {
    renderCard({ title: '' });
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('renders "Untitled" when title is only whitespace', () => {
    renderCard({ title: '   ' });
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('renders the actual title when it is not blank', () => {
    renderCard({ title: 'Shopping List' });
    expect(screen.getByText('Shopping List')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Pin badge
// ---------------------------------------------------------------------------

describe('pin badge', () => {
  it('shows the pin badge when isPinned is true', () => {
    renderCard({ isPinned: true });
    expect(screen.getByText(/pinned/i)).toBeInTheDocument();
  });

  it('does not show the pin badge when isPinned is false', () => {
    renderCard({ isPinned: false });
    expect(screen.queryByText(/pinned/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Preview truncation
// ---------------------------------------------------------------------------

describe('preview truncation', () => {
  it('displays the full preview when it is 100 characters or fewer', () => {
    const preview = 'a'.repeat(100);
    renderCard({ preview });
    expect(screen.getByText(preview)).toBeInTheDocument();
  });

  it('truncates preview longer than 100 characters and appends an ellipsis', () => {
    const longPreview = 'b'.repeat(150);
    renderCard({ preview: longPreview });
    // The component slices at 100 and appends '…'
    const truncated = `${'b'.repeat(100)}…`;
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });

  it('does not render the preview paragraph when preview is empty', () => {
    renderCard({ preview: '' });
    // Only the title text is present; no extra paragraph for a blank preview
    expect(screen.queryByText(/^b+/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tag badges
// ---------------------------------------------------------------------------

describe('tag badges', () => {
  it('renders a badge for each object-style tag', () => {
    renderCard({ tags: [{ id: 1, name: 'react' }, { id: 2, name: 'vue' }] });
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('vue')).toBeInTheDocument();
  });

  it('renders a badge for plain-string tags', () => {
    renderCard({ tags: ['alpha', 'beta'] });
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('renders nothing in the tag area when tags array is empty', () => {
    renderCard({ tags: [] });
    // None of the default tag names should appear
    expect(screen.queryByText('react')).not.toBeInTheDocument();
    expect(screen.queryByText('javascript')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Date display
// ---------------------------------------------------------------------------

describe('date display', () => {
  it('renders a formatted date string derived from updatedAt', () => {
    renderCard({ updatedAt: '2025-06-01T00:00:00.000Z' });
    // The exact format depends on the locale; just verify something date-like appears
    const dateEl = screen.getByText(/2025/);
    expect(dateEl).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// onSelect callback
// ---------------------------------------------------------------------------

describe('onSelect callback', () => {
  it('calls onSelect with the note object when the card is clicked', () => {
    const { onSelect } = renderCard();
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_NOTE);
  });

  it('calls onSelect when Enter is pressed on the card', () => {
    const { onSelect } = renderCard();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_NOTE);
  });

  it('calls onSelect when Space is pressed on the card', () => {
    const { onSelect } = renderCard();
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(SAMPLE_NOTE);
  });

  it('does not call onSelect when an unrelated key is pressed', () => {
    const { onSelect } = renderCard();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
