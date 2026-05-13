# Tasks — Implementation Tasks

**Feature:** Tasks
**Phase:** 3
**Status:** Approved — Ready to implement
**Date:** 2026-05-07

> Implement tasks in order. One commit per task. Run tests before committing.
> Use `/spec-implement tasks` to have Claude Code execute these with sub-agents.

---

## Task 1 — Database migration

**Files:** `db/migrations/003_create_tasks.sql`

**What:** Create the `tasks`, `task_tags_vocab`, and `task_tags` tables exactly as
specified in `design.md`. Include the composite primary key on `task_tags`, all four
indexes (`idx_tasks_due_date`, `idx_tasks_status_priority`, `idx_tasks_pinned_due`,
`idx_task_tags_tag_id`), and the two `CHECK` constraints on `priority` and `status`.
`PRAGMA foreign_keys = ON` is already set globally in `server/db.js`; do not add
it again. The migration runner in `server/db.js` already reads `db/migrations/`
in filename order — no runner changes are needed.

**Done when:**
- `003_create_tasks.sql` exists with the exact SQL from `design.md`
- `npm run dev:server` applies the migration without error on a fresh DB
- Running the server a second time does not fail or duplicate tables
- `tasks`, `task_tags_vocab`, and `task_tags` tables exist with correct columns,
  types, defaults, constraints, and indexes

**Commit:** `chore(db): add tasks, task_tags_vocab, and task_tags migration`

---

## Task 2 — Task model (server)

**Files:** `server/models/task.js`

**What:** Export five functions covering all task persistence operations. All
queries use parameterised `better-sqlite3` prepared statements — no string
interpolation of user input. Use `getDb()` from `server/db.js`.

- `create(fields)` — inserts a new row into `tasks` using provided fields
  (`title`, `body`, `due_date`, `priority`, `status`, `is_pinned`; all have
  defaults per the schema). Returns the newly created row via `findById`.
- `findAll({ sort, status, priority })` — returns task rows with a `body_preview`
  computed column (`SUBSTR(body, 1, 140)`, nullable). Sort is applied in three
  tiers: (1) `is_pinned DESC`, (2) a `CASE` expression that moves
  `Completed`/`Cancelled` tasks after active ones, (3) the `sort` parameter:
  - `due_asc` (default): `COALESCE(due_date, '9999-12-31') ASC`
  - `due_desc`: `COALESCE(due_date, '0000-01-01') DESC`
  - `priority_desc`: `CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END ASC`
  - `updated_desc`: `updated_at DESC`
  Filtering: when `status` is a non-empty array, add `WHERE status IN (...)`;
  likewise for `priority`. Only whitelisted enum values are accepted; unknown
  values are filtered out before the query is built. Tags are NOT attached in
  `findAll` — the route layer calls `getTagsForTask` separately per task.
- `findById(id)` — returns a single full task row (with full `body`), or
  `undefined` if not found.
- `update(id, fields)` — accepts any subset of `{ title, body, due_date,
  priority, status, is_pinned }`. Always sets `updated_at = datetime('now')`.
  Returns the updated row via `findById`.
- `destroy(id)` — deletes the task row; the `ON DELETE CASCADE` on `task_tags`
  handles join-table cleanup automatically. Returns `{ deleted: boolean }`.

**Done when:**
- All five functions are exported and work against the live DB
- `findAll` applies all three sort tiers correctly; pinned tasks are always first
- `findAll` filters by status and priority when arrays are provided
- Null due-date handling matches the design (`COALESCE` for `due_asc`/`due_desc`)
- Unit test in `tests/unit/task-model.test.js` covers all five functions including
  sort order, pin-first behaviour, status/priority filtering, and null due-date sort

**Commit:** `feat(tasks): task model with CRUD, sort, and filter`

---

## Task 3 — Task tag model (server)

**Files:** `server/models/task-tag.js`

**What:** Export three functions for task tag management. All writes execute inside
a single `db.transaction()` call. The structure mirrors `server/models/tag.js`
exactly, but operates on `task_tags_vocab` and `task_tags`.

- `findAll()` — returns all `task_tags_vocab` rows sorted `name ASC` as
  `{ id, name }` objects.
