# Dashboard — Implementation Tasks

## Task List

---

### Task 1 — Date/time utility module
**File(s):** `client/src/utils/dashboard-dates.js`
**What:** Create and export all date/time helper functions and the `PRIORITY_RANK` constant used throughout the Dashboard feature:
- `getGreeting(): string` — returns `"Good morning"` (05:00–11:59), `"Good afternoon"` (12:00–16:59), or `"Good evening"` (17:00–04:59) based on local hour.
- `formatFullDate(date?: Date): string` — returns `"Weekday, D Month YYYY"` using `Intl.DateTimeFormat` with `{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }`. Defaults to `new Date()`.
- `getTodayISO(date?: Date): string` — returns local date as `"YYYY-MM-DD"` using `date.toLocaleDateString('en-CA')`. Defaults to `new Date()`.
- `formatEventTime(startAt: string): string` — extracts `HH:MM` via `startAt.slice(11, 16)`.
- `formatRelativePastDate(isoDate: string, todayISO: string): string` — returns `"Yesterday"` for 1 day ago, `"N days ago"` for 2+.
- `formatRelativeFutureDate(isoDate: string, todayISO: string): string` — returns `"Tomorrow"` (1 day), `"In N days"` (2–4 days), or short weekday + date e.g. `"Fri 17"` (5–7 days) using `Intl.DateTimeFormat` with `{ weekday: 'short', day: 'numeric' }`.
- `addDays(isoDate: string, n: number): string` — adds `n` days to an ISO date string using `new Date(isoDate + 'T00:00:00')` plus millisecond arithmetic; returns a new ISO date string.
- `export const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 }` — used for sorting tasks by priority.

All functions must have JSDoc comments. No external dependencies.

**Done when:** All eight exports exist; `getGreeting()` returns the correct string for all three hour ranges; `getTodayISO()` returns a valid `YYYY-MM-DD` string; `addDays('2026-05-15', 3)` returns `'2026-05-18'`; `formatRelativePastDate` and `formatRelativeFutureDate` return the correct labels for boundary values.
**Commit message:** `feat(dashboard): add dashboard-dates utility module`

---

### Task 2 — useDashboardData hook
**File(s):** `client/src/hooks/use-dashboard-data.js`
**What:** Create the `useDashboardData()` custom hook. It fires three parallel API calls on mount using `Promise.all([getTasks(), getEvents({ start, end }), getNotes()])`, where `start` is today's ISO date from `getTodayISO()` and `end` is `addDays(todayISO, 7)`.

The hook must derive today's ISO date string once at call time and apply all client-side slicing logic after the fetches resolve:

- **todayEvents**: events where `item.kind === 'event'` and `item.startAt.slice(0, 10) === todayISO`, sorted ascending by `startAt`. Pass all matching items (the widget slices to 5 internally).
- **todayTasks**: tasks where `task.dueDate === todayISO` and status is not `'Completed'` or `'Cancelled'`, sorted by `PRIORITY_RANK[priority]` descending. Pass all matching items.
- **overdueTasksSlice** (max 5) and **overdueTasksTotal**: tasks where `task.dueDate < todayISO` and status not Completed/Cancelled, sorted `dueDate` ascending then priority descending.
- **upcomingEventsSlice** (max 5) and **upcomingEventsTotal**: events where `item.kind === 'event'` and `item.startAt.slice(0, 10) > todayISO`, sorted ascending by `startAt`.
- **upcomingTasksSlice** (max 5) and **upcomingTasksTotal**: tasks where `task.dueDate > todayISO` and `task.dueDate <= plusSevenISO` and status not Completed/Cancelled, sorted `dueDate` ascending then priority descending.
- **pinnedItemsSlice** (max 6) and **pinnedItemsTotal**: tasks where `task.isPinned === 1` (augmented `kind: 'task'`) merged with notes where `note.isPinned === 1` (augmented `kind: 'note'`), sorted by `updatedAt` descending.

Returns `{ isLoading, error, todayEvents, todayTasks, overdueTasksSlice, overdueTasksTotal, upcomingEventsSlice, upcomingEventsTotal, upcomingTasksSlice, upcomingTasksTotal, pinnedItemsSlice, pinnedItemsTotal }`.

Sets `isLoading: true` before firing; sets `isLoading: false` in the `finally` block. Any rejection sets `error` with the caught message string.

Imports `getTasks` from `'../api/tasks.js'`, `getEvents` from `'../api/events.js'`, `getNotes` from `'../api/notes.js'`, and `getTodayISO`, `addDays`, `PRIORITY_RANK` from `'../utils/dashboard-dates.js'`.

