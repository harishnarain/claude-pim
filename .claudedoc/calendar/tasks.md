# Calendar — Implementation Tasks

## Task List

---

### Task 1 — Database migration: add due_time to tasks and create events table
**File(s):** `db/migrations/004_add_event_and_task_time.sql`
**What:** Write the migration SQL exactly as specified in design.md:
- `ALTER TABLE tasks ADD COLUMN due_time TEXT;`
- `CREATE TABLE IF NOT EXISTS events (...)` with all columns: id, title, description, location, all_day, start_at, end_at, color, created_at, updated_at
- Three indexes: `idx_events_start_at`, `idx_events_end_at`, `idx_events_range`

The migration runner in `server/db.js` auto-applies any new file in `db/migrations/` on server start; no changes to the runner are needed.
**Done when:** Server starts without error; `due_time` column exists in the `tasks` table; `events` table exists with all columns and indexes visible via `.schema events` in SQLite
**Commit message:** `chore(db): add events table and due_time column migration (004)`

---

### Task 2 — Update task model to include due_time
**File(s):** `server/models/task.js`
**What:** Extend the existing model to handle the new `due_time` column:
- Add `"due_time"` to `ALLOWED_COLUMNS` inside the `update()` function so PATCH queries include it
- Update the `create()` INSERT statement to include `due_time` in the column list and `@due_time` in the VALUES list; pass `fields.due_time ?? null` in the `stmt.run()` object
- Update `findById()` SELECT to include `due_time` in the column list
- Update the JSDoc for `create`, `findById`, and `update` to document the new field

`findAll()` does not need to return `due_time` — the calendar window endpoint fetches tasks directly and selects only the fields needed for chip rendering.
**Done when:** `Task.create({ title: 'x', due_time: '09:30' })` returns an object with `due_time: '09:30'`; `Task.findById(id)` includes `due_time`; `Task.update(id, { due_time: '14:00' })` persists the change
**Commit message:** `feat(tasks): add due_time to task model create, findById, and update`

---

### Task 3 — Update task routes to validate and pass due_time
**File(s):** `server/routes/tasks.js`
**What:** Wire `due_time` through the route layer:
- Add a `TIME_PATTERN` constant: `/^\d{2}:\d{2}$/`
- In `validateTaskFields()`: add a `due_time` parameter and validate it — when present and non-null it must match `TIME_PATTERN` with the hour component 00–23 and the minute component 00–59; return `errors.due_time` on failure
- Update the `validateTaskFields` signature comment (JSDoc)
- In `POST /api/tasks`: destructure `due_time` from `req.body`; pass it to `validateTaskFields`; pass it to `Task.create()`
- In `PATCH /api/tasks/:id`: destructure `due_time` from `req.body`; pass it to `validateTaskFields`; include `due_time` in `updateFields` when it is present (allow explicit `null` to clear the field)
**Done when:** `POST /api/tasks` with `"due_time": "25:00"` returns 422; `POST` with `"due_time": "09:30"` returns 201 and the response body includes `due_time: "09:30"`; `PATCH` with `"due_time": null` clears the field
**Commit message:** `feat(tasks): validate and pass due_time through task routes`

---

### Task 4 — Register events router in server entry point
**File(s):** `server/index.js`
**What:** Import the (not-yet-created) events router and mount it:
- Add `import eventsRouter from './routes/events.js';` alongside the other router imports
- Add `app.use('/api/events', eventsRouter);` after the tasks router line, with a matching comment

This task is done before `server/models/event.js` and `server/routes/events.js` exist; the server will fail to start until Task 5 and 6 are complete, but the registration must be committed first so subsequent tasks have a clear diff to review.

NOTE: The implementer should create a temporary stub `server/routes/events.js` that exports a bare Express `Router()` with no routes so the server starts cleanly. The stub will be replaced in Task 6.
**Done when:** `server/index.js` imports and mounts `eventsRouter`; the server starts without crashing (stub router in place)
**Commit message:** `chore(server): register /api/events router`

---

### Task 5 — Event model: CRUD operations
**File(s):** `server/models/event.js`
**What:** Create the event model following the same patterns as `server/models/task.js`:
- `create(fields)` — INSERT with `@title, @description, @location, @all_day, @start_at, @end_at, @color`; returns `findById(lastInsertRowid)`
- `findAll({ start, end })` — SELECT events where `start_at <= end + 'T23:59'` AND `end_at >= start + 'T00:00'` (date-range overlap); returns all columns in camelCase-friendly snake_case
- `findById(id)` — SELECT all columns WHERE `id = ?`; returns the row or `undefined`
- `update(id, fields)` — dynamic SET via `ALLOWED_COLUMNS` whitelist (`['title', 'description', 'location', 'all_day', 'start_at', 'end_at', 'color']`); always appends `updated_at = datetime('now')`; returns `findById(id)`
- `destroy(id)` — DELETE WHERE `id = ?`; returns `{ deleted: info.changes > 0 }`
- All queries use parameterised statements (better-sqlite3 named or positional params)
- JSDoc on every exported function
**Done when:** All five functions are exported and work against the live DB when called directly from a Node REPL
**Commit message:** `feat(calendar): add event model with CRUD and date-range query`

