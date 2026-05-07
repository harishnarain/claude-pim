/**
 * E2E test: Notes happy path.
 *
 * Covers the full user journey for the Notes module:
 *   1. Navigate to /notes — see the empty state.
 *   2. Click "New Note" — land on /notes/<id>.
 *   3. Type a multi-line note with Markdown (heading, list item, bold text).
 *   4. Wait for auto-save to fire — verify "Saved" indicator appears.
 *   5. Open the TagCombobox; type a new tag name and press Enter.
 *   6. Verify the tag chip appears.
 *   7. Navigate back to /notes — verify note card shows title, preview, and tag badge.
 *   8. Return to the note; toggle the pin; navigate back; verify note is at top.
 *   9. Open the note; click Delete; cancel in ConfirmDialog; verify note is still there.
 *  10. Click Delete again; confirm; verify redirect to /notes and note is gone.
 *
 * Prerequisites: the Vite dev server (port 5173) and Express API (port 3001)
 * must be running before executing `npm run test:e2e`.
 *
 * @module tests/e2e/notes.spec.js
 */

import { test, expect } from '@playwright/test';

/** Tag name used throughout the test. */
const TEST_TAG = 'e2etag';

/**
 * Multi-line Markdown content used in the test.
 * The first line becomes the note title in the card view.
 */
const NOTE_CONTENT = '# E2E Test Heading\n- list item\n**bold text**';

/** The expected title derived from the first line of NOTE_CONTENT. */
const NOTE_TITLE = 'E2E Test Heading';

test.describe('Notes happy path', () => {
  /**
   * Clean up ALL notes before each run so the test starts from a known empty
   * state and is idempotent against a persistent dev DB.
   * Cleanup is done directly via the API.
   *
   * @param {import('@playwright/test').APIRequestContext} request - Playwright request context.
   * @returns {Promise<void>}
   */
  test.beforeEach(async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/notes');
    if (!res.ok()) return;

    const body = await res.json();
    const notes = body.data ?? [];

    for (const note of notes) {
      await request.delete(`http://localhost:3001/api/notes/${note.id}`);
    }
  });

  test('full journey: create → tag → pin → delete', async ({ page }) => {
    // -------------------------------------------------------------------------
    // Step 1: Navigate to /notes and verify the empty state.
    // -------------------------------------------------------------------------
    await page.goto('/notes');

    await expect(
      page.getByRole('heading', { name: 'Notes', exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'No notes yet' }),
    ).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 2: Click "New Note" and land on /notes/<id>.
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: 'New Note' }).first().click();

    // The page creates a blank note and replaces /notes/new with /notes/:id.
    await expect(page).toHaveURL(/\/notes\/\d+/, { timeout: 10000 });

    // Wait for the editor to be ready (the textarea is the writable editing area).
    // The NoteEditor textarea has aria-label="Note content".
    const editor = page.getByLabel('Note content');
    await expect(editor).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 3: Type a multi-line Markdown note into the editor textarea.
    // -------------------------------------------------------------------------
    await editor.fill(NOTE_CONTENT);

    // -------------------------------------------------------------------------
    // Step 4: Wait for auto-save to fire and verify the "Saved" indicator.
    // The debounce is 800 ms; waiting 1500 ms gives the save roundtrip time.
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

    // Capture the current note URL so we can return to it later.
    const noteUrl = page.url();

    // -------------------------------------------------------------------------
    // Step 7: Navigate back to /notes and verify the note card.
    // -------------------------------------------------------------------------
    await page.goto('/notes');

    await expect(
      page.getByRole('heading', { name: 'Notes', exact: true }),
    ).toBeVisible();

    // The note card should display the derived title (first heading line).
    await expect(page.getByText(NOTE_TITLE)).toBeVisible();

    // A preview snippet should be visible somewhere on the card.
    await expect(page.getByText('list item')).toBeVisible();

    // The tag badge should appear on the card.
    await expect(page.getByText(TEST_TAG)).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 8: Return to the note, toggle the pin, navigate back, verify order.
    // -------------------------------------------------------------------------
    await page.goto(noteUrl);

    // Wait for the editor to be fully loaded before interacting.
    await expect(page.getByLabel('Note content')).toBeVisible({ timeout: 10000 });

    // The NoteToolbar pin button shows "Pin" when unpinned; click to pin.
    const pinButton = page.getByRole('button', { name: /^Pin$/ });
    await expect(pinButton).toBeVisible({ timeout: 5000 });
    await pinButton.click();

    // After toggling, the button text should change to "Pinned".
    await expect(
      page.getByRole('button', { name: /Pinned/ }),
    ).toBeVisible({ timeout: 8000 });

    // Navigate back to /notes.
    await page.goto('/notes');

    // The pinned note card should be the first list item (pinned-first sort).
    const firstCard = page.getByRole('list').getByRole('button').first();
    await expect(firstCard).toContainText(NOTE_TITLE);

    // -------------------------------------------------------------------------
    // Step 9: Open the note, click Delete, cancel — verify the note persists.
    // -------------------------------------------------------------------------
    await page.goto(noteUrl);

    await page.getByRole('button', { name: 'Delete' }).click();

    // The ConfirmDialog should appear.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Click Cancel — the dialog closes without deleting the note.
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).not.toBeVisible();

    // The editor is still visible — the note was not deleted.
    await expect(page.getByLabel('Note content')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 10: Click Delete again, confirm — verify redirect and note is gone.
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: 'Delete' }).click();

    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();

    await confirmDialog.getByRole('button', { name: 'Confirm' }).click();

    // After deletion, the app navigates back to /notes.
    await expect(page).toHaveURL(/\/notes$/);

    // The note title should no longer appear in the list.
    await expect(page.getByText(NOTE_TITLE)).not.toBeVisible();

    // Empty state should be visible since no other notes exist.
    await expect(
      page.getByRole('heading', { name: 'No notes yet' }),
    ).toBeVisible();
  });
});
