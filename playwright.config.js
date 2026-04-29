/**
 * Playwright configuration for PIM end-to-end tests.
 *
 * Assumes the full app (Vite dev server on port 5173 + Express on port 3001)
 * is already running before `npm run test:e2e` is executed.
 *
 * Run: npm run test:e2e
 *
 * @type {import('@playwright/test').PlaywrightTestConfig}
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  /** Directory containing E2E test files. */
  testDir: './tests/e2e',

  /** Glob pattern matching test files. */
  testMatch: '**/*.spec.js',

  /** Fail fast — stop after the first test failure during CI. */
  fullyParallel: false,

  /** Retry failed tests once on CI to reduce flakiness. */
  retries: process.env.CI ? 1 : 0,

  /** Single worker keeps the DB state predictable across tests. */
  workers: 1,

  /** HTML report written to playwright-report/. */
  reporter: 'html',

  use: {
    /** Base URL for all page.goto() calls that use relative paths. */
    baseURL: 'http://localhost:5173',

    /** Capture a screenshot and trace on failure for debugging. */
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