- `syncTaskTags(taskId, tagNames)` — the core lifecycle function. Accepts a task
  ID and an array of tag name strings (already normalised to lowercase/trimmed by
  the caller). Runs these six steps atomically inside a single transaction:
  1. `INSERT OR IGNORE INTO task_tags_vocab (name) VALUES (?)` for each name.
  2. Resolve the `id` of each name via `SELECT id FROM task_tags_vocab WHERE name = ?`.
  3. `DELETE FROM task_tags WHERE task_id = ?`.
  4. `INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)` for each resolved id.
  5. `DELETE FROM task_tags_vocab WHERE id NOT IN (SELECT DISTINCT tag_id FROM task_tags)`.
  Returns the updated list of `{ id, name }` tag objects for the task.
- `getTagsForTask(taskId)` — returns the `{ id, name }` tag objects currently
  associated with a task, sorted `name ASC`.

**Done when:**
- All three functions are exported and correct
- `syncTaskTags` runs inside a single transaction (atomicity verified by test)
- Orphan cleanup: a vocab entry with no remaining task associations is deleted
- Tag names are normalised to lowercase/trimmed inside `syncTaskTags` before
  any SQL is executed
- Unit test in `tests/unit/task-tag-model.test.js` covers `findAll`,
  `syncTaskTags` (create new tags, reuse existing tags, orphan cleanup), and
  `getTagsForTask`

**Commit:** `feat(tasks): task tag model with lifecycle and orphan cleanup`

---

## Task 4 — Tasks API routes (server)

**Files:** `server/routes/tasks.js`

**What:** Implement the Express router for all five `/api/tasks` endpoints.
Follow the same `ok(data, meta)` / `fail(code, fields)` envelope pattern used
in `server/routes/notes.js` and `server/routes/contacts.js`.

Endpoints:

- `GET /` — reads `sort`, `status`, and `priority` from `req.query`. Validates
  `sort` against the four allowed values (default `due_asc`); validates `status`
  and `priority` values against their enum allowlists (comma-separated; unknown
  values are dropped). Calls `Task.findAll({ sort, status, priority })`. For each
  task row, attaches `tags` via `TaskTag.getTagsForTask(task.id)`. Returns
  `{ data: tasks[], meta: { count } }`.
- `GET /:id` — calls `Task.findById(id)`. Attaches `tags`. Returns the full task
  object or 404.
- `POST /` — validates: `title` required and max 255 chars; `body` max 10,000
  chars; `due_date` matches `/^\d{4}-\d{2}-\d{2}$/` and is a valid calendar date
  when present; `priority` is one of `Low, Medium, High`; `status` is one of the
  five valid values; `tags` array max 5 entries, each max 30 chars. Normalises tag
  names (lowercase, trim). Calls `Task.create`, then `TaskTag.syncTaskTags`.
  Returns 201 with the full task object including tags.
- `PATCH /:id` — validates same rules (all fields optional for partial update).
  When `tags` is present in the body, calls `TaskTag.syncTaskTags`; when absent,
  tag set is unchanged. Calls `Task.update`. Returns 200 with the full task object.
- `DELETE /:id` — calls `Task.destroy`. The cascade handles `task_tags` cleanup;
  run a standalone orphan cleanup via `TaskTag.syncTaskTags(id, [])` is NOT
  needed because the cascade clears the join table, but call a direct orphan
  cleanup SQL (`DELETE FROM task_tags_vocab WHERE id NOT IN (SELECT DISTINCT
  tag_id FROM task_tags)`) after deletion. Returns `{ data: { deleted: true } }`.

Validation errors return 422 with `{ code: 'VALIDATION_ERROR', fields: { ... } }`.
Invalid / non-integer IDs return 404. Auth middleware is wired in Task 5.

**Done when:**
- All five endpoints respond correctly to valid requests
- Validation rejects title > 255 chars, body > 10,000 chars, invalid due_date,
  invalid enum values, tags array > 5 entries, tag name > 30 chars
- 404 returned for non-existent IDs
- Response envelope is consistent with the contacts and notes pattern
- Integration test in `tests/unit/tasks-api.test.js` covers all endpoints,
  including validation failures, 404 cases, tag attach/detach, and orphan cleanup

**Commit:** `feat(tasks): tasks REST API routes`

---

## Task 5 — Task tags API route and route mounting (server)

**Files:** `server/routes/task-tags.js`, `server/index.js`

**What:** Implement the single `GET /api/task-tags` endpoint and mount both new
task routers in the Express app.

