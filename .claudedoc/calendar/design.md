# Calendar — Technical Design

## Architecture Overview

The Calendar module adds a fourth primary module to the PIM application. It sits
alongside Contacts, Notes, and Tasks in the sidebar and exposes two route families:
`/calendar` (the grid view) and `/calendar/events/:id` (the appointment detail/edit
page). Calendar data is owned by a new `events` SQLite table. Tasks surface on the
calendar by querying the existing `tasks` table within the same date-range window
query.

```
Browser
  │
  ├── /calendar                      CalendarPage
  │     ├── CalendarToolbar           (view switcher + navigation)
  │     ├── AllDayBanner              (all-day events + undated tasks)
  │     ├── CalendarGrid              (Day | WorkWeek | Week | Month)
  │     │     ├── TimeColumn          (hour labels — day/week views only)
  │     │     ├── DayColumn(s)        (timed slots; click → QuickCreate)
  │     │     │     └── EventChip(s)  (appointments + timed tasks)
  │     │     └── MonthCell(s)        (month view cells)
  │     └── QuickCreateForm           (inline; "Expand" → EventEditorPage)
  │
  └── /calendar/events/:id           EventEditorPage
        └── EventForm                 (full appointment editor)

Server
  ├── GET  /api/events?start=&end=   (date-range query, returns events + tasks)
  ├── POST /api/events
  ├── GET  /api/events/:id
  ├── PATCH /api/events/:id
  └── DELETE /api/events/:id

  ├── PATCH /api/tasks/:id           (existing; now accepts `due_time` field)
  └── GET   /api/tasks               (existing; now returns `due_time` field)
```

### Open Questions — Resolved

| Question | Decision |
|---|---|
| Week start day | Sunday (US convention); configurable per-user in a future settings module |
| Work Week view | Weekends are **hidden entirely** (Mon–Fri columns only) |
| Task time field label | **"Due Time"** in the TaskForm UI |
| Color palette | Blue, Green, Red, Yellow, Purple, Pink, Orange, Grey (8 colors; default Blue) |

---

## Data Model

### New Table: `events`

Stores calendar appointments. All times are stored in ISO-8601 local-time strings
(`YYYY-MM-DDTHH:MM`) without a timezone offset — the application operates in the
user's local browser time throughout.

| Column       | Type    | Notes                                                    |
|---|---|---|
| id           | INTEGER | PK, auto-increment                                       |
| title        | TEXT    | NOT NULL; max 255 chars                                  |
| description  | TEXT    | nullable                                                 |
| location     | TEXT    | nullable; max 255 chars                                  |
| all_day      | INTEGER | NOT NULL DEFAULT 0; 1 = all-day, 0 = timed               |
| start_at     | TEXT    | NOT NULL; ISO local datetime `YYYY-MM-DDTHH:MM`          |
| end_at       | TEXT    | NOT NULL; ISO local datetime `YYYY-MM-DDTHH:MM`          |
| color        | TEXT    | NOT NULL DEFAULT 'blue'; one of the 8-color palette keys |
| created_at   | TEXT    | NOT NULL DEFAULT datetime('now')                         |
| updated_at   | TEXT    | NOT NULL DEFAULT datetime('now')                         |

**Color palette keys (SCREAMING_SNAKE_CASE constant in client):**
`blue`, `green`, `red`, `yellow`, `purple`, `pink`, `orange`, `grey`

For all-day events `start_at` stores `YYYY-MM-DDT00:00` and `end_at` stores
`YYYY-MM-DDT23:59`. The `all_day` flag is the authoritative indicator — the UI
reads this flag rather than inspecting the time component.

### Modified Table: `tasks`

A new optional `due_time` column is added via migration 004.

| Column    | Type | Notes                                          |
|---|---|---|
| due_time  | TEXT | nullable; `HH:MM` 24-hour string; e.g. `09:30` |

`due_time` is only meaningful when `due_date` is also set. The API and form treat
it as optional regardless.

### Migration SQL