**Done when:** Hook can be imported; `isLoading` transitions correctly; all twelve return fields are present; filtering and slicing logic produces correct results when called with mocked API data in a unit test (include a basic Vitest test in `tests/unit/use-dashboard-data.test.js` that mocks the three API modules and verifies slice counts and field presence).
**Commit message:** `feat(dashboard): add useDashboardData hook`

---

### Task 3 — WelcomeHeader component
**File(s):** `client/src/components/WelcomeHeader.jsx`
**What:** Create the `WelcomeHeader` presentational component. It accepts no props. On render, it calls `getGreeting()` and `formatFullDate()` from `'../utils/dashboard-dates.js'` to obtain the greeting string and today's full date string.

Renders:
- A large heading with the greeting text (e.g. `"Good morning"`).
- A secondary line with today's full date (e.g. `"Thursday, 15 May 2026"`).

Styling uses Tailwind classes only; no inline styles. The heading should use `text-2xl font-semibold` or similar, and the date line should be muted (`text-gray-500`).

**Done when:** Component renders without error; heading text matches `getGreeting()` output; date text matches `formatFullDate()` output; no inline styles present; component is the default export.
**Commit message:** `feat(dashboard): add WelcomeHeader component`

---

### Task 4 — WidgetCard shared shell
**File(s):** `client/src/components/WidgetCard.jsx`
**What:** Create the `WidgetCard` shared card shell component used by every Dashboard widget. Props:
- `title` (string) — widget heading text rendered in a `<h2>` or `<h3>`.
- `viewAllTo` (string | null, default null) — react-router-dom `to` path for a "View all" link rendered at the card's bottom. Only rendered when non-null.
- `viewAllLabel` (string, default `"View all"`) — label text for the view-all link.
- `children` (ReactNode) — widget body content.

The card must have: a white background, a border (`border border-gray-200`), rounded corners (`rounded-xl`), consistent padding (`p-4` or `p-5`), and a bottom separator between the heading and body. The "View all" link uses `<Link>` from `react-router-dom` styled as a small muted text link.

**Done when:** Card renders with heading and children; "View all" link appears only when `viewAllTo` is a non-null string; link navigates to the correct path; component is the default export.
**Commit message:** `feat(dashboard): add WidgetCard shared card shell`

---

### Task 5 — TodayAgendaWidget component
**File(s):** `client/src/components/TodayAgendaWidget.jsx`
**What:** Create the `TodayAgendaWidget` component. Props:
- `todayEvents` (object[]) — all today's events (hook passes unsliced list).
- `todayTasks` (object[]) — all today's tasks (hook passes unsliced list).

The widget uses `WidgetCard` with `title="Today's Agenda"` and no `viewAllTo` at the card level (sub-section view-all links are internal).

Renders two labelled sub-sections inside the card body:

**"Events today" sub-section:**
- Slices `todayEvents` to first 5.
- If `todayEvents.length === 0`: renders `"No events today"` paragraph.
- Each event row: formatted start time (via `formatEventTime` from `dashboard-dates.js`), title, and location (if set, muted). The entire row is a `<Link to="/calendar">`.
- If `todayEvents.length > 5`: renders a `"View all"` link to `"/calendar"` below the 5 rows.

**"Tasks due today" sub-section:**
- Slices `todayTasks` to first 5.
- If `todayTasks.length === 0`: renders `"No tasks due today"` paragraph.
- Each task row: title, `<PriorityBadge priority={task.priority} />`, `<StatusBadge status={task.status} />`. The entire row is a `<Link to={`/tasks/${task.id}`}>`.
- If `todayTasks.length > 5`: renders a `"View all tasks"` link to `"/tasks"` below the 5 rows.

Imports `PriorityBadge` from `'./PriorityBadge.jsx'`, `StatusBadge` from `'./StatusBadge.jsx'`, `formatEventTime` from `'../utils/dashboard-dates.js'`, `WidgetCard` from `'./WidgetCard.jsx'`, and `Link` from `'react-router-dom'`.

**Done when:** Both sub-sections render; empty states appear when arrays are empty; event rows link to `/calendar`; task rows link to `/tasks/:id`; "View all" links appear only when more than 5 items exist; component is the default export.
**Commit message:** `feat(dashboard): add TodayAgendaWidget component`

---

### Task 6 — OverdueTasksWidget component
**File(s):** `client/src/components/OverdueTasksWidget.jsx`
**What:** Create the `OverdueTasksWidget` component. Props:
- `tasks` (object[]) — overdue task objects already sorted and sliced to max 5 by the hook.
- `total` (number) — total overdue count before the 5-item cap (used to decide whether to show "View all").

