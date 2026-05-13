# Tasks — Technical Design

## Architecture Overview

The Tasks module is the third major feature of the PIM application, sitting alongside
Contacts and Notes. It introduces a `tasks` table with explicit structured fields
(title, body, due_date, priority, status, is_pinned), an isolated `task_tags` join
table referencing a new `task_tags_vocab` table, a new server model and route file,
a dedicated Zustand store, a frontend API client, and a set of React pages and
components that follow the conventions established by Contacts and Notes.

Tasks are entirely standalone — no foreign keys to `contacts` or `notes`. Tags for
tasks are stored in a separate vocabulary table (`task_tags_vocab`) and join table
(`task_tags`) so they remain isolated from Notes tags for now. The schema is
intentionally designed to make a future unification (Phase 5) a non-breaking
migration (see Tags Isolation section).

The `due_date` column is a plain ISO-8601 date string (no time component), making it
trivially joinable to a future Calendar module without schema changes.

```
Browser
  |
  |  React Router (/tasks, /tasks/new, /tasks/:id)
  v
TasksPage                     TaskEditorPage
  |                                  |
  FilterControl (status + priority)  TaskToolbar (pin, save status, delete)
  SortControl (reused)               TaskForm (title, body, due date, priority,
  TaskList                                      status, tags)
    TaskCard (x N)                   TagCombobox (reused, task-scoped tags)
      PriorityBadge                  ConfirmDialog (delete)
      StatusBadge
  EmptyState (conditional)
  v
useTasksStore (Zustand)
  |
  v
client/src/api/tasks.js     client/src/api/task-tags.js
  |                                  |
  v                                  v
GET /api/tasks              GET /api/task-tags
POST /api/tasks             (tag CRUD implicit via task save)
PATCH /api/tasks/:id
DELETE /api/tasks/:id
  |
  v
server/routes/tasks.js    server/routes/task-tags.js
  |
  v
server/models/task.js     server/models/task-tag.js
  |
  v
SQLite  (tasks, task_tags_vocab, task_tags tables)
```

---

## Resolved Design Decisions

The following open questions from `requirements.md` are resolved here:

**Auto-save vs explicit Save:** Auto-save with a debounced write (800 ms, flush on
blur/navigation), consistent with the Notes module. The title field is required; the
save is suppressed client-side when title is empty, and an inline validation message
is shown instead. A `TaskToolbar` displays "Saving..." / "Saved" / "Save failed"
status, matching `NoteToolbar`.

**Filter persistence:** Filter and sort selections persist to `localStorage`, consistent
with the Notes sort preference. Keys: `tasks_sort`, `tasks_filter_status`,
`tasks_filter_priority`. Persisting across sessions prevents the user from having to
re-apply their preferred view on every page refresh.

**No-due-date sort placement:** Tasks without a `due_date` sort to the **bottom** when
sorting by due date ascending (soonest first). Null dates are treated as
`9999-12-31` for comparison purposes in the client-side sort derivation.

**Tag character limit:** Individual task tag names are limited to **30 characters**,
consistent with Notes tags, to ease a future unification.

**Status change from list:** Status is changeable directly from the `TaskCard` via an
inline `<select>` dropdown rendered on the card. This avoids requiring navigation to
the detail view for the most common action (marking a task complete). The change is
persisted immediately (no debounce) via a `PATCH` request.

---

## Data Model

### Tables

| Table           | Column      | Type    | Notes                                                      |
|-----------------|-------------|---------|------------------------------------------------------------|
| tasks           | id          | INTEGER | PK, auto-increment                                         |
| tasks           | title       | TEXT    | NOT NULL; max 255 chars enforced at server                 |
| tasks           | body        | TEXT    | Nullable; max 10,000 chars enforced at server              |
| tasks           | due_date    | TEXT    | Nullable; ISO-8601 date string (YYYY-MM-DD); no time       |
| tasks           | priority    | TEXT    | NOT NULL; CHECK IN ('Low','Medium','High'); default 'Low'  |
| tasks           | status      | TEXT    | NOT NULL; CHECK IN ('Not Started','Blocked','In Progress','Completed','Cancelled'); default 'Not Started' |
| tasks           | is_pinned   | INTEGER | Boolean (0/1); default 0                                   |
| tasks           | created_at  | TEXT    | datetime('now') default                                    |
| tasks           | updated_at  | TEXT    | datetime('now') default; refreshed on every PATCH          |
| task_tags_vocab | id          | INTEGER | PK, auto-increment                                         |
| task_tags_vocab | name        | TEXT    | Unique, trimmed lowercase, max 30 chars, NOT NULL          |
| task_tags_vocab | created_at  | TEXT    | datetime('now') default                                    |
| task_tags       | task_id     | INTEGER | FK -> tasks.id ON DELETE CASCADE                           |
| task_tags       | tag_id      | INTEGER | FK -> task_tags_vocab.id ON DELETE CASCADE                 |

