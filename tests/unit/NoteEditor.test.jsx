/**
 * Unit tests for client/src/components/NoteEditor.jsx.
 *
 * Verifies:
 *   - The textarea renders with the supplied content value.
 *   - onChange is called with the new string on every keystroke.
 *   - The character counter displays correctly formatted numbers.
 *   - readOnly is applied and a warning message appears when content reaches charLimit.
 *   - The counter turns amber (text-amber-500) when within 10 % of charLimit.
 *   - The counter turns red (text-red-600) and shows the warning at the limit.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteEditor from '../../client/src/components/NoteEditor.jsx';

/** Default charLimit used across most tests. */
const DEFAULT_LIMIT = 25_000;

/**
 * Render NoteEditor with sensible defaults, merging in any prop overrides.
 *
 * @param {object} [props] - Prop overrides.
 * @param {string}   [props.content='']           - Controlled textarea value.
 * @param {Function} [props.onChange]             - Change handler mock.
 * @param {number}   [props.charLimit=25000]      - Character limit.
 * @returns {{ onChange: import('vitest').Mock }}
 */
function renderEditor(props = {}) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <NoteEditor
      content=""
      charLimit={DEFAULT_LIMIT}
      onChange={onChange}
      {...props}
    />
  );
  return { onChange };
}

// ---------------------------------------------------------------------------
// Textarea rendering
// ---------------------------------------------------------------------------

describe('textarea rendering', () => {
  it('renders a textarea element', () => {
    renderEditor();
    expect(screen.getByRole('textbox', { name: /note content/i })).toBeInTheDocument();
  });

  it('displays the supplied content value', () => {
    renderEditor({ content: 'Hello world' });
    expect(screen.getByRole('textbox', { name: /note content/i })).toHaveValue('Hello world');
  });

  it('is not read-only when content is below the limit', () => {
    renderEditor({ content: 'short' });
    expect(screen.getByRole('textbox', { name: /note content/i })).not.toHaveAttribute('readOnly');
  });
});

// ---------------------------------------------------------------------------
// onChange fires on every keystroke
// ---------------------------------------------------------------------------

describe('onChange handler', () => {
  it('calls onChange with the new value when the user types', () => {
    const { onChange } = renderEditor({ content: '' });
    const textarea = screen.getByRole('textbox', { name: /note content/i });
    fireEvent.change(textarea, { target: { value: 'Hi' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Hi');
  });

  it('calls onChange on each individual change event', () => {
    const { onChange } = renderEditor({ content: 'abc' });
    const textarea = screen.getByRole('textbox', { name: /note content/i });
    fireEvent.change(textarea, { target: { value: 'abcd' } });
    fireEvent.change(textarea, { target: { value: 'abcde' } });
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Character counter display
// ---------------------------------------------------------------------------

describe('character counter', () => {
  it('shows "0 / 25,000" when content is empty', () => {
    renderEditor({ content: '', charLimit: 25_000 });
    expect(screen.getByText('0 / 25,000')).toBeInTheDocument();
  });

  it('shows the correct count for a non-empty content string', () => {
    // 'Hello' has 5 characters
    renderEditor({ content: 'Hello', charLimit: 25_000 });
    expect(screen.getByText('5 / 25,000')).toBeInTheDocument();
  });

  it('formats large numbers with toLocaleString separators', () => {
    // 10,000 characters
    const content = 'a'.repeat(10_000);
    renderEditor({ content, charLimit: 25_000 });
    // The exact separator depends on the locale, but in Node's default (en-US) it's a comma.
    expect(screen.getByText(/10[,.]000 \/ 25[,.]000/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Read-only at the character limit
// ---------------------------------------------------------------------------

describe('read-only at charLimit', () => {
  it('makes the textarea readOnly when content.length === charLimit', () => {
    const content = 'x'.repeat(DEFAULT_LIMIT);
    renderEditor({ content, charLimit: DEFAULT_LIMIT });
    expect(screen.getByRole('textbox', { name: /note content/i })).toHaveAttribute('readOnly');
  });

  it('shows the "Character limit reached" warning message at the limit', () => {
    const content = 'x'.repeat(DEFAULT_LIMIT);
    renderEditor({ content, charLimit: DEFAULT_LIMIT });
    expect(screen.getByText(/character limit reached/i)).toBeInTheDocument();
  });

  it('does NOT show the warning below the limit', () => {
    renderEditor({ content: 'short', charLimit: DEFAULT_LIMIT });
    expect(screen.queryByText(/character limit reached/i)).not.toBeInTheDocument();
  });

  it('applies the red counter class at the limit', () => {
    const content = 'x'.repeat(DEFAULT_LIMIT);
    renderEditor({ content, charLimit: DEFAULT_LIMIT });
    // The counter wrapper should carry text-red-600
    const counter = screen.getByText(new RegExp(`${DEFAULT_LIMIT.toLocaleString()} / ${DEFAULT_LIMIT.toLocaleString()}`));
    expect(counter.closest('div')).toHaveClass('text-red-600');
  });
});

// ---------------------------------------------------------------------------
// Amber warning when near the limit (>= 90 %)
// ---------------------------------------------------------------------------

describe('amber warning near the limit', () => {
  it('applies the amber counter class when content is at 90 % of charLimit', () => {
    const charLimit = 1000;
    const content = 'x'.repeat(900); // exactly 90 %
    renderEditor({ content, charLimit });
    const counter = screen.getByText(`900 / 1,000`);
    expect(counter.closest('div')).toHaveClass('text-amber-500');
  });

  it('applies the amber counter class when content is between 90 % and 100 %', () => {
    const charLimit = 1000;
    const content = 'x'.repeat(950);
    renderEditor({ content, charLimit });
    const counter = screen.getByText(`950 / 1,000`);
    expect(counter.closest('div')).toHaveClass('text-amber-500');
  });

  it('uses the default grey counter class below the 90 % threshold', () => {
    const charLimit = 1000;
    const content = 'x'.repeat(899); // just below 90 %
    renderEditor({ content, charLimit });
    const counter = screen.getByText(`899 / 1,000`);
    expect(counter.closest('div')).toHaveClass('text-gray-500');
  });

  it('does NOT show the "Character limit reached" warning at 90 %', () => {
    const charLimit = 1000;
    const content = 'x'.repeat(900);
    renderEditor({ content, charLimit });
    expect(screen.queryByText(/character limit reached/i)).not.toBeInTheDocument();
  });
});