Uses `WidgetCard` with `title="Overdue Tasks"`. Passes `viewAllTo="/tasks"` and `viewAllLabel="View all tasks"` to `WidgetCard` only when `total > 5`.

If `tasks.length === 0`: renders `"You're all caught up."` paragraph (no rows, no "View all").

Each task row:
- Title text.
- Relative due-date label via `formatRelativePastDate(task.dueDate, todayISO)` where `todayISO` is derived by calling `getTodayISO()` once at render time.
- `<PriorityBadge priority={task.priority} />`.
- Entire row is a `<Link to={`/tasks/${task.id}`}>`.

Imports `WidgetCard`, `PriorityBadge`, `Link` from react-router-dom, and `formatRelativePastDate`, `getTodayISO` from `dashboard-dates.js`.

**Done when:** Empty state "You're all caught up." renders when `tasks` is empty; rows render with title, relative date label, and priority badge; "View all" link appears via `WidgetCard` props only when `total > 5`; each row links to `/tasks/:id`; component is the default export.
**Commit message:** `feat(dashboard): add OverdueTasksWidget component`

---

### Task 7 — UpcomingEventsWidget component
**File(s):** `client/src/components/UpcomingEventsWidget.jsx`
**What:** Create the `UpcomingEventsWidget` component. Props:
- `events` (object[]) — upcoming event objects already sorted and sliced to max 5 by the hook.
- `total` (number) — total upcoming event count before the cap.

Uses `WidgetCard` with `title="Upcoming Events"`. Passes `viewAllTo="/calendar"` and `viewAllLabel="View calendar"` only when `total > 5`.

If `events.length === 0`: renders `"No upcoming events."` paragraph.

Each event row:
- Day label: `formatRelativeFutureDate(event.startAt.slice(0, 10), todayISO)` where `todayISO` is derived by calling `getTodayISO()` once at render time.
- HH:MM start time via `formatEventTime(event.startAt)`.
- Title text.
- Location (if set), muted.
- Entire row is a `<Link to="/calendar">`.

Imports `WidgetCard`, `Link`, and `formatRelativeFutureDate`, `formatEventTime`, `getTodayISO` from `dashboard-dates.js`.

**Done when:** Empty state renders when `events` is empty; rows render with day label, time, title, and optional location; "View calendar" link appears via `WidgetCard` props only when `total > 5`; each row links to `/calendar`; component is the default export.
**Commit message:** `feat(dashboard): add UpcomingEventsWidget component`

---

### Task 8 — UpcomingTasksWidget component
**File(s):** `client/src/components/UpcomingTasksWidget.jsx`
**What:** Create the `UpcomingTasksWidget` component. Props:
- `tasks` (object[]) — upcoming task objects already sorted and sliced to max 5 by the hook.
- `total` (number) — total upcoming task count before the cap.

Uses `WidgetCard` with `title="Upcoming Tasks"`. Passes `viewAllTo="/tasks"` and `viewAllLabel="View all tasks"` only when `total > 5`.

If `tasks.length === 0`: renders `"No upcoming tasks."` paragraph.

Each task row:
- Title text.
- Relative due label via `formatRelativeFutureDate(task.dueDate, todayISO)` where `todayISO` is derived once at render time via `getTodayISO()`.
- `<PriorityBadge priority={task.priority} />`.
- Entire row is a `<Link to={`/tasks/${task.id}`}>`.

Imports `WidgetCard`, `PriorityBadge`, `Link`, and `formatRelativeFutureDate`, `getTodayISO` from `dashboard-dates.js`.

**Done when:** Empty state renders when `tasks` is empty; rows render with title, relative date label, and priority badge; "View all tasks" link appears only when `total > 5`; each row links to `/tasks/:id`; component is the default export.
**Commit message:** `feat(dashboard): add UpcomingTasksWidget component`

---

### Task 9 — PinnedItemsWidget component
**File(s):** `client/src/components/PinnedItemsWidget.jsx`
**What:** Create the `PinnedItemsWidget` component. Props:
- `items` (object[]) — combined pinned items (each has `kind: 'note' | 'task'`) already sorted and sliced to max 6 by the hook.
- `total` (number) — total pinned item count before the cap.

The widget is hidden entirely (returns `null`) when `items.length === 0`.

Uses `WidgetCard` with `title="Pinned Items"`. The `viewAllTo` prop is determined as follows:
- If `total <= 6`: pass `viewAllTo={null}` (no link needed).
- If `total > 6` and all items are `kind === 'note'`: pass `viewAllTo="/notes"` and `viewAllLabel="View all notes"`.
- If `total > 6` and all items are `kind === 'task'`: pass `viewAllTo="/tasks"` and `viewAllLabel="View all tasks"`.
- If `total > 6` and items are mixed: pass `viewAllTo={null}` (omit the link per spec).

