/**
 * Unit tests for the calendar-layout utility
 * (client/src/utils/calendar-layout.js).
 *
 * All functions under test are pure — no mocking needed.
 */
import { describe, it, expect } from 'vitest';
import {
  layoutItems,
  getWindowBounds,
  getViewColumns,
} from '../../client/src/utils/calendar-layout.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal event object compatible with normalise() inside layoutItems.
 *
 * @param {string} startAt - ISO datetime string
 * @param {string} endAt   - ISO datetime string
 * @param {string} [id]    - optional id for identification in assertions
 * @returns {object}
 */
function makeEvent(startAt, endAt, id = undefined) {
  return { id, startAt, endAt };
}

// ---------------------------------------------------------------------------
// layoutItems
// ---------------------------------------------------------------------------

describe('layoutItems()', () => {
  it('returns an empty array when given an empty array', () => {
    expect(layoutItems([])).toEqual([]);
  });

  it('returns an empty array when given null/undefined', () => {
    expect(layoutItems(null)).toEqual([]);
    expect(layoutItems(undefined)).toEqual([]);
  });

  it('assigns lane: 0 and laneCount: 1 to a single non-overlapping item', () => {
    const items = [makeEvent('2024-01-15T09:00', '2024-01-15T10:00', 'a')];
    const result = layoutItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].lane).toBe(0);
    expect(result[0].laneCount).toBe(1);
  });

  it('gives laneCount: 1 to each of two non-overlapping items', () => {
    const items = [
      makeEvent('2024-01-15T09:00', '2024-01-15T10:00', 'a'),
      makeEvent('2024-01-15T11:00', '2024-01-15T12:00', 'b'),
    ];
    const result = layoutItems(items);
    expect(result).toHaveLength(2);
    for (const item of result) {
      expect(item.laneCount).toBe(1);
      expect(item.lane).toBe(0);
    }
  });

  it('gives laneCount: 2 and distinct lanes to two fully-overlapping items', () => {
    const items = [
      makeEvent('2024-01-15T09:00', '2024-01-15T11:00', 'a'),
      makeEvent('2024-01-15T09:00', '2024-01-15T11:00', 'b'),
    ];
    const result = layoutItems(items);
    expect(result).toHaveLength(2);

    const itemA = result.find((r) => r.id === 'a');
    const itemB = result.find((r) => r.id === 'b');

    expect(itemA.laneCount).toBe(2);
    expect(itemB.laneCount).toBe(2);
    // One gets lane 0, the other lane 1 — they must be different.
    expect(itemA.lane).not.toBe(itemB.lane);
    expect(new Set([itemA.lane, itemB.lane])).toEqual(new Set([0, 1]));
  });

  it('handles three items where two overlap and one is independent', () => {
    // a and b overlap; c is after both and is independent.
    const items = [
      makeEvent('2024-01-15T09:00', '2024-01-15T11:00', 'a'),
      makeEvent('2024-01-15T09:30', '2024-01-15T10:30', 'b'),
      makeEvent('2024-01-15T12:00', '2024-01-15T13:00', 'c'),
    ];
    const result = layoutItems(items);
    expect(result).toHaveLength(3);

    const itemA = result.find((r) => r.id === 'a');
    const itemB = result.find((r) => r.id === 'b');
    const itemC = result.find((r) => r.id === 'c');

    // Overlapping cluster: laneCount 2, distinct lanes.
    expect(itemA.laneCount).toBe(2);
    expect(itemB.laneCount).toBe(2);
    expect(itemA.lane).not.toBe(itemB.lane);

    // Independent item: laneCount 1, lane 0.
    expect(itemC.laneCount).toBe(1);
    expect(itemC.lane).toBe(0);
  });

  it('handles three mutually overlapping items — each in its own lane', () => {
    const items = [
      makeEvent('2024-01-15T09:00', '2024-01-15T12:00', 'a'),
      makeEvent('2024-01-15T09:00', '2024-01-15T12:00', 'b'),
      makeEvent('2024-01-15T09:00', '2024-01-15T12:00', 'c'),
    ];
    const result = layoutItems(items);
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.laneCount).toBe(3);
    }
    const lanes = result.map((r) => r.lane).sort();
    expect(lanes).toEqual([0, 1, 2]);
  });

  it('annotates all-day tasks (no dueTime) with lane: 0 and laneCount: 1', () => {
    const allDayTask = { id: 'task1', dueDate: '2024-01-15' }; // no dueTime
    const result = layoutItems([allDayTask]);
    expect(result).toHaveLength(1);
    expect(result[0].lane).toBe(0);
    expect(result[0].laneCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getWindowBounds
// ---------------------------------------------------------------------------

describe('getWindowBounds() — day view', () => {
  it('returns windowStart === windowEnd === currentDate', () => {
    const { windowStart, windowEnd } = getWindowBounds('2024-06-15', 'day');
    expect(windowStart).toBe('2024-06-15');
    expect(windowEnd).toBe('2024-06-15');
  });

  it('works for the first day of a month', () => {
    const { windowStart, windowEnd } = getWindowBounds('2024-01-01', 'day');
    expect(windowStart).toBe('2024-01-01');
    expect(windowEnd).toBe('2024-01-01');
  });
});

describe('getWindowBounds() — workweek view', () => {
  it('returns Monday as windowStart and Friday as windowEnd when anchor is a Wednesday', () => {
    // 2024-01-10 is a Wednesday.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-10', 'workweek');
    expect(windowStart).toBe('2024-01-08'); // Monday
    expect(windowEnd).toBe('2024-01-12');   // Friday
  });

  it('returns the same week when anchor is a Monday', () => {
    // 2024-01-08 is a Monday.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-08', 'workweek');
    expect(windowStart).toBe('2024-01-08');
    expect(windowEnd).toBe('2024-01-12');
  });

  it('returns the same week when anchor is a Friday', () => {
    // 2024-01-12 is a Friday.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-12', 'workweek');
    expect(windowStart).toBe('2024-01-08');
    expect(windowEnd).toBe('2024-01-12');
  });

  it('returns the previous Mon–Fri when anchor is a Sunday', () => {
    // 2024-01-14 is a Sunday — the workweek Mon–Fri is Jan 8–12.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-14', 'workweek');
    expect(windowStart).toBe('2024-01-08');
    expect(windowEnd).toBe('2024-01-12');
  });

  it('returns the next Mon–Fri when anchor is a Saturday', () => {
    // 2024-01-13 is a Saturday — the workweek Mon–Fri is Jan 8–12.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-13', 'workweek');
    expect(windowStart).toBe('2024-01-08');
    expect(windowEnd).toBe('2024-01-12');
  });
});

describe('getWindowBounds() — week view', () => {
  it('returns Sunday as windowStart and Saturday as windowEnd when anchor is a Wednesday', () => {
    // 2024-01-10 is a Wednesday.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-10', 'week');
    expect(windowStart).toBe('2024-01-07'); // Sunday
    expect(windowEnd).toBe('2024-01-13');   // Saturday
  });

  it('returns the same day as both bounds when anchor is a Sunday', () => {
    // 2024-01-07 is a Sunday.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-07', 'week');
    expect(windowStart).toBe('2024-01-07');
    expect(windowEnd).toBe('2024-01-13');
  });

  it('returns the week boundaries when anchor is a Saturday', () => {
    // 2024-01-13 is a Saturday.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-13', 'week');
    expect(windowStart).toBe('2024-01-07');
    expect(windowEnd).toBe('2024-01-13');
  });
});

describe('getWindowBounds() — month view', () => {
  it('windowStart is a Sunday on or before the 1st of the month', () => {
    // January 2024: 1st is a Monday. Grid should start on Sunday 2023-12-31.
    const { windowStart } = getWindowBounds('2024-01-15', 'month');
    const start = new Date(windowStart + 'T00:00:00');
    expect(start.getDay()).toBe(0); // Sunday
    expect(windowStart <= '2024-01-01').toBe(true);
  });

  it('windowEnd is a Saturday on or after the last day of the month', () => {
    // January 2024: last day is the 31st (a Wednesday). Grid should end on Saturday 2024-02-03.
    const { windowEnd } = getWindowBounds('2024-01-15', 'month');
    const end = new Date(windowEnd + 'T00:00:00');
    expect(end.getDay()).toBe(6); // Saturday
    expect(windowEnd >= '2024-01-31').toBe(true);
  });

  it('covers the full display grid for January 2024', () => {
    // Jan 2024: 1st is Monday → grid starts Sun 2023-12-31; 31st is Wed → grid ends Sat 2024-02-03.
    const { windowStart, windowEnd } = getWindowBounds('2024-01-01', 'month');
    expect(windowStart).toBe('2023-12-31');
    expect(windowEnd).toBe('2024-02-03');
  });

  it('covers the full display grid for February 2024 (leap month)', () => {
    // Feb 2024: 1st is Thursday → grid starts Sun 2024-01-28; 29th is Thursday → grid ends Sat 2024-03-02.
    const { windowStart, windowEnd } = getWindowBounds('2024-02-15', 'month');
    expect(windowStart).toBe('2024-01-28');
    expect(windowEnd).toBe('2024-03-02');
  });

  it('covers the full display grid for a month where the 1st is a Sunday', () => {
    // December 2024: 1st is a Sunday → grid starts on 2024-12-01 itself.
    const { windowStart, windowEnd } = getWindowBounds('2024-12-15', 'month');
    expect(windowStart).toBe('2024-12-01');
    const end = new Date(windowEnd + 'T00:00:00');
    expect(end.getDay()).toBe(6); // Saturday
    expect(windowEnd >= '2024-12-31').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getViewColumns
// ---------------------------------------------------------------------------

describe('getViewColumns() — day view', () => {
  it('returns exactly 1 Date equal to the anchor date', () => {
    const columns = getViewColumns('2024-06-15', 'day');
    expect(columns).toHaveLength(1);
    expect(columns[0]).toBeInstanceOf(Date);
    expect(columns[0].getFullYear()).toBe(2024);
    expect(columns[0].getMonth()).toBe(5); // June is 0-indexed 5
    expect(columns[0].getDate()).toBe(15);
  });
});

describe('getViewColumns() — workweek view', () => {
  it('returns exactly 5 Dates (Mon–Fri)', () => {
    // Anchor: Wednesday 2024-01-10.
    const columns = getViewColumns('2024-01-10', 'workweek');
    expect(columns).toHaveLength(5);
    for (const col of columns) {
      expect(col).toBeInstanceOf(Date);
    }
  });

  it('first column is Monday and last is Friday', () => {
    const columns = getViewColumns('2024-01-10', 'workweek');
    expect(columns[0].getDay()).toBe(1); // Monday
    expect(columns[4].getDay()).toBe(5); // Friday
  });

  it('columns are consecutive days', () => {
    const columns = getViewColumns('2024-01-10', 'workweek');
    for (let i = 1; i < columns.length; i++) {
      const prev = columns[i - 1];
      const curr = columns[i];
      const expected = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      expect(curr.getFullYear()).toBe(expected.getFullYear());
      expect(curr.getMonth()).toBe(expected.getMonth());
      expect(curr.getDate()).toBe(expected.getDate());
    }
  });
});

describe('getViewColumns() — week view', () => {
  it('returns exactly 7 Dates (Sun–Sat)', () => {
    // Anchor: Wednesday 2024-01-10.
    const columns = getViewColumns('2024-01-10', 'week');
    expect(columns).toHaveLength(7);
    for (const col of columns) {
      expect(col).toBeInstanceOf(Date);
    }
  });

  it('first column is Sunday and last is Saturday', () => {
    const columns = getViewColumns('2024-01-10', 'week');
    expect(columns[0].getDay()).toBe(0); // Sunday
    expect(columns[6].getDay()).toBe(6); // Saturday
  });

  it('columns are consecutive days', () => {
    const columns = getViewColumns('2024-01-10', 'week');
    for (let i = 1; i < columns.length; i++) {
      const prev = columns[i - 1];
      const curr = columns[i];
      const expected = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      expect(curr.getFullYear()).toBe(expected.getFullYear());
      expect(curr.getMonth()).toBe(expected.getMonth());
      expect(curr.getDate()).toBe(expected.getDate());
    }
  });
});

describe('getViewColumns() — month view', () => {
  it('returns an array of Dates for the full display grid', () => {
    const columns = getViewColumns('2024-01-15', 'month');
    // Every cell is a Date instance.
    for (const col of columns) {
      expect(col).toBeInstanceOf(Date);
    }
  });

  it('count is a multiple of 7 (complete weeks)', () => {
    const columns = getViewColumns('2024-01-15', 'month');
    expect(columns.length % 7).toBe(0);
  });

  it('count is between 28 and 42 cells', () => {
    const columns = getViewColumns('2024-01-15', 'month');
    expect(columns.length).toBeGreaterThanOrEqual(28);
    expect(columns.length).toBeLessThanOrEqual(42);
  });

  it('first cell is a Sunday', () => {
    const columns = getViewColumns('2024-01-15', 'month');
    expect(columns[0].getDay()).toBe(0);
  });

  it('last cell is a Saturday', () => {
    const columns = getViewColumns('2024-01-15', 'month');
    expect(columns[columns.length - 1].getDay()).toBe(6);
  });

  it('grid spans January 2024 correctly (35 cells: Dec 31 – Feb 3)', () => {
    const columns = getViewColumns('2024-01-01', 'month');
    // Jan 2024: Mon 1st → grid starts Sun 2023-12-31; Wed 31st → grid ends Sat 2024-02-03.
    expect(columns).toHaveLength(35);
    // First cell: 2023-12-31.
    expect(columns[0].getFullYear()).toBe(2023);
    expect(columns[0].getMonth()).toBe(11); // December
    expect(columns[0].getDate()).toBe(31);
    // Last cell: 2024-02-03.
    expect(columns[34].getFullYear()).toBe(2024);
    expect(columns[34].getMonth()).toBe(1); // February
    expect(columns[34].getDate()).toBe(3);
  });

  it('grid spans February 2024 correctly (35 cells: Jan 28 – Mar 2)', () => {
    const columns = getViewColumns('2024-02-01', 'month');
    expect(columns).toHaveLength(35);
    expect(columns[0].getMonth()).toBe(0); // January
    expect(columns[0].getDate()).toBe(28);
    expect(columns[34].getMonth()).toBe(2); // March
    expect(columns[34].getDate()).toBe(2);
  });

  it('columns are consecutive days throughout the grid', () => {
    // Use a month that avoids DST transitions (July is safe in most locales).
    const columns = getViewColumns('2024-07-15', 'month');
    for (let i = 1; i < columns.length; i++) {
      // Compare by date arithmetic to avoid DST-hour discrepancies.
      const prev = columns[i - 1];
      const curr = columns[i];
      const expected = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1);
      expect(curr.getFullYear()).toBe(expected.getFullYear());
      expect(curr.getMonth()).toBe(expected.getMonth());
      expect(curr.getDate()).toBe(expected.getDate());
    }
  });
});