---

### Task 6 — Event routes: full REST implementation (replaces stub)
**File(s):** `server/routes/events.js`
**What:** Replace the stub from Task 4 with the full router. Follow the same structure as `server/routes/tasks.js`:
- Local helpers: `ok(data, meta)`, `fail(code, fields)`, `parseId(param)`, `isValidDate(value)`
- `VALID_COLORS` constant: `new Set(['blue','green','red','yellow','purple','pink','orange','grey'])`
- `DATETIME_PATTERN` constant: `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/`
- `DATE_PATTERN` constant: `/^\d{4}-\d{2}-\d{2}$/`
- `validateEventFields(fields, requireAll)` — validates `title` (required when `requireAll`, max 255), `description` (optional, max 10 000), `location` (optional, max 255), `allDay` (optional boolean), `startAt` (required when `requireAll`, matches `DATETIME_PATTERN`, valid date), `endAt` (required when `requireAll`, same, >= startAt), `color` (optional, must be in `VALID_COLORS`)
- `GET /api/events` — validates `start` and `end` query params (both required, `DATE_PATTERN`, valid date); calls `Event.findAll({ start, end })` for appointments; calls a direct DB query to select task chip fields (`id, title, due_date, due_time, status, priority, is_pinned`) from `tasks` WHERE `due_date BETWEEN ? AND ?`; merges both arrays adding `kind: 'event'` or `kind: 'task'`; camelCase-converts task rows before returning; responds with `{ data, error: null, meta: { count, start, end } }`; returns 422 `MISSING_PARAMS` if params absent
- `POST /api/events` — validates with `requireAll=true`; calls `Event.create(...)`; returns 201
- `GET /api/events/:id` — returns 404 if not found; returns the event object (no `kind` field)
- `PATCH /api/events/:id` — validates with `requireAll=false`; calls `Event.update(...)`; returns 200
- `DELETE /api/events/:id` — returns 404 if not found; calls `Event.destroy(id)`; returns `{ deleted: true }`
- All snake_case DB columns must be converted to camelCase in responses (`all_day` → `allDay`, `start_at` → `startAt`, `end_at` → `endAt`, `created_at` → `createdAt`, `updated_at` → `updatedAt`)
**Done when:** All five endpoints respond correctly; GET with missing `start`/`end` returns 422; POST with invalid `color` returns 422; POST with `endAt` before `startAt` returns 422; DELETE returns `{ deleted: true }`
**Commit message:** `feat(calendar): add full events REST routes`

---

### Task 7 — Update tasks API client to handle due_time
**File(s):** `client/src/api/tasks.js`
**What:** Add `due_time` ↔ `dueTime` mapping to the existing thin client:
- In `toCamel()`: add `dueTime: task.due_time`
- In `toSnake()`: add `if (task.dueTime !== undefined) result.due_time = task.dueTime;`

No other changes — `getTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask` function signatures remain unchanged.
**Done when:** `toCamel({ due_time: '09:30' })` returns an object with `dueTime: '09:30'`; `toSnake({ dueTime: '14:00' })` returns `{ due_time: '14:00' }`
**Commit message:** `feat(tasks): map due_time <-> dueTime in tasks API client`

---

### Task 8 — Update tasksStore to pass dueTime through createTask and updateTask
**File(s):** `client/src/store/tasksStore.js`
**What:** The store calls `apiCreateTask(data)` and `apiUpdateTask(id, data)` with camelCase objects. Since `toSnake` now handles `dueTime`, the store already works correctly — no behavioral change is needed. However, update the JSDoc for `createTask` and `updateTask` to document the new optional `dueTime` field so the implementer of `TaskForm` knows the shape.

Also update `_deriveDisplayed` — this function does not sort by `dueTime`, so no logic changes are needed. Just confirm no `due_time` raw key leaks through by checking `toCamel` is always applied before items enter the store.

If the store's `fetchTasks` or `fetchTask` was calling `toCamel` indirectly (via `api/tasks.js`), this task is a documentation-only commit. If any store function directly references `due_date` (raw), fix it to use `dueDate`.
**Done when:** A task created with `dueTime: '10:00'` round-trips correctly through the store — `createTask` returns an object with `dueTime`, `updateTask` persists the value, `selectedTask` reflects `dueTime` after `fetchTask`
**Commit message:** `feat(tasks): document and verify dueTime flows through tasksStore`

---