Each item row:
- `<TypeIcon kind={item.kind} />` from `'./TypeIcon.jsx'`.
- Title text: for `kind === 'note'`, use the first non-empty line of `item.content`; for `kind === 'task'`, use `item.title`.
- Module badge: a small inline pill reading `"Note"` or `"Task"` using Tailwind classes (e.g. `text-xs bg-gray-100 rounded px-1`).
- For `kind === 'note'`: entire row is `<Link to={`/notes/${item.id}`}>`.
- For `kind === 'task'`: entire row is `<Link to={`/tasks/${item.id}`}>`.

Imports `WidgetCard`, `TypeIcon`, `Link`.

**Done when:** Returns `null` when `items` is empty; rows render with icon, title, and badge; correct navigation links on click; "View all" link appears only when appropriate per the mixed/same-kind rules above; component is the default export.
**Commit message:** `feat(dashboard): add PinnedItemsWidget component`

---

### Task 10 — DashboardPage component
**File(s):** `client/src/pages/dashboard-page.jsx`
**What:** Create the top-level `DashboardPage` route component (default export). It calls `useDashboardData()` and owns loading and error states.

Rendering logic:
- While `isLoading` is `true`: render a full-page centered loading indicator (e.g. `"Loading dashboard…"` in muted text or a spinner — match the style used by other pages).
- If `error` is set: render a full-width error banner with the message `"Could not load dashboard data. Please refresh."` using the same `bg-red-50 text-red-700 border border-red-200` style used by `TasksPage` and `NotesPage`.
- Otherwise, render:
  1. `<WelcomeHeader />` at the top.
  2. A responsive two-column grid below it using Tailwind: `grid grid-cols-1 lg:grid-cols-2 gap-6`. The left column contains `<TodayAgendaWidget>` then `<OverdueTasksWidget>`. The right column contains `<UpcomingEventsWidget>`, `<UpcomingTasksWidget>`, then `<PinnedItemsWidget>`.

Pass exactly the props each widget expects as documented in their tasks above.

Wraps content in a `<div className="p-6">` (or equivalent consistent padding with other pages).

Imports all widget components, `WelcomeHeader`, and `useDashboardData`.

**Done when:** Page renders without error when data loads; loading indicator appears while `isLoading` is true; error banner appears when `error` is set; two-column layout collapses to one column on narrow viewports (verify via Tailwind `lg:` prefix); all widgets receive correct props; component is the default export.
**Commit message:** `feat(dashboard): add DashboardPage component`

---

### Task 11 — Routing and Sidebar wiring
**File(s):** `client/src/App.jsx`, `client/src/components/Sidebar.jsx`
**What:** Wire `DashboardPage` into the router and add the Dashboard nav link to the Sidebar.

**`App.jsx` changes:**
1. Add `import DashboardPage from './pages/dashboard-page.jsx'` to the import block.
2. Replace the existing root redirect:
   ```
   <Route path="/" element={<Navigate to="/contacts" replace />} />
   ```
   with:
   ```
   <Route path="/" element={<DashboardPage />} />
   ```
3. Remove the `Navigate` import only if it is no longer used anywhere else in the file (check — it is only used for the root redirect, so remove it).
4. Update the JSDoc routes comment at the top of the file to document `/` → `DashboardPage`.

**`Sidebar.jsx` changes:**
Prepend a new entry to the `NAV_LINKS` array before the `Contacts` entry:
```js
{
  label: 'Dashboard',
  to: '/',
  end: true,
  icon: /* house/grid inline SVG, aria-hidden="true", 16x16, stroke="currentColor" */,
}
```
The `end: true` flag is required so the Dashboard link is not permanently active on every route. The SVG should be a simple house or grid icon consistent with the existing SVG style (stroke-based, no fill, `strokeWidth="1.5"`, `strokeLinecap="round"`).

**Done when:** Navigating to `/` renders `DashboardPage` (not a redirect to `/contacts`); the Sidebar shows "Dashboard" above "Contacts"; the Dashboard link is highlighted only when the route is exactly `/`; all existing routes (`/contacts`, `/notes`, `/tasks`, `/calendar`, `/search`) still resolve correctly; no TypeScript/lint errors.
**Commit message:** `feat(dashboard): wire DashboardPage into routing and add Sidebar link`

---

