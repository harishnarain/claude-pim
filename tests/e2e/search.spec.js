/**
 * E2E test: Search happy path.
 *
 * Covers the full user journey for the Search module:
 *   1. Search bar visible — navigate to /contacts; assert search input is
 *      visible in the top navbar.
 *   2. Dropdown appears on typing — type "test" in the search bar; assert
 *      the dropdown appears.
 *   3. Recent searches — perform a search, press Enter to go to results page,
 *      navigate back, click the search bar; assert the previous query appears
 *      in recent searches.
 *   4. Full results page — type a query for a known contact (seeded in
 *      beforeEach); press Enter; assert /search?q=… URL, result count visible,
 *      at least one result row with the contact's name.
 *   5. Type filter — on the results page click the "Tasks" tab; assert URL
 *      contains type=task; results show only task-kind items.
 *   6. Group toggle — click "Group by module"; assert section headers appear.
 *   7. Empty state — search for a string guaranteed to match nothing; assert
 *      the empty state message is visible.
 *
 * Prerequisites: the Vite dev server (port 5173) and Express API (port 3001)
 * must be running before executing `npm run test:e2e`.
 *
 * @module tests/e2e/search.spec.js
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base API URL for direct API calls. */
const API_BASE = 'http://localhost:3001';

/** Unique prefix used in seeded data to avoid collisions with other tests. */
const SEED_PREFIX = 'E2ESearch';

/** First name for the seeded contact. */
const CONTACT_FIRST = SEED_PREFIX;

/** Last name for the seeded contact. */
const CONTACT_LAST = 'ContactXYZ';

/** Full display name of the seeded contact (first + last). */
const CONTACT_FULL_NAME = `${CONTACT_FIRST} ${CONTACT_LAST}`;

/** Content for the seeded note. */
const NOTE_CONTENT = `${SEED_PREFIX} NoteABC`;

/** Title for the seeded task. */
const TASK_TITLE = `${SEED_PREFIX} TaskDEF`;

/** Search term that will match only the seeded contact. */
const CONTACT_QUERY = CONTACT_FULL_NAME;

/**
 * A query string that is extremely unlikely to match any real record
 * and is used to exercise the empty-state path.
 */
const EMPTY_QUERY = 'zzz_noresults_e2esearch_xyz9999';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seed one contact, one note, and one task via the API.
 * Returns the created record IDs so afterEach can clean them up.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
 * @returns {Promise<{ contactId: number, noteId: number, taskId: number }>}
 */
async function seedData(request) {
  const contactRes = await request.post(`${API_BASE}/api/contacts`, {
    data: {
      first_name: CONTACT_FIRST,
      last_name: CONTACT_LAST,
      email: 'e2esearch@example.com',
    },
  });
  expect(contactRes.status()).toBe(201);
  const contactBody = await contactRes.json();
  const contactId = contactBody.data.id;

  const noteRes = await request.post(`${API_BASE}/api/notes`, {
    data: { content: NOTE_CONTENT },
  });
  expect(noteRes.status()).toBe(201);
  const noteBody = await noteRes.json();
  const noteId = noteBody.data.id;

  const taskRes = await request.post(`${API_BASE}/api/tasks`, {
    data: {
      title: TASK_TITLE,
      status: 'Not Started',
      priority: 'Medium',
    },
  });
  expect(taskRes.status()).toBe(201);
  const taskBody = await taskRes.json();
  const taskId = taskBody.data.id;

  return { contactId, noteId, taskId };
}

/**
 * Delete the seeded records by ID via the API.
 *
 * @param {import('@playwright/test').APIRequestContext} request - Playwright API context.
 * @param {{ contactId: number, noteId: number, taskId: number }} ids - IDs to delete.
 * @returns {Promise<void>}
 */
