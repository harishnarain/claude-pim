/**
 * calendar-layout.js
 *
 * Pure utility functions for calendar rendering:
 *  - layoutItems       : annotates items with overlap lane/laneCount data
 *  - getWindowBounds   : computes the fetch window (windowStart/windowEnd)
 *  - getViewColumns    : returns the Date objects for each column to render
 *
 * No side effects. No imports outside this utils directory.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a raw calendar item to a { startAt, endAt } pair suitable for
 * the layout algorithm.  Tasks without a dueTime are excluded (they belong
 * in the AllDayBanner, not the timed grid).
 *
 * @param {object} item  - Event or Task shape from the API
 * @returns {{ startAt: string, endAt: string } | null}
 */
function normalise(item) {
  if (item.startAt && item.endAt) {
    // Already an event with explicit start/end.
    return { startAt: item.startAt, endAt: item.endAt };
  }
  if (item.dueDate) {
    if (!item.dueTime) {
      // All-day task — skip from timed grid.
      return null;
    }
    const startAt = `${item.dueDate}T${item.dueTime}`;
    // Zero-duration point in time.
    return { startAt, endAt: startAt };
  }
  return null;
}

// ---------------------------------------------------------------------------
// layoutItems
// ---------------------------------------------------------------------------

/**
 * Assign overlap layout lanes to a mixed array of events and timed tasks.
 *
 * Algorithm:
 *   1. Normalise each item to a { startAt, endAt } pair; items without a
 *      normalised form (all-day tasks) pass through un-annotated (lane: 0,
 *      laneCount: 1).
 *   2. Sort by startAt ascending, then by endAt descending (longer first).
 *   3. Group into overlap clusters.  An item joins an existing cluster if
 *      its startAt is strictly before the cluster's current max endAt.
 *   4. Within each cluster, greedily assign the first free lane (free = last
 *      item in that lane has endAt <= new item's startAt).
 *   5. Annotate every item in the cluster with its lane index and the total
 *      lane count for that cluster.
 *
 * Items that cannot be normalised receive lane: 0, laneCount: 1.
 *
 * @param {object[]} items  - Array of event/task objects from the API
 * @returns {object[]}       - Same items each annotated with { lane, laneCount }
 */
export function layoutItems(items) {
  if (!items || items.length === 0) return [];

  // Separate normalisable items from all-day / un-timeable items.
  const withNorm = items.map((item) => ({
    item,
    norm: normalise(item),
  }));

  // Items without a usable time window go straight through.
  const skipItems = withNorm
    .filter(({ norm }) => norm === null)
    .map(({ item }) => ({ ...item, lane: 0, laneCount: 1 }));

  const timedItems = withNorm.filter(({ norm }) => norm !== null);

  if (timedItems.length === 0) return skipItems;

  // Step 1 — sort.
  timedItems.sort((a, b) => {
    if (a.norm.startAt < b.norm.startAt) return -1;
    if (a.norm.startAt > b.norm.startAt) return 1;
    // Same start: longer event first (endAt descending).
    if (a.norm.endAt > b.norm.endAt) return -1;
    if (a.norm.endAt < b.norm.endAt) return 1;
    return 0;
  });

  // Step 2 — build clusters.
  // Each cluster: { maxEndAt: string, members: [{ item, norm, laneIndex }] }
  const clusters = [];

  for (const { item, norm } of timedItems) {
    const lastCluster = clusters[clusters.length - 1];

    if (!lastCluster || norm.startAt >= lastCluster.maxEndAt) {
      // Start a new cluster.
      clusters.push({
        maxEndAt: norm.endAt,
        members: [{ item, norm, laneIndex: 0 }],
        // lanes[k] = endAt of the last item assigned to lane k
        lanes: [norm.endAt],
      });
    } else {
      // Join the existing cluster — update maxEndAt if needed.
      if (norm.endAt > lastCluster.maxEndAt) {
        lastCluster.maxEndAt = norm.endAt;
      }

      // Step 3 — greedy lane assignment.
      let assigned = -1;
      for (let k = 0; k < lastCluster.lanes.length; k++) {
        if (lastCluster.lanes[k] <= norm.startAt) {
          // Lane k is free.
          lastCluster.lanes[k] = norm.endAt;
          assigned = k;
          break;
        }
      }

      if (assigned === -1) {
        // Need a new lane.
        assigned = lastCluster.lanes.length;
        lastCluster.lanes.push(norm.endAt);
      }

      lastCluster.members.push({ item, norm, laneIndex: assigned });
    }
  }

  // Step 4 — annotate items.
  const annotated = [];
  for (const cluster of clusters) {
    const laneCount = cluster.lanes.length;
    for (const { item, laneIndex } of cluster.members) {
      annotated.push({ ...item, lane: laneIndex, laneCount });
    }
  }

  return [...annotated, ...skipItems];
}

