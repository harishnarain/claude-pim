/**
 * Unit tests for client/src/components/MarkdownView.jsx.
 *
 * Mocks `renderMarkdown` from `markdownRenderer.js` to isolate the component
 * under test from the full Markdown rendering pipeline.
 *
 * Verifies:
 *   - The wrapper <div> is always rendered.
 *   - Output from renderMarkdown is placed inside the wrapper <div>.
 *   - The component renders without error for an empty string.
 *   - The component renders without error when content is undefined.
 *   - renderMarkdown is called with the content prop value.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock renderMarkdown before importing the component so the component picks up
// the mock when its module is evaluated.
// ---------------------------------------------------------------------------
vi.mock('../../client/src/lib/markdownRenderer.js', () => ({
  renderMarkdown: vi.fn(),
}));

import { renderMarkdown } from '../../client/src/lib/markdownRenderer.js';
import MarkdownView from '../../client/src/components/MarkdownView.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render MarkdownView with the given content prop.
 *
 * @param {string} [content=''] - Markdown string to pass as the content prop.
 * @returns {{ container: HTMLElement }}
 */
function renderView(content = '') {
  return render(<MarkdownView content={content} />);
}

// ---------------------------------------------------------------------------
// Reset mock between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  renderMarkdown.mockReset();
  // Default: return an empty array so no children crash the component.
  renderMarkdown.mockReturnValue([]);
});

// ---------------------------------------------------------------------------
// Wrapper <div> is always present
// ---------------------------------------------------------------------------

describe('MarkdownView wrapper', () => {
  it('renders a wrapping <div>', () => {
    const { container } = renderView('hello');
    expect(container.firstChild.tagName.toLowerCase()).toBe('div');
  });

  it('renders without error for an empty string', () => {
    expect(() => renderView('')).not.toThrow();
  });

  it('renders without error when content is undefined', () => {
    // Pass no content prop at all — component should guard with `?? ''`.
    expect(() => render(<MarkdownView />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// renderMarkdown is called correctly
// ---------------------------------------------------------------------------

describe('renderMarkdown integration', () => {
  it('calls renderMarkdown with the content prop', () => {
    renderMarkdown.mockReturnValue([]);
    renderView('# My Heading');
    expect(renderMarkdown).toHaveBeenCalledWith('# My Heading');
  });

  it('calls renderMarkdown with an empty string when content is empty', () => {
    renderMarkdown.mockReturnValue([]);
    renderView('');
    expect(renderMarkdown).toHaveBeenCalledWith('');
  });
});

// ---------------------------------------------------------------------------
// Output from renderMarkdown appears inside the wrapper <div>
// ---------------------------------------------------------------------------

describe('output placement', () => {
  it('places a single React element returned by renderMarkdown inside the wrapper', () => {
    renderMarkdown.mockReturnValue([
      React.createElement('p', { key: 'p1' }, 'Rendered paragraph'),
    ]);
    const { container } = renderView('Rendered paragraph');
    const wrapper = container.firstChild;
    expect(wrapper.querySelector('p')).not.toBeNull();
    expect(wrapper.querySelector('p').textContent).toBe('Rendered paragraph');
  });

  it('places multiple React elements returned by renderMarkdown inside the wrapper', () => {
    renderMarkdown.mockReturnValue([
      React.createElement('h1', { key: 'h1' }, 'Title'),
      React.createElement('p', { key: 'p1' }, 'Body text'),
      React.createElement('blockquote', { key: 'bq' }, 'A quote'),
    ]);
    const { container } = renderView('# Title\nBody text\n> A quote');
    const wrapper = container.firstChild;
    expect(wrapper.querySelector('h1').textContent).toBe('Title');
    expect(wrapper.querySelector('p').textContent).toBe('Body text');
    expect(wrapper.querySelector('blockquote').textContent).toBe('A quote');
  });

  it('renders nothing inside the wrapper when renderMarkdown returns an empty array', () => {
    renderMarkdown.mockReturnValue([]);
    const { container } = renderView('');
    const wrapper = container.firstChild;
    expect(wrapper.children).toHaveLength(0);
  });
});
