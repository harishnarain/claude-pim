/**
 * Unit tests for client/src/components/CalendarToolbar.jsx.
 *
 * Covers:
 *   - All four view tab buttons render with correct labels.
 *   - The active tab has the highlighted Tailwind classes (bg-blue-100, text-blue-700).
 *   - Clicking a tab calls onViewChange with the correct view key.
 *   - Prev/Next arrow buttons render and call onPrev / onNext.
 *   - Today button renders and calls onToday.
 *   - Date range label: correct string for each view (day, workweek, week, month).
 *   - Date label updates when currentDate changes.
 *   - Cross-month and cross-year range labels are formatted correctly.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalendarToolbar from '../../client/src/components/CalendarToolbar.jsx';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Render CalendarToolbar with sensible defaults merged with any prop overrides.
 *
 * @param {object}   [props]                   - Prop overrides.
 * @param {string}   [props.activeView='week'] - One of 'day' | 'workweek' | 'week' | 'month'.
 * @param {Date}     [props.currentDate]       - Anchor date; defaults to 2026-05-06 (Wednesday).
 * @param {Function} [props.onViewChange]
 * @param {Function} [props.onPrev]
 * @param {Function} [props.onNext]
 * @param {Function} [props.onToday]
 * @returns {{ onViewChange, onPrev, onNext, onToday }} — the mock functions used.
 */
function renderToolbar(props = {}) {
  const onViewChange = props.onViewChange ?? vi.fn();
  const onPrev = props.onPrev ?? vi.fn();
  const onNext = props.onNext ?? vi.fn();
  const onToday = props.onToday ?? vi.fn();
  // Wednesday 2026-05-06 as a stable anchor.
  const currentDate = props.currentDate ?? new Date(2026, 4, 6);

  render(
    <CalendarToolbar
      activeView="week"
      onViewChange={onViewChange}
      currentDate={currentDate}
      onPrev={onPrev}
      onNext={onNext}
      onToday={onToday}
      {...props}
    />
  );

  return { onViewChange, onPrev, onNext, onToday };
}

// ---------------------------------------------------------------------------
// View tab rendering
// ---------------------------------------------------------------------------