// ---------------------------------------------------------------------------
// getWindowBounds
// ---------------------------------------------------------------------------

/**
 * Parse a YYYY-MM-DD string and return a plain Date at local midnight.
 *
 * @param {string} dateStr  - ISO date string 'YYYY-MM-DD'
 * @returns {Date}
 */
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date to a 'YYYY-MM-DD' string using local-time components.
 *
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add `n` days to a Date (returns a new Date).
 *
 * @param {Date}   date
 * @param {number} n
 * @returns {Date}
 */
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Compute the fetch window boundaries for the given view.
 *
 * | View     | windowStart             | windowEnd               |
 * |----------|-------------------------|-------------------------|
 * | day      | currentDate             | currentDate             |
 * | workweek | Monday of current week  | Friday of current week  |
 * | week     | Sunday of current week  | Saturday of current week|
 * | month    | First day of month      | Last day of month       |
 *
 * For month view the window is extended to include the leading/trailing days
 * needed to fill the first and last display weeks (up to 42 total days).
 * The grid always starts on Sunday and ends on Saturday.
 *
 * @param {string} currentDate  - ISO date string 'YYYY-MM-DD'
 * @param {string} activeView   - 'day' | 'workweek' | 'week' | 'month'
 * @returns {{ windowStart: string, windowEnd: string }}
 */
export function getWindowBounds(currentDate, activeView) {
  const anchor = parseLocalDate(currentDate);

  if (activeView === 'day') {
    return { windowStart: currentDate, windowEnd: currentDate };
  }

  if (activeView === 'workweek') {
    // Monday = day-of-week 1; Sunday = 0.
    const dow = anchor.getDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
    const monday = addDays(anchor, dow === 0 ? -6 : 1 - dow);
    const friday = addDays(monday, 4);
    return { windowStart: formatDate(monday), windowEnd: formatDate(friday) };
  }

  if (activeView === 'week') {
    // Week starts on Sunday.
    const dow = anchor.getDay(); // 0 = Sun
    const sunday = addDays(anchor, -dow);
    const saturday = addDays(sunday, 6);
    return { windowStart: formatDate(sunday), windowEnd: formatDate(saturday) };
  }

  if (activeView === 'month') {
    const year = anchor.getFullYear();
    const month = anchor.getMonth(); // 0-based
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0); // day 0 of next month

    // Extend to full display weeks (Sunday–Saturday grid).
    const startDow = firstOfMonth.getDay(); // 0 = Sun
    const endDow = lastOfMonth.getDay();    // 0 = Sun … 6 = Sat

    const gridStart = addDays(firstOfMonth, -startDow);
    const gridEnd = addDays(lastOfMonth, 6 - endDow);

    return { windowStart: formatDate(gridStart), windowEnd: formatDate(gridEnd) };
  }

  // Fallback — treat as day.
  return { windowStart: currentDate, windowEnd: currentDate };
}

// ---------------------------------------------------------------------------
// getViewColumns
// ---------------------------------------------------------------------------

/**
 * Return an ordered array of Date objects representing each column to render
 * for the given view.
 *
 * | View     | Columns                                          |
 * |----------|--------------------------------------------------|
 * | day      | 1 Date (the anchor date)                         |
 * | workweek | 5 Dates (Mon–Fri of the anchor week)             |
 * | week     | 7 Dates (Sun–Sat of the anchor week)             |
 * | month    | N Dates (every day in the display grid, 28–42)   |
 *
 * @param {string} currentDate  - ISO date string 'YYYY-MM-DD'
 * @param {string} activeView   - 'day' | 'workweek' | 'week' | 'month'
 * @returns {Date[]}
 */
export function getViewColumns(currentDate, activeView) {
  const { windowStart, windowEnd } = getWindowBounds(currentDate, activeView);

  if (activeView === 'day') {
    return [parseLocalDate(windowStart)];
  }

  // For all multi-day views, enumerate every day from windowStart to windowEnd.
  const start = parseLocalDate(windowStart);
  const end = parseLocalDate(windowEnd);
  const columns = [];

  const current = new Date(start);
  while (current <= end) {
    columns.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return columns;
}
