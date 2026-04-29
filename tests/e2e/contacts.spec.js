/**
 * E2E test: Contacts happy path.
 *
 * Covers the full user journey for the Contacts module:
 *   1. Navigate to /contacts — see empty state.
 *   2. Click "Add Contact", fill form, submit.
 *   3. See the new contact in the list.
 *   4. Click the contact row — see the detail view.
 *   5. Click "Edit", change a field, save — see the updated value.
 *   6. Click "Delete", confirm — see empty state again.
 *
 * Prerequisites: the Vite dev server (port 5173) and Express API (port 3001)
 * must be running before executing `npm run test:e2e`.
 *
 * @module tests/e2e/contacts.spec.js
 */

import { test, expect } from '@playwright/test';

/** Contact fixture used throughout the test. */
const CONTACT = {
  firstName: 'E2E',
  lastName: 'Testuser',
  email: 'e2e.testuser@example.com',
  phone: '555-0100',
  company: 'Playwright Inc.',
};

/** Updated company value used in the edit step. */
const UPDATED_COMPANY = 'Updated Corp';

test.describe('Contacts happy path', () => {
  /**
   * Clean up any leftover contacts with the test fixture name before each run
   * so the test is idempotent when run repeatedly against a persistent DB.
   * The cleanup is done via the API directly.
   *
   * @param {import('@playwright/test').Page} page - Playwright page object.
   * @returns {Promise<void>}
   */
  test.beforeEach(async ({ request }) => {
    // Fetch all contacts and delete any that match the test fixture.
    const res = await request.get('http://localhost:3001/api/contacts');
    if (!res.ok()) return;

    const body = await res.json();
    const contacts = body.data ?? [];

    for (const contact of contacts) {
      if (
        contact.first_name === CONTACT.firstName &&
        contact.last_name === CONTACT.lastName
      ) {
        await request.delete(`http://localhost:3001/api/contacts/${contact.id}`);
      }
    }
  });

  test('full CRUD journey: create → view → edit → delete', async ({ page }) => {
    // ------------------------------------------------------------------
    // Step 1: Navigate to /contacts and verify the empty state.
    // ------------------------------------------------------------------
    await page.goto('/contacts');

    await expect(
      page.getByRole('heading', { name: 'Contacts' }),
    ).toBeVisible();

    // The empty state heading is rendered by EmptyState when there are no contacts.
    await expect(
      page.getByRole('heading', { name: 'No contacts yet' }),
    ).toBeVisible();

    // ------------------------------------------------------------------
    // Step 2: Open the create contact form.
    // ------------------------------------------------------------------
    // Click the "Add Contact" button in the page header.
    await page.getByRole('button', { name: 'Add Contact' }).first().click();

    // Expect navigation to /contacts/new.
    await expect(page).toHaveURL(/\/contacts\/new/);

    // ------------------------------------------------------------------
    // Step 3: Fill in the form and submit.
    // ------------------------------------------------------------------
    await page.getByLabel('First Name').fill(CONTACT.firstName);
    await page.getByLabel('Last Name').fill(CONTACT.lastName);
    await page.getByLabel('Email').fill(CONTACT.email);
    await page.getByLabel('Phone').fill(CONTACT.phone);
    await page.getByLabel('Company').fill(CONTACT.company);

    await page.getByRole('button', { name: 'Save' }).click();

    // ------------------------------------------------------------------
    // Step 4: Verify the new contact appears in the contacts list.
    // ------------------------------------------------------------------
    // After a successful create the app navigates back to /contacts.
    await expect(page).toHaveURL(/\/contacts$/);

    const fullName = `${CONTACT.firstName} ${CONTACT.lastName}`;

    // The contact row should now be visible in the list.
    await expect(page.getByText(fullName)).toBeVisible();

    // ------------------------------------------------------------------
    // Step 5: Click the contact row to open the detail view.
    // ------------------------------------------------------------------
    await page.getByText(fullName).click();

    // The URL should change to /contacts/:id.
    await expect(page).toHaveURL(/\/contacts\/\d+/);

    // The detail page heading should display the full name.
    await expect(
      page.getByRole('heading', { name: fullName }),
    ).toBeVisible();

    // All submitted fields should be visible.
    await expect(page.getByText(CONTACT.email)).toBeVisible();
    await expect(page.getByText(CONTACT.company)).toBeVisible();

    // ------------------------------------------------------------------
    // Step 6: Edit the contact — update the Company field.
    // ------------------------------------------------------------------
    await page.getByRole('button', { name: 'Edit' }).click();

    // The Company input should now be visible in edit mode.
    const companyInput = page.getByLabel('Company');
    await expect(companyInput).toBeVisible();

    // Clear and type the updated value.
    await companyInput.clear();
    await companyInput.fill(UPDATED_COMPANY);

    await page.getByRole('button', { name: 'Save' }).click();

    // After save the page returns to read mode — verify the updated value.
    await expect(page.getByText(UPDATED_COMPANY)).toBeVisible();

    // The old company name should no longer be present.
    await expect(page.getByText(CONTACT.company)).not.toBeVisible();

    // ------------------------------------------------------------------
    // Step 7: Delete the contact and confirm — verify empty state returns.
    // ------------------------------------------------------------------
    await page.getByRole('button', { name: 'Delete' }).click();

    // The ConfirmDialog should appear with a confirmation message.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Click the Confirm button inside the dialog.
    await dialog.getByRole('button', { name: 'Confirm' }).click();

    // After deletion, the app navigates back to /contacts.
    await expect(page).toHaveURL(/\/contacts$/);

    // Empty state should be visible again since all contacts were deleted.
    await expect(
      page.getByRole('heading', { name: 'No contacts yet' }),
    ).toBeVisible();
  });
});
