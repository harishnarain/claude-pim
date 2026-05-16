# Dashboard — Technical Design

## Architecture Overview

The Dashboard is a new read-only page that aggregates data from the existing
Tasks, Events, and Notes modules. It introduces no new server-side routes or
database tables. All data is fetched on the client from existing REST endpoints
and filtered in the browser using pure JavaScript date arithmetic.

The page sits at route `/` and replaces the current `<Navigate to="/contacts">`
redirect in `App.jsx`. It follows the same shell layout as every other page:
`TopNavbar` across the top, `Sidebar` on the left, and a scrollable `<main>`
area on the right.

```
┌──────────────── TopNavbar (h-14) ─────────────────────┐
│ PIM                      [ SearchBar ]                │
├────────────┬──────────────────────────────────────────┤
│  Sidebar   │  DashboardPage (flex-1, overflow-y-auto) │
│  w-56      │                                          │
│            │  WelcomeHeader                           │
│  Dashboard │  ┌─────────────┐  ┌──────────────────┐  │
│  Contacts  │  │ TodayAgenda │  │  UpcomingEvents  │  │
│  Notes     │  │  Widget     │  │  Widget          │  │
│  Tasks     │  ├─────────────┤  ├──────────────────┤  │
│  Calendar  │  │ OverdueTasks│  │  UpcomingTasks   │  │
│            │  │  Widget     │  │  Widget          │  │
│            │  └─────────────┘  ├──────────────────┤  │
│            │                   │  PinnedItems     │  │
│            │                   │  Widget          │  │
│            │                   └──────────────────┘  │
└────────────┴──────────────────────────────────────────┘
```

Viewport breakpoints:
- `< 1024 px` (Tailwind `lg`): single-column stack, widgets in document order.
- `>= 1024 px`: two-column grid — left column holds TodayAgenda + OverdueTasks;
  right column holds UpcomingEvents + UpcomingTasks + PinnedItems.

---

## Data Model

No new tables or columns are required. The Dashboard reads from the existing
`tasks`, `events`, and `notes` tables via their existing REST endpoints.

No migration is needed.

---

## API Contract

### Endpoints called by the Dashboard

The Dashboard makes three parallel `GET` requests on mount. There is no new
`/api/dashboard` endpoint.

| Method | Path              | Query params                    | Purpose                         |
|--------|-------------------|---------------------------------|---------------------------------|
| GET    | /api/tasks        | (none)                          | Fetch all tasks for client-side filtering |
| GET    | /api/events       | `start=YYYY-MM-DD&end=YYYY-MM-DD` | Fetch events for a 9-day window (yesterday through +7 days) |
| GET    | /api/notes        | (none)                          | Fetch all notes for pinned filtering |

#### Why fetch all tasks and notes?

The existing `/api/tasks` and `/api/notes` endpoints do not support a
`due_date` range filter or an `is_pinned` filter at the query level. Rather
than adding new query params to those routes (which would be scope creep for
this feature), the Dashboard fetches all records and applies filters
client-side. Record counts for a solo PIM user are expected to remain small
(hundreds, not millions), so this is acceptable.

#### Events window calculation

`GET /api/events` requires `start` and `end` date params. The Dashboard
supplies:

- `start` = today's ISO date (YYYY-MM-DD, local time)
- `end`   = today + 7 days ISO date

This single call returns all events needed for both the "Today's Agenda" widget
(events whose `startAt` date equals today) and the "Upcoming Events" widget
(events whose `startAt` date is between tomorrow and today+7).

### Response shapes (existing, no changes)