### Task 9 — Add Due Time input to TaskForm
**File(s):** `client/src/components/TaskForm.jsx`
**What:** Add an optional "Due Time" time input rendered only when `dueDate` is non-empty:
- Read `dueTime: task?.dueTime ?? ''` from props
- After the "Due Date" `<div>` block, add a new `<div>` conditionally rendered when `dueDate !== ''`
- The new input is `<input type="time" id="task-due-time" value={dueTime} ...>` with label "Due Time", `aria-label="Due time"`, `onChange={(e) => handleChange('dueTime', e.target.value)}`, and `onBlur={onBlur}`
- Apply the same Tailwind classes as the existing date input for visual consistency
- If `dueDate` is cleared (set to `''`), the "Due Time" section disappears; the parent's `handleFormChange` is responsible for clearing `dueTime` when `dueDate` is cleared (document this in a JSDoc note on the component)
**Done when:** The Due Time field appears when a due date is set, disappears when due date is cleared, and its value round-trips through `onChange` as `{ dueTime: 'HH:MM' }`
**Commit message:** `feat(tasks): add Due Time input to TaskForm (shown when due date is set)`

---

### Task 10 — Events API client
**File(s):** `client/src/api/events.js`
**What:** Create a new API client module following the exact same pattern as `client/src/api/tasks.js`:
- `BASE_URL = '/api/events'`
- `toCamelEvent(event)` — maps all snake_case event fields to camelCase: `allDay: event.all_day`, `startAt: event.start_at`, `endAt: event.end_at`, `createdAt: event.created_at`, `updatedAt: event.updated_at`; passes through `id, title, description, location, color` unchanged
- `toCamelTask(task)` — maps task chip fields: `dueDate: task.due_date`, `dueTime: task.due_time`, `isPinned: task.is_pinned`; passes through `id, title, status, priority` unchanged; adds `kind: 'task'`
- `toSnakeEvent(event)` — maps camelCase inputs to snake_case for POST/PATCH bodies: `all_day`, `start_at`, `end_at`; only includes defined keys
- `apiFetch(url, init)` — same throw-on-non-2xx pattern as `api/tasks.js`
- `getEvents({ start, end })` — GET `/api/events?start=&end=`; maps each item through `toCamelEvent` (for `kind === 'event'` items) or `toCamelTask` (for `kind === 'task'` items); returns the merged array
- `getEvent(id)` — GET `/api/events/:id`; maps through `toCamelEvent`; returns single event
- `createEvent(event)` — POST `/api/events`; body via `toSnakeEvent`; maps response via `toCamelEvent`; returns created event
- `updateEvent(id, event)` — PATCH `/api/events/:id`; body via `toSnakeEvent`; maps response via `toCamelEvent`; returns updated event
- `deleteEvent(id)` — DELETE `/api/events/:id`; returns raw `data` (`{ deleted: true }`)
- JSDoc on every exported function
**Done when:** All six exported functions are present with correct signatures; `toCamelEvent` correctly converts all field names; `toSnakeEvent` only serialises defined fields
**Commit message:** `feat(calendar): add events API client`

---

### Task 11 — Calendar layout utility
**File(s):** `client/src/utils/calendar-layout.js`
**What:** Implement the pure overlap layout function described in the design:

`layoutItems(items)` — accepts an array of calendar items (events and tasks with `startAt`/`endAt` or `dueDate`/`dueTime`), returns the same array with each item annotated with `{ lane, laneCount }`:
1. Sort items by `startAt` ascending, then `endAt` descending (longer events first)
2. Group into overlap clusters: an item joins an existing cluster if its `startAt` < the cluster's current max `endAt`; otherwise it starts a new cluster
3. Within each cluster, greedily assign each item to the first available lane (a lane is free if its last item's `endAt` <= the new item's `startAt`)
4. Annotate each item with `lane` (0-based index) and `laneCount` (total lanes in the cluster)

Also export two helper functions used by `CalendarPage` and `DayWeekGrid`:
- `getWindowBounds(currentDate, activeView)` — given an ISO date string and a view string (`'day'|'workweek'|'week'|'month'`), returns `{ windowStart: 'YYYY-MM-DD', windowEnd: 'YYYY-MM-DD' }` per the design table; for `month` view, extends the window to include the leading/trailing days needed to fill the first and last display weeks (up to 42 days total)
- `getViewColumns(currentDate, activeView)` — returns an array of `Date` objects for the columns to render (1 for day, 5 for workweek Mon–Fri, 7 for week Sun–Sat, N for month)

All three functions are pure (no side effects, no imports from outside the utils directory).
**Done when:** All three functions are exported; `layoutItems` with two non-overlapping items returns `laneCount: 1` for each; with two overlapping items returns `laneCount: 2` and `lane: 0` / `lane: 1`; `getWindowBounds('2026-05-07', 'week')` returns the Sunday–Saturday window containing May 7
**Commit message:** `feat(calendar): add calendar-layout utility (layoutItems, getWindowBounds, getViewColumns)`

---

