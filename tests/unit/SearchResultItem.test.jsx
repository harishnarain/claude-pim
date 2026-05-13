/**
 * Unit tests for client/src/components/SearchResultItem.jsx.
 *
 * Covers:
 *   - Renders the title and subtitle of a result.
 *   - Calls onClick when the row is clicked.
 *   - Calls onClick when Enter is pressed on the row.
 *   - Calls onClick when Space is pressed on the row.
 *   - Does not call onClick for unrelated keys.
 *   - Renders correctly for all four kind values: contact, note, task, event.
 *   - Does not render the subtitle paragraph when subtitle is absent.
 *
 * TypeIcon is mocked because it is introduced in a separate task (Task 7)
 * and may not yet be present in the repository. The mock renders a simple
 * div with a data attribute so tests can verify the kind prop is forwarded.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock TypeIcon so the test does not depend on Task 7 being merged first.
vi.mock('../../client/src/components/TypeIcon.jsx', () => ({
  default: function TypeIcon({ kind }) {
    return <div data-testid="type-icon" data-kind={kind} />;
  },
}));

import SearchResultItem from '../../client/src/components/SearchResultItem.jsx';

/** A complete sample result used as a base across tests. */
const SAMPLE_RESULT = {
  id: 1,
  kind: 'note',
  title: 'Meeting Notes',
  subtitle: 'Discussed Q3 roadmap',
  url: '/notes/1',
  updatedAt: '2025-01-15T10:00:00.000Z',
  isPinned: false,
};

/**
 * Render SearchResultItem with sensible defaults merged with any overrides.
 *
 * @param {object} [resultOverrides]   - Fields to merge into SAMPLE_RESULT.
 * @param {object} [props]             - Additional component props.
 * @param {Function} [props.onClick]   - onClick handler mock.
 * @returns {{ onClick: import('vitest').Mock }}
 */
function renderItem(resultOverrides = {}, props = {}) {
  const onClick = props.onClick ?? vi.fn();
  const result = { ...SAMPLE_RESULT, ...resultOverrides };
  render(<SearchResultItem result={result} onClick={onClick} />);
  return { onClick };
}

// ---------------------------------------------------------------------------
// Title and subtitle rendering
// ---------------------------------------------------------------------------

describe('title and subtitle rendering', () => {
  it('renders the result title', () => {
    renderItem();
    expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
  });

  it('renders the result subtitle', () => {
    renderItem();
    expect(screen.getByText('Discussed Q3 roadmap')).toBeInTheDocument();
  });

  it('does not render the subtitle paragraph when subtitle is falsy', () => {
    renderItem({ subtitle: '' });
    expect(screen.queryByText('Discussed Q3 roadmap')).not.toBeInTheDocument();
  });

  it('applies the correct title classes', () => {
    renderItem();
    const title = screen.getByText('Meeting Notes');
    expect(title).toHaveClass('text-sm', 'font-medium', 'text-gray-900', 'truncate');
  });

  it('applies the correct subtitle classes', () => {
    renderItem();
    const subtitle = screen.getByText('Discussed Q3 roadmap');
    expect(subtitle).toHaveClass('text-xs', 'text-gray-500', 'truncate');
  });
});

// ---------------------------------------------------------------------------
// onClick behaviour — mouse click
// ---------------------------------------------------------------------------

describe('onClick on mouse click', () => {
  it('calls onClick with the result object when the row is clicked', () => {
    const { onClick } = renderItem();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith({ ...SAMPLE_RESULT });
  });
});

// ---------------------------------------------------------------------------
// onClick behaviour — keyboard
// ---------------------------------------------------------------------------

describe('onClick on keyboard activation', () => {
  it('calls onClick with the result object when Enter is pressed', () => {
    const { onClick } = renderItem();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith({ ...SAMPLE_RESULT });
  });

  it('calls onClick with the result object when Space is pressed', () => {
    const { onClick } = renderItem();
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith({ ...SAMPLE_RESULT });
  });

  it('does not call onClick when an unrelated key is pressed', () => {
    const { onClick } = renderItem();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Renders for all four kind values
// ---------------------------------------------------------------------------

describe('renders for all four kind values', () => {
  const KINDS = ['contact', 'note', 'task', 'event'];

  KINDS.forEach((kind) => {
    it(`renders without error and passes kind="${kind}" to TypeIcon`, () => {
      renderItem({ kind });
      const icon = screen.getByTestId('type-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('data-kind', kind);
    });
  });
});

// ---------------------------------------------------------------------------
// Accessibility attributes
// ---------------------------------------------------------------------------

describe('accessibility', () => {
  it('has role="button"', () => {
    renderItem();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has tabIndex of 0', () => {
    renderItem();
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });
});
