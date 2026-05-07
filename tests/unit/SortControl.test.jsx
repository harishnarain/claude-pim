/**
 * Unit tests for client/src/components/SortControl.jsx.
 *
 * Covers:
 *   - All three sort options are rendered.
 *   - The select reflects the `value` prop (controlled component).
 *   - onChange is called with the correct sort key when the user selects an option.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SortControl from '../../client/src/components/SortControl.jsx';

/**
 * Render SortControl with sensible defaults merged with any prop overrides.
 *
 * @param {object} [props] - Prop overrides.
 * @param {string}   [props.value='updated_desc'] - Currently selected sort key.
 * @param {Function} [props.onChange]             - Change handler mock.
 * @returns {{ onChange: import('vitest').Mock }}
 */
function renderControl(props = {}) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <SortControl
      value="updated_desc"
      onChange={onChange}
      {...props}
    />
  );
  return { onChange };
}

// ---------------------------------------------------------------------------
// Option rendering
// ---------------------------------------------------------------------------

describe('option rendering', () => {
  it('renders a select element', () => {
    renderControl();
    expect(screen.getByRole('combobox', { name: /sort notes by/i })).toBeInTheDocument();
  });

  it('renders the "Last Modified" option', () => {
    renderControl();
    expect(screen.getByRole('option', { name: 'Last Modified' })).toBeInTheDocument();
  });

  it('renders the "Oldest First" option', () => {
    renderControl();
    expect(screen.getByRole('option', { name: 'Oldest First' })).toBeInTheDocument();
  });

  it('renders the "Title A–Z" option', () => {
    renderControl();
    expect(screen.getByRole('option', { name: 'Title A–Z' })).toBeInTheDocument();
  });

  it('renders exactly three options', () => {
    renderControl();
    expect(screen.getAllByRole('option').length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Controlled value
// ---------------------------------------------------------------------------

describe('controlled value', () => {
  it('reflects the "updated_desc" value when passed as prop', () => {
    renderControl({ value: 'updated_desc' });
    const select = screen.getByRole('combobox', { name: /sort notes by/i });
    expect(select).toHaveValue('updated_desc');
  });

  it('reflects the "updated_asc" value when passed as prop', () => {
    renderControl({ value: 'updated_asc' });
    const select = screen.getByRole('combobox', { name: /sort notes by/i });
    expect(select).toHaveValue('updated_asc');
  });

  it('reflects the "title_asc" value when passed as prop', () => {
    renderControl({ value: 'title_asc' });
    const select = screen.getByRole('combobox', { name: /sort notes by/i });
    expect(select).toHaveValue('title_asc');
  });
});

// ---------------------------------------------------------------------------
// onChange callback
// ---------------------------------------------------------------------------

describe('onChange callback', () => {
  it('calls onChange with "updated_asc" when that option is selected', () => {
    const { onChange } = renderControl({ value: 'updated_desc' });
    const select = screen.getByRole('combobox', { name: /sort notes by/i });
    fireEvent.change(select, { target: { value: 'updated_asc' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('updated_asc');
  });

  it('calls onChange with "title_asc" when that option is selected', () => {
    const { onChange } = renderControl({ value: 'updated_desc' });
    const select = screen.getByRole('combobox', { name: /sort notes by/i });
    fireEvent.change(select, { target: { value: 'title_asc' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('title_asc');
  });

  it('calls onChange with "updated_desc" when that option is selected', () => {
    const { onChange } = renderControl({ value: 'title_asc' });
    const select = screen.getByRole('combobox', { name: /sort notes by/i });
    fireEvent.change(select, { target: { value: 'updated_desc' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('updated_desc');
  });
});