### Task 12 — Calendar layout unit tests
**File(s):** `tests/unit/calendar-layout.test.js`
**What:** Write Vitest unit tests for `client/src/utils/calendar-layout.js`:
- `layoutItems` — non-overlapping items each get `laneCount: 1`; two fully-overlapping items get `laneCount: 2` with `lane: 0` and `lane: 1`; three items where two overlap and one is independent each get the correct laneCount; empty array returns empty array
- `getWindowBounds` — day view: start === end === currentDate; workweek view: start is the Monday of the week, end is the Friday; week view: start is the Sunday, end is the Saturday; month view: window covers the full display grid (first day is a Sunday on or before the 1st, last day is a Saturday on or after the last day of the month)
- `getViewColumns` — day view returns 1 Date; workweek view returns 5 Dates (Mon–Fri); week view returns 7 Dates (Sun–Sat); month view returns the correct number of cells

Use Vitest `describe`/`it`/`expect` — no mocking needed (pure functions).
**Done when:** `npm test` passes with all calendar-layout tests green; no existing tests broken
**Commit message:** `test(calendar): unit tests for calendar-layout utility`

---

### Task 13 — Calendar Zustand store
**File(s):** `client/src/store/calendarStore.js`
**What:** Create the `useCalendarStore` Zustand store as specified in the design. Follow the same `create((set, get) => ...)` pattern as `client/src/store/tasksStore.js`:

State:
- `activeView` — initialised from `localStorage.getItem('calendar_view') ?? 'week'`
- `currentDate` — ISO date string, initialised to today (`new Date().toISOString().slice(0, 10)`)
- `windowStart` / `windowEnd` — derived from `currentDate` + `activeView` using `getWindowBounds` from `calendar-layout.js`; recomputed whenever either changes
- `items` — `[]`; merged events+tasks for the current window
- `isLoading` — `false`
- `error` — `null`
- `selectedEvent` — `null`
- `isSaving` — `false`
- `saveStatus` — `'idle'`

Actions (all per the design doc):
- `setActiveView(view)` — updates `activeView`, persists to `localStorage`, recomputes `windowStart`/`windowEnd`, calls `fetchWindow()`
- `setCurrentDate(dateStr)` — updates `currentDate`, recomputes window, calls `fetchWindow()`
- `goToToday()` — sets `currentDate` to today ISO string, calls `fetchWindow()`
- `goPrev()` / `goNext()` — decrement/increment `currentDate` by the current view's unit (1 day / 1 week / 1 month); call `fetchWindow()`
- `fetchWindow()` — calls `getEvents({ start: windowStart, end: windowEnd })`; sets `isLoading` around it; on success sets `items`; on failure sets `error`
- `fetchEvent(id)` — calls `getEvent(id)`; sets `selectedEvent`
- `createEvent(data)` — calls `createEvent(data)` from api; prepends to `items`; returns created event
- `updateEvent(id, data)` — calls `updateEvent(id, data)`; updates matching item in `items` and `selectedEvent`; manages `isSaving`/`saveStatus` with 2-second idle reset
- `deleteEvent(id)` — calls `deleteEvent(id)`; removes from `items`
- `setSelectedEvent(event)` — sets directly without API call

JSDoc on the store and each action.
**Done when:** `useCalendarStore.getState().fetchWindow()` resolves without error when the server is running; `goNext()` changes `currentDate` and `windowStart`/`windowEnd` correctly for each view
**Commit message:** `feat(calendar): add useCalendarStore with all state and actions`

---

### Task 14 — ColorPicker component
**File(s):** `client/src/components/ColorPicker.jsx`
**What:** Create the 8-swatch color picker component per the design:
- Export a `COLOR_PALETTE` constant (array of `{ key, label, bg, ring }` objects) for the 8 colors: blue, green, red, yellow, purple, pink, orange, grey — mapping each key to a Tailwind `bg-*` class and a `ring-*` focus/selected class
- The component renders a row of 8 circular swatches (`<button>` elements)
- The currently selected swatch shows a `ring-2 ring-offset-2` outline
- Clicking a swatch calls `onChange(colorKey)`
- Props: `value: string`, `onChange: (colorKey) => void`
- `aria-label` on each swatch button: e.g. `"Select blue color"`; `aria-pressed` for the selected state
- No inline styles — Tailwind classes only
**Done when:** The component renders 8 swatches; clicking one calls `onChange` with the correct key; the selected swatch is visually distinguished
**Commit message:** `feat(calendar): add ColorPicker component with 8-color palette`

---