`task_tags` has a composite PK of `(task_id, tag_id)`.

### Tags Isolation and Unification Path

Task tags live in `task_tags_vocab` (not `tags`). The Notes tags live in `tags`.
This keeps the two namespaces fully independent in Phase 3. In Phase 5 (or whenever
a unified tag vocabulary is desired), the migration path is:

1. Add a `source` or `module` column to a merged `tags` table (or create a new one
   that covers both).
2. `INSERT OR IGNORE` all rows from `task_tags_vocab` into the unified table.
3. Update `task_tags.tag_id` foreign keys to point to the unified table.
4. Drop `task_tags_vocab`.

Because all tag name values are normalised to lowercase + trimmed before storage in
both `tags` and `task_tags_vocab`, duplicates between the two sets will collapse
cleanly on `INSERT OR IGNORE` during the merge.

### Calendar Compatibility

The `due_date` column stores a plain `TEXT` value in `YYYY-MM-DD` format. A Phase 4
Calendar query to find tasks due on a given date is:

```sql
SELECT * FROM tasks WHERE due_date = '2026-05-12';
```

No schema changes are required to support Calendar integration. The Tasks model
simply needs to be imported and queried alongside Calendar events.

### Migration SQL

```sql
-- migration: 003_create_tasks.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  body       TEXT,
  due_date   TEXT,
  priority   TEXT    NOT NULL DEFAULT 'Low'
               CHECK(priority IN ('Low', 'Medium', 'High')),
  status     TEXT    NOT NULL DEFAULT 'Not Started'
               CHECK(status IN ('Not Started', 'Blocked', 'In Progress', 'Completed', 'Cancelled')),
  is_pinned  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_tags_vocab (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES task_tags_vocab(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON tasks(due_date ASC);

CREATE INDEX IF NOT EXISTS idx_tasks_status_priority
  ON tasks(status, priority);

CREATE INDEX IF NOT EXISTS idx_tasks_pinned_due
  ON tasks(is_pinned DESC, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id
  ON task_tags(tag_id);
```

---

## API Contract

### Endpoints

| Method | Path                   | Description                                              |
|--------|------------------------|----------------------------------------------------------|
| GET    | /api/tasks             | List all tasks (filtered, sorted, with tags)             |
| GET    | /api/tasks/:id         | Get a single task with its full tag list                 |
| POST   | /api/tasks             | Create a new task                                        |
| PATCH  | /api/tasks/:id         | Update any task field (partial update)                   |
| DELETE | /api/tasks/:id         | Delete a task; orphan task tags auto-cleaned             |
| GET    | /api/task-tags         | List all task tag vocabulary entries                     |

Tags are not individually created via a dedicated POST endpoint. They are created
implicitly when a tag name is sent in the `tags` array of a task create or update
request.

### Query Parameters

`GET /api/tasks` accepts:
- `sort` — `due_asc` (default) | `due_desc` | `priority_desc` | `updated_desc`
- `status` — comma-separated status filter, e.g. `Not Started,In Progress`
- `priority` — comma-separated priority filter, e.g. `High,Medium`

Pinned tasks always appear before unpinned tasks within any sort order. Completed
and Cancelled tasks appear after all active tasks regardless of sort or filter
(enforced server-side via an `ORDER BY` priority expression). Filtering by status
can include Completed/Cancelled if the user explicitly selects them.

### Request / Response Shapes

All responses use the `{ data, error, meta }` envelope consistent with the Contacts
and Notes modules. Error objects always include a `code` string.

---

#### GET /api/tasks

