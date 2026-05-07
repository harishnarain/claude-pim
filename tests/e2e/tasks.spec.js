/**
 * E2E test: Tasks happy path.
 *
 * Covers the full user journey for the Tasks module:
 *   1. Navigate to /tasks — see the empty state.
 *   2. Click "New Task" — land on /tasks/<id>.
 *   3. Fill in a title, body, due date (tomorrow), priority "High", status "In Progress".
 *   4. Wait for auto-save to fire — verify "Saved" indicator appears.
 *   5. Open the TagCombobox; type a new tag name ("personal") and press Enter.
 *   6. Verify the tag chip appears.
 *   7. Navigate back to /tasks; verify the task card shows title, priority badge,
 *      status badge, and tag chip.
 *   8. Change the status on the card via the inline select to "Completed"; verify
 *      the title receives strikethrough styling.
 *   9. Click "New Task" again; create a second task ("Write report") with priority "Medium".
 *  10. Return to the first task detail page; toggle the pin; navigate back; verify
 *      the pinned task appears above the second task (pinnedDone sorts before
 *      unpinnedActive per the store derivation logic).
 *  11. Open the first task again; click Delete; cancel in ConfirmDialog; verify the
 *      task is still there.
 *  12. Click Delete again; confirm; verify redirect to /tasks and the task is gone.
 *
 * Prerequisites: the Vite dev server (port 5173) and Express API (port 3001)
 * must be running before executing `npm run test:e2e`.
 *
 * @module tests/e2e/tasks.spec.js
 */

import { test, expect } from '@playwright/test';

/** Title of the primary test task. */
const TASK_TITLE = 'Buy groceries';

/** Title of the secondary test task. */
const TASK_TITLE_2 = 'Write report';

/** Tag name used throughout the test. */
const TEST_TAG = 'personal';

/** Body text for the primary task. */
const TASK_BODY = 'Pick up milk, eggs, and bread.';

/**
 * Compute tomorrow's date as a YYYY-MM-DD string.
 *
 * @returns {string} ISO date string for tomorrow.
 */