```sql
-- migration: 004_add_event_and_task_time.sql

-- Add due_time to tasks table.
ALTER TABLE tasks ADD COLUMN due_time TEXT;

-- Create the events table.
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT,
  location    TEXT,
  all_day     INTEGER NOT NULL DEFAULT 0,
  start_at    TEXT    NOT NULL,
  end_at      TEXT    NOT NULL,
  color       TEXT    NOT NULL DEFAULT 'blue',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Index for date-range window queries (the primary read pattern).
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at ASC);
CREATE INDEX IF NOT EXISTS idx_events_end_at   ON events(end_at   ASC);

-- Composite index for range overlap queries.
CREATE INDEX IF NOT EXISTS idx_events_range
  ON events(start_at ASC, end_at ASC);
```

---

## API Contract

### Events Endpoints

| Method | Path                 | Description                                          |
|---|---|---|
| GET    | /api/events          | List events (and tasks) in a date-range window       |
| POST   | /api/events          | Create a new appointment                             |
| GET    | /api/events/:id      | Get a single appointment by ID                       |
| PATCH  | /api/events/:id      | Partially update an appointment                      |
| DELETE | /api/events/:id      | Delete an appointment                                |

### GET /api/events — Query Parameters

| Param | Required | Format       | Description                                   |
|---|---|---|---|
| start | yes      | YYYY-MM-DD   | Window start date (inclusive)                 |
| end   | yes      | YYYY-MM-DD   | Window end date (inclusive)                   |

The endpoint returns a merged payload of **appointments** (from `events`) and
**tasks** (from `tasks` where `due_date` falls within `[start, end]`). Both item
types are returned in the same `data` array, differentiated by a `kind` field.

Missing or malformed `start`/`end` parameters return `422 VALIDATION_ERROR`.

#### Response envelope — GET /api/events

```json
{
  "data": [
    {
      "kind": "event",
      "id": 42,
      "title": "Team standup",
      "description": "Daily sync",
      "location": "Zoom",
      "allDay": false,
      "startAt": "2026-05-07T09:00",
      "endAt": "2026-05-07T09:30",
      "color": "blue",
      "createdAt": "2026-05-01T10:00:00",
      "updatedAt": "2026-05-01T10:00:00"
    },
    {
      "kind": "task",
      "id": 17,
      "title": "Submit invoice",
      "dueDate": "2026-05-07",
      "dueTime": "14:00",
      "status": "Not Started",
      "priority": "High",
      "isPinned": false
    }
  ],
  "error": null,
  "meta": { "count": 2, "start": "2026-05-04", "end": "2026-05-10" }
}
```

Tasks included in this response contain only the fields needed to render a calendar
chip: `kind`, `id`, `title`, `dueDate`, `dueTime`, `status`, `priority`, `isPinned`.
Full task detail is fetched by the existing `GET /api/tasks/:id` endpoint when the
user navigates to `/tasks/:id`.

### POST /api/events — Request Body

```json
{
  "title": "Team standup",
  "description": "Daily sync",
  "location": "Zoom",
  "allDay": false,
  "startAt": "2026-05-07T09:00",
  "endAt": "2026-05-07T09:30",
  "color": "blue"
}
```

`title`, `startAt`, and `endAt` are required. `allDay` defaults to `false`.
`color` defaults to `"blue"`. Returns `201` with the created event object.

### PATCH /api/events/:id — Request Body

All fields optional. Only provided fields are updated.

```json
{
  "title": "Updated title",
  "color": "green"
}
```

Returns `200` with the full updated event object.

### GET /api/events/:id — Response

Returns a single event object (same shape as one `kind: "event"` item above, minus
the `kind` field — `kind` is only present in the list response).

### DELETE /api/events/:id — Response

```json
{ "data": { "deleted": true }, "error": null, "meta": null }
```

### Tasks API Changes

The existing Tasks endpoints (`GET /api/tasks`, `GET /api/tasks/:id`,
`POST /api/tasks`, `PATCH /api/tasks/:id`) are updated to include `due_time`:

- `toCamel` in `client/src/api/tasks.js` maps `due_time` → `dueTime`.
- `toSnake` maps `dueTime` → `due_time`.
- `validateTaskFields` in `server/routes/tasks.js` accepts an optional `due_time`
  field; must match `/^\d{2}:\d{2}$/` when present and non-null.
