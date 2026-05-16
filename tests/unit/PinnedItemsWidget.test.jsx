/**
 * Unit tests for client/src/components/PinnedItemsWidget.jsx.
 *
 * Covers:
 *   - Returns null when items array is empty.
 *   - Renders "Pinned Items" heading via WidgetCard.
 *   - Each row displays the TypeIcon, title, and kind badge.
 *   - Note rows link to /notes/:id.
 *   - Task rows link to /tasks/:id.
 *   - Note title is derived from the first non-empty line of content.
 *   - "View all" link is absent when total <= 6.
 *   - "View all notes" link when total > 6 and all items are notes.
 *   - "View all tasks" link when total > 6 and all items are tasks.
 *   - No "View all" link when total > 6 and items are mixed kinds.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => {
  /**
   * Minimal Link mock that renders an <a> tag.
   *
   * @param {object} props
   * @param {string} props.to
   * @param {string} [props.className]
   * @param {React.ReactNode} props.children
   * @returns {JSX.Element}
   */
  const Link = ({ to, className, children }) => (
    <a href={to} className={className}>
      {children}
    </a>
  );
  return { Link };
});

vi.mock('../../client/src/components/TypeIcon.jsx', () => {
  /**
   * Minimal TypeIcon mock that renders a span with a data attribute.
   *
   * @param {object} props
   * @param {string} props.kind
   * @param {string} [props.className]
   * @returns {JSX.Element}
   */
  const TypeIcon = ({ kind, className }) => (
    <span data-testid={`type-icon-${kind}`} className={className} />
  );
  return { default: TypeIcon };
});

import PinnedItemsWidget from '../../client/src/components/PinnedItemsWidget.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** @type {object} */
const NOTE_1 = { id: 1, kind: 'note', content: 'First note line\nSecond line', pinned: true };
/** @type {object} */
const NOTE_2 = { id: 2, kind: 'note', content: '\nIndented note\nMore', pinned: true };
/** @type {object} */
const TASK_1 = { id: 10, kind: 'task', title: 'Buy groceries', pinned: true };
/** @type {object} */
const TASK_2 = { id: 11, kind: 'task', title: 'Review PR', pinned: true };

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Render PinnedItemsWidget with the given props.
 *
 * @param {object[]} items  - Items array.
 * @param {number}   total  - Total count before cap.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderWidget(items, total) {
  return render(<PinnedItemsWidget items={items} total={total} />);
}

// ---------------------------------------------------------------------------
// Empty state — returns null
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('renders nothing when items array is empty', () => {
    const { container } = renderWidget([], 0);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when items array is empty even if total > 0', () => {
    const { container } = renderWidget([], 10);
    expect(container).toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// Widget heading
// ---------------------------------------------------------------------------

describe('heading', () => {
  it('renders "Pinned Items" as a heading', () => {
    renderWidget([NOTE_1], 1);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Pinned Items');
  });
});

// ---------------------------------------------------------------------------
// Note rows
// ---------------------------------------------------------------------------

describe('note rows', () => {
  it('renders a TypeIcon with kind="note"', () => {
    renderWidget([NOTE_1], 1);
    expect(screen.getByTestId('type-icon-note')).toBeInTheDocument();
  });

  it('displays the first non-empty line of note content as the title', () => {
    renderWidget([NOTE_1], 1);
    expect(screen.getByText('First note line')).toBeInTheDocument();
  });

  it('skips leading empty lines to find the first non-empty line', () => {
    renderWidget([NOTE_2], 1);
    expect(screen.getByText('Indented note')).toBeInTheDocument();
  });

  it('renders a "Note" badge pill', () => {
    renderWidget([NOTE_1], 1);
    expect(screen.getByText('Note')).toBeInTheDocument();
  });

  it('note row links to /notes/:id', () => {
    renderWidget([NOTE_1], 1);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/notes/1');
  });
});

// ---------------------------------------------------------------------------
// Task rows
// ---------------------------------------------------------------------------

describe('task rows', () => {
  it('renders a TypeIcon with kind="task"', () => {
    renderWidget([TASK_1], 1);
    expect(screen.getByTestId('type-icon-task')).toBeInTheDocument();
  });

  it('displays task.title as the title', () => {
    renderWidget([TASK_1], 1);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders a "Task" badge pill', () => {
    renderWidget([TASK_1], 1);
    expect(screen.getByText('Task')).toBeInTheDocument();
  });

  it('task row links to /tasks/:id', () => {
    renderWidget([TASK_1], 1);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tasks/10');
  });
});

// ---------------------------------------------------------------------------
// Multiple items
// ---------------------------------------------------------------------------

describe('multiple items', () => {
  it('renders one row per item', () => {
    renderWidget([NOTE_1, TASK_1], 2);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders both note and task badges in a mixed list', () => {
    renderWidget([NOTE_1, TASK_1], 2);
    expect(screen.getByText('Note')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "View all" link — visibility rules
// ---------------------------------------------------------------------------

describe('"View all" link — total <= 6 (no link)', () => {
  it('no "View all" link when total equals items.length (all-notes, total=2)', () => {
    renderWidget([NOTE_1, NOTE_2], 2);
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument();
  });

  it('no "View all" link when total equals 6 (cap exactly met)', () => {
    const sixNotes = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      kind: 'note',
      content: `Note ${i + 1}`,
    }));
    renderWidget(sixNotes, 6);
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument();
  });
});

describe('"View all notes" link when total > 6 and all items are notes', () => {
  it('renders "View all notes" link', () => {
    renderWidget([NOTE_1, NOTE_2], 10);
    expect(screen.getByRole('link', { name: 'View all notes' })).toBeInTheDocument();
  });

  it('"View all notes" link href is "/notes"', () => {
    renderWidget([NOTE_1, NOTE_2], 10);
    const link = screen.getByRole('link', { name: 'View all notes' });
    expect(link).toHaveAttribute('href', '/notes');
  });
});

describe('"View all tasks" link when total > 6 and all items are tasks', () => {
  it('renders "View all tasks" link', () => {
    renderWidget([TASK_1, TASK_2], 10);
    expect(screen.getByRole('link', { name: 'View all tasks' })).toBeInTheDocument();
  });

  it('"View all tasks" link href is "/tasks"', () => {
    renderWidget([TASK_1, TASK_2], 10);
    const link = screen.getByRole('link', { name: 'View all tasks' });
    expect(link).toHaveAttribute('href', '/tasks');
  });
});

describe('no "View all" link when total > 6 and items are mixed kinds', () => {
  it('omits the "View all" footer link for mixed kinds', () => {
    renderWidget([NOTE_1, TASK_1], 10);
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument();
  });
});