### Task 15 — CalendarToolbar component
**File(s):** `client/src/components/CalendarToolbar.jsx`
**What:** Create the toolbar with view tabs, navigation arrows, date range label, and Today button per the design props contract:
- Props: `activeView`, `onViewChange`, `currentDate` (Date object), `onPrev`, `onNext`, `onToday`
- Four view tab buttons: Day, Work Week, Week, Month — the active tab is highlighted (`bg-blue-100 text-blue-700`); clicking calls `onViewChange(viewKey)`
- Prev/Next arrow buttons (SVG chevrons) call `onPrev` / `onNext`
- Today button calls `onToday`
- Date range label: a human-readable string derived from `currentDate` and `activeView` (e.g. "May 4–10, 2026" for week view, "May 2026" for month view, "May 7, 2026" for day view)
- Tailwind styling consistent with existing toolbars (gray border bottom, white background, flex layout)
- No state — purely presentational; all interaction via callbacks
**Done when:** The toolbar renders all controls; tab clicks fire `onViewChange` with the correct view key; the date label updates when `currentDate` changes
**Commit message:** `feat(calendar): add CalendarToolbar component`

---

### Task 16 — TimeColumn component
**File(s):** `client/src/components/TimeColumn.jsx`
**What:** Create the left-hand hour-labels column for day/week views:
- Renders 24 rows, one per hour (00:00 through 23:00), each with a fixed height of 60px (matching the slot height used by `DayColumn`)
- Labels are formatted as `"12 AM"`, `"1 PM"`, etc. (12-hour format with AM/PM)
- The current hour row has a subtle highlight (e.g. light blue background)
- No props — the 24 rows are fixed
- Tailwind classes only; `text-xs text-gray-400` for label text
**Done when:** The component renders 24 labeled rows each 60px tall; the component mounts without errors
**Commit message:** `feat(calendar): add TimeColumn component with 24-hour labels`

---

### Task 17 — EventChip component
**File(s):** `client/src/components/EventChip.jsx`
**What:** Create the appointment chip rendered inside DayColumn and AllDayBanner per the design props contract:
- Props: `event: { id, title, startAt, endAt, color, allDay }`, `style: object`, `onClick: () => void`, `onDelete: () => void`
- The chip background uses a color-to-Tailwind map keyed by `event.color` (import `COLOR_PALETTE` from `ColorPicker.jsx` or define an equivalent local map)
- Shows the event title and, for timed events, a formatted time range (`"9:00–9:30 AM"`)
- A small delete icon button (`×` or SVG trash) is visible on hover; clicking it calls `onDelete()`; the chip itself (excluding delete button) calls `onClick()` on click
- `style` prop is spread as `style={style}` for the overlap positioning set by `DayColumn`
- `role="button"` and `tabIndex={0}` for accessibility; `onKeyDown` handles Enter/Space → `onClick`
- No inline color values — use Tailwind classes derived from `event.color`; for non-Tailwind-purge-safe dynamic classes, maintain an explicit map object
**Done when:** The chip renders with the correct background color; clicking the chip body calls `onClick`; clicking delete calls `onDelete`; `style` prop correctly positions the chip
**Commit message:** `feat(calendar): add EventChip component`

---

### Task 18 — TaskChip component
**File(s):** `client/src/components/TaskChip.jsx`
**What:** Create the task chip component, visually distinct from EventChip:
- Props: `task: { id, title, dueDate, dueTime, status, priority }`, `style: object`, `onClick: () => void`
- Renders a small checkbox icon (inline SVG, unchecked square) on the left, then the task title
- Background: white with a left-side colored border (e.g. `border-l-4 border-blue-400 bg-white`) to distinguish from event chips
- For timed tasks, show the formatted time (e.g. `"2:00 PM"`) below the title in `text-xs`
- No delete action — clicking the chip calls `onClick()` which navigates to `/tasks/:id`
- `style` prop spread for positioning (same as `EventChip`)
- `role="button"` and `tabIndex={0}`; `onKeyDown` Enter/Space → `onClick`
**Done when:** The chip renders with a checkbox icon; clicking calls `onClick`; `style` prop is applied; the component is visually distinct from EventChip
**Commit message:** `feat(calendar): add TaskChip component`

---

### Task 19 — AllDayBanner component
**File(s):** `client/src/components/AllDayBanner.jsx`
**What:** Create the sticky banner row rendered above the timed grid in day/week views:
- Props: `columns: Date[]`, `items: object[]` (all-day events and tasks with no `dueTime`), `onEventClick: (event) => void`, `onTaskClick: (task) => void`, `onEventDelete: (eventId) => void`
- For each column date, filter `items` to those that fall on that date (`allDay === true` for events; `dueDate === dateStr && !dueTime` for tasks)
- Renders `EventChip` (with `style={{}}`) for events and `TaskChip` (with `style={{}}`) for tasks in each column slot
- A thin left spacer aligns the banner with the `TimeColumn` width (fixed 48px / `w-12`)
- Sticky positioning: `sticky top-0 z-10 bg-white border-b border-gray-200`
- If no all-day items exist, the banner still renders (empty, minimal height) to preserve grid alignment
**Done when:** All-day events and timeless tasks render in the correct column; the banner sticks to the top of its scroll container
**Commit message:** `feat(calendar): add AllDayBanner component`