`server/routes/task-tags.js`:
- `GET /` — calls `TaskTag.findAll()`, returns
  `{ data: tags[], meta: { count } }`.
- Apply the same auth middleware pattern that `server/routes/tags.js` uses.

`server/index.js` changes:
- Import `tasksRouter` from `./routes/tasks.js` and mount at `/api/tasks`.
- Import `taskTagsRouter` from `./routes/task-tags.js` and mount at `/api/task-tags`.
- Apply auth middleware to both routers at mount time, consistent with the
  existing contacts/notes/tags pattern.

**Done when:**
- `GET /api/task-tags` returns the full task tag vocab with the envelope
- Both `/api/tasks` and `/api/task-tags` are reachable via the running server
- The `GET /api/task-tags` endpoint is covered by an assertion in the integration
  test already written in Task 4
- `server/index.js` has no duplicated or orphaned route registrations

**Commit:** `feat(tasks): task-tags route and mount tasks + task-tags routers`

---

## Task 6 — Frontend API client

**Files:** `client/src/api/tasks.js`, `client/src/api/task-tags.js`

**What:** Two thin fetch-wrapper modules following the same pattern as
`client/src/api/notes.js` and `client/src/api/tags.js`.

`client/src/api/tasks.js`:
- `toCamel(task)` — converts snake_case API fields to camelCase:
  `is_pinned` → `isPinned`, `due_date` → `dueDate`,
  `body_preview` → `bodyPreview`, `created_at` → `createdAt`,
  `updated_at` → `updatedAt`. Passes `tags`, `title`, `body`, `priority`,
  `status`, `id` through as-is.
- `toSnake(task)` — converts camelCase inputs to snake_case for request bodies:
  `isPinned` → `is_pinned`, `dueDate` → `due_date`. Passes all other fields
  through. Converts the `tags` value to an array of name strings via a
  `tagsToPayload` helper (handles both `{ id, name }` objects and plain strings).
- `apiFetch(url, init)` — same implementation as in `notes.js` and `contacts.js`:
  unwraps `{ data, error, meta }` envelope, throws on non-2xx responses.
- `getTasks({ sort, status, priority })` — builds a query string from the provided
  params and calls `GET /api/tasks`. Returns `data[].map(toCamel)`.
- `getTask(id)` — `GET /api/tasks/:id`. Returns `toCamel(data)`.
- `createTask(task)` — `POST /api/tasks` with `toSnake(task)` body. Returns
  `toCamel(data)`.
- `updateTask(id, task)` — `PATCH /api/tasks/:id` with `toSnake(task)` body.
  Returns `toCamel(data)`.
- `deleteTask(id)` — `DELETE /api/tasks/:id`. Returns `data`.

`client/src/api/task-tags.js`:
- `getTaskTags()` — `GET /api/task-tags`. Returns `data` as-is (already
  `{ id, name }[]`), sorted `name ASC`.

**Done when:**
- All functions exported and correct
- `toCamel` / `toSnake` correctly map all fields including `isPinned`/`dueDate`
- `tagsToPayload` produces an array of strings from either input form
- `getTasks` correctly builds query string for `sort`, `status`, and `priority`
- Unit test in `tests/unit/tasks-api-client.test.js` verifies request shapes and
  field mapping with mocked `fetch`

**Commit:** `feat(tasks): frontend API client for tasks and task-tags`

---

## Task 7 — Zustand tasks store

**Files:** `client/src/store/tasksStore.js`

**What:** Zustand store containing all Tasks state and actions from `design.md`.

State shape (all fields from the design, with localStorage initialisation for
`sortKey`, `statusFilter`, and `priorityFilter`):
- `tasks` — `[]`
- `selectedTask` — `null`
- `taskTags` — `[]`
- `isLoading` — `false`
- `isSaving` — `false`
- `saveStatus` — `'idle'`
- `error` — `null`
- `sortKey` — `localStorage.getItem('tasks_sort') ?? 'due_asc'`
- `statusFilter` — `JSON.parse(localStorage.getItem('tasks_filter_status') ?? '[]')`
- `priorityFilter` — `JSON.parse(localStorage.getItem('tasks_filter_priority') ?? '[]')`
- `displayedTasks` — derived; initialised to `[]`