Response `data` is an array of task objects:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Write design doc",
      "body": "Cover data model, API, components...",
      "due_date": "2026-05-12",
      "priority": "High",
      "status": "In Progress",
      "is_pinned": true,
      "tags": [{ "id": 2, "name": "work" }],
      "created_at": "2026-05-07T10:00:00",
      "updated_at": "2026-05-07T11:30:00"
    }
  ],
  "error": null,
  "meta": { "count": 1 }
}
```

The body field is included in list responses as a preview (first 140 characters,
trimmed). The server computes a `body_preview` column at read time — the full `body`
is only returned by `GET /api/tasks/:id`.

---

#### GET /api/tasks/:id

Response `data` is the full task object including the complete `body` and all tags:

```json
{
  "data": {
    "id": 1,
    "title": "Write design doc",
    "body": "Cover data model, API, components, state, error handling, and security.",
    "due_date": "2026-05-12",
    "priority": "High",
    "status": "In Progress",
    "is_pinned": true,
    "tags": [{ "id": 2, "name": "work" }],
    "created_at": "2026-05-07T10:00:00",
    "updated_at": "2026-05-07T11:30:00"
  },
  "error": null,
  "meta": null
}
```

---

#### POST /api/tasks

Request body:

```json
{
  "title": "Write design doc",
  "body": "Cover all sections.",
  "due_date": "2026-05-12",
  "priority": "High",
  "status": "Not Started",
  "is_pinned": false,
  "tags": ["work", "writing"]
}
```

- `title` — required; max 255 characters
- `body` — optional; max 10,000 characters
- `due_date` — optional; must match `YYYY-MM-DD` pattern when present
- `priority` — optional; defaults to `'Low'`; must be one of the valid enum values
- `status` — optional; defaults to `'Not Started'`; must be a valid enum value
- `is_pinned` — optional boolean; defaults to `false`
- `tags` — optional array of tag name strings (0–5); new names are created
  automatically; existing names are matched case-insensitively

Response: `201 Created` with the full task object (same shape as GET /:id).

Validation errors (`422`):

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "title": "required and must be a non-empty string of at most 255 characters",
      "due_date": "must be a valid date in YYYY-MM-DD format",
      "priority": "must be one of: Low, Medium, High",
      "tags": "maximum 5 tags allowed"
    }
  },
  "meta": null
}
```

---

#### PATCH /api/tasks/:id

Request body (all fields optional — partial update):

```json
{
  "title": "Write design doc (final)",
  "status": "Completed",
  "is_pinned": false,
  "tags": ["work"]
}
```

When `tags` is present it **replaces** the entire tag set. After the update, any
task tags no longer referenced by any task are deleted. When `tags` is absent the
existing tags are preserved unchanged.

Response: `200 OK` with the full updated task object.

---

#### DELETE /api/tasks/:id

No request body. Response:

```json
{
  "data": { "deleted": true },
  "error": null,
  "meta": null
}
```

After deletion the server runs the orphan task-tag cleanup query.

---

#### GET /api/task-tags

Response:

```json
{
  "data": [
    { "id": 1, "name": "admin" },
    { "id": 2, "name": "work" }
  ],
  "error": null,
  "meta": { "count": 2 }
}
```

Tags sorted `name ASC`.

---

### Server-Side Tag Lifecycle

Identical in structure to the Notes tag lifecycle in `server/models/tag.js`. The task
equivalent lives in `server/models/task-tag.js` and operates on `task_tags_vocab` and
`task_tags`:

1. Normalise each name: lowercase + trim.
2. `INSERT OR IGNORE INTO task_tags_vocab (name) VALUES (?)` for each name.
3. Resolve tag IDs by name.
4. `DELETE FROM task_tags WHERE task_id = ?`.
5. `INSERT INTO task_tags (task_id, tag_id)` for each resolved ID.
6. `DELETE FROM task_tags_vocab WHERE id NOT IN (SELECT DISTINCT tag_id FROM task_tags)`.

All six steps run inside a single `db.transaction()` call.

### Server-Side Sort and Filter Logic

The `GET /api/tasks` query applies ordering in three tiers:

1. `is_pinned DESC` — pinned tasks always float to the top.
2. Active vs done — tasks with status in `('Completed','Cancelled')` sort after all
   other tasks (implemented via a `CASE` expression: `CASE WHEN status IN (...) THEN 1 ELSE 0 END ASC`).
