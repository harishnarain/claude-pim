/**
 * Unit tests for client/src/components/WelcomeHeader.jsx.
 *
 * Covers:
 *   - Renders a heading with the text returned by getGreeting().
 *   - Renders a date paragraph with the text returned by formatFullDate().
 *   - No inline styles are present on the rendered elements.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WelcomeHeader from '../../client/src/components/WelcomeHeader.jsx';
import { getGreeting, formatFullDate } from '../../client/src/utils/dashboard-dates.js';

// ---------------------------------------------------------------------------
// Heading text
// ---------------------------------------------------------------------------

describe('heading text', () => {
  it('renders a heading containing the getGreeting() output', () => {
    render(<WelcomeHeader />);
    const greeting = getGreeting();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(greeting);
  });
});

// ---------------------------------------------------------------------------
// Date text
// ---------------------------------------------------------------------------

describe('date text', () => {
  it('renders the formatFullDate() string in the document', () => {
    render(<WelcomeHeader />);
    const fullDate = formatFullDate();
    expect(screen.getByText(fullDate)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// No inline styles
// ---------------------------------------------------------------------------

describe('no inline styles', () => {
  it('heading element has no inline style attribute', () => {
    render(<WelcomeHeader />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toHaveAttribute('style');
  });

  it('date paragraph has no inline style attribute', () => {
    render(<WelcomeHeader />);
    const fullDate = formatFullDate();
    const datePara = screen.getByText(fullDate);
    expect(datePara).not.toHaveAttribute('style');
  });
});

// ---------------------------------------------------------------------------
// Tailwind classes
// ---------------------------------------------------------------------------

describe('Tailwind classes', () => {
  it('heading has text-2xl and font-semibold classes', () => {
    render(<WelcomeHeader />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('text-2xl');
    expect(heading).toHaveClass('font-semibold');
  });

  it('date line has text-gray-500 class', () => {
    render(<WelcomeHeader />);
    const fullDate = formatFullDate();
    const datePara = screen.getByText(fullDate);
    expect(datePara).toHaveClass('text-gray-500');
  });
});