---

### Task 20 — DayColumn component
**File(s):** `client/src/components/DayColumn.jsx`
**What:** Create the single-day timed-slot column per the design props contract:
- Props: `date: Date`, `items: object[]`, `onSlotClick: (date, hour) => void`, `onEventClick: (event) => void`, `onTaskClick: (task) => void`, `onEventDelete: (eventId) => void`
- Renders 24 one-hour slot divs, each `h-[60px]`; clicking an empty slot calls `onSlotClick(date, hour)`; slot has a subtle hover background
- Filters `items` to timed events (`allDay === false`) and timed tasks (`dueTime` present); passes them through `layoutItems()` from `calendar-layout.js` to get `{ lane, laneCount }`
- Renders `EventChip` and `TaskChip` positioned absolutely within a `relative` container; computes `style` from `{ lane, laneCount, startAt, endAt }`:
  - `top`: `(startHour + startMin/60) * 60` px
  - `height`: `duration_in_minutes / 60 * 60` px (min 30px)
  - `left`: `lane / laneCount * 100%`
  - `width`: `1 / laneCount * 100%`
- The entire column is `relative overflow-hidden`
**Done when:** Events render at the correct vertical position; two overlapping events render side-by-side with correct `left`/`width`; clicking an empty slot fires `onSlotClick` with the correct hour
**Commit message:** `feat(calendar): add DayColumn component with overlap layout`

---

### Task 21 — DayWeekGrid component
**File(s):** `client/src/components/DayWeekGrid.jsx`
**What:** Create the scrollable timed grid container used by Day, Work Week, and Week views:
- Props: `columns: Date[]`, `items: object[]`, `onSlotClick`, `onEventClick`, `onTaskClick`, `onEventDelete`
- Renders `AllDayBanner` at the top, then a scrollable `div` containing a flex row of: `TimeColumn` on the left, then one `DayColumn` per date in `columns`
- Distributes `items` to each `DayColumn` by matching `startAt.slice(0, 10)` (for events) or `dueDate` (for tasks) against the column's date ISO string
- The scroll container starts scrolled to 08:00 on mount (`scrollTop = 8 * 60` px via `useEffect` with a `ref`)
- Each `DayColumn` has `flex-1 min-w-0` for equal-width columns; `TimeColumn` has fixed width `w-12`
- The outer div uses `overflow-y-auto` to allow vertical scrolling within the main area
**Done when:** Columns render side by side; the view auto-scrolls to 8 AM on mount; items route to the correct DayColumn
**Commit message:** `feat(calendar): add DayWeekGrid component`

---

### Task 22 — MonthGrid component
**File(s):** `client/src/components/MonthGrid.jsx`
**What:** Create the month grid view:
- Props: `currentDate: Date`, `items: object[]`, `onDayClick: (date) => void`, `onEventClick: (event) => void`, `onTaskClick: (task) => void`, `onEventDelete: (eventId) => void`
- Uses `getViewColumns(currentDate, 'month')` from `calendar-layout.js` to get the array of Date objects for the grid (up to 42 cells, Sunday-anchored)
- Renders a 7-column CSS grid; a header row with day-of-week labels (Sun–Sat)
- Each cell shows the day number; today's date has a highlighted circle; days outside the current month are in muted text
- For each cell, filters `items` by date and renders up to 3 chips (EventChip for events, TaskChip for tasks) with an "+N more" link if count > 3; clicking a cell calls `onDayClick(date)` (switches to Day view)
- Clicking a chip calls `onEventClick` or `onTaskClick`; delete icon on EventChip calls `onEventDelete`
- No absolute positioning needed — chips flow naturally inside each cell
**Done when:** The month grid renders 5 or 6 weeks; today is highlighted; items appear on the correct dates; "+N more" shows when there are more than 3 items
**Commit message:** `feat(calendar): add MonthGrid component`

---

### Task 23 — CalendarGrid component
**File(s):** `client/src/components/CalendarGrid.jsx`
**What:** Create the dispatcher component that renders either `DayWeekGrid` or `MonthGrid` based on `activeView`:
- Props: `activeView`, `currentDate: Date`, `items: object[]`, `onSlotClick`, `onEventClick`, `onTaskClick`, `onEventDelete`, `onDayClick`
- When `activeView === 'month'`: renders `<MonthGrid currentDate={currentDate} items={items} onDayClick={onDayClick} onEventClick={onEventClick} onTaskClick={onTaskClick} onEventDelete={onEventDelete} />`
- Otherwise (day/workweek/week): calls `getViewColumns(currentDate, activeView)` to get `columns: Date[]`; renders `<DayWeekGrid columns={columns} items={items} onSlotClick={onSlotClick} onEventClick={onEventClick} onTaskClick={onTaskClick} onEventDelete={onEventDelete} />`
- No local state; purely a dispatcher
**Done when:** Switching `activeView` between all four values renders the correct sub-component; props flow through correctly
**Commit message:** `feat(calendar): add CalendarGrid dispatcher component`

