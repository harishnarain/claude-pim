/**
 * Unit tests for client/src/components/SearchResultList.jsx.
 *
 * Covers:
 *   - Flat mode renders all items in the given order.
 *   - Grouped mode shows section headers for non-empty groups.
 *   - Sections with 0 results are hidden in grouped mode.
 *   - "Show more" button appears when a section has more than 20 items,
 *     and reveals the next page when clicked.
 *   - "Show more" disappears once all items are shown.
 *   - onResultClick is called with the correct result when a row is clicked.
 *   - Renders nothing when results array is empty.
 *
 * SearchResultItem is mocked to avoid a TypeIcon dependency.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock SearchResultItem so tests are isolated from its dependencies.
// ---------------------------------------------------------------------------

vi.mock('../../client/src/components/SearchResultItem.jsx', () => ({
  default: function SearchResultItem({ result, onClick }) {
    return (
      <div
        data-testid="search-result-item"
        data-kind={result.kind}
        data-id={result.id}
        role="button"
        tabIndex={0}
        onClick={() => onClick(result)}
      >
        {result.title}
      </div>
    );
  },
}));

import SearchResultList from '../../client/src/components/SearchResultList.jsx';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Build an array of N results of a given kind.
 *
 * @param {number} n     - Number of results to generate.
 * @param {string} kind  - 'contact' | 'note' | 'task' | 'event'.
 * @returns {object[]}
 */
function makeResults(n, kind = 'note') {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    kind,
    title: `${kind} ${i + 1}`,
    subtitle: `Subtitle for ${kind} ${i + 1}`,
    url: `/${kind}s/${i + 1}`,
    updatedAt: '2025-01-15T10:00:00.000Z',
    isPinned: false,
  }));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Flat mode
// ---------------------------------------------------------------------------

describe('flat mode (grouped={false})', () => {
  it('renders a SearchResultItem for every result in the given order', () => {
    const results = [
      ...makeResults(2, 'note'),
      ...makeResults(1, 'contact'),
    ];
    render(<SearchResultList results={results} grouped={false} onResultClick={vi.fn()} />);
    const items = screen.getAllByTestId('search-result-item');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute('data-kind', 'note');
    expect(items[1]).toHaveAttribute('data-kind', 'note');
    expect(items[2]).toHaveAttribute('data-kind', 'contact');
  });

  it('renders all items when there are exactly 20', () => {
    const results = makeResults(20, 'task');
    render(<SearchResultList results={results} grouped={false} onResultClick={vi.fn()} />);
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(20);
  });

  it('calls onResultClick with the clicked result object', () => {
    const results = makeResults(2, 'note');
    const onResultClick = vi.fn();
    render(<SearchResultList results={results} grouped={false} onResultClick={onResultClick} />);
    fireEvent.click(screen.getAllByTestId('search-result-item')[0]);
    expect(onResultClick).toHaveBeenCalledTimes(1);
    expect(onResultClick).toHaveBeenCalledWith(results[0]);
  });

  it('renders nothing when the results array is empty', () => {
    const { container } = render(
      <SearchResultList results={[]} grouped={false} onResultClick={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Grouped mode — section headings
// ---------------------------------------------------------------------------

describe('grouped mode — section headings', () => {
  it('shows section headers for non-empty groups', () => {
    const results = [
      ...makeResults(1, 'contact'),
      ...makeResults(1, 'note'),
    ];
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('hides sections with 0 results', () => {
    const results = makeResults(2, 'task');
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    expect(screen.queryByText('Contacts')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.queryByText('Events')).not.toBeInTheDocument();
  });

  it('shows all four section headers when each kind has results', () => {
    const results = [
      ...makeResults(1, 'contact'),
      ...makeResults(1, 'note'),
      ...makeResults(1, 'task'),
      ...makeResults(1, 'event'),
    ];
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('renders items in the fixed section order regardless of input order', () => {
    // Input is: event, note, contact — output should be: contact, note, event.
    const results = [
      ...makeResults(1, 'event'),
      ...makeResults(1, 'note'),
      ...makeResults(1, 'contact'),
    ];
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    const headingTexts = headings.map((h) => h.textContent);
    expect(headingTexts).toEqual(['Contacts', 'Notes', 'Events']);
  });

  it('calls onResultClick with the correct result in grouped mode', () => {
    const results = makeResults(1, 'contact');
    const onResultClick = vi.fn();
    render(<SearchResultList results={results} grouped={true} onResultClick={onResultClick} />);
    fireEvent.click(screen.getByTestId('search-result-item'));
    expect(onResultClick).toHaveBeenCalledTimes(1);
    expect(onResultClick).toHaveBeenCalledWith(results[0]);
  });
});

// ---------------------------------------------------------------------------
// Grouped mode — Show more pagination
// ---------------------------------------------------------------------------

describe('grouped mode — Show more', () => {
  it('shows at most 20 items initially when a section has more than 20', () => {
    const results = makeResults(25, 'note');
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(20);
  });

  it('renders the "Show more" button when a section has more than 20 items', () => {
    const results = makeResults(21, 'note');
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument();
  });

  it('does not render "Show more" when a section has exactly 20 items', () => {
    const results = makeResults(20, 'note');
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
  });

  it('reveals the next 20 items after clicking "Show more"', () => {
    const results = makeResults(25, 'note');
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: /show more/i }));
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(25);
  });

  it('hides "Show more" button once all items are visible', () => {
    const results = makeResults(25, 'note');
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /show more/i }));
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
  });

  it('paginates independently per section', () => {
    const results = [
      ...makeResults(25, 'contact'),
      ...makeResults(25, 'note'),
    ];
    render(<SearchResultList results={results} grouped={true} onResultClick={vi.fn()} />);
    // Both sections should start with 20 visible → 40 total items.
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(40);
    const buttons = screen.getAllByRole('button', { name: /show more/i });
    expect(buttons).toHaveLength(2);
    // Click the first section's "Show more".
    fireEvent.click(buttons[0]);
    // First section now shows 25, second still 20 → 45 total.
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(45);
  });

  it('renders nothing when results array is empty in grouped mode', () => {
    const { container } = render(
      <SearchResultList results={[]} grouped={true} onResultClick={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