### Task 12 — Unit tests for dashboard-dates.js
**File(s):** `tests/unit/dashboard-dates.test.js`
**What:** Write a Vitest unit test suite for `client/src/utils/dashboard-dates.js`. Cover every exported function with at least the following cases:

- **`getGreeting`**: mock `Date` (or pass a synthetic date) to verify `"Good morning"` at 06:00, `"Good afternoon"` at 13:00, `"Good evening"` at 20:00, and `"Good evening"` at 02:00 (edge: early-morning maps to evening).
- **`formatFullDate`**: pass a fixed `Date` (e.g. `new Date('2026-05-15T00:00:00')`) and assert the returned string matches `"Friday, 15 May 2026"` (or the locale-correct equivalent).
- **`getTodayISO`**: pass a fixed date and assert the returned string is `"2026-05-15"`.
- **`formatEventTime`**: `"2026-05-15T09:30"` → `"09:30"`; `"2026-05-15T14:05"` → `"14:05"`.
- **`formatRelativePastDate`**: 1 day ago → `"Yesterday"`; 3 days ago → `"3 days ago"`.
- **`formatRelativeFutureDate`**: 1 day ahead → `"Tomorrow"`; 3 days ahead → `"In 3 days"`; 6 days ahead → short weekday + date string (assert it is a non-empty string matching `/^\w{3} \d{1,2}$/`).
- **`addDays`**: `addDays('2026-05-15', 3)` → `'2026-05-18'`; `addDays('2026-12-30', 3)` → `'2027-01-02'` (year-boundary case).
- **`PRIORITY_RANK`**: assert `High > Medium > Low`.

Note: `getGreeting` reads `new Date()` internally. Either spy on the global `Date` constructor with `vi.useFakeTimers()` or refactor `getGreeting` to accept an optional `date` parameter (preferred — also update the implementation in Task 1 accordingly if doing this).

**Done when:** `npm test` passes with all test cases green; no existing tests are broken.
**Commit message:** `test(dashboard): unit tests for dashboard-dates utility`

---

### Task 13 — E2E happy-path test
**File(s):** `tests/e2e/dashboard.spec.js`
**What:** Write a Playwright E2E test suite for the Dashboard page. Seed data via the API in `beforeEach` (create at least one task due today, one overdue task, one upcoming event, one pinned note) and clean up with `afterEach`.

Cover the following cases:

1. **Root route renders Dashboard** — navigate to `/`; assert the page contains a greeting heading (`"Good morning"`, `"Good afternoon"`, or `"Good evening"`) and today's date string (partial match sufficient, e.g. year `"2026"`).
2. **Sidebar Dashboard link is active** — assert the "Dashboard" nav link in the sidebar has the active highlight class when on `/`.
3. **Today's Agenda widget** — assert the `"Today's Agenda"` heading is visible; the task due today appears in the tasks sub-section.
4. **Overdue Tasks widget** — assert the `"Overdue Tasks"` heading is visible; the overdue task seeded in `beforeEach` appears.
5. **Upcoming Events widget** — assert the `"Upcoming Events"` heading is visible; the upcoming event seeded in `beforeEach` appears.
6. **Pinned Items widget** — assert the `"Pinned Items"` heading is visible; the pinned note seeded in `beforeEach` appears.
7. **Navigation from widget row** — click the overdue task row; assert the URL changes to `/tasks/:id`.
8. **Empty states** — delete all seeded tasks and events; navigate to `/`; assert at least one empty-state message (e.g. `"You're all caught up."` or `"No upcoming events."`) is visible.

Use the same API seeding pattern as `tests/e2e/search.spec.js` (direct `fetch` to `http://localhost:3001/api/…` in `beforeEach`/`afterEach`).

**Done when:** All 8 E2E test cases pass; no existing E2E tests are broken; `npm run test:e2e` exits with code 0.
**Commit message:** `test(dashboard): E2E happy-path test with Playwright`

---

## Rules

- Every task has exactly one commit
- No task should take more than 90 minutes
- Task 1 (dashboard-dates.js) must be complete before Tasks 2, 3, 5, 6, 7, 8, and 12 — they all import from it
- Task 2 (useDashboardData) must be complete before Task 10 (DashboardPage)
- Tasks 3–9 (WelcomeHeader and all widget components) must be complete before Task 10 (DashboardPage)
- Task 4 (WidgetCard) must be complete before Tasks 5–9 — all widgets use it
- Task 10 (DashboardPage) must be complete before Task 11 (routing wiring)
- Task 12 (unit tests) is independent of Tasks 3–11 and may be written any time after Task 1
- Task 13 (E2E) must be the last task — it validates the fully wired feature end-to-end
- No server files, no migration files, and no new npm packages are required
