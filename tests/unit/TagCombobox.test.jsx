/**
 * Unit tests for client/src/components/TagCombobox.jsx.
 *
 * Covers:
 *   - Typing filters the available list.
 *   - Selecting an existing tag calls onChange and clears the input.
 *   - Pressing Enter on a new name adds it as a plain string and calls onChange.
 *   - Clicking x on a chip removes that tag and calls onChange.
 *   - 5-tag limit: input is disabled and a hint is shown; 6th tag cannot be added.
 *   - 30-character limit: characters beyond 30 are not accepted.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TagCombobox from '../../client/src/components/TagCombobox.jsx';

/** Sample available tags for use across tests. */
const AVAILABLE_TAGS = [
  { id: 1, name: 'react' },
  { id: 2, name: 'javascript' },
  { id: 3, name: 'typescript' },
  { id: 4, name: 'css' },
  { id: 5, name: 'html' },
  { id: 6, name: 'nodejs' },
];

/**
 * Render TagCombobox with sensible defaults, merging in any prop overrides.
 *
 * @param {object} [props] - Prop overrides.
 * @returns {{ onChange: import('vitest').Mock }}
 */
function renderCombobox(props = {}) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <TagCombobox
      selected={[]}
      available={AVAILABLE_TAGS}
      onChange={onChange}
      {...props}
    />
  );
  return { onChange };
}

/**
 * Return the combobox input element.
 * @returns {HTMLElement}
 */
function getInput() {
  return screen.getByRole('combobox', { name: /tag search/i });
}

// ---------------------------------------------------------------------------
// Dropdown filtering
// ---------------------------------------------------------------------------

describe('dropdown filtering', () => {
  it('shows all available options when input is focused and empty', async () => {
    renderCombobox();
    fireEvent.focus(getInput());
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBe(AVAILABLE_TAGS.length);
  });

  it('filters the list to matching tags as the user types', async () => {
    renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'scr' } });
    // "javascript" and "typescript" contain "scr"
    const options = screen.getAllByRole('option');
    const optionTexts = options.map((o) => o.textContent.trim());
    expect(optionTexts).toContain('javascript');
    expect(optionTexts).toContain('typescript');
    // "react", "css", "html", "nodejs" do not match
    expect(optionTexts).not.toContain('react');
    expect(optionTexts).not.toContain('css');
  });

  it('highlights the top result with font-medium when input matches a prefix', () => {
    renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'rea' } });
    const reactOption = screen.getByRole('option', { name: 'react' });
    expect(reactOption).toHaveClass('font-medium');
  });

  it('excludes already-selected tags from the dropdown', async () => {
    renderCombobox({ selected: [{ id: 1, name: 'react' }] });
    fireEvent.focus(getInput());
    await screen.findByRole('listbox');
    // "react" should not appear because it is already selected
    expect(screen.queryByRole('option', { name: 'react' })).not.toBeInTheDocument();
  });

  it('closes the dropdown on Escape', () => {
    renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'r' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Selecting an existing tag
// ---------------------------------------------------------------------------

describe('selecting an existing tag', () => {
  it('calls onChange with the selected object when an option is clicked', async () => {
    const { onChange } = renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    const reactOption = await screen.findByRole('option', { name: 'react' });
    fireEvent.click(reactOption);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ id: 1, name: 'react' }]);
  });

  it('clears the input and closes the dropdown after selecting an option', async () => {
    renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    const reactOption = await screen.findByRole('option', { name: 'react' });
    fireEvent.click(reactOption);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects the top exact-match option when Enter is pressed', async () => {
    const { onChange } = renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith([{ id: 1, name: 'react' }]);
  });
});

// ---------------------------------------------------------------------------
// Creating a new tag (on-the-fly)
// ---------------------------------------------------------------------------