---

### Task 24 — QuickCreateForm component
**File(s):** `client/src/components/QuickCreateForm.jsx`
**What:** Create the inline quick-create form per the design props contract:
- Props: `initialDate: Date`, `initialHour: number | null`, `onSave: (event) => void`, `onExpand: (eventId) => void`, `onClose: () => void`
- Controlled form with: title input (text, required, maxLength=255), all-day toggle (checkbox), start/end time inputs (hidden when allDay is true); ColorPicker
- Pre-fills `startAt` from `initialDate` + `initialHour`; `endAt` defaults to `startAt + 1 hour`; `allDay` defaults to `initialHour === null`
- "Save" button: validates title non-empty; calls `createEvent(data)` from the calendar store; on success calls `onSave(createdEvent)`; on error shows an inline error message
- "Expand" button: same create logic; on success calls `onExpand(createdEvent.id)`
- "Cancel" button calls `onClose()`
- Shows an inline error message on API failure (not a modal)
- Displays a loading state on the Save/Expand buttons while `isSaving`
**Done when:** The form pre-fills the correct date/time from props; Save creates an event and calls `onSave`; Expand creates an event and calls `onExpand`; an API error shows an inline message; Cancel closes without creating
**Commit message:** `feat(calendar): add QuickCreateForm inline event creation component`

---

### Task 25 — EventForm component
**File(s):** `client/src/components/EventForm.jsx`
**What:** Create the full controlled form for all appointment fields, used inside `EventEditorPage`:
- Props: `event: object | null`, `onChange: (changedFields) => void`, `onBlur: () => void`, `errors: object` (per-field validation errors from the API, keyed by field name)
- Controlled inputs for: title (text, maxLength=255, required), description (textarea, maxLength=10000), location (text, maxLength=255), allDay (checkbox), startAt (datetime-local input), endAt (datetime-local input), color (ColorPicker component)
- When `allDay` is toggled to true, set start time to `T00:00` and end time to `T23:59` automatically
- Character counters on title and description (same pattern as `TaskForm`)
- Per-field error messages: if `errors.title` is set, show it below the title input in `text-xs text-red-600`; same for `startAt`, `endAt`, `color`, etc.
- Calls `onChange({ fieldName: newValue })` on each field change (same pattern as `TaskForm`)
- `onBlur` called on any field blur
**Done when:** All fields render as controlled inputs; ColorPicker is wired to `onChange`; per-field errors display correctly; allDay toggle adjusts the time fields
**Commit message:** `feat(calendar): add EventForm component for full event editing`

---

### Task 26 — EventEditorPage
**File(s):** `client/src/pages/EventEditorPage.jsx`
**What:** Create the full event detail/edit page following the same create-first pattern as `TaskEditorPage`:
- Route: `/calendar/events/:id` — always edit mode (there is no `/new` route; events are always created first via `QuickCreateForm`)
- On mount: calls `fetchEvent(id)` from `useCalendarStore`; if the event is not found (404 or null `selectedEvent` after loading), redirects to `/calendar` with `router state: { toast: 'Event not found.' }`
- Local state `localEvent` mirrors `selectedEvent`; debounced auto-save (800ms) on field change, same pattern as `TaskEditorPage`
- Renders a toolbar row with: back button (navigates to `/calendar`), save status badge (`'saving' | 'saved' | 'error'`), and delete button
- Delete button opens a `ConfirmDialog`; on confirm calls `deleteEvent(id)` then navigates to `/calendar`
- Main content area: `<EventForm event={localEvent} onChange={handleFormChange} onBlur={handleFormBlur} errors={fieldErrors} />`
- On `saveStatus === 'error'`, parse `error` for per-field messages if the API returned a 422 `VALIDATION_ERROR` envelope; store them in local `fieldErrors` state; clear `fieldErrors` on each successful save
- Page title (document.title) set to `event.title ?? 'Event'`
**Done when:** Navigating to `/calendar/events/:id` loads and displays the event; editing a field auto-saves after 800ms; delete navigates to `/calendar`; a 404 id redirects to `/calendar` with a toast
**Commit message:** `feat(calendar): add EventEditorPage with auto-save, delete, and 404 redirect`

---