3. Secondary sort — the `sort` query parameter governs this tier:
   - `due_asc` (default): `due_date ASC NULLS LAST`
   - `due_desc`: `due_date DESC NULLS FIRST`
   - `priority_desc`: `CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END ASC`
   - `updated_desc`: `updated_at DESC`

SQLite does not support `NULLS LAST` natively, so null due dates are handled via
`COALESCE(due_date, '9999-12-31')` for `due_asc` and `COALESCE(due_date, '0000-01-01')`
for `due_desc`.

Filtering is applied via a `WHERE` clause built from validated query parameters.
Only whitelisted enum values are accepted; unknown values are ignored.

---

## Component Design (Frontend)

All new files follow `kebab-case.jsx` naming and functional-component conventions
consistent with the Contacts and Notes modules.

### Pages

| Component        | Path                                | Responsibility                                                     |
|------------------|-------------------------------------|--------------------------------------------------------------------|
| `TasksPage`      | `client/src/pages/TasksPage.jsx`    | List view: renders TaskList, FilterControl, SortControl, New button |
| `TaskEditorPage` | `client/src/pages/TaskEditorPage.jsx` | Create and edit: renders TaskForm, TaskToolbar, TagCombobox       |

### Components

| Component        | Path                                       | Props                                                                  | Responsibility                                                              |
|------------------|--------------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| `TaskList`       | `client/src/components/TaskList.jsx`       | `tasks[]`, `onSelect(task)`, `onStatusChange(id, status)`              | Renders an ordered list of `TaskCard` rows                                  |
| `TaskCard`       | `client/src/components/TaskCard.jsx`       | `task`, `onSelect(task)`, `onStatusChange(id, status)`                 | Single row: title, body preview, due date, PriorityBadge, StatusBadge, tags, pin indicator, inline status dropdown |
| `TaskForm`       | `client/src/components/TaskForm.jsx`       | `task`, `onChange(fields)`, `onBlur()`                                 | Controlled form for title, body, due date, priority, status fields; character counters; inline validation |
| `TaskToolbar`    | `client/src/components/TaskToolbar.jsx`    | `isPinned`, `onTogglePin`, `onDelete`, `isSaving`, `saveStatus`        | Pin toggle, auto-save status indicator ("Saving..." / "Saved" / "Save failed"), Delete button |
| `PriorityBadge`  | `client/src/components/PriorityBadge.jsx`  | `priority`                                                             | Coloured pill: Low = grey, Medium = amber, High = red                       |
| `StatusBadge`    | `client/src/components/StatusBadge.jsx`    | `status`                                                               | Coloured pill per status: Not Started = grey, Blocked = orange, In Progress = blue, Completed = green, Cancelled = slate |
| `FilterControl`  | `client/src/components/FilterControl.jsx`  | `statusFilter[]`, `priorityFilter[]`, `onStatusChange(values[])`, `onPriorityChange(values[])` | Multi-select filter UI for status and priority; shows active filter count badge |
| `SortControl`    | already exists (`SortControl.jsx`)         | `value`, `onChange(sortKey)`, `options[]`                              | Reused unchanged; caller passes task-specific options array                 |
| `TagCombobox`    | already exists (`TagCombobox.jsx`)         | `selected[]`, `available[]`, `onChange(tags[])`                        | Reused unchanged; receives task-scoped tags from `useTasksStore`            |
| `ConfirmDialog`  | already exists (`ConfirmDialog.jsx`)       | —                                                                      | Reused unchanged                                                            |
| `EmptyState`     | already exists (`EmptyState.jsx`)          | —                                                                      | Reused unchanged                                                            |

### Component Tree

```
TasksPage
  (header: "Tasks" title + "New Task" button)
  FilterControl
    (status multi-select)
    (priority multi-select)
  SortControl
  TaskList
    TaskCard (x N)
      PriorityBadge
      StatusBadge (inline status <select>)
      (due date, title, body preview, tags, pin icon)
  EmptyState (conditional)

TaskEditorPage
  TaskToolbar
    (pin toggle, save status indicator, Delete button)
  TaskForm
    <input> title
    <textarea> body
    <input type="date"> due date
    <select> priority
    <select> status
    (character counters for title and body)
  TagCombobox
  ConfirmDialog (delete confirmation, conditional)
```