- `ALLOWED_COLUMNS` in `server/models/task.js` gains `"due_time"`.
- `create` and `findById` SQL in `server/models/task.js` are updated to include
  `due_time`.

### Validation Rules — Events

| Field       | Rule                                                             |
|---|---|
| title       | Required; non-empty string; max 255 chars                        |
| description | Optional string; max 10 000 chars                                |
| location    | Optional string; max 255 chars                                   |
| allDay      | Optional boolean; defaults false                                  |
| startAt     | Required; must match `YYYY-MM-DDTHH:MM`; valid date             |
| endAt       | Required; same format; must be >= startAt                        |
| color       | Optional; must be one of the 8 palette keys; defaults `"blue"`   |

### Error Codes

| Code              | HTTP | Meaning                              |
|---|---|---|
| VALIDATION_ERROR  | 422  | One or more fields failed validation |
| NOT_FOUND         | 404  | Event ID does not exist              |
| MISSING_PARAMS    | 422  | start/end query params absent        |

---

## Component Design (Frontend)

### New Pages

| File | Route | Description |
|---|---|---|
| `client/src/pages/CalendarPage.jsx` | `/calendar` | Main calendar grid, toolbar, and quick-create |
| `client/src/pages/EventEditorPage.jsx` | `/calendar/events/:id` | Full appointment create/edit page |

### New Components

| Component | File | Description |
|---|---|---|
| `CalendarToolbar` | `components/CalendarToolbar.jsx` | View tabs (Day/WorkWeek/Week/Month), Today button, prev/next arrows, date range label |
| `CalendarGrid` | `components/CalendarGrid.jsx` | Dispatcher: renders `DayWeekGrid` or `MonthGrid` based on active view |
| `DayWeekGrid` | `components/DayWeekGrid.jsx` | Scrollable timed grid for Day, Work Week, and Week views; renders TimeColumn + DayColumn(s) |
| `MonthGrid` | `components/MonthGrid.jsx` | 5- or 6-row month grid with MonthCell per day |
| `TimeColumn` | `components/TimeColumn.jsx` | Left-hand 24-hour hour labels column (00:00–23:00) |
| `DayColumn` | `components/DayColumn.jsx` | Single day's timed slot column; handles click-to-create and overlapping chip layout |
| `AllDayBanner` | `components/AllDayBanner.jsx` | Sticky banner row above the timed grid; renders all-day events and tasks without a time |
| `EventChip` | `components/EventChip.jsx` | Rendered appointment chip inside a day column or banner; click navigates to editor; delete icon shows confirm dialog |
| `TaskChip` | `components/TaskChip.jsx` | Rendered task chip; checkbox icon; click navigates to `/tasks/:id`; visually distinct from EventChip |
| `QuickCreateForm` | `components/QuickCreateForm.jsx` | Inline popover form (title + allDay toggle + time); "Save" creates event and closes; "Expand" creates event then navigates to editor |
| `EventForm` | `components/EventForm.jsx` | Full controlled form for all appointment fields; used inside EventEditorPage |
| `ColorPicker` | `components/ColorPicker.jsx` | 8-swatch color picker; used inside EventForm and QuickCreateForm |
| `ConfirmDialog` | `components/ConfirmDialog.jsx` | Already exists; reused for event deletion confirm |

### Modified Components

| Component | Change |
|---|---|
| `Sidebar` | Add Calendar entry to `NAV_LINKS` with an inline SVG calendar icon; `end: false` so any `/calendar/*` sub-path activates the link |
| `TaskForm` | Add a "Due Time" time input (`<input type="time">`) rendered only when `dueDate` is non-empty |

### Props Contracts

**CalendarToolbar**
```
activeView: 'day' | 'workweek' | 'week' | 'month'
onViewChange: (view) => void
currentDate: Date
onPrev: () => void
onNext: () => void
onToday: () => void
```