### Task 27 — CalendarPage
**File(s):** `client/src/pages/CalendarPage.jsx`
**What:** Create the main calendar page that composes all calendar components:
- Reads `activeView`, `currentDate`, `items`, `isLoading`, `error`, `setActiveView`, `setCurrentDate`, `goToToday`, `goPrev`, `goNext`, `fetchWindow`, `createEvent`, `deleteEvent` from `useCalendarStore`
- Calls `fetchWindow()` on mount (via `useEffect` with no deps — the store derives the window from its own state on first render)
- Shows a loading spinner (`<p className="text-sm text-gray-500">Loading…</p>` centered) while `isLoading` and `items` is empty
- Shows an error banner above the grid when `error` is set; includes a "Retry" button that calls `fetchWindow()`
- Passes `currentDate` as a `Date` object (convert from store's ISO string) to `CalendarToolbar` and `CalendarGrid`
- `onSlotClick(date, hour)` — sets `quickCreate` state to `{ date, hour }`; renders `QuickCreateForm` positioned (fixed overlay or inline); `QuickCreateForm.onSave` closes the form; `QuickCreateForm.onExpand(id)` navigates to `/calendar/events/${id}`
- `onEventClick(event)` — navigates to `/calendar/events/${event.id}`
- `onTaskClick(task)` — navigates to `/tasks/${task.id}`
- `onEventDelete(eventId)` — calls `deleteEvent(eventId)` (the `EventChip` handles the `ConfirmDialog` internally via `onDelete` prop; `CalendarPage` just executes the deletion on confirm)
- `onDayClick(date)` — sets `activeView` to `'day'` and `currentDate` to the clicked date ISO string (month view → day view drill-down)
**Done when:** The calendar page renders and fetches data on mount; clicking a slot opens the quick-create form; clicking an event navigates to the editor; the error banner with Retry appears when the API fails
**Commit message:** `feat(calendar): add CalendarPage composing all calendar sub-components`

---

### Task 28 — Add Calendar to Sidebar and App routing
**File(s):** `client/src/components/Sidebar.jsx`, `client/src/App.jsx`
**What:** Wire the calendar into the application shell:

**Sidebar.jsx:**
- Add a Calendar entry to `NAV_LINKS` after the Tasks entry:
  ```
  { label: 'Calendar', to: '/calendar', end: false, icon: <inline SVG calendar icon> }
  ```
- The SVG icon should be a simple calendar/grid icon (16×16 viewBox, stroke, no fill) consistent with the existing icon style
- `end: false` ensures any `/calendar/*` sub-path activates the link

**App.jsx:**
- Add imports for `CalendarPage` and `EventEditorPage`
- Add two new routes inside `<Routes>`:
  - `<Route path="/calendar" element={<CalendarPage />} />`
  - `<Route path="/calendar/events/:id" element={<EventEditorPage />} />`
- Update the route list comment at the top of the file to document the two new routes
**Done when:** The Calendar link appears in the sidebar and highlights when on `/calendar` or `/calendar/events/:id`; navigating to `/calendar` renders `CalendarPage`; navigating to `/calendar/events/1` renders `EventEditorPage`
**Commit message:** `feat(calendar): add Calendar sidebar link and routes to App`

---

### Task 29 — E2E tests: calendar happy path
**File(s):** `tests/e2e/calendar.spec.js`
**What:** Write a Playwright E2E test covering the calendar happy path. Follow the same structure as `tests/e2e/` existing specs:
- **Test 1 — Navigate to calendar:** Visit `/`, click the Calendar sidebar link, assert the URL is `/calendar` and the page contains the toolbar
- **Test 2 — View switching:** Click each view tab (Day, Work Week, Week, Month) and assert the active tab is highlighted and the grid changes
- **Test 3 — Today button:** Navigate forward twice (click Next twice), then click Today; assert the displayed date range includes today
- **Test 4 — Create event via QuickCreateForm:** Click a time slot in the week view, fill in a title, click Save; assert the event chip appears on the grid
- **Test 5 — Navigate to EventEditorPage via Expand:** Click a slot, fill a title, click Expand; assert the URL changes to `/calendar/events/:id` and the full form is visible
- **Test 6 — Delete event from calendar:** Create an event, find its chip, click the delete icon, confirm the dialog; assert the chip is no longer visible
- **Test 7 — Task chip appears on calendar:** Create a task with a due date (via the Tasks module), navigate back to Calendar; assert a task chip appears on the correct date in the week view
**Done when:** `npm run test:e2e` passes all 7 calendar tests; no other E2E tests are broken
**Commit message:** `test(calendar): E2E happy path with Playwright`

---

## Rules

- Every task has exactly one commit
- No task should take more than 90 minutes
- If a task feels too large, split it
- Do not write implementation code — implement only, no spec changes
- Backend tasks (1–6) must be complete before frontend tasks (7–29) begin
- Tasks module changes (Tasks 2, 3, 7, 8, 9) must be complete before any calendar component renders task chips (Tasks 17–29)
- The layout utility (Task 11) and its tests (Task 12) must be complete before DayColumn (Task 20), DayWeekGrid (Task 21), MonthGrid (Task 22), and CalendarGrid (Task 23) are implemented
- The store (Task 13) must be complete before any page or form that calls store actions is implemented (Tasks 24–27)
- CalendarPage (Task 27) must be complete before the routing wiring (Task 28) is committed, so the import resolves cleanly
