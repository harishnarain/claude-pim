/**
 * E2E test: Dashboard happy path.
 *
 * Covers the full user journey for the Dashboard page:
 *   1. Root route renders Dashboard — navigate to /; assert the page contains
 *      a heading matching one of the three greeting strings.
 *   2. Today's Agenda widget — assert the "Today's Agenda" heading is visible;
 *      the task due today appears in the tasks sub-section.
 *   3. Overdue Tasks widget — assert the "Overdue Tasks" heading is visible;
 *      the overdue task appears.
 *   4. Upcoming Events widget — assert the "Upcoming Events" heading is visible;
 *      "Team Standup" appears.
 *   5. Pinned Items widget — assert the "Pinned Items" heading is visible;
 *      "Pinned meeting note" appears.
 *   6. Navigation from widget row — click the overdue task row; assert the
 *      URL changes to /tasks/:id.
 *   7. Sidebar Dashboard link active — assert the "Dashboard" nav link in the
 *      sidebar has the active highlight class when on /.
 *   8. Empty states — after deleting all seeded items, navigate to /; assert
 *      "You're all caught up." is visible.
 *
 * Prerequisites: the Vite dev server (port 5173) and Express API (port 3001)
 * must be running before executing `npm run test:e2e`.
 *
 * @module tests/e2e/dashboard.spec.js
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base API URL for direct API calls. */
const API_BASE = 'http://localhost:3001';

/** Unique prefix used in seeded data to avoid collisions with other tests. */
const SEED_PREFIX = 'E2EDashboard';

/** Title for the task due today. */
const TODAY_TASK_TITLE = `${SEED_PREFIX} TodayTask`;

/** Title for the overdue task. */
const OVERDUE_TASK_TITLE = `${SEED_PREFIX} OverdueTask`;

/** Title for the upcoming calendar event. */
const EVENT_TITLE = 'Team Standup';

/** Content for the pinned note (first line used as display title). */
const NOTE_CONTENT = 'Pinned meeting note\nBody content here';

/**
 * A very old ISO due date used for the overdue task so it sorts to the front
 * of the overdue list regardless of how many other overdue tasks exist.
 */
const OLD_DUE_DATE = '2020-01-01';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return today's local date as a YYYY-MM-DD string.
 *
 * @returns {string} ISO date for today, e.g. "2026-05-15".
 */