Actions:
- `fetchTasks()` — calls `getTasks()` from the API client (no query params; all
  filtering and sorting is done client-side). Sets `isLoading`. On success, sets
  `tasks` and re-derives `displayedTasks`.
- `fetchTask(id)` — calls `getTask(id)`, sets `selectedTask`.
- `createTask(data)` — calls `createTask(data)` from the API client; prepends the
  returned task to `tasks`; re-derives `displayedTasks`; returns the created task.
- `updateTask(id, data)` — sets `isSaving = true` and `saveStatus = 'saving'`;
  calls `updateTask(id, data)`; replaces the matching entry in `tasks`; updates
  `selectedTask` if it matches; re-derives `displayedTasks`; sets `isSaving = false`
  and `saveStatus = 'saved'`; schedules `saveStatus = 'idle'` after 2 s.
  On error sets `saveStatus = 'error'` and `isSaving = false`.
- `deleteTask(id)` — calls `deleteTask(id)`; removes from `tasks`; clears
  `selectedTask`; re-derives `displayedTasks`.
- `fetchTaskTags()` — calls `getTaskTags()`, sets `taskTags`.
- `setSortKey(key)` — sets `sortKey`; persists to
  `localStorage.setItem('tasks_sort', key)`; re-derives `displayedTasks`.
- `setStatusFilter(values)` — sets `statusFilter`; persists to
  `localStorage.setItem('tasks_filter_status', JSON.stringify(values))`;
  re-derives `displayedTasks`.
- `setPriorityFilter(values)` — sets `priorityFilter`; persists to
  `localStorage.setItem('tasks_filter_priority', JSON.stringify(values))`;
  re-derives `displayedTasks`.
- `setSelectedTask(task)` — sets `selectedTask` directly.

Private helper `_deriveDisplayed(tasks, sortKey, statusFilter, priorityFilter)`:
1. Apply `statusFilter`: if non-empty, keep only tasks whose `status` is in the filter.
2. Apply `priorityFilter`: if non-empty, keep only tasks whose `priority` is in the filter.
3. Separate pinned from unpinned; within each group, separate active
   (status not in `['Completed','Cancelled']`) from done.
4. Sort each of the four buckets by `sortKey` (null `dueDate` treated as
   `'9999-12-31'` for `due_asc`, `'0000-01-01'` for `due_desc`; priority sorted
   High → Medium → Low; `updatedAt` sorted descending).
5. Concatenate: `[pinnedActive, pinnedDone, unpinnedActive, unpinnedDone]`.

Export as `useTasksStore`.

**Done when:**
- Store initialises `sortKey`, `statusFilter`, and `priorityFilter` from localStorage
- `displayedTasks` is always re-derived on any change to `tasks`, `sortKey`,
  `statusFilter`, or `priorityFilter`
- `isSaving` and `saveStatus` transition correctly through `saving → saved → idle`
- `setSortKey`, `setStatusFilter`, `setPriorityFilter` all persist to localStorage
- `_deriveDisplayed` correctly applies pinned-first, done-last, and sort order
- Unit test in `tests/unit/tasks-store.test.js` covers all actions, the derived
  display logic, localStorage persistence, and `saveStatus` transitions, mocking
  the API client

**Commit:** `feat(tasks): Zustand tasks store with actions and derived display`

---

## Task 8 — PriorityBadge and StatusBadge components

**Files:** `client/src/components/PriorityBadge.jsx`,
`client/src/components/StatusBadge.jsx`

**What:** Two small pure presentational badge components used by `TaskCard` and
`TaskEditorPage`.

`PriorityBadge.jsx`:
- Props: `priority` (string — `'Low'`, `'Medium'`, or `'High'`).
- Renders a `<span>` pill with the priority label.
- Tailwind colour classes per the design palette:
  - `Low`: `bg-gray-100 text-gray-600`
  - `Medium`: `bg-amber-100 text-amber-700`
  - `High`: `bg-red-100 text-red-700`