**DayColumn**
```
date: Date
items: CalendarItem[]          -- appointments + tasks for this day
onSlotClick: (date, hour) => void
onEventClick: (event) => void
onTaskClick: (task) => void
onEventDelete: (eventId) => void
```

**EventChip**
```
event: { id, title, startAt, endAt, color, allDay }
style: object                  -- positioning from overlap layout engine
onClick: () => void
onDelete: () => void
```

**TaskChip**
```
task: { id, title, dueDate, dueTime, status, priority }
style: object
onClick: () => void
```

**QuickCreateForm**
```
initialDate: Date
initialHour: number | null     -- null means all-day
onSave: (event) => void        -- called after API create
onExpand: (eventId) => void    -- called after API create, then navigates
onClose: () => void
```

**ColorPicker**
```
value: string                  -- current color key
onChange: (colorKey) => void
```

---

## State Management

### New Store: `useCalendarStore`

File: `client/src/store/calendarStore.js`

```
State:
  activeView     string        -- 'day' | 'workweek' | 'week' | 'month'
                               -- initialised from localStorage key 'calendar_view'
                               -- default 'week'
  currentDate    string        -- ISO date string 'YYYY-MM-DD' for the anchor date
                               -- initialised to today
  windowStart    string        -- YYYY-MM-DD; derived from currentDate + activeView
  windowEnd      string        -- YYYY-MM-DD; derived from currentDate + activeView
  items          object[]      -- merged events+tasks for the current window
  isLoading      boolean
  error          string|null
  selectedEvent  object|null   -- full event being edited in EventEditorPage
  isSaving       boolean
  saveStatus     'idle' | 'saving' | 'saved' | 'error'

Actions:
  setActiveView(view)          -- updates activeView, persists to localStorage,
                               -- recomputes window, triggers fetchWindow()
  setCurrentDate(dateStr)      -- updates currentDate, recomputes window,
                               -- triggers fetchWindow()
  goToToday()                  -- sets currentDate to today, triggers fetchWindow()
  goPrev()                     -- decrements currentDate by view unit
  goNext()                     -- increments currentDate by view unit
  fetchWindow()                -- GET /api/events?start=&end= for current window;
                               -- replaces items[]
  fetchEvent(id)               -- GET /api/events/:id; sets selectedEvent
  createEvent(data)            -- POST /api/events; adds to items[], returns created
  updateEvent(id, data)        -- PATCH /api/events/:id; updates items[] + selectedEvent
  deleteEvent(id)              -- DELETE /api/events/:id; removes from items[]
  setSelectedEvent(event)      -- set directly without API call
```

`windowStart` and `windowEnd` are derived synchronously whenever `currentDate` or
`activeView` changes:

| View     | windowStart             | windowEnd               |
|---|---|---|
| day      | currentDate             | currentDate             |
| workweek | Monday of current week  | Friday of current week  |
| week     | Sunday of current week  | Saturday of current week|
| month    | First day of month      | Last day of month       |

For month view the window is extended to include the leading/trailing days needed
to complete the first and last display weeks (i.e. the visible grid may span up to
42 days). This ensures events on those fringe days are fetched.

The store does **not** cache multiple windows. Each navigation replaces `items[]`
with the newly fetched window. This keeps the store simple and memory-bounded.

### localStorage Keys

| Key             | Value                                    |
|---|---|
| `calendar_view` | `'day'` / `'workweek'` / `'week'` / `'month'` |

---

## Overlap Layout Algorithm

Overlapping timed appointments in day/week views are laid out using a column-
packing algorithm applied inside `DayColumn` before render:

1. Sort items by `startAt` ascending, then by `endAt` descending (longer events first).
2. Group items into **overlap clusters**: an item joins an existing cluster if its
   `startAt` is before the cluster's current maximum `endAt`.
3. Within each cluster, greedily assign each item to the first available **lane**
   (a lane is free if its last item's `endAt` <= the new item's `startAt`).
4. Each lane renders as an equal-width column within the cluster's horizontal span.
   An item occupying lane `k` of `n` lanes gets `left: k/n * 100%` and
   `width: 1/n * 100%` (as inline style percentages on a relative-positioned container).