describe('creating a new tag', () => {
  it('shows the "Create tag" option when input does not match any existing tag', () => {
    renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'brandnew' } });
    expect(screen.getByText(/create tag.*brandnew/i)).toBeInTheDocument();
  });

  it('does not show the "Create tag" option when input exactly matches an existing tag', () => {
    renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'react' } });
    expect(screen.queryByText(/create tag/i)).not.toBeInTheDocument();
  });

  it('calls onChange with a lowercased string when Enter is pressed on a new name', () => {
    const { onChange } = renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'BrandNew' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['brandnew']);
  });

  it('calls onChange with a lowercased string when the Create option is clicked', async () => {
    const { onChange } = renderCombobox();
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'MyTag' } });
    const createOption = await screen.findByText(/create tag.*mytag/i);
    fireEvent.click(createOption);
    expect(onChange).toHaveBeenCalledWith(['mytag']);
  });

  it('appends a new plain-string tag to existing selected tags', () => {
    const { onChange } = renderCombobox({
      selected: [{ id: 1, name: 'react' }],
    });
    const input = getInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith([{ id: 1, name: 'react' }, 'newtag']);
  });
});

// ---------------------------------------------------------------------------
// Chip rendering and removal
// ---------------------------------------------------------------------------

describe('chip rendering and removal', () => {
  it('renders a chip for each selected tag', () => {
    renderCombobox({
      selected: [{ id: 1, name: 'react' }, 'newtag'],
    });
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('newtag')).toBeInTheDocument();
  });

  it('calls onChange without the removed tag when x is clicked', () => {
    const { onChange } = renderCombobox({
      selected: [{ id: 1, name: 'react' }, { id: 2, name: 'javascript' }],
    });
    const removeBtn = screen.getByRole('button', { name: /remove tag react/i });
    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith([{ id: 2, name: 'javascript' }]);
  });

  it('calls onChange without the plain-string tag when x is clicked', () => {
    const { onChange } = renderCombobox({
      selected: ['newtag', { id: 2, name: 'javascript' }],
    });
    const removeBtn = screen.getByRole('button', { name: /remove tag newtag/i });
    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith([{ id: 2, name: 'javascript' }]);
  });
});

// ---------------------------------------------------------------------------
// 5-tag limit
// ---------------------------------------------------------------------------

describe('5-tag limit', () => {
  /** Build an array of 5 selected object tags. */
  function fiveTags() {
    return AVAILABLE_TAGS.slice(0, 5).map(({ id, name }) => ({ id, name }));
  }

  it('disables the input when 5 tags are selected', () => {
    renderCombobox({ selected: fiveTags() });
    expect(getInput()).toBeDisabled();
  });

  it('shows a hint message when 5 tags are selected', () => {
    renderCombobox({ selected: fiveTags() });
    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.getByRole('note').textContent).toMatch(/maximum of 5 tags/i);
  });

  it('does not render the dropdown when at the 5-tag limit', () => {
    renderCombobox({ selected: fiveTags() });
    fireEvent.focus(getInput());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not call onChange when Enter is pressed while at the 5-tag limit', () => {
    const { onChange } = renderCombobox({ selected: fiveTags() });
    const input = getInput();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 30-character limit
// ---------------------------------------------------------------------------

describe('30-character limit', () => {
  it('accepts exactly 30 characters', () => {
    renderCombobox();
    const input = getInput();
    const thirtyChars = 'a'.repeat(30);
    fireEvent.change(input, { target: { value: thirtyChars } });
    expect(input).toHaveValue(thirtyChars);
  });

  it('truncates input to 30 characters when more are typed', () => {
    renderCombobox();
    const input = getInput();
    const thirtyOneChars = 'b'.repeat(31);
    fireEvent.change(input, { target: { value: thirtyOneChars } });
    // The component slices to MAX_TAG_LENGTH (30)
    expect(input.value.length).toBe(30);
  });

  it('has maxLength attribute set to 30', () => {
    renderCombobox();
    expect(getInput()).toHaveAttribute('maxLength', '30');
  });
});