**GET /api/tasks** returns `{ data: Task[], error, meta }` where each `Task` has
(after the client's `toCamel` mapper in `client/src/api/tasks.js`):

```
{
  id, title, bodyPreview, dueDate, dueTime,
  priority, status, isPinned, tags,
  createdAt, updatedAt
}
```

**GET /api/events** (with date range) returns `{ data: Item[], error, meta }`
where each item is either an event or a task chip distinguished by `kind`:

```
Event: { id, title, description, location, allDay,
         startAt, endAt, color, createdAt, updatedAt, kind: 'event' }

TaskChip: { id, title, dueDate, dueTime, status,
            priority, isPinned, kind: 'task' }
```

The Dashboard uses only the `kind: 'event'` items from this response. Task
data for the widgets comes from the separate `/api/tasks` call, which carries
`body`, full `status`, and `is_pinned`.

**GET /api/notes** returns `{ data: Note[], error, meta }` where each `Note`
has (after `toCamel`):

```
{ id, content, title, preview, isPinned, tags, createdAt, updatedAt }
```

---

## Component Design (Frontend)

### File layout

```
client/src/
  pages/
    dashboard-page.jsx          ← New: top-level route component
  components/
    WelcomeHeader.jsx           ← New: greeting + date display
    WidgetCard.jsx              ← New: shared card shell (heading, padding, optional "View all" link)
    TodayAgendaWidget.jsx       ← New: today's events + tasks sub-sections
    OverdueTasksWidget.jsx      ← New: overdue tasks list
    UpcomingEventsWidget.jsx    ← New: next 7-day events list
    UpcomingTasksWidget.jsx     ← New: next 7-day tasks list
    PinnedItemsWidget.jsx       ← New: combined pinned notes + tasks
  hooks/
    use-dashboard-data.js       ← New: fetches and slices all dashboard data
  utils/
    dashboard-dates.js          ← New: date/time helper functions
```

### Component descriptions and props

---

#### `DashboardPage` (`pages/dashboard-page.jsx`)

Top-level route component rendered at `/`. Calls `useDashboardData()` and
distributes sliced data to widget components. Owns the loading and error states.

No props (it is a page component).

Responsibilities:
- Call `useDashboardData()` on mount.
- Render a full-page loading indicator while `isLoading` is true.
- Render a full-page error message if `error` is set.
- Render `WelcomeHeader` + the responsive two-column widget grid when data is ready.

---

#### `WelcomeHeader` (`components/WelcomeHeader.jsx`)

Stateless presentational component. Receives no props; derives the greeting and
date from `Date.now()` at render time (no prop needed — the page always
reflects the current time).

```
Props: none
```

Renders:
- Time-of-day greeting string (computed via `getGreeting()` from `dashboard-dates.js`).
- Full date string (computed via `formatFullDate()` from `dashboard-dates.js`).

---

#### `WidgetCard` (`components/WidgetCard.jsx`)

Shared card shell used by every widget. Provides consistent border, background,
padding, and heading style. Accepts an optional "view all" link at the bottom.

```
Props:
  title       {string}       — Widget heading text.
  viewAllTo   {string|null}  — react-router-dom `to` path for "View all" link.
                               Rendered only when non-null.
  viewAllLabel {string}      — Label for the "View all" link (default: "View all").
  children    {ReactNode}    — Widget body content.
```

---

#### `TodayAgendaWidget` (`components/TodayAgendaWidget.jsx`)

Renders two labelled sub-sections: "Events today" and "Tasks due today".

```
Props:
  todayEvents  {object[]}  — Event objects whose startAt date equals today.
  todayTasks   {object[]}  — Task objects whose dueDate equals today and
                             status is not Completed or Cancelled.
```

Each sub-section is capped at 5 items. The cap and "View all" link logic lives
inside this component (not in `WidgetCard`), because the two sub-sections have
independent caps with different navigation targets.

Event row displays: formatted start time (HH:MM), title, optional location.
Clicking navigates to `/calendar`.

Task row displays: title, `PriorityBadge`, `StatusBadge`.
Clicking navigates to `/tasks/:id`.

---

#### `OverdueTasksWidget` (`components/OverdueTasksWidget.jsx`)

Renders a list of overdue tasks (due before today, not Completed/Cancelled).

```
Props:
  tasks  {object[]}  — Overdue task objects, already sorted by dueDate asc
                       then priority desc. Max 5 items passed in (sliced by
                       the hook); total count also passed to show "View all".
  total  {number}    — Total number of overdue tasks (before the 5-item cap)
                       so the component can decide whether to show "View all".
```

Each row displays: title, relative due-date label (e.g. "3 days ago"),
`PriorityBadge`. Clicking navigates to `/tasks/:id`.

Empty state: "You're all caught up."

---

#### `UpcomingEventsWidget` (`components/UpcomingEventsWidget.jsx`)

Renders events whose `startAt` falls between tomorrow and today+7 (inclusive).

```
Props:
  events  {object[]}  — Upcoming event objects, sorted by startAt asc.
  total   {number}    — Total count before the 5-item cap.
```

Each row displays: day label ("Tomorrow" or short weekday + date, e.g.
"Fri 17"), HH:MM start time, title, optional location.
Clicking navigates to `/calendar`.

Empty state: "No upcoming events."

---

#### `UpcomingTasksWidget` (`components/UpcomingTasksWidget.jsx`)

Renders tasks whose `dueDate` falls between tomorrow and today+7 (inclusive)
and whose status is not Completed or Cancelled.

```
Props:
  tasks  {object[]}  — Upcoming task objects, sorted by dueDate asc then
                       priority desc.
  total  {number}    — Total count before the 5-item cap.
```

Each row displays: title, relative due label ("Tomorrow", "In N days", or
short weekday), `PriorityBadge`. Clicking navigates to `/tasks/:id`.

Empty state: "No upcoming tasks."

---

#### `PinnedItemsWidget` (`components/PinnedItemsWidget.jsx`)

Renders combined pinned notes and tasks sorted by `updatedAt` descending.
The widget is hidden entirely when there are no pinned items.

```
Props:
  items  {object[]}  — Combined pinned items, each augmented with a `kind`
                       field ('note' | 'task') and capped at 6.
  total  {number}    — Total count before the 6-item cap.
```

Each row displays: `TypeIcon` (kind), title (first non-empty line of note
content or task title), module badge ("Note" or "Task").

Clicking a note row navigates to `/notes/:id`.
Clicking a task row navigates to `/tasks/:id`.

When `total > 6` and items are mixed kind, the "View all" link is omitted
(requirement: show all 6 without a link if mixed).
When all items are notes, link goes to `/notes`.
When all items are tasks, link goes to `/tasks`.

---

## State Management

No new Zustand store is introduced. All Dashboard state is local to
`DashboardPage` via `useState` and `useEffect`, encapsulated in the
`useDashboardData` custom hook.

### `useDashboardData` hook (`hooks/use-dashboard-data.js`)

```
Returns:
{
  isLoading: boolean,
  error: string | null,
  todayEvents: object[],
  todayTasks: object[],
  overdueTasksSlice: object[],     // max 5
  overdueTasksTotal: number,
  upcomingEventsSlice: object[],   // max 5
  upcomingEventsTotal: number,
  upcomingTasksSlice: object[],    // max 5
  upcomingTasksTotal: number,
  pinnedItemsSlice: object[],      // max 6
  pinnedItemsTotal: number,
}
```

#### Fetch strategy

All three API calls fire in parallel via `Promise.all` using the existing
client API functions (`getTasks`, `getEvents`, `getNotes`). The hook sets
`isLoading: true` before firing and `isLoading: false` in the finally block.
Any rejection sets `error` with the caught message.

```
Promise.all([
  getTasks(),                               // all tasks, default sort
  getEvents({ start: todayISO, end: plusSevenISO }),
  getNotes(),                               // all notes
])
```

The hook derives today's ISO date string once at call time using
`getTodayISO()` from `dashboard-dates.js`.

#### Client-side slicing logic

All filtering, sorting, and capping runs after the three fetches resolve:

**todayEvents**: filter events array where `item.kind === 'event'` and
`item.startAt.slice(0, 10) === todayISO`. Sort ascending by `startAt`.
Take first 5 for `TodayAgendaWidget` (the widget holds its own cap display
logic; the hook passes all matching items and the widget slices to 5 and
shows "View all" when more exist).

**todayTasks**: filter tasks where `task.dueDate === todayISO` and
`task.status !== 'Completed'` and `task.status !== 'Cancelled'`.
Sort by priority descending (High=3, Medium=2, Low=1).

**overdueTasksSlice / overdueTasksTotal**: filter tasks where
`task.dueDate < todayISO` and status not Completed/Cancelled.
Sort by `dueDate` ascending, then priority descending within the same date.
`total` = full count; `slice` = first 5.

**upcomingEventsSlice / upcomingEventsTotal**: filter events where
`item.kind === 'event'` and `item.startAt.slice(0, 10) > todayISO` (already
bounded by the API's `end` param). Sort ascending by `startAt`.
`total` = full count; `slice` = first 5.

**upcomingTasksSlice / upcomingTasksTotal**: filter tasks where
`task.dueDate > todayISO` and `task.dueDate <= plusSevenISO` and status not
Completed/Cancelled. Sort by `dueDate` ascending, then priority descending.
`total` = full count; `slice` = first 5.

**pinnedItemsSlice / pinnedItemsTotal**: collect tasks where
`task.isPinned === 1` (augmented with `kind: 'task'`) and notes where
`note.isPinned === 1` (augmented with `kind: 'note'`). Merge and sort by
`updatedAt` descending. `total` = full count; `slice` = first 6.

#### Priority sort order constant

```js
/** @type {Record<string, number>} */
const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };
```

Defined once in `dashboard-dates.js` and imported by the hook.

---

## Routing

### `App.jsx` changes

1. Replace the existing root redirect:
   ```
   // Remove:
   <Route path="/" element={<Navigate to="/contacts" replace />} />

   // Add:
   <Route path="/" element={<DashboardPage />} />
   ```
2. Import `DashboardPage` from `'./pages/dashboard-page.jsx'`.
3. Remove the now-unused `Navigate` import if it is no longer referenced
   elsewhere (check — it is only used for the root redirect, so it can be
   removed).

### `Sidebar.jsx` changes

Prepend a Dashboard entry to the `NAV_LINKS` constant, before Contacts:

```js
{
  label: 'Dashboard',
  to: '/',
  end: true,           // exact match so '/' does not also highlight on /contacts
  icon: /* house/grid SVG */,
}
```

The `end: true` flag is critical. Without it, NavLink would mark the Dashboard
link active on every route because every path starts with `/`.

---

## Date/Time Utilities (`utils/dashboard-dates.js`)

All time-sensitive logic is centralised in a single utility module so it is
easily testable in isolation.

### `getGreeting(): string`

Returns one of three strings based on local hour:
- 05:00–11:59 → `"Good morning"`
- 12:00–16:59 → `"Good afternoon"`
- 17:00–04:59 → `"Good evening"`

### `formatFullDate(date?: Date): string`

Returns `"Weekday, D Month YYYY"` (e.g. `"Thursday, 15 May 2026"`) using
`Intl.DateTimeFormat` with `{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }`.
No external dependency needed.

### `getTodayISO(date?: Date): string`

Returns today's local date as `"YYYY-MM-DD"`. Uses
`date.toLocaleDateString('en-CA')` which produces ISO format in all browsers.

### `formatEventTime(startAt: string): string`

Extracts the `HH:MM` portion from the `startAt` datetime string
(`startAt.slice(11, 16)`). The `startAt` field from the API is stored as
`YYYY-MM-DDTHH:MM` (no seconds, no timezone suffix) per the existing event
schema, so simple string slicing is correct.

### `formatRelativePastDate(isoDate: string, todayISO: string): string`

Computes days between `isoDate` and `todayISO` (both `YYYY-MM-DD`). Returns:
- `"Yesterday"` for 1 day ago.
- `"N days ago"` for 2+ days ago.

### `formatRelativeFutureDate(isoDate: string, todayISO: string): string`

Computes days between `todayISO` and `isoDate`. Returns:
- `"Tomorrow"` for 1 day ahead.
- `"In N days"` for 2–4 days ahead.
- Short weekday + date (e.g. `"Fri 17"`) for 5–7 days ahead,
  using `Intl.DateTimeFormat` with `{ weekday: 'short', day: 'numeric' }`.

### `addDays(isoDate: string, n: number): string`

Adds `n` days to an ISO date string and returns a new ISO date string.
Implemented with `new Date(isoDate + 'T00:00:00')` plus millisecond arithmetic
to avoid `Date` constructor timezone ambiguity.

### `PRIORITY_RANK`

```js
/** @type {Record<string, number>} Map of priority label to sort weight. */
export const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };
```

---

## Error Handling Strategy

- `useDashboardData` catches any error from `Promise.all` and stores the
  message in its `error` state field.
- `DashboardPage` checks `error` and renders a full-width error banner:
  `"Could not load dashboard data. Please refresh."` in the same red-50
  banner style used by `TasksPage` and `NotesPage`.
- Individual widget components receive already-resolved data and have no
  error state of their own.
- Empty states ("No events today", "You're all caught up.", etc.) are rendered
  inside each widget component as plain text paragraphs, not error states.

---

## Security Considerations

- The Dashboard makes only `GET` requests and renders no forms, so there is
  no CSRF or injection surface introduced.
- All displayed text is rendered as React children (not `dangerouslySetInnerHTML`),
  so XSS from stored content is already mitigated by React's escaping.
- No user input is collected on this page.
- Date arithmetic uses only trusted `Date.now()` values and ISO strings
  already validated by the server before storage; no user-controlled strings
  enter any date computation.

---

## Checklist of Files to Create or Modify

| Action | File |
|--------|------|
| Create | `client/src/pages/dashboard-page.jsx` |
| Create | `client/src/components/WelcomeHeader.jsx` |
| Create | `client/src/components/WidgetCard.jsx` |
| Create | `client/src/components/TodayAgendaWidget.jsx` |
| Create | `client/src/components/OverdueTasksWidget.jsx` |
| Create | `client/src/components/UpcomingEventsWidget.jsx` |
| Create | `client/src/components/UpcomingTasksWidget.jsx` |
| Create | `client/src/components/PinnedItemsWidget.jsx` |
| Create | `client/src/hooks/use-dashboard-data.js` |
| Create | `client/src/utils/dashboard-dates.js` |
| Modify | `client/src/App.jsx` — replace root redirect, import DashboardPage |
| Modify | `client/src/components/Sidebar.jsx` — prepend Dashboard nav link |

No server files, no migration files, and no new npm packages are required.

---

Design draft complete. Please review and say "design approved" to proceed to task breakdown.
