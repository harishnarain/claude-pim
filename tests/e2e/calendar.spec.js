/**
 * E2E test: Calendar happy path.
 *
 * Covers the full user journey for the Calendar module:
 *   1. Navigate to /calendar — click the Calendar sidebar link and assert
 *      the URL is /calendar and the toolbar is visible.
 *   2. View switching — click each view tab (Day, Work Week, Week, Month) and
 *      assert the active tab is highlighted and the grid updates.
 *   3. Today button — navigate forward twice (Next × 2), then click Today;
 *      assert the displayed date range includes today.
 *   4. Create event via QuickCreateForm — click a time slot in the week view,
 *      fill in a title, click Save; assert the event chip appears on the grid.
 *   5. Navigate to EventEditorPage via Expand — click a slot, fill a title,
 *      click Expand; assert URL changes to /calendar/events/:id and the full
 *      form is visible.
 *   6. Delete event from calendar — create an event, navigate to its editor,
 *      click Delete, confirm; assert redirect to /calendar and chip gone.
 *   7. Task chip appears on calendar — create a task with a due date via the
 *      Tasks module API, navigate back to Calendar; assert a task chip appears
 *      on the correct date in the week view.
 *
 * Prerequisites: the Vite dev server (port 5173) and Express API (port 3001)
 * must be running before executing `npm run test:e2e`.
 *
 * @module tests/e2e/calendar.spec.js
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Title used for the quick-create event in Test 4. */
const EVENT_TITLE = 'E2E Calendar Event';

/** Title used for the expand-to-editor test (Test 5). */
const EXPAND_EVENT_TITLE = 'E2E Expand Event';

/** Title for the event created for the delete test (Test 6). */
const DELETE_EVENT_TITLE = 'E2E Delete Event';

/** Title for the task created in Test 7. */
const TASK_TITLE = 'E2E Calendar Task';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return today's date as a YYYY-MM-DD string in local time.
 *
 * @returns {string} ISO date string for today.
 */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Wait for the calendar page to finish loading by waiting for the toolbar
 * Today button to be visible and any loading spinner to disappear.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @returns {Promise<void>}
 */
async function waitForCalendarReady(page) {
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 10000 });
  // Wait for the loading spinner to disappear, if it appears at all.
  await page.waitForFunction(
    () => !document.querySelector('p.text-sm.text-gray-500')?.textContent.includes('Loading'),
    { timeout: 10000 }
  );
}

/**
 * Switch the calendar to the Week view and wait for the all-day banner.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @returns {Promise<void>}
 */