async function cleanData(request, { contactId, noteId, taskId }) {
  if (contactId) {
    await request.delete(`${API_BASE}/api/contacts/${contactId}`);
  }
  if (noteId) {
    await request.delete(`${API_BASE}/api/notes/${noteId}`);
  }
  if (taskId) {
    await request.delete(`${API_BASE}/api/tasks/${taskId}`);
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Search happy path', () => {
  /**
   * IDs of records created in beforeEach, used for cleanup in afterEach.
   * @type {{ contactId: number, noteId: number, taskId: number }}
   */
  let seededIds;

  /**
   * Seed one contact, one note, and one task before each test so there is
   * known data to match against the search API.
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
  // Test 1 — Search bar visible
  // -------------------------------------------------------------------------

  test('Test 1 — search input is visible in the top navbar on /contacts', async ({ page }) => {
    await page.goto('/contacts');

    // The SearchBar renders an <input type="search" aria-label="Search">.
    const searchInput = page.getByRole('searchbox', { name: 'Search' });
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Test 2 — Dropdown appears on typing
  // -------------------------------------------------------------------------

  test('Test 2 — typing in the search bar opens the results dropdown', async ({ page }) => {
    await page.goto('/contacts');

    const searchInput = page.getByRole('searchbox', { name: 'Search' });
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a query — this triggers the debounced search and opens the dropdown.
    await searchInput.click();
    await page.keyboard.type('test');

    // The SearchDropdown is rendered as a white card below the input.
    // It contains either results or a "No results" message; either way it is
    // the element that becomes visible when the dropdown opens.
    // We wait for any child of the dropdown to appear (the container div).
    await expect(
      page.locator('.absolute.top-full.mt-1.bg-white.rounded-lg.shadow-lg'),
    ).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Test 3 — Recent searches persist
  // -------------------------------------------------------------------------

  test('Test 3 — previous query appears in recent searches after returning', async ({ page }) => {
    await page.goto('/contacts');

    const searchInput = page.getByRole('searchbox', { name: 'Search' });
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a query and press Enter to navigate to the results page.
    await searchInput.click();
    await page.keyboard.type(CONTACT_QUERY);
    await page.keyboard.press('Enter');

    // Assert the URL changed to the search results page.
    await expect(page).toHaveURL(/\/search/, { timeout: 10000 });

    // Navigate back to /contacts so the recent-search history can be tested.
    await page.goto('/contacts');

    // Click the search bar with an empty query — the dropdown should open and
    // show the "Recent searches" section with the previous query.
    const freshInput = page.getByRole('searchbox', { name: 'Search' });
    await expect(freshInput).toBeVisible({ timeout: 10000 });
    await freshInput.click();

    // The SearchDropdown in "recent searches" state renders:
    //   <p>Recent searches</p>
    //   <ul> <li>…{query}…</li> </ul>
    await expect(page.getByText('Recent searches')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(CONTACT_QUERY)).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Test 4 — Full results page
  // -------------------------------------------------------------------------

  test('Test 4 — full results page shows count and seeded contact row', async ({ page }) => {
    await page.goto('/contacts');

    const searchInput = page.getByRole('searchbox', { name: 'Search' });
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type the seeded contact's full name and press Enter.
    await searchInput.click();
    await page.keyboard.type(CONTACT_QUERY);
    await page.keyboard.press('Enter');

    // The URL must include /search?q=…
    await expect(page).toHaveURL(/\/search\?q=/, { timeout: 10000 });

    // A result count paragraph should be visible (e.g. "1 result" or "N results").
    await expect(
      page.locator('p.text-sm.text-gray-500').filter({ hasText: /result/ }),
    ).toBeVisible({ timeout: 10000 });

    // At least one result row must contain the contact's name.
    await expect(page.getByText(CONTACT_FULL_NAME)).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Test 5 — Type filter
  // -------------------------------------------------------------------------

  test('Test 5 — clicking Tasks tab filters to task-kind results and updates URL', async ({
    page,
  }) => {
    // Navigate directly to the search results page with a broad query that
    // matches the seeded task.
    const encodedQuery = encodeURIComponent(SEED_PREFIX);
    await page.goto(`/search?q=${encodedQuery}`);

    // Wait for the result count to appear, indicating the page has loaded.
    await expect(
      page.locator('p.text-sm.text-gray-500').filter({ hasText: /result/ }),
    ).toBeVisible({ timeout: 10000 });

    // Click the "Tasks" module filter tab.
    await page.getByRole('tab', { name: 'Tasks' }).click();

    // The URL should now contain type=task.
    await expect(page).toHaveURL(/type=task/, { timeout: 5000 });

    // The seeded task title must be visible in the filtered results.
    await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 10000 });

    // Contact and note rows should not appear (they are filtered out).
    await expect(page.getByText(CONTACT_FULL_NAME)).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Test 6 — Group by module toggle
  // -------------------------------------------------------------------------

  test('Test 6 — Group by module toggle shows section headers', async ({ page }) => {
    // Navigate to the search results page with a broad query.
    const encodedQuery = encodeURIComponent(SEED_PREFIX);
    await page.goto(`/search?q=${encodedQuery}`);

    // Wait for results to load.
    await expect(
      page.locator('p.text-sm.text-gray-500').filter({ hasText: /result/ }),
    ).toBeVisible({ timeout: 10000 });

    // Click the "Group by module" button.
    await page.getByRole('button', { name: 'Group by module' }).click();

    // In grouped mode the SearchResultList renders <section aria-label="Contacts">
    // (and similarly for Notes, Tasks, Events) with an <h3> heading inside.
    // Assert that at least the Contacts section heading is visible, since
    // the seeded contact will appear there.
    await expect(page.getByRole('region', { name: 'Contacts' })).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Test 7 — Empty state
  // -------------------------------------------------------------------------

  test('Test 7 — searching for a no-match query shows the empty state message', async ({
    page,
  }) => {
    // Navigate directly to the search page with a query that matches nothing.
    const encodedQuery = encodeURIComponent(EMPTY_QUERY);
    await page.goto(`/search?q=${encodedQuery}`);

    // The SearchPage empty state renders: No results for «{query}»
    await expect(
      page.getByText(`No results for «${EMPTY_QUERY}»`),
    ).toBeVisible({ timeout: 10000 });
  });
});