- Common classes: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium`.
- Unknown priority values render with a neutral fallback (grey).

`StatusBadge.jsx`:
- Props: `status` (string — one of the five valid status values).
- Renders a `<span>` pill with the status label.
- Tailwind colour classes per the design palette:
  - `Not Started`: `bg-gray-100 text-gray-600`
  - `Blocked`: `bg-orange-100 text-orange-700`
  - `In Progress`: `bg-blue-100 text-blue-700`
  - `Completed`: `bg-green-100 text-green-700`
  - `Cancelled`: `bg-slate-100 text-slate-500`
- Same common classes as `PriorityBadge`.
- Unknown status values render with a neutral fallback.

**Done when:**
- Both components render the correct label and Tailwind classes for every valid
  value
- Unknown values degrade gracefully (no crash, neutral styling)
- Unit test in `tests/unit/PriorityBadge.test.jsx` covers all three priorities and
  an unknown value
- Unit test in `tests/unit/StatusBadge.test.jsx` covers all five statuses and an
  unknown value

**Commit:** `feat(tasks): PriorityBadge and StatusBadge components`

---

## Task 9 — FilterControl component

**Files:** `client/src/components/FilterControl.jsx`

**What:** A multi-select filter UI for status and priority. Used by `TasksPage`.

Props:
- `statusFilter` (string[]) — currently active status filters.
- `priorityFilter` (string[]) — currently active priority filters.
- `onStatusChange(values[])` — called with the new status filter array.
- `onPriorityChange(values[])` — called with the new priority filter array.

Behaviour:
- Renders two independent multi-select sections side-by-side: "Status" and
  "Priority".
- Each section shows its enum values as toggle buttons (or checkboxes). Clicking
  a value toggles it in the filter array and calls the corresponding callback.
- When one or more filters are active, shows a small count badge (e.g. "2 active")
  next to the section label so the user knows filters are applied.
- A "Clear" button (or link) per section resets that filter to `[]` and calls the
  callback.
- Tailwind classes only; no inline styles. All toggles use keyboard-accessible
  `<button>` elements with appropriate `aria-pressed` attributes.

**Done when:**
- Clicking a status value toggles it in `statusFilter` and fires `onStatusChange`
- Clicking a priority value toggles it in `priorityFilter` and fires `onPriorityChange`
- Active count badge shows correct count when filters are applied
- "Clear" resets the corresponding filter array
- Unit test in `tests/unit/FilterControl.test.jsx` covers: toggle on, toggle off,
  clear, count badge display, and keyboard accessibility (`aria-pressed`)

**Commit:** `feat(tasks): FilterControl component for status and priority filters`

---

## Task 10 — TaskCard and TaskList components

**Files:** `client/src/components/TaskCard.jsx`,
`client/src/components/TaskList.jsx`

**What:** The task list row and its wrapper list component.

`TaskCard.jsx`:
- Props: `task` (camelCase task object), `onSelect(task)`, `onStatusChange(id, status)`.
- Renders a card containing:
  - A pin icon (Unicode pin `📌` or a simple SVG) visible only when `task.isPinned`.
  - Title in bold; when status is `Completed` or `Cancelled`, apply
    `line-through text-gray-400` to the title.
  - Body preview text (`task.bodyPreview`) truncated to one line.
  - Due date formatted as a human-readable date (e.g. `"May 12, 2026"`) using
    `Intl.DateTimeFormat`. When the due date is in the past and the task is not
    Completed or Cancelled, apply `text-red-600` to the date.
  - `PriorityBadge` for the task's priority.
  - `StatusBadge` for the task's status.
  - An inline `<select>` dropdown for status change — the selected option is the
    current status; changing it calls `onStatusChange(task.id, newStatus)`.
    The `<select>` must call `e.stopPropagation()` so it does not trigger
    `onSelect`.
  - Tags rendered as small grey pills (reuse the chip style from `TagCombobox` or
    define similar Tailwind classes inline).
- The overall card is a `<div>` with `role="button"` and `tabIndex={0}` that
  fires `onSelect(task)` on click and on Enter/Space key.
- Done tasks (Completed or Cancelled) receive `bg-gray-50` card background.
- Normal tasks receive `bg-white` card background.
- Tailwind classes only.

`TaskList.jsx`:
- Props: `tasks[]`, `onSelect(task)`, `onStatusChange(id, status)`.
- Renders a `<ul>` of `TaskCard` components, keyed by `task.id`.
- If `tasks` is empty, renders nothing (parent `TasksPage` shows `EmptyState`).

**Done when:**
- `TaskCard` renders all fields correctly; pin icon is conditional; done treatment
  applies strikethrough and grey background; overdue dates are red
- Inline status `<select>` calls `onStatusChange` and does not trigger `onSelect`
- Keyboard navigation (Enter/Space) fires `onSelect`
- `TaskList` renders one card per task
- Unit test in `tests/unit/TaskCard.test.jsx` covers: full render, done visual
  treatment, overdue date colouring, status change via select, click/keyboard
  navigation, and pin icon visibility
- Unit test in `tests/unit/TaskList.test.jsx` covers: renders correct count,
  empty renders nothing

**Commit:** `feat(tasks): TaskCard and TaskList components`

---

## Task 11 — TasksPage

**Files:** `client/src/pages/TasksPage.jsx`

**What:** The Tasks list page. Fetches tasks on mount; shows filter controls, sort
control, task list, and a "New Task" button.

Behaviour:
- On mount: calls `fetchTasks()` and `fetchTaskTags()` from `useTasksStore`.
- Renders a page header "Tasks" and a "New Task" button (navigates to `/tasks/new`).
- Renders `FilterControl` wired to `statusFilter`, `priorityFilter`,
  `setStatusFilter`, and `setPriorityFilter` from the store.
- Renders `SortControl` wired to `sortKey` and `setSortKey`. Pass task-specific
  options: `due_asc` = "Due Date (Soonest)", `due_desc` = "Due Date (Latest)",
  `priority_desc` = "Priority (High→Low)", `updated_desc` = "Last Modified".
  `SortControl` already accepts a generic `options[]` prop; pass the array here.
- Renders `TaskList` with `displayedTasks` from the store.
  - `onSelect` navigates to `/tasks/:id`.
  - `onStatusChange` calls `updateTask(id, { status })` from the store.
- When `displayedTasks` is empty and not loading and no filters are active, renders
  `EmptyState` with a prompt to create the first task.
- When `displayedTasks` is empty and filters ARE active, renders a "No tasks match
  your filters" message (not `EmptyState`).
- Shows a loading indicator while `isLoading` is true.
- Shows the store's `error` in a red banner when non-null.

**Done when:**
- Tasks are fetched on mount; list renders correctly
- Filter controls change `statusFilter`/`priorityFilter` in the store and the
  list updates
- Sort control changes `sortKey` and the list reorders
- "New Task" navigates to `/tasks/new`; clicking a card navigates to `/tasks/:id`
- Inline status change on a card calls `updateTask` in the store
- Empty state appears when there are no tasks (unfiltered)
- "No tasks match filters" message appears when filtered results are empty
- Error banner appears when the store has an error
- Unit test in `tests/unit/TasksPage.test.jsx` mocks the store and verifies:
  fetch-on-mount, filter wiring, sort wiring, navigation, status change, empty
  state, filtered-empty message, and error banner

**Commit:** `feat(tasks): TasksPage list view`

---

## Task 12 — TaskForm and TaskToolbar components

**Files:** `client/src/components/TaskForm.jsx`,
`client/src/components/TaskToolbar.jsx`

**What:** The controlled form for task fields and the toolbar strip at the top of
`TaskEditorPage`. Grouped in one task because both are leaf components used only
by `TaskEditorPage`.

`TaskForm.jsx`:
- Props: `task` (camelCase task object or `null`), `onChange(fields)`, `onBlur()`.
- Renders controlled inputs for all task fields:
  - `<input type="text">` for `title` — required; max 255 chars; character counter
    below the field. Shows inline validation error when title is empty.
  - `<textarea>` for `body` — optional; max 10,000 chars; character counter below.
  - `<input type="date">` for `dueDate` — optional.
  - `<select>` for `priority` — options: Low, Medium, High.
  - `<select>` for `status` — options: Not Started, Blocked, In Progress,
    Completed, Cancelled.
- On every field change, calls `onChange({ fieldName: newValue })` with only the
  changed field (not the full task object), so the parent can merge it.
- Calls `onBlur()` on the `onBlur` event of any field (used to flush auto-save).
- Character counters show `"x / 255"` for title and `"x / 10,000"` for body using
  `toLocaleString()`. Counter turns red when the limit is reached.
- Tags are NOT part of `TaskForm` — they are rendered by `TagCombobox` directly
  in `TaskEditorPage`.
- Tailwind classes only; no inline styles.

`TaskToolbar.jsx`:
- Props: `isPinned` (boolean), `onTogglePin()`, `onDelete()`, `isSaving` (boolean),
  `saveStatus` (string — `'idle' | 'saving' | 'saved' | 'error'`).
- Renders in a single flex row:
  - Pin toggle button: label "Pinned" (active, blue) or "Pin" (inactive, grey).
    Calls `onTogglePin()` on click.
  - Save status indicator: shows `"Saving..."` when `saveStatus === 'saving'`,
    `"Saved"` when `saveStatus === 'saved'`, `"Save failed"` (red) when
    `saveStatus === 'error'`, and nothing when `'idle'`.
  - Delete button: red-toned; labelled "Delete". Calls `onDelete()` on click.
- Tailwind classes only; no inline styles.

**Done when:**
- `TaskForm` renders all five fields as controlled inputs; `onChange` fires on
  every change with only the changed field
- `onBlur` fires when any field loses focus
- Character counters are accurate; counter turns red at the limit
- Empty title shows inline validation error
- `TaskToolbar` renders correct labels and colours for all `saveStatus` values
- Pin button label/colour changes with `isPinned`
- Unit test in `tests/unit/TaskForm.test.jsx` covers: all field renders, onChange
  for each field, onBlur, character counters, and title validation
- Unit test in `tests/unit/TaskToolbar.test.jsx` covers: all saveStatus values,
  pin toggle states, and delete button click

**Commit:** `feat(tasks): TaskForm and TaskToolbar components`

---

## Task 13 — TaskEditorPage

**Files:** `client/src/pages/TaskEditorPage.jsx`

**What:** The task create/edit page. Handles auto-save (800 ms debounce with flush
on blur/navigation), tag changes, pin toggle, and delete with confirmation.
Follows the same pattern as `NoteEditorPage`.

Create mode (`/tasks/new`):
- On mount calls `createTask({ title: 'New Task', priority: 'Low', status: 'Not Started', is_pinned: false, tags: [] })` immediately to obtain an ID; navigates to
  `/tasks/<id>` using `replace: true` so the browser back button skips
  `/tasks/new`.

Edit mode (`/tasks/:id`):
- On mount calls `fetchTask(id)` and `fetchTaskTags()`.
- If the task is not found after load, navigates to `/tasks` with a
  router-state toast message.

Auto-save:
- Holds a `useRef` debounce timer. On every `TaskForm` `onChange` event, merges
  the changed field into local state (`localTask`) — a camelCase copy of the
  task being edited — clears the timer and schedules a new one for 800 ms.
  When it fires, calls `updateTask(id, localTask)`.
- On `TaskForm` `onBlur`, flushes the debounce immediately.
- Auto-save is suppressed client-side if `localTask.title` is empty.

Pin and tags:
- Pin toggle calls `updateTask(id, { isPinned: !isPinned })` immediately (no
  debounce); also calls `setSelectedTask` to update UI optimistically.
- Tag changes from `TagCombobox` call `updateTask(id, { tags: newTags })`
  immediately, then call `fetchTaskTags()` to refresh the available tag list.

Delete:
- `onDelete` from `TaskToolbar` sets `showConfirm = true`.
- `ConfirmDialog` confirmation calls `deleteTask(id)` then navigates to `/tasks`.
- Cancel sets `showConfirm = false`.

Layout:
- `TaskToolbar` at the top.
- `TaskForm` below (full-width column layout — no side-by-side split; tasks have
  no Markdown preview).
- `TagCombobox` below the form, wired to `taskTags` from the store and the tags
  on `selectedTask`.
- `ConfirmDialog` rendered conditionally at the bottom of the JSX.
- Shows a loading indicator while `isLoading` is true and `selectedTask` is null.

**Done when:**
- Create mode creates a task immediately and redirects to its URL
- Edit mode loads the task and displays all fields, tags, and pin state
- Auto-save fires after 800 ms of inactivity; flushes on blur/navigation
- Auto-save is suppressed when title is empty; validation message is shown
- `isSaving` and `saveStatus` in the store update correctly during saves
- Pin toggle saves immediately; UI updates optimistically
- Tag changes save immediately; available tag list refreshes
- Delete shows `ConfirmDialog`; confirmed delete navigates to `/tasks`
- 404 task ID navigates to `/tasks`
- Unit test in `tests/unit/TaskEditorPage.test.jsx` mocks the store and covers:
  create-mode redirect, edit-mode load, auto-save debounce, pin toggle, tag
  change, delete flow, and 404 redirect

**Commit:** `feat(tasks): TaskEditorPage with auto-save, tags, pin, and delete`

---

## Task 14 — Routing, Sidebar icons, and Tasks sidebar link

**Files:** `client/src/App.jsx`, `client/src/components/Sidebar.jsx`

**What:** Add the three Tasks routes to the React Router configuration and update
`Sidebar.jsx` to add the Tasks link AND add inline SVG icons to ALL module links
(Contacts, Notes, Tasks). This is a single commit because both changes are in the
same two files.

`client/src/App.jsx`:
- Import `TasksPage` from `./pages/TasksPage.jsx`.
- Import `TaskEditorPage` from `./pages/TaskEditorPage.jsx`.
- Add three routes:
  - `/tasks` → `TasksPage`
  - `/tasks/new` → `TaskEditorPage`
  - `/tasks/:id` → `TaskEditorPage`
- Leave the root redirect (`/` → `/contacts`) unchanged.

`client/src/components/Sidebar.jsx`:
- Add an `icon` field to each entry in `NAV_LINKS` — a React element (inline
  SVG) per the icon assignments in `design.md`:
  - Contacts: person silhouette — circle head + arc shoulders
  - Notes: document with lines — rectangle with three horizontal lines
  - Tasks: checkbox — square with a tick mark
- All icons: `width="16" height="16" viewBox="0 0 16 16"`, `aria-hidden="true"`,
  `stroke="currentColor"`, `fill="none"`, `strokeWidth="1.5"`,
  `strokeLinecap="round"`.
- Add `{ label: 'Tasks', to: '/tasks', icon: <...svg...> }` to `NAV_LINKS`.
- Update the `NAV_LINKS.map` render to:
  `<span aria-hidden="true">{icon}</span><span>{label}</span>` inside each
  `NavLink`, with `flex items-center gap-2` on the NavLink's inner wrapper.
- The `navLinkClass` function remains unchanged — `currentColor` propagates to
  icons automatically.
- The `end` prop for Contacts remains `true`; all other links omit `end` (or
  set it to `false`) so sub-paths highlight the sidebar item.

**Done when:**
- `/tasks`, `/tasks/new`, and `/tasks/:id` all render the correct page components
- Sidebar shows icons for Contacts, Notes, and Tasks alongside their labels
- Active link highlights both icon and label
- Existing contacts and notes routes are unaffected
- Unit test in `tests/unit/Sidebar.test.jsx` (create if not present) verifies
  that three nav links render, each contains an SVG element, and the correct
  link is highlighted for `/tasks/*` paths
- Unit test in `tests/unit/app-routing.test.jsx` is updated to assert the
  three new task routes render the correct components

**Commit:** `feat(tasks): add Tasks routes and sidebar icons for all modules`

---

## Task 15 — E2E test: tasks happy path

**Files:** `tests/e2e/tasks.spec.js`

**What:** Playwright end-to-end test covering the full Tasks user journey.

**Done when:** The test passes end-to-end for this sequence:
1. Navigate to `/tasks`; see the empty state.
2. Click "New Task"; land on `/tasks/<id>`.
3. Fill in a title ("Buy groceries"), a body, a due date (tomorrow's date), set
   priority to "High", and status to "In Progress".
4. Wait 1 second for auto-save to fire; verify `"Saved"` indicator appears.
5. Open the `TagCombobox`; type a new tag name ("personal") and press Enter.
6. Verify the tag chip appears.
7. Navigate back to `/tasks`; verify the task card shows the title, due date,
   priority badge ("High"), status badge ("In Progress"), and tag chip.
8. Change the status on the card via the inline `<select>` to "Completed";
   verify the card moves to the bottom of the list and the title receives
   strikethrough styling.
9. Click "New Task" again; create a second task ("Write report") with priority
   "Medium".
10. Return to the first task detail page; toggle the pin; navigate back;
    verify the pinned task appears at the top of the list above the second task.
11. Open the first task again; click Delete; cancel in `ConfirmDialog`; verify
    the task is still there.
12. Click Delete again; confirm; verify redirect to `/tasks` and the task is gone.

**Commit:** `test(tasks): E2E happy path with Playwright`

---

## Implementation Complete

After Task 15, run:

```bash
npm test
npm run test:e2e
```

Then run `/spec-review tasks` to invoke the Reviewer Agent.