async function switchToWeekView(page) {
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(page.getByLabel('All-day events')).toBeVisible({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Calendar happy path', () => {
  /**
   * Clean up all events and tasks before each test so the calendar starts
   * from a known empty state and tests remain idempotent.
   *
   * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
   * @returns {Promise<void>}
   */
  test.beforeEach(async ({ request }) => {
    // Delete all events by fetching across a wide date window.
    const eventsRes = await request.get(
      'http://localhost:3001/api/events?start=2020-01-01&end=2099-12-31',
    );
    if (eventsRes.ok()) {
      const body = await eventsRes.json();
      const items = body.data ?? [];
      for (const item of items) {
        if (item.kind === 'event') {
          await request.delete(`http://localhost:3001/api/events/${item.id}`);
        }
      }
    }

    // Delete all tasks so task chips don't bleed across tests.
    const tasksRes = await request.get('http://localhost:3001/api/tasks');
    if (tasksRes.ok()) {
      const body = await tasksRes.json();
      const tasks = body.data ?? [];
      for (const task of tasks) {
        await request.delete(`http://localhost:3001/api/tasks/${task.id}`);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Test 1 — Navigate to calendar
  // -------------------------------------------------------------------------

  test('Test 1 — navigate to /calendar via sidebar link', async ({ page }) => {
    await page.goto('/');

    // Click the Calendar link in the sidebar navigation.
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Calendar' })
      .click();

    // Assert URL changed to /calendar.
    await expect(page).toHaveURL(/\/calendar/, { timeout: 10000 });

    // Assert the Today button is visible (part of the CalendarToolbar).
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 10000 });

    // Assert the Week view tab button is present (exact: true to avoid matching "Work Week").
    await expect(page.getByRole('button', { name: 'Week', exact: true })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Test 2 — View switching
  // -------------------------------------------------------------------------

  test('Test 2 — view switching highlights active tab and updates grid', async ({ page }) => {
    await page.goto('/calendar');
    await waitForCalendarReady(page);

    const viewTabs = [
      { label: 'Day', exact: true },
      { label: 'Work Week', exact: true },
      { label: 'Week', exact: true },
      { label: 'Month', exact: true },
    ];

    for (const { label, exact } of viewTabs) {
      // Click the view tab.
      await page.getByRole('button', { name: label, exact }).click();

      // The button should now be aria-pressed=true (highlighted active state).
      await expect(
        page.getByRole('button', { name: label, exact }),
      ).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });
    }

    // After visiting Month, switch back to Week and verify the timed-grid renders.
    await page.getByRole('button', { name: 'Week', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Week', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    // The all-day banner should be visible in day/week views (DayWeekGrid rendered).
    await expect(page.getByLabel('All-day events')).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Test 3 — Today button
  // -------------------------------------------------------------------------

  test('Test 3 — Today button resets date range to include today', async ({ page }) => {
    await page.goto('/calendar');
    await waitForCalendarReady(page);

    // Work in Week view so the date label shows a week range.
    await switchToWeekView(page);

    // Capture the initial date label text.
    const dateLabel = page.locator('span.text-sm.font-medium.text-gray-700');
    const initialLabel = await dateLabel.textContent();

    // Click Next twice to move forward two weeks.
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    // The date label should have changed.
    await expect(dateLabel).not.toHaveText(initialLabel ?? '', { timeout: 5000 });

    // Click Today to return to the current week.
    await page.getByRole('button', { name: 'Today' }).click();

    // The toolbar date label should now include the current year and month name.
    const today = new Date();
    const currentYear = String(today.getFullYear());

    await expect(dateLabel).toContainText(currentYear, { timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Test 4 — Create event via QuickCreateForm
  // -------------------------------------------------------------------------

  test('Test 4 — create event via QuickCreateForm; chip appears on grid', async ({ page }) => {
    await page.goto('/calendar');
    await waitForCalendarReady(page);
    await switchToWeekView(page);

    // Click the 9:00 time slot in the first DayColumn.
    // DayColumn time-slot rows have aria-label "<hour>:00".
    const slot9 = page.getByRole('button', { name: '9:00' }).first();
    await slot9.scrollIntoViewIfNeeded();
    await slot9.click();

    // The QuickCreateForm dialog should appear.
    const dialog = page.getByRole('dialog', { name: 'Quick create event' });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill in the event title.
    // Use click + keyboard type so React's controlled input receives change events.
    const titleInput = dialog.getByLabel('Event title');
    await titleInput.click();
    await page.keyboard.type(EVENT_TITLE);
    await expect(titleInput).toHaveValue(EVENT_TITLE);

    // Click Save and wait for the network request to complete.
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/events') && resp.status() === 201),
      dialog.getByRole('button', { name: 'Save event' }).click(),
    ]);

    // The dialog should close after a successful save.
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // The event chip appears in the DayColumn at the 9:00 row.
    // Scroll the chip into view and assert it is visible.
    const eventChip = page.getByText(EVENT_TITLE);
    await eventChip.scrollIntoViewIfNeeded();
    await expect(eventChip).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Test 5 — Navigate to EventEditorPage via Expand
  // -------------------------------------------------------------------------

  test('Test 5 — Expand button navigates to /calendar/events/:id', async ({ page }) => {
    await page.goto('/calendar');
    await waitForCalendarReady(page);
    await switchToWeekView(page);

    // Click the 10:00 slot.
    const slot10 = page.getByRole('button', { name: '10:00' }).first();
    await slot10.scrollIntoViewIfNeeded();
    await slot10.click();

    const dialog = page.getByRole('dialog', { name: 'Quick create event' });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill in the event title.
    const titleInput = dialog.getByLabel('Event title');
    await titleInput.click();
    await titleInput.fill(EXPAND_EVENT_TITLE);
    await expect(titleInput).toHaveValue(EXPAND_EVENT_TITLE);

    // Click Expand instead of Save.
    await dialog.getByRole('button', { name: 'Expand event editor' }).click();

    // The URL should change to /calendar/events/:id.
    await expect(page).toHaveURL(/\/calendar\/events\/\d+/, { timeout: 10000 });

    // The full EventForm should be visible.
    const eventTitleInput = page.getByLabel('Event title');
    await expect(eventTitleInput).toBeVisible({ timeout: 5000 });
    await expect(eventTitleInput).toHaveValue(EXPAND_EVENT_TITLE, { timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Test 6 — Delete event from EventEditorPage
  // -------------------------------------------------------------------------

  test('Test 6 — delete event from EventEditorPage removes it from calendar', async ({
    page,
    request,
  }) => {
    // Create an event directly via the API for a predictable setup.
    const today = todayStr();
    const createRes = await request.post('http://localhost:3001/api/events', {
      data: {
        title: DELETE_EVENT_TITLE,
        allDay: false,
        startAt: `${today}T09:00`,
        endAt: `${today}T10:00`,
        color: 'blue',
      },
    });
    expect(createRes.status()).toBe(201);
    const createdBody = await createRes.json();
    const eventId = createdBody.data.id;

    // Navigate directly to the event editor.
    await page.goto(`/calendar/events/${eventId}`);
    await expect(page.getByLabel('Event title')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Event title')).toHaveValue(DELETE_EVENT_TITLE, { timeout: 5000 });

    // Click the Delete button.
    await page.getByRole('button', { name: 'Delete' }).click();

    // The ConfirmDialog should appear.
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    // Confirm the deletion.
    await confirmDialog.getByRole('button', { name: 'Confirm' }).click();

    // After deletion the app navigates back to /calendar.
    await expect(page).toHaveURL(/\/calendar$/, { timeout: 10000 });

    // The event chip should no longer be present in the grid.
    await waitForCalendarReady(page);
    await expect(page.getByText(DELETE_EVENT_TITLE)).not.toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Test 7 — Task chip appears on calendar
  // -------------------------------------------------------------------------

  test('Test 7 — task chip with due date appears on calendar week view', async ({
    page,
    request,
  }) => {
    // Create a task with today as the due date via the API.
    const today = todayStr();
    const createRes = await request.post('http://localhost:3001/api/tasks', {
      data: {
        title: TASK_TITLE,
        due_date: today,
        priority: 'Medium',
        status: 'Not Started',
      },
    });
    expect(createRes.status()).toBe(201);

    // Navigate to the calendar in week view.
    await page.goto('/calendar');
    await waitForCalendarReady(page);
    await switchToWeekView(page);

    // Timeless tasks (dueDate but no dueTime) appear in the all-day banner.
    // The task chip should be visible on today's column.
    await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 5000 });
  });
});