function getTodayISO() {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Return tomorrow's local date as a YYYY-MM-DD string.
 *
 * @returns {string} ISO date for tomorrow, e.g. "2026-05-16".
 */
function getTomorrowISO() {
  const ms = Date.now() + 24 * 60 * 60 * 1000;
  return new Date(ms).toLocaleDateString('en-CA');
}

/**
 * Seed one task due today, one overdue task, one upcoming event, and one
 * pinned note via the API. Returns the created record IDs so afterEach can
 * clean them up.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
 * @returns {Promise<{ todayTaskId: number, overdueTaskId: number, eventId: number, noteId: number }>}
 */
async function seedData(request) {
  const todayISO = getTodayISO();
  const tomorrowISO = getTomorrowISO();

  // Task due today — In Progress, High priority
  const todayTaskRes = await request.post(`${API_BASE}/api/tasks`, {
    data: {
      title: TODAY_TASK_TITLE,
      status: 'In Progress',
      priority: 'High',
      due_date: todayISO,
    },
  });
  expect(todayTaskRes.status()).toBe(201);
  const todayTaskBody = await todayTaskRes.json();
  const todayTaskId = todayTaskBody.data.id;

  // Overdue task — Not Started, Medium priority, due on OLD_DUE_DATE (2020-01-01)
  // Using a very old date ensures this task sorts first (ascending by date) and
  // always appears within the 5-item cap of the OverdueTasksWidget.
  const overdueTaskRes = await request.post(`${API_BASE}/api/tasks`, {
    data: {
      title: OVERDUE_TASK_TITLE,
      status: 'Not Started',
      priority: 'Medium',
      due_date: OLD_DUE_DATE,
    },
  });
  expect(overdueTaskRes.status()).toBe(201);
  const overdueTaskBody = await overdueTaskRes.json();
  const overdueTaskId = overdueTaskBody.data.id;

  // Upcoming event — tomorrow at 10:00
  const eventStartAt = `${tomorrowISO}T10:00`;
  const eventEndAt = `${tomorrowISO}T11:00`;
  const eventRes = await request.post(`${API_BASE}/api/events`, {
    data: {
      title: EVENT_TITLE,
      startAt: eventStartAt,
      endAt: eventEndAt,
      allDay: false,
      color: 'blue',
    },
  });
  expect(eventRes.status()).toBe(201);
  const eventBody = await eventRes.json();
  const eventId = eventBody.data.id;

  // Pinned note
  const noteRes = await request.post(`${API_BASE}/api/notes`, {
    data: {
      content: NOTE_CONTENT,
      is_pinned: 1,
    },
  });
  expect(noteRes.status()).toBe(201);
  const noteBody = await noteRes.json();
  const noteId = noteBody.data.id;

  return { todayTaskId, overdueTaskId, eventId, noteId };
}

/**
 * Delete the seeded records by ID via the API.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
 * @param {{ todayTaskId: number, overdueTaskId: number, eventId: number, noteId: number }} ids - IDs to delete.
 * @returns {Promise<void>}
 */
async function cleanData(request, { todayTaskId, overdueTaskId, eventId, noteId }) {
  if (todayTaskId) {
    await request.delete(`${API_BASE}/api/tasks/${todayTaskId}`);
  }
  if (overdueTaskId) {
    await request.delete(`${API_BASE}/api/tasks/${overdueTaskId}`);
  }
  if (eventId) {
    await request.delete(`${API_BASE}/api/events/${eventId}`);
  }
  if (noteId) {
    await request.delete(`${API_BASE}/api/notes/${noteId}`);
  }
}

/**
 * Fetch all active (non-Completed, non-Cancelled) tasks that are currently
 * overdue relative to today. Used by Test 8 to temporarily retire pre-existing
 * overdue tasks so the OverdueTasksWidget can reach its empty state.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
 * @returns {Promise<Array<{ id: number, status: string }>>} Array of overdue task summaries.
 */
async function fetchExistingOverdueTasks(request) {
  const todayISO = getTodayISO();
  const res = await request.get(`${API_BASE}/api/tasks`);
  const body = await res.json();
  return body.data.filter(
    (t) =>
      t.due_date &&
      t.due_date < todayISO &&
      t.status !== 'Completed' &&
      t.status !== 'Cancelled',
  );
}

/**
 * Patch a list of tasks to 'Completed' status. Used in Test 8 to temporarily
 * retire pre-existing overdue tasks so the empty state can be verified.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
 * @param {Array<{ id: number, status: string }>} tasks - Tasks to patch.
 * @returns {Promise<void>}
 */
async function completeOverdueTasks(request, tasks) {
  for (const task of tasks) {
    await request.patch(`${API_BASE}/api/tasks/${task.id}`, {
      data: { status: 'Completed' },
    });
  }
}

/**
 * Restore a list of tasks to their original status values. Used in Test 8
 * teardown to undo the temporary 'Completed' patches.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
 * @param {Array<{ id: number, status: string }>} tasks - Tasks with their original status.
 * @returns {Promise<void>}
 */
async function restoreOverdueTasks(request, tasks) {
  for (const task of tasks) {
    await request.patch(`${API_BASE}/api/tasks/${task.id}`, {
      data: { status: task.status },
    });
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Dashboard happy path', () => {
  /**
   * IDs of records created in beforeEach, used for cleanup in afterEach.
   * @type {{ todayTaskId: number, overdueTaskId: number, eventId: number, noteId: number }}
   */
  let seededIds;

  /**
   * Seed one task due today, one overdue task, one upcoming event, and one
   * pinned note before each test so there is known data to assert against.
   *
   * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
   * @returns {Promise<void>}
   */
  test.beforeEach(async ({ request }) => {
    seededIds = await seedData(request);
  });

  /**
   * Remove the seeded records after each test to keep the database clean.
   *
   * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
   * @returns {Promise<void>}
   */
  test.afterEach(async ({ request }) => {
    await cleanData(request, seededIds);
  });

  // -------------------------------------------------------------------------
  // Test 1 — Root route renders Dashboard
  // -------------------------------------------------------------------------

  test('Test 1 — navigating to / renders a time-appropriate greeting heading', async ({ page }) => {
    await page.goto('/');

    // WelcomeHeader renders a greeting in one of three forms.
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Test 2 — Today's Agenda widget
  // -------------------------------------------------------------------------

  test("Test 2 — Today's Agenda widget shows the task due today", async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load by checking the greeting heading first.
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible({ timeout: 10000 });

    // The WidgetCard renders the title in an <h2>.
    await expect(page.getByRole('heading', { name: "Today's Agenda" })).toBeVisible({
      timeout: 10000,
    });

    // The seeded task due today must appear in the tasks sub-section.
    await expect(page.getByText(TODAY_TASK_TITLE)).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Test 3 — Overdue Tasks widget
  // -------------------------------------------------------------------------

  test('Test 3 — Overdue Tasks widget shows the overdue task', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible({ timeout: 10000 });

    // WidgetCard renders the title in an <h2>.
    await expect(page.getByRole('heading', { name: 'Overdue Tasks' })).toBeVisible({
      timeout: 10000,
    });

    // The seeded overdue task must appear in the widget.
    // It uses OLD_DUE_DATE (2020-01-01) so it always sorts first in the
    // ascending date order and is included in the 5-item cap.
    await expect(page.getByText(OVERDUE_TASK_TITLE)).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Test 4 — Upcoming Events widget
  // -------------------------------------------------------------------------

  test('Test 4 — Upcoming Events widget shows Team Standup', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible({ timeout: 10000 });

    // WidgetCard renders the title in an <h2>.
    await expect(page.getByRole('heading', { name: 'Upcoming Events' })).toBeVisible({
      timeout: 10000,
    });

    // The seeded event must appear in the widget.
    await expect(page.getByText(EVENT_TITLE)).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Test 5 — Pinned Items widget
  // -------------------------------------------------------------------------

  test('Test 5 — Pinned Items widget shows the pinned note', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible({ timeout: 10000 });

    // WidgetCard renders the title in an <h2>.
    await expect(page.getByRole('heading', { name: 'Pinned Items' })).toBeVisible({
      timeout: 10000,
    });

    // PinnedItemsWidget uses the first non-empty line of note content as the title.
    await expect(page.getByText('Pinned meeting note')).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Test 6 — Navigation from widget row
  // -------------------------------------------------------------------------

  test('Test 6 — clicking the overdue task row navigates to /tasks/:id', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible({ timeout: 10000 });

    // Wait for the Overdue Tasks widget content to load.
    await expect(page.getByText(OVERDUE_TASK_TITLE)).toBeVisible({ timeout: 10000 });

    // Click the overdue task row (it is a <Link> wrapping the title text).
    await page.getByText(OVERDUE_TASK_TITLE).click();

    // The URL should change to /tasks/:id where :id is the overdue task's ID.
    await expect(page).toHaveURL(
      new RegExp(`/tasks/${seededIds.overdueTaskId}$`),
      { timeout: 10000 },
    );
  });

  // -------------------------------------------------------------------------
  // Test 7 — Sidebar Dashboard link active
  // -------------------------------------------------------------------------

  test('Test 7 — the Dashboard sidebar link has the active highlight class when on /', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible({ timeout: 10000 });

    // The Sidebar renders NavLinks; the active one receives bg-blue-100 text-blue-700.
    // Locate the "Dashboard" link inside the sidebar nav.
    const dashboardLink = page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Dashboard' });

    await expect(dashboardLink).toBeVisible({ timeout: 5000 });

    // Assert the active class is applied.
    await expect(dashboardLink).toHaveClass(/bg-blue-100/);
    await expect(dashboardLink).toHaveClass(/text-blue-700/);
  });

  // -------------------------------------------------------------------------
  // Test 8 — Empty states
  // -------------------------------------------------------------------------

  test("Test 8 — after deleting all seeded items the Overdue Tasks widget shows \"You're all caught up.\"", async ({
    page,
    request,
  }) => {
    // Fetch any pre-existing overdue tasks so we can temporarily retire them.
    const preExistingOverdue = await fetchExistingOverdueTasks(request);

    // Temporarily mark all pre-existing overdue tasks as Completed so they
    // no longer appear in the OverdueTasksWidget.
    await completeOverdueTasks(request, preExistingOverdue);

    try {
      // Delete the seeded items (afterEach also runs cleanData, which will no-op).
      await cleanData(request, seededIds);

      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
      ).toBeVisible({ timeout: 10000 });

      // The OverdueTasksWidget renders this message when tasks.length === 0.
      await expect(page.getByText("You're all caught up.")).toBeVisible({ timeout: 10000 });
    } finally {
      // Restore pre-existing overdue tasks to their original statuses.
      await restoreOverdueTasks(request, preExistingOverdue);
    }
  });
});