describe('view tabs', () => {
  it('renders all four tab buttons', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /^day$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /work week/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^week$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^month$/i })).toBeInTheDocument();
  });

  it('highlights the active "week" tab with blue classes', () => {
    renderToolbar({ activeView: 'week' });
    const weekBtn = screen.getByRole('button', { name: /^week$/i });
    expect(weekBtn).toHaveClass('bg-blue-100');
    expect(weekBtn).toHaveClass('text-blue-700');
  });

  it('does not highlight inactive tabs', () => {
    renderToolbar({ activeView: 'week' });
    const dayBtn = screen.getByRole('button', { name: /^day$/i });
    expect(dayBtn).not.toHaveClass('bg-blue-100');
    expect(dayBtn).not.toHaveClass('text-blue-700');
  });

  it('highlights the active "day" tab', () => {
    renderToolbar({ activeView: 'day' });
    const dayBtn = screen.getByRole('button', { name: /^day$/i });
    expect(dayBtn).toHaveClass('bg-blue-100');
    expect(dayBtn).toHaveClass('text-blue-700');
  });

  it('highlights the active "workweek" tab', () => {
    renderToolbar({ activeView: 'workweek' });
    const btn = screen.getByRole('button', { name: /work week/i });
    expect(btn).toHaveClass('bg-blue-100');
    expect(btn).toHaveClass('text-blue-700');
  });

  it('highlights the active "month" tab', () => {
    renderToolbar({ activeView: 'month' });
    const btn = screen.getByRole('button', { name: /^month$/i });
    expect(btn).toHaveClass('bg-blue-100');
    expect(btn).toHaveClass('text-blue-700');
  });

  it('sets aria-pressed=true on the active tab', () => {
    renderToolbar({ activeView: 'week' });
    expect(screen.getByRole('button', { name: /^week$/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets aria-pressed=false on inactive tabs', () => {
    renderToolbar({ activeView: 'week' });
    expect(screen.getByRole('button', { name: /^day$/i })).toHaveAttribute('aria-pressed', 'false');
  });
});

// ---------------------------------------------------------------------------
// Tab click callbacks
// ---------------------------------------------------------------------------

describe('tab click callbacks', () => {
  it('calls onViewChange with "day" when the Day tab is clicked', () => {
    const { onViewChange } = renderToolbar({ activeView: 'week' });
    fireEvent.click(screen.getByRole('button', { name: /^day$/i }));
    expect(onViewChange).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith('day');
  });

  it('calls onViewChange with "workweek" when the Work Week tab is clicked', () => {
    const { onViewChange } = renderToolbar({ activeView: 'week' });
    fireEvent.click(screen.getByRole('button', { name: /work week/i }));
    expect(onViewChange).toHaveBeenCalledWith('workweek');
  });

  it('calls onViewChange with "week" when the Week tab is clicked', () => {
    const { onViewChange } = renderToolbar({ activeView: 'day' });
    fireEvent.click(screen.getByRole('button', { name: /^week$/i }));
    expect(onViewChange).toHaveBeenCalledWith('week');
  });

  it('calls onViewChange with "month" when the Month tab is clicked', () => {
    const { onViewChange } = renderToolbar({ activeView: 'week' });
    fireEvent.click(screen.getByRole('button', { name: /^month$/i }));
    expect(onViewChange).toHaveBeenCalledWith('month');
  });
});

// ---------------------------------------------------------------------------
// Navigation buttons
// ---------------------------------------------------------------------------

describe('navigation buttons', () => {
  it('renders a Prev (Previous) arrow button', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
  });

  it('renders a Next arrow button', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('calls onPrev when the prev arrow button is clicked', () => {
    const { onPrev } = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when the next arrow button is clicked', () => {
    const { onNext } = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Today button
// ---------------------------------------------------------------------------

describe('Today button', () => {
  it('renders a Today button', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });

  it('calls onToday when the Today button is clicked', () => {
    const { onToday } = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: /today/i }));
    expect(onToday).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Date range label — day view
// ---------------------------------------------------------------------------

describe('date range label — day view', () => {
  it('shows the full month + day + year for a single day', () => {
    // 2026-05-07 = Thursday
    renderToolbar({
      activeView: 'day',
      currentDate: new Date(2026, 4, 7),
    });
    expect(screen.getByText('May 7, 2026')).toBeInTheDocument();
  });

  it('shows the correct label for January 1', () => {
    renderToolbar({
      activeView: 'day',
      currentDate: new Date(2026, 0, 1),
    });
    expect(screen.getByText('January 1, 2026')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Date range label — month view
// ---------------------------------------------------------------------------

describe('date range label — month view', () => {
  it('shows "Month YYYY" for month view', () => {
    renderToolbar({
      activeView: 'month',
      currentDate: new Date(2026, 4, 6),
    });
    expect(screen.getByText('May 2026')).toBeInTheDocument();
  });

  it('shows the correct month and year for December', () => {
    renderToolbar({
      activeView: 'month',
      currentDate: new Date(2025, 11, 15),
    });
    expect(screen.getByText('December 2025')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Date range label — week view (Sun–Sat)
// ---------------------------------------------------------------------------

describe('date range label — week view', () => {
  it('shows "May 3–9, 2026" for a Wednesday in the May 3–9 week', () => {
    // 2026-05-06 = Wednesday; week: Sun May 3 – Sat May 9
    renderToolbar({
      activeView: 'week',
      currentDate: new Date(2026, 4, 6),
    });
    expect(screen.getByText('May 3–9, 2026')).toBeInTheDocument();
  });

  it('shows "May 10–16, 2026" for a Sunday that starts a new week', () => {
    // 2026-05-10 = Sunday; week: Sun May 10 – Sat May 16
    renderToolbar({
      activeView: 'week',
      currentDate: new Date(2026, 4, 10),
    });
    expect(screen.getByText('May 10–16, 2026')).toBeInTheDocument();
  });

  it('shows a cross-month label when the week spans two months', () => {
    // 2026-05-01 = Friday; week: Sun Apr 26 – Sat May 2
    renderToolbar({
      activeView: 'week',
      currentDate: new Date(2026, 4, 1),
    });
    // Expect short month names: "Apr 26 – May 2, 2026"
    expect(screen.getByText('Apr 26 – May 2, 2026')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Date range label — workweek view (Mon–Fri)
// ---------------------------------------------------------------------------

describe('date range label — workweek view', () => {
  it('shows "May 4–8, 2026" for a Wednesday in the May 4–8 workweek', () => {
    // 2026-05-06 = Wednesday; workweek: Mon May 4 – Fri May 8
    renderToolbar({
      activeView: 'workweek',
      currentDate: new Date(2026, 4, 6),
    });
    expect(screen.getByText('May 4–8, 2026')).toBeInTheDocument();
  });

  it('uses short month names when workweek spans two months', () => {
    // 2026-04-30 = Thursday; workweek: Mon Apr 27 – Fri May 1
    renderToolbar({
      activeView: 'workweek',
      currentDate: new Date(2026, 3, 30),
    });
    expect(screen.getByText('Apr 27 – May 1, 2026')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Cross-year label
// ---------------------------------------------------------------------------

describe('date range label — cross-year week', () => {
  it('shows "Dec 28, 2025 – Jan 3, 2026" for the New Year week', () => {
    // 2025-12-31 = Wednesday; week: Sun Dec 28, 2025 – Sat Jan 3, 2026
    renderToolbar({
      activeView: 'week',
      currentDate: new Date(2025, 11, 31),
    });
    expect(screen.getByText('Dec 28, 2025 – Jan 3, 2026')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Date label reflects currentDate prop change
// ---------------------------------------------------------------------------

describe('date label reflects currentDate prop', () => {
  it('renders different labels for different currentDate values', () => {
    const { rerender } = render(
      <CalendarToolbar
        activeView="day"
        currentDate={new Date(2026, 4, 1)}
        onViewChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
      />
    );
    expect(screen.getByText('May 1, 2026')).toBeInTheDocument();

    rerender(
      <CalendarToolbar
        activeView="day"
        currentDate={new Date(2026, 5, 15)}
        onViewChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
      />
    );
    expect(screen.getByText('June 15, 2026')).toBeInTheDocument();
    expect(screen.queryByText('May 1, 2026')).not.toBeInTheDocument();
  });
});