### Priority Badge Colour Palette

| Priority | Background     | Text          | Tailwind classes                         |
|----------|----------------|---------------|------------------------------------------|
| Low      | Grey-100       | Grey-600      | `bg-gray-100 text-gray-600`              |
| Medium   | Amber-100      | Amber-700     | `bg-amber-100 text-amber-700`            |
| High     | Red-100        | Red-700       | `bg-red-100 text-red-700`                |

### Status Badge Colour Palette

| Status       | Background     | Text          | Tailwind classes                         |
|--------------|----------------|---------------|------------------------------------------|
| Not Started  | Grey-100       | Grey-600      | `bg-gray-100 text-gray-600`              |
| Blocked      | Orange-100     | Orange-700    | `bg-orange-100 text-orange-700`          |
| In Progress  | Blue-100       | Blue-700      | `bg-blue-100 text-blue-700`              |
| Completed    | Green-100      | Green-700     | `bg-green-100 text-green-700`            |
| Cancelled    | Slate-100      | Slate-500     | `bg-slate-100 text-slate-500`            |

### "Done" Visual Treatment on Cards

Tasks with status `Completed` or `Cancelled` receive:
- Muted card background: `bg-gray-50` (vs the default `bg-white`)
- Title rendered with `line-through text-gray-400`
- Card positioned below all active tasks in the list (enforced by sort order)

---

## State Management

### Store: `useTasksStore`

File: `client/src/store/tasksStore.js`

```
State
  tasks              {object[]}    Full list from last fetch (camelCase)
  selectedTask       {object|null} Currently open task (full body + tags)
  taskTags           {object[]}    All available task-scoped tags (for TagCombobox)
  isLoading          {boolean}
  isSaving           {boolean}     True during an auto-save PATCH request
  saveStatus         {string}      'idle' | 'saving' | 'saved' | 'error'
  error              {string|null}
  sortKey            {string}      'due_asc' | 'due_desc' | 'priority_desc' | 'updated_desc'
  statusFilter       {string[]}    Active status filters (empty = no filter)
  priorityFilter     {string[]}    Active priority filters (empty = no filter)
  displayedTasks     {object[]}    Derived: filtered + sorted client-side view of tasks

Actions
  fetchTasks()                    GET /api/tasks; updates tasks + displayedTasks
  fetchTask(id)                   GET /api/tasks/:id; sets selectedTask
  createTask(data)                POST /api/tasks; prepends to tasks; returns created task
  updateTask(id, data)            PATCH /api/tasks/:id; updates tasks + selectedTask; sets isSaving
  deleteTask(id)                  DELETE /api/tasks/:id; removes from list; clears selectedTask
  fetchTaskTags()                 GET /api/task-tags; updates taskTags
  setSortKey(key)                 Updates sortKey; persists to localStorage; re-derives displayedTasks
  setStatusFilter(values[])       Updates statusFilter; persists to localStorage; re-derives displayedTasks
  setPriorityFilter(values[])     Updates priorityFilter; persists to localStorage; re-derives displayedTasks
  setSelectedTask(task)           Set selectedTask directly (optimistic pin toggle)
```

### Derived `displayedTasks`

`displayedTasks` is re-derived inside the store whenever `tasks`, `sortKey`,
`statusFilter`, or `priorityFilter` changes. The derivation runs entirely client-side
for instant response to filter and sort changes.

**Derivation steps:**
1. Apply `statusFilter`: if non-empty, keep only tasks whose `status` is in the filter.
2. Apply `priorityFilter`: if non-empty, keep only tasks whose `priority` is in the filter.
3. Separate pinned from unpinned (within each, separate active from done).
4. Sort each bucket by the current `sortKey` (null due dates treated as `'9999-12-31'`).
5. Concatenate: `[pinnedActive, pinnedDone, unpinnedActive, unpinnedDone]`.

This mirrors the server-side sort so that the initial page load (server sort) and
subsequent client-side filter/sort changes feel consistent.

### Auto-Save Integration

`isSaving` and `saveStatus` live in the store so `TaskToolbar` can display the save
indicator without prop drilling, identical to the `NoteToolbar` / `isSaving` pattern
in `useNotesStore`. `saveStatus` provides finer-grained feedback ('saving' → 'saved'
→  'idle' after 2 s, or 'error' on failure).