This algorithm is implemented as a pure function `layoutItems(items)` in
`client/src/utils/calendar-layout.js`, returning each item annotated with
`{ lane, laneCount }`. `DayColumn` converts these to positioning styles.

Task chips participate in the same overlap algorithm as event chips so that a
timed task and a timed event starting at the same hour are displayed side-by-side.

---

## Routing

The two new routes are added to the React Router configuration:

```
/calendar                → CalendarPage
/calendar/events/:id     → EventEditorPage
```

`EventEditorPage` follows the same create-first pattern as `TaskEditorPage`:
- On "Expand" from `QuickCreateForm`, the event is already created (the form calls
  `createEvent()` first), so `EventEditorPage` mounts in edit mode with an existing
  `id` and calls `fetchEvent(id)` on mount.
- There is no `/calendar/events/new` route. The quick-create form always creates
  the event before navigating.

---

## Error Handling Strategy

| Scenario | Handling |
|---|---|
| Window fetch fails | `error` state set; an inline alert banner is shown in `CalendarPage` above the grid; user can retry via a "Retry" button |
| Event create fails (QuickCreate) | Inline error message inside `QuickCreateForm`; form stays open |
| Event create fails (EventEditor) | `saveStatus = 'error'`; red status badge in toolbar; no navigation |
| Event update fails | `saveStatus = 'error'`; red status badge; fields retain current values |
| Event delete fails | Alert inside `ConfirmDialog` before it closes; user can try again |
| Event not found (404 on mount) | Redirect to `/calendar` with a toast message via router state |
| Validation errors (422) | Per-field error messages rendered below each invalid input in `EventForm` |

---

## Security Considerations

- All SQL uses parameterised statements (`better-sqlite3` named parameters). No
  user-supplied values are interpolated into SQL strings.
- `start` and `end` query params are validated against `YYYY-MM-DD` format and
  checked as valid calendar dates before they are used in the SQL query.
- `color` is validated against a whitelist of 8 exact strings; any other value
  returns `VALIDATION_ERROR`.
- `startAt` and `endAt` are validated against `YYYY-MM-DDTHH:MM` format; `endAt`
  must not precede `startAt`.
- `due_time` on tasks is validated against `/^\d{2}:\d{2}$/`; the hour component
  must be 00–23 and the minute component 00–59.
- Maximum field lengths are enforced server-side (title 255, description 10 000,
  location 255) and replicated as `maxLength` attributes on form inputs client-side.
- The application is single-user with no authentication beyond local JWT, consistent
  with the existing modules. No additional auth surface is introduced.

---

## File Inventory

### New files

```
server/routes/events.js
server/models/event.js
client/src/api/events.js
client/src/store/calendarStore.js
client/src/pages/CalendarPage.jsx
client/src/pages/EventEditorPage.jsx
client/src/components/CalendarToolbar.jsx
client/src/components/CalendarGrid.jsx
client/src/components/DayWeekGrid.jsx
client/src/components/MonthGrid.jsx
client/src/components/TimeColumn.jsx
client/src/components/DayColumn.jsx
client/src/components/AllDayBanner.jsx
client/src/components/EventChip.jsx
client/src/components/TaskChip.jsx
client/src/components/QuickCreateForm.jsx
client/src/components/EventForm.jsx
client/src/components/ColorPicker.jsx
client/src/utils/calendar-layout.js
db/migrations/004_add_event_and_task_time.sql
tests/unit/calendar-layout.test.js
tests/e2e/calendar.spec.js
```

### Modified files

```
server/index.js                         (register /api/events router)
server/models/task.js                   (add due_time to create, findById, update)
server/routes/tasks.js                  (validate + pass due_time)
client/src/api/tasks.js                 (toCamel/toSnake: due_time <-> dueTime)
client/src/store/tasksStore.js          (pass dueTime through updateTask/createTask)
client/src/components/TaskForm.jsx      (add Due Time input)
client/src/components/Sidebar.jsx       (add Calendar nav link)
client/src/main.jsx                     (add /calendar and /calendar/events/:id routes)
```