function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test.describe('Tasks happy path', () => {
  /**
   * Clean up ALL tasks before each run so the test starts from a known empty
   * state and is idempotent against a persistent dev DB.
   * Cleanup is done directly via the API.
   *
   * @param {import('@playwright/test').APIRequestContext} request - Playwright request context.
   * @returns {Promise<void>}
   */
  test.beforeEach(async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/tasks');
    if (!res.ok()) return;

    const body = await res.json();
    const tasks = body.data ?? [];

    for (const task of tasks) {
      await request.delete(`http://localhost:3001/api/tasks/${task.id}`);
    }
  });

  test('full journey: create → tag → status → pin → delete', async ({ page }) => {
    // -------------------------------------------------------------------------
    // Step 1: Navigate to /tasks and verify the empty state.
    // -------------------------------------------------------------------------
    await page.goto('/tasks');

    await expect(
      page.getByRole('heading', { name: 'Tasks', exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'No tasks yet' }),
    ).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 2: Click "New Task" and land on /tasks/<id>.
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: 'New Task' }).first().click();

    // The page creates a blank task and replaces /tasks/new with /tasks/:id.
    await expect(page).toHaveURL(/\/tasks\/\d+/, { timeout: 10000 });

    // Wait for the title field to be ready.
    const titleInput = page.getByLabel('Task title');
    await expect(titleInput).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 3: Fill in title, body, due date, priority, and status.
    // -------------------------------------------------------------------------
    await titleInput.fill(TASK_TITLE);

    const bodyTextarea = page.getByLabel('Task body');
    await bodyTextarea.fill(TASK_BODY);

    const dueDateInput = page.getByLabel('Due date');
    await dueDateInput.fill(getTomorrowDate());

    const prioritySelect = page.getByLabel('Priority');
    await prioritySelect.selectOption('High');

    const statusSelect = page.getByLabel('Status');
    await statusSelect.selectOption('In Progress');

    // Blur to flush the debounce timer immediately.
    await statusSelect.blur();

    // -------------------------------------------------------------------------
    // Step 4: Wait for auto-save to fire and verify the "Saved" indicator.
    // The debounce is 800 ms; allow up to 5 s for the save roundtrip.
    // -------------------------------------------------------------------------
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // Step 5: Open the TagCombobox and type a new tag, then press Enter.
    // -------------------------------------------------------------------------
    const tagInput = page.getByRole('combobox', { name: 'Tag search' });
    await expect(tagInput).toBeVisible();
    await tagInput.click();
    await tagInput.fill(TEST_TAG);

    // Press Enter to create the tag.
    await tagInput.press('Enter');

    // -------------------------------------------------------------------------
    // Step 6: Verify the tag chip appears in the selected tags area.
    // -------------------------------------------------------------------------
    await expect(
      page.getByLabel('Selected tags').getByText(TEST_TAG),
    ).toBeVisible();

    // Capture the current task URL so we can return to it later.
    const taskUrl = page.url();

    // -------------------------------------------------------------------------
    // Step 7: Navigate back to /tasks and verify the task card.
    // -------------------------------------------------------------------------
    await page.goto('/tasks');

    await expect(
      page.getByRole('heading', { name: 'Tasks', exact: true }),
    ).toBeVisible();

    // The task card should display the title.
    await expect(page.getByText(TASK_TITLE)).toBeVisible();

    // The priority badge should show "High".
    await expect(page.getByText('High')).toBeVisible();

    // The status badge should show "In Progress".
    await expect(page.getByText('In Progress')).toBeVisible();

    // The tag chip should appear on the card.
    await expect(page.getByText(TEST_TAG)).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 8: Change the status via the inline select to "Completed".
    //         Verify the card title receives strikethrough styling.
    // -------------------------------------------------------------------------
    const changeStatusSelect = page.getByRole('combobox', { name: 'Change status' });
    await changeStatusSelect.selectOption('Completed');

    // After changing to Completed the title should have line-through styling.
    // The TaskCard applies 'line-through' class to the title paragraph when isDone.
    await expect(
      page.locator('p.line-through', { hasText: TASK_TITLE }),
    ).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // Step 9: Click "New Task" again and create a second task.
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: 'New Task' }).first().click();

    await expect(page).toHaveURL(/\/tasks\/\d+/, { timeout: 10000 });

    const titleInput2 = page.getByLabel('Task title');
    await expect(titleInput2).toBeVisible({ timeout: 10000 });

    await titleInput2.fill(TASK_TITLE_2);

    const prioritySelect2 = page.getByLabel('Priority');
    await prioritySelect2.selectOption('Medium');
    await prioritySelect2.blur();

    // Wait for auto-save of the second task.
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // Step 10: Return to the first task; toggle the pin; navigate back; verify
    //          the pinned task appears above the second task.
    //
    //          Per the store derivation logic, the order is:
    //            [pinnedActive, pinnedDone, unpinnedActive, unpinnedDone]
    //          "Buy groceries" is Completed (done) and pinned → pinnedDone bucket.
    //          "Write report" is active and not pinned → unpinnedActive bucket.
    //          Therefore "Buy groceries" still appears before "Write report".
    // -------------------------------------------------------------------------
    await page.goto(taskUrl);

    // Wait for the editor to be fully loaded.
    await expect(page.getByLabel('Task title')).toBeVisible({ timeout: 10000 });

    // The pin button shows "Pin" when unpinned.
    const pinButton = page.getByRole('button', { name: /^Pin$/ });
    await expect(pinButton).toBeVisible({ timeout: 5000 });
    await pinButton.click();

    // After toggling, the button text should change to "Pinned".
    await expect(
      page.getByRole('button', { name: /Pinned/ }),
    ).toBeVisible({ timeout: 8000 });

    // Navigate back to /tasks.
    await page.goto('/tasks');

    // The first list item should contain the pinned task title ("Buy groceries").
    // pinnedDone sorts before unpinnedActive in the store derivation.
    const listItems = page.getByRole('list').getByRole('listitem');
    const firstItem = listItems.first();
    await expect(firstItem).toContainText(TASK_TITLE);

    // The second item should be the second task.
    const secondItem = listItems.nth(1);
    await expect(secondItem).toContainText(TASK_TITLE_2);

    // -------------------------------------------------------------------------
    // Step 11: Open the first task; click Delete; cancel — verify persistence.
    // -------------------------------------------------------------------------
    await page.goto(taskUrl);

    await page.getByRole('button', { name: 'Delete' }).click();

    // The ConfirmDialog should appear.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Click Cancel — the dialog closes without deleting the task.
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).not.toBeVisible();

    // The title input is still visible — the task was not deleted.
    await expect(page.getByLabel('Task title')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 12: Click Delete again; confirm; verify redirect and task is gone.
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: 'Delete' }).click();

    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();

    await confirmDialog.getByRole('button', { name: 'Confirm' }).click();

    // After deletion, the app navigates back to /tasks.
    await expect(page).toHaveURL(/\/tasks$/, { timeout: 10000 });

    // The first task title should no longer appear in the list.
    await expect(page.getByText(TASK_TITLE)).not.toBeVisible();

    // The second task should still be present.
    await expect(page.getByText(TASK_TITLE_2)).toBeVisible();
  });
});