### Persistence (localStorage)

On store initialisation, filter and sort preferences are read from localStorage:

| Key                     | Default value   |
|-------------------------|-----------------|
| `tasks_sort`            | `'due_asc'`     |
| `tasks_filter_status`   | `'[]'` (JSON)   |
| `tasks_filter_priority` | `'[]'` (JSON)   |

Each setter (`setSortKey`, `setStatusFilter`, `setPriorityFilter`) writes the new
value back to localStorage before re-deriving `displayedTasks`.

---

## API Client

File: `client/src/api/tasks.js`

Follows the same pattern as `client/src/api/notes.js`:

- `toCamel(task)` converts snake_case API fields to camelCase:
  - `is_pinned` → `isPinned`
  - `due_date` → `dueDate`
  - `body_preview` → `bodyPreview`
  - `created_at` → `createdAt`
  - `updated_at` → `updatedAt`
- `toSnake(task)` converts camelCase inputs back to snake_case for the request body:
  - `isPinned` → `is_pinned`
  - `dueDate` → `due_date`
- `tagsToPayload(tags)` converts `{id, name}` objects or plain strings to an array of
  name strings (identical helper to the one in `notes.js`).
- The same `apiFetch(url, init)` pattern is used: envelope unwrap, non-2xx throws.

File: `client/src/api/task-tags.js`

Single function `getTaskTags()` — fetches `GET /api/task-tags` and returns an array
of `{id, name}` objects. Same shape as `getTags()` in `client/src/api/tags.js`.

---

## Sidebar Module Icons

The Sidebar currently renders text-only nav links. All module links (Contacts, Notes,
Tasks, and future modules) must gain a recognisable inline SVG icon, with no new npm
packages.

### Icon Design

Each icon is a 16×16 inline SVG (`width="16" height="16" viewBox="0 0 16 16"`) with
`aria-hidden="true"` since the visible label provides the accessible name. Stroke-based
icons use `currentColor` so they inherit the link's active/inactive text colour
automatically. All icons use `strokeWidth="1.5"` and `strokeLinecap="round"` for a
consistent visual weight.

### Icon Assignments

| Module   | Icon concept         | SVG motif                                              |
|----------|----------------------|--------------------------------------------------------|
| Contacts | Person silhouette    | Circle head + arc shoulders (user icon)                |
| Notes    | Document with lines  | Rectangle with three horizontal lines inside           |
| Tasks    | Checkbox / checkmark | Square with a tick mark inside                         |
| Calendar | Calendar grid        | Rectangle with top bar and 2×2 grid cells (Phase 4)   |
| Search   | Magnifying glass     | Circle + handle diagonal (Phase 5)                     |

### Implementation

`Sidebar.jsx` is modified to:
1. Add an `icon` field to each entry in `NAV_LINKS` — a React element (the inline SVG).
2. Render the icon and label together inside the `NavLink`:
   `<span aria-hidden="true">{icon}</span><span>{label}</span>`
3. Apply `flex items-center gap-2` to the NavLink's inner wrapper so icon and label
   align horizontally.
4. The existing `navLinkClass` function remains unchanged — active/inactive colours
   cascade to `currentColor` icons automatically.

No new component file is needed; the SVGs live directly in the `NAV_LINKS` array
definition in `Sidebar.jsx` as JSX literals. If the SVG definitions grow large, they
can be extracted to a `client/src/lib/icons.js` module in a later cleanup pass.

---

## Routing

New routes added to `client/src/App.jsx`:

| Path         | Component        | Mode        |
|--------------|------------------|-------------|
| `/tasks`     | `TasksPage`      | List view   |
| `/tasks/new` | `TaskEditorPage` | Create mode |
| `/tasks/:id` | `TaskEditorPage` | Edit mode   |

`TaskEditorPage` detects create vs edit mode by checking whether `useParams().id`
equals `'new'` or is a numeric string, identical to how `NoteEditorPage` handles
`/notes/new` vs `/notes/:id`.

---

## Error Handling Strategy

Consistent with the Contacts and Notes error handling pattern:

- **API errors** are caught in store actions; `error` state is set to the error message.
- **404 on `TaskEditorPage`** (task not found) triggers a `useEffect` redirect to `/tasks`
  with a router-state toast message.
- **Validation errors (422)** surface field-level messages from the API `error.fields`
  object; `TaskForm` displays them as inline text below the relevant input.
- **Auto-save failures** are surfaced as a "Save failed" status in `TaskToolbar` via
  `saveStatus: 'error'`. The user can keep editing — the next auto-save attempt will
  retry.
- **Inline status change failures** (from the `TaskCard` dropdown) show a transient
  error banner at the top of `TasksPage` using the store's `error` field.
- **Network failures** display a red error banner at the top of the page, consistent
  with `ContactsPage` and `NotesPage`.
- `ConfirmDialog` is reused for the delete confirmation, identical to the existing
  pattern.

---

## Security Considerations

- **Input validation (server):** `title` required and max 255 chars; `body` optional
  and max 10,000 chars; `due_date` validated against `/^\d{4}-\d{2}-\d{2}$/` and
  checked for calendar validity; `priority` and `status` validated against their enum
  allowlists; `tags` max 5 entries, each max 30 chars. Invalid inputs return
  `422 VALIDATION_ERROR`.
- **Parameterised queries:** All SQL uses `better-sqlite3` prepared statements with
  named parameters. No string interpolation of user input into SQL at any point.
- **Filter/sort injection prevention:** `sort`, `status`, and `priority` query
  parameters are validated against explicit allowlists before being used in any SQL
  expression. Unknown values are ignored or trigger a `400 BAD_REQUEST`.
- **Tag name normalisation:** Names are lowercased and trimmed server-side before
  storage.
- **Foreign key enforcement:** `PRAGMA foreign_keys = ON` is already set in
  `server/db.js`; the tasks migration does not change this.
- **Auth:** JWT middleware that protects `/api/contacts` and `/api/notes` must equally
  protect `/api/tasks` and `/api/task-tags`. No anonymous access.
- **`due_date` format:** The server only stores a validated date string. No time
  component means no timezone ambiguity or injection risk from time parsing.

---

## File Inventory

### New server files

| File                              | Purpose                                         |
|-----------------------------------|-------------------------------------------------|
| `server/models/task.js`           | CRUD for `tasks` table                          |
| `server/models/task-tag.js`       | Tag resolution, creation, orphan cleanup        |
| `server/routes/tasks.js`          | Express router for /api/tasks                   |
| `server/routes/task-tags.js`      | Express router for /api/task-tags               |

### New client files

| File                                           | Purpose                                    |
|------------------------------------------------|--------------------------------------------|
| `client/src/api/tasks.js`                      | Fetch wrapper for /api/tasks               |
| `client/src/api/task-tags.js`                  | Fetch wrapper for /api/task-tags           |
| `client/src/store/tasksStore.js`               | Zustand store for Tasks                    |
| `client/src/pages/TasksPage.jsx`               | Tasks list view                            |
| `client/src/pages/TaskEditorPage.jsx`          | Task create/edit view                      |
| `client/src/components/TaskList.jsx`           | Renders list of TaskCard rows              |
| `client/src/components/TaskCard.jsx`           | Single task card with inline status select |
| `client/src/components/TaskForm.jsx`           | Controlled form for all task fields        |
| `client/src/components/TaskToolbar.jsx`        | Pin toggle, save status, delete button     |
| `client/src/components/PriorityBadge.jsx`      | Coloured priority pill                     |
| `client/src/components/StatusBadge.jsx`        | Coloured status pill                       |
| `client/src/components/FilterControl.jsx`      | Status + priority multi-select filters     |

### New database files

| File                                    | Purpose                                          |
|-----------------------------------------|--------------------------------------------------|
| `db/migrations/003_create_tasks.sql`    | Creates tasks, task_tags_vocab, task_tags tables |

### Modified files

| File                         | Change required                                                   |
|------------------------------|-------------------------------------------------------------------|
| `server/index.js`            | Mount `/api/tasks` and `/api/task-tags` routers                   |
| `client/src/App.jsx`         | Add routes `/tasks`, `/tasks/new`, `/tasks/:id`; import new pages |
| `client/src/components/Sidebar.jsx` | Add inline SVG icons to all nav links; add Tasks link      |

---

Design draft complete. Please review and say 'design approved' to proceed to task breakdown.
