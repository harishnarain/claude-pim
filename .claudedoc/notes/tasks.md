# Notes — Implementation Tasks

**Feature:** Notes  
**Phase:** 2  
**Status:** Approved — Ready to implement  
**Date:** 2026-05-06

> Implement tasks in order. One commit per task. Run tests before committing.
> Use `/spec-implement notes` to have Claude Code execute these with sub-agents.

---

## Task 1 — Database migration

**Files:** `db/migrations/002_create_notes.sql`

**What:** Create the `notes`, `tags`, and `note_tags` tables exactly as specified in
design.md. Include the composite primary key on `note_tags`, the two indexes
(`idx_notes_updated_at` and `idx_note_tags_tag_id`), and enable foreign keys
via `PRAGMA foreign_keys = ON`. The migration runner in `server/db.js` already
reads `db/migrations/` in filename order so no runner changes are needed.

**Done when:**
- `002_create_notes.sql` file exists with the exact SQL from design.md
- `npm run dev:server` applies the migration without error on a fresh DB
- Running the server a second time does not fail or duplicate tables
- `notes`, `tags`, and `note_tags` tables are visible in the DB with the
  correct columns, types, defaults, and constraints

**Commit:** `chore(db): add notes, tags, and note_tags migration`

---

## Task 2 — Note model (server)

**Files:** `server/models/note.js`

**What:** Export five functions covering all note persistence operations.

- `create(fields)` — inserts a new row into `notes` (content, is_pinned defaults)
  and returns the full note row (without tags; tag wiring is the tag model's job).
- `findAll({ sort })` — returns all note rows, sorted per the `sort` param:
  `updated_desc` (default), `updated_asc`, or `title_asc`. Pinned notes always
  sort first within any secondary order. Pinned ordering: `ORDER BY is_pinned DESC,
  <secondary>`. For `title_asc`, secondary sort is the first line of `content`
  computed in SQLite via `SUBSTR(content, 1, INSTR(content || '\n', '\n') - 1)`.
  Each row in the result also carries a `title` column (same first-line derivation)
  and a `preview` column (next 140 characters after the first newline, with leading/
  trailing whitespace removed). Both are computed columns in the SELECT, not stored.
- `findById(id)` — returns a single note row, or `undefined` if not found. Includes
  the `title` computed column.
- `update(id, fields)` — accepts any subset of `{ content, is_pinned }`. Always
  sets `updated_at = datetime('now')`. Returns the updated row via `findById`.
- `destroy(id)` — deletes the note row; cascades remove `note_tags` rows. Returns
  `{ deleted: boolean }`.

All queries use parameterised better-sqlite3 prepared statements. No string
interpolation of user data. Use `getDb()` from `server/db.js`.

**Done when:**
- All five functions are exported and work against the live DB
- `findAll` returns rows with `title` and `preview` computed columns
- `findAll` sort orders `updated_desc`, `updated_asc`, and `title_asc` all
  return pinned notes first within each order
- Unit test in `tests/unit/note-model.test.js` covers all five functions,
  including sort order and pin-first behaviour

**Commit:** `feat(notes): note model with CRUD and sort`

---

## Task 3 — Tag model (server)

**Files:** `server/models/tag.js`

**What:** Export three functions for tag management. All writes execute inside
a single `db.transaction()` call to keep state consistent.

- `findAll()` — returns all tag rows sorted `name ASC`.
- `syncNoteTags(noteId, tagNames)` — the core lifecycle function. Accepts a
  note ID and an array of tag name strings (already normalised to lowercase/
  trimmed by the caller). Runs these steps atomically:
  1. For each name: `INSERT OR IGNORE INTO tags (name) VALUES (?)`.
  2. Resolve the `id` of each name via `SELECT id FROM tags WHERE name = ?`.
  3. `DELETE FROM note_tags WHERE note_id = ?`.
  4. `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)` for each resolved id.
  5. `DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)`.
  Returns the updated list of `{ id, name }` tag objects for the note.
- `getTagsForNote(noteId)` — returns the `{ id, name }` tag objects currently
  associated with a note, sorted `name ASC`.

**Done when:**
- All three functions are exported and correct
- `syncNoteTags` is wrapped in a single transaction (atomicity verified by test)
- Orphan cleanup: a tag with no remaining note associations is deleted
- Tag names are normalised to lowercase/trimmed inside `syncNoteTags` before
  any SQL is executed
- Unit test in `tests/unit/tag-model.test.js` covers `findAll`,
  `syncNoteTags` (create new tags, reuse existing tags, orphan cleanup), and
  `getTagsForNote`

**Commit:** `feat(notes): tag model with lifecycle and orphan cleanup`

---

## Task 4 — Notes API routes (server)

**Files:** `server/routes/notes.js`

**What:** Implement the Express router for all five `/api/notes` endpoints. Follow
the same `ok(data, meta)` / `fail(code, fields)` envelope pattern used in
`server/routes/contacts.js`.

Endpoints:

- `GET /` — calls `Note.findAll({ sort })` where `sort` comes from `req.query.sort`
  (default `updated_desc`). For each note row, attaches `tags` via
  `Tag.getTagsForNote(note.id)`. Returns `{ data: notes[], meta: { count } }`.
- `GET /:id` — calls `Note.findById(id)`. Attaches `tags`. Returns the full note
  or 404.
- `POST /` — validates: `content` length <= 25,000; `tags` array length <= 5;
  each tag name length <= 30 chars. Normalises tag names (lowercase, trim).
  Calls `Note.create`, then `Tag.syncNoteTags`. Returns 201 with the full note
  including tags.
- `PATCH /:id` — validates same rules; partial update. When `tags` is present,
  calls `Tag.syncNoteTags`. When absent, tag set is unchanged. Updates
  `updated_at` via `Note.update`. Returns 200 with the full note.
- `DELETE /:id` — calls `Note.destroy`. If `tags` were associated, the cascade
  removes `note_tags` rows; a follow-up `Tag.syncNoteTags(id, [])` is not needed
  because the cascade handles it, but a standalone orphan cleanup query should
  still run. Returns `{ data: { deleted: true } }`.

Validation errors return 422 with `{ code: 'VALIDATION_ERROR', fields: { ... } }`.
Invalid / non-integer IDs return 404. All routes use `logger` for info/warn.
JWT middleware is not applied in this task (auth is wired in Task 5).

**Done when:**
- All five endpoints respond correctly to valid requests via manual curl
- Validation rejects `content` > 25,000 chars, tags array > 5, tag name > 30 chars
- 404 returned for non-existent IDs
- Response envelope is consistent with the contacts pattern
- Integration test in `tests/unit/notes-api.test.js` covers all endpoints,
  including validation failures and 404 cases

**Commit:** `feat(notes): notes REST API routes`

---

## Task 5 — Tags API route and route mounting (server)

**Files:** `server/routes/tags.js`, `server/index.js`

**What:** Implement the single `GET /api/tags` endpoint and mount both new routers
in the Express app.

`server/routes/tags.js`:
- `GET /` — calls `Tag.findAll()`, returns `{ data: tags[], meta: { count } }`.
- Apply JWT auth middleware to this router (same import pattern as contacts if
  auth middleware exists; if auth is still a stub, follow whatever pattern the
  contacts router uses).

`server/index.js` changes:
- Import `notesRouter` from `./routes/notes.js` and mount at `/api/notes`.
- Import `tagsRouter` from `./routes/tags.js` and mount at `/api/tags`.
- Apply JWT auth middleware to both routers at mount time (same pattern as
  `/api/contacts` if that middleware is present; document in a comment if it
  is still a stub).

**Done when:**
- `GET /api/tags` returns the full tag list with the `{ data, error, meta }` envelope
- Both `/api/notes` and `/api/tags` are reachable via the running server
- The tags endpoint is covered by the integration test already written in Task 4
  (add a `GET /api/tags` assertion there rather than a new file)
- `server/index.js` has no duplicated or orphaned route registrations

**Commit:** `feat(notes): tags route and mount notes + tags routers`

---

## Task 6 — Notes API client (frontend)

**Files:** `client/src/api/notes.js`, `client/src/api/tags.js`

**What:** Two thin fetch-wrapper modules following the exact pattern of
`client/src/api/contacts.js`.

`client/src/api/notes.js`:
- `toCamel(note)` — converts `is_pinned` -> `isPinned`, `created_at` ->
  `createdAt`, `updated_at` -> `updatedAt`. Passes `tags`, `title`, `preview`
  through as-is.
- `toSnake(note)` — converts `isPinned` -> `is_pinned`; passes `content` as-is;
  converts the `tags` value to an array of name strings via a `tagsToPayload`
  helper (handles both `{ id, name }` objects and plain strings).
- `apiFetch(url, init)` — same implementation as in contacts: unwraps envelope,
  throws on non-2xx.
- `getNotes({ sort })` — `GET /api/notes?sort=<sort>` returns `data[].map(toCamel)`.
- `getNote(id)` — `GET /api/notes/:id` returns `toCamel(data)`.
- `createNote(note)` — `POST /api/notes` returns `toCamel(data)`.
- `updateNote(id, note)` — `PATCH /api/notes/:id` returns `toCamel(data)`.
- `deleteNote(id)` — `DELETE /api/notes/:id` returns `data`.

`client/src/api/tags.js`:
- `getTags()` — `GET /api/tags` returns `data` as-is (already `{ id, name }`).

**Done when:**
- All six functions in `notes.js` and one function in `tags.js` are exported
- `toCamel` / `toSnake` correctly map all fields including `isPinned`
- `tagsToPayload` produces an array of strings from either input form
- Unit test in `tests/unit/notes-api-client.test.js` verifies request shapes
  and field mapping with mocked `fetch`

**Commit:** `feat(notes): frontend API client for notes and tags`

---

## Task 7 — Zustand notes store

**Files:** `client/src/store/notesStore.js`

**What:** Zustand store containing all Notes state and actions from design.md.

State shape:
- `notes` — `[]` (raw list from last fetch)
- `selectedNote` — `null`
- `tags` — `[]` (all available tags)
- `isLoading` — `false`
- `isSaving` — `false`
- `error` — `null`
- `sortKey` — initialised from `localStorage.getItem('notes_sort') ?? 'updated_desc'`
- `sortedNotes` — derived from `notes` + `sortKey` (pinned-first, then secondary
  sort); recomputed whenever either changes

Actions:
- `fetchNotes()` — calls `getNotes({ sort: sortKey })`, sets `notes` and
  re-derives `sortedNotes`. Sets `isLoading` around the request.
- `fetchNote(id)` — calls `getNote(id)`, sets `selectedNote`.
- `createNote(data)` — calls `createNote(data)` from the API client; prepends
  the returned note to `notes`; re-derives `sortedNotes`; returns the note.
- `updateNote(id, data)` — sets `isSaving = true`; calls `updateNote(id, data)`;
  replaces the matching entry in `notes`; updates `selectedNote` if it matches;
  re-derives `sortedNotes`; sets `isSaving = false`.
- `deleteNote(id)` — calls `deleteNote(id)`; removes the note from `notes`;
  clears `selectedNote`; re-derives `sortedNotes`.
- `fetchTags()` — calls `getTags()`, sets `tags`.
- `setSortKey(key)` — sets `sortKey`; persists to `localStorage.setItem('notes_sort', key)`;
  re-derives `sortedNotes` from the current `notes`.
- `setSelectedNote(note)` — sets `selectedNote` directly (used for optimistic
  updates during auto-save).

The `_deriveSorted(notes, sortKey)` helper (private, not exported) implements
the sort: separate pinned (`isPinned === true`) from unpinned; sort each group
by the chosen key (`updatedAt` desc/asc, or `title` asc case-insensitive);
concatenate pinned + unpinned.

Export as `useNotesStore`.

**Done when:**
- Store initialises `sortKey` from `localStorage`
- All actions update state correctly; `isSaving` is set/cleared around `updateNote`
- `sortedNotes` is always pinned-first within the chosen secondary sort
- `setSortKey` persists to `localStorage`
- Unit test in `tests/unit/notes-store.test.js` covers all actions and the
  derived sort behaviour, mocking the API client

**Commit:** `feat(notes): Zustand notes store with actions and derived sort`

---

## Task 8 — Markdown rules and renderer library

**Files:** `client/src/lib/markdownRules.js`, `client/src/lib/markdownRenderer.js`

**What:** The two-file Markdown processing pipeline described in design.md.
No third-party Markdown library. No `dangerouslySetInnerHTML`.

`client/src/lib/markdownRules.js`:
- Export `BLOCK_RULES` — ordered array of rule objects, each with
  `{ name, test(line), render(line, key) }`. Rules in order:
  1. `codeBlock` — handled by the renderer's pre-processing pass (see below);
     this sentinel rule's `test` always returns `false` (blocks are extracted
     before line-by-line processing).
  2. `heading1` — line starts with `# ` (space required).
  3. `heading2` — line starts with `## `.
  4. `heading3` — line starts with `### `.
  5. `blockquote` — line starts with `> `.
  6. `unorderedList` — line starts with `- ` or `* `.
  7. `orderedList` — line starts with a digit followed by `. `.
  8. `paragraph` — fallthrough (test always returns `true`).
  Each `render(line, key)` strips the leading syntax characters, applies
  inline rules to the remaining text, and returns the appropriate React element
  (`<h1>`, `<h2>`, `<h3>`, `<blockquote>`, `<li>`, `<p>`).
- Export `INLINE_RULES` — ordered array of inline rule objects, each with
  `{ name, pattern (RegExp), render(match, key) }`:
  1. `bold` — `**text**` -> `<strong>`.
  2. `italic` — `*text*` or `_text_` -> `<em>` (must not conflict with bold;
     bold is checked first).
  3. `inlineCode` — `` `code` `` -> `<code>`.
  4. `link` — `[label](url)` -> `<a target="_blank" rel="noopener noreferrer">`.

`client/src/lib/markdownRenderer.js`:
- Export `renderMarkdown(content)` — accepts a raw Markdown string and returns
  `ReactNode[]` (array of React elements ready to render as children of a `<div>`).
- Pre-processing steps (in order):
  1. Split content on newlines.
  2. Extract fenced code blocks (lines between ` ``` ` delimiters) as a single
     `<pre><code>` element; replace those line ranges with a placeholder to skip
     them in line-by-line processing.
  3. Group consecutive `unorderedList` lines into a single `<ul>` element;
     group consecutive `orderedList` lines into a single `<ol>` element.
  4. Apply block rules line-by-line for remaining lines.
- `applyInlineRules(text)` — applies each `INLINE_RULE` in order via regex
  split, returning a mixed array of strings and React elements. Used inside
  each block rule's `render` for the text content.

**Done when:**
- `renderMarkdown` returns correct React elements for all 8 block types and 4
  inline types without using `dangerouslySetInnerHTML`
- Code blocks (```` ``` ````) preserve interior whitespace and are not passed
  through inline rules
- Hyperlinks have `target="_blank"` and `rel="noopener noreferrer"`
- Consecutive list items produce a single wrapping `<ul>` or `<ol>` element
- Unit test in `tests/unit/markdown-renderer.test.js` tests each rule type,
  mixed inline content, nested inline (e.g. bold inside a heading), and edge
  cases (empty string, no Markdown syntax)

**Commit:** `feat(notes): Markdown rule pipeline and renderer`

---

## Task 9 — MarkdownView component

**Files:** `client/src/components/MarkdownView.jsx`

**What:** Pure presentational component that calls `renderMarkdown(content)` from
`markdownRenderer.js` and wraps the output in a `<div>`. No state, no side
effects, no `dangerouslySetInnerHTML`.

Props:
- `content` (string) — raw Markdown string to render.

The wrapping `<div>` should have Tailwind prose-like classes for readable
typography (e.g. `prose max-w-none` if Tailwind Typography plugin is available,
or hand-crafted spacing/heading size classes if not). The component must not
introduce any new npm dependency.

**Done when:**
- Component renders without error for any string value of `content`, including
  empty string
- Each supported Markdown element renders with visually distinct Tailwind styles
  (h1 larger than h2, code in monospace, blockquotes indented/bordered, etc.)
- Unit test in `tests/unit/MarkdownView.test.jsx` mocks `renderMarkdown` and
  verifies the output is rendered inside the wrapper `<div>`

**Commit:** `feat(notes): MarkdownView component`

---

## Task 10 — NoteEditor component

**Files:** `client/src/components/NoteEditor.jsx`

**What:** The textarea pane of the note editor with a live character counter.
Side-by-side layout with `MarkdownView` is handled by the parent page (Task 14);
this component is only the textarea + counter UI.

Props:
- `content` (string) — controlled value.
- `onChange(content)` — called on every keystroke.
- `charLimit` (number) — maximum characters (25,000).

Behaviour:
- Renders a `<textarea>` with `value={content}` and `onChange` wired.
- Below the textarea, shows a character counter: `"2,450 / 25,000"` using
  `toLocaleString()` for formatting.
- When `content.length >= charLimit`, the textarea becomes `readOnly` and the
  counter text turns red with an inline warning message: `"Character limit reached"`.
- When `content.length` is within 10% of the limit, the counter text turns
  yellow/amber as a warning.
- All styling via Tailwind classes only; no inline styles.

**Done when:**
- Textarea is fully controlled and fires `onChange` on every keystroke
- Counter displays correct formatted numbers
- `readOnly` is applied at the limit; text and warning colour change correctly
- Unit test in `tests/unit/NoteEditor.test.jsx` covers: normal typing, counter
  display, read-only at limit, amber warning near limit

**Commit:** `feat(notes): NoteEditor component with character counter`

---

## Task 11 — TagCombobox component

**Files:** `client/src/components/TagCombobox.jsx`

**What:** A controlled multi-select combobox for selecting and creating tags.

Props:
- `selected` (array of `string | { id, name }`) — currently applied tags.
- `available` (array of `{ id, name }`) — all tags fetched from the store.
- `onChange(tags[])` — called with the updated selected array when the selection
  changes. Items in the array may be plain strings (new, unsaved) or `{ id, name }`
  objects (existing).

Behaviour:
- Renders a text input and a dropdown list of `available` tags filtered by what
  the user has typed.
- Selected tags are shown as removable chips/badges above or below the input.
- If the typed text does not match any existing tag and the user presses Enter,
  a `"Create tag: <name>"` option appears; selecting it adds the lowercased,
  trimmed text as a plain string to the selected array and calls `onChange`.
- Maximum 5 tags: once 5 are selected, the input is disabled and a hint is shown.
- Each tag name is capped at 30 characters — the input stops accepting characters
  beyond 30.
- Clicking the `x` on a chip removes that tag and calls `onChange`.
- The dropdown closes on Escape, on blur (with a short delay to allow click),
  and after a selection is made.
- No external combobox library. Implement using a controlled `<input>` and a
  conditional `<ul>` dropdown.

**Done when:**
- Typing filters the available list; exact match highlights the top result
- Pressing Enter on a new name adds it as a string; `onChange` is called
- Chips render for each selected tag; clicking `x` removes it
- At 5 tags the input is disabled
- Characters beyond 30 are not accepted
- Unit test in `tests/unit/TagCombobox.test.jsx` covers: filter, select
  existing, create new, remove chip, 5-tag limit, 30-char limit

**Commit:** `feat(notes): TagCombobox with on-the-fly tag creation`

---

## Task 12 — NoteToolbar component

**Files:** `client/src/components/NoteToolbar.jsx`

**What:** The toolbar strip rendered at the top of `NoteEditorPage`. Contains
the pin toggle, auto-save status indicator, and Delete button.

Props:
- `isPinned` (boolean) — current pin state.
- `onTogglePin()` — called when the pin button is clicked.
- `onDelete()` — called when the Delete button is clicked.
- `isSaving` (boolean) — drives the save status indicator.

Behaviour:
- Pin toggle: a button that shows a pin icon (Unicode or SVG) with label
  "Pinned" (active) or "Pin" (inactive). Tailwind active/inactive colour
  classes differ.
- Save status: when `isSaving` is `true`, shows `"Saving..."`. When
  `isSaving` is `false` and a save has occurred, shows `"Saved"` for 2 seconds
  then clears. Implement the 2-second clear with a `useEffect` that sets a
  local `showSaved` boolean.
- Delete button: red-toned Tailwind classes; labelled "Delete".
- All elements in a single `<div>` flex row; no inline styles.

**Done when:**
- Pin button renders correct label and colour for both states
- `"Saving..."` appears during save; `"Saved"` appears briefly after
- Delete button fires `onDelete`
- Unit test in `tests/unit/NoteToolbar.test.jsx` covers all prop combinations

**Commit:** `feat(notes): NoteToolbar with pin, save status, and delete`

---

## Task 13 — SortControl component and NoteCard + NoteList components

**Files:** `client/src/components/SortControl.jsx`, `client/src/components/NoteCard.jsx`,
`client/src/components/NoteList.jsx`

**What:** Three small leaf components needed by `NotesPage`. Group them in one
task because each is under 60 lines and they share no logic.

`SortControl.jsx`:
- Props: `value` (string), `onChange(sortKey)`.
- Renders a `<select>` with three `<option>` elements:
  `updated_desc` = "Last Modified", `updated_asc` = "Oldest First",
  `title_asc` = "Title A–Z".
- Controlled component; calls `onChange` on the select's `onChange` event.

`NoteCard.jsx`:
- Props: `note` (camelCase object with `id`, `title`, `preview`, `isPinned`,
  `tags[]`, `updatedAt`), `onSelect(note)`.
- Renders a clickable card (button or div with `role="button"`) showing:
  - Title (or `"Untitled"` if blank) in bold.
  - Pin indicator (e.g. a pin icon or "Pinned" badge) when `isPinned` is true.
  - Preview text truncated to ~100 characters.
  - Tags rendered as small coloured badges.
  - `updatedAt` formatted as a relative or short date string.
- Calls `onSelect(note)` on click.
- Tailwind only; no inline styles.

`NoteList.jsx`:
- Props: `notes[]`, `onSelect(note)`.
- Renders a `<ul>` of `NoteCard` components, keyed by `note.id`.
- If `notes` is empty, renders nothing (parent `NotesPage` renders `EmptyState`).

**Done when:**
- `SortControl` renders all three options and calls `onChange` with the right key
- `NoteCard` shows title, pin badge, preview, tags, and date; fires `onSelect`
- `NoteList` renders one `NoteCard` per note
- Unit tests: `tests/unit/SortControl.test.jsx`, `tests/unit/NoteCard.test.jsx`,
  `tests/unit/NoteList.test.jsx` — each covering render and interaction

**Commit:** `feat(notes): SortControl, NoteCard, and NoteList components`

---

## Task 14 — NotesPage

**Files:** `client/src/pages/NotesPage.jsx`

**What:** The Notes list page. Fetches notes on mount; shows sort control, note
list, empty state, and a "New Note" button.

Behaviour:
- On mount: calls `fetchNotes()` and `fetchTags()` from `useNotesStore`.
- Renders `SortControl` wired to `sortKey` and `setSortKey` from the store.
- Renders `NoteList` with `sortedNotes` from the store.
- When `sortedNotes` is empty and not loading, renders `EmptyState` with a
  prompt to create the first note.
- "New Note" button navigates to `/notes/new` using `useNavigate`.
- Clicking a `NoteCard` navigates to `/notes/:id`.
- Shows a loading skeleton or spinner while `isLoading` is true.
- Shows the store's `error` in a red banner if non-null.

**Done when:**
- Notes are fetched on mount; list renders correctly
- Sort control changes `sortKey` in the store and the list reorders
- "New Note" navigates to `/notes/new`; clicking a card navigates to `/notes/:id`
- Empty state appears when there are no notes
- Error banner appears when the store has an error
- Unit test in `tests/unit/NotesPage.test.jsx` mocks the store and verifies
  fetch-on-mount, sort wiring, navigation, and empty state

**Commit:** `feat(notes): NotesPage list view`

---

## Task 15 — NoteEditorPage

**Files:** `client/src/pages/NoteEditorPage.jsx`

**What:** The note create/edit page. Handles auto-save, tag changes, pin toggle,
and delete with confirmation.

Behaviour:

Create mode (`/notes/new`):
- On mount calls `createNote({ content: '', is_pinned: false, tags: [] })`
  immediately to obtain an ID; then navigates to `/notes/<id>` using
  `replace: true` so the browser back button skips the `/notes/new` URL.

Edit mode (`/notes/:id`):
- On mount calls `fetchNote(id)` and `fetchTags()`.
- If the note is not found (404 or `selectedNote` is null after load),
  navigates to `/notes` with a toast state message.

Auto-save:
- Holds a `useRef` debounce timer. On every `NoteEditor` `onChange` event,
  clears the timer and sets a new one for 800 ms; when it fires, calls
  `updateNote(id, { content })`.
- On `NoteEditor` blur, flushes the debounce immediately (clears timer, calls
  `updateNote` synchronously if there are unsaved changes).
- Content changes are tracked in local state (`localContent`) to avoid
  re-renders from the store during typing. The store's `selectedNote.content`
  is the initial value; local state diverges during typing.
- If `localContent.length > 25000`, the auto-save call is blocked client-side.

Pin and tags:
- Pin toggle calls `updateNote(id, { is_pinned: !isPinned })` immediately
  (no debounce).
- Tag changes from `TagCombobox` call `updateNote(id, { tags: newTags })`
  immediately, then call `fetchTags()` to refresh the available tag list.

Delete:
- `onDelete` from `NoteToolbar` sets `showConfirm = true`.
- `ConfirmDialog` confirmation calls `deleteNote(id)` then navigates to `/notes`.
- Cancel sets `showConfirm = false`.

Layout:
- Side-by-side on wide screens: `NoteEditor` on the left, `MarkdownView` on
  the right (Tailwind `md:flex-row` / `flex-col` responsive classes).
- `NoteToolbar` rendered above the editor/preview columns.
- `TagCombobox` rendered below both columns.
- Validation error for content exceeding the limit shown inline (the textarea
  already goes `readOnly` via `NoteEditor`; show a red message below it).

**Done when:**
- Create mode creates a note immediately and redirects to its URL
- Edit mode loads the note and displays content, tags, and pin state
- Auto-save fires after 800 ms of inactivity; flush fires on blur
- `isSaving` in the store is `true` during the PATCH and `false` after
- Pin toggle and tag changes are saved immediately
- Delete shows `ConfirmDialog`; confirmed delete navigates to `/notes`
- 404 note ID redirects to `/notes`
- Side-by-side layout renders on wide screens; stacked on narrow
- Unit test in `tests/unit/NoteEditorPage.test.jsx` mocks the store and covers:
  create-mode redirect, edit-mode load, auto-save debounce, pin toggle, tag
  change, delete flow, and 404 redirect

**Commit:** `feat(notes): NoteEditorPage with auto-save, tags, pin, and delete`

---

## Task 16 — Routing and sidebar wiring

**Files:** `client/src/App.jsx`, `client/src/components/Sidebar.jsx`

**What:** Add the three Notes routes to the React Router configuration and add
"Notes" to the sidebar navigation.

`client/src/App.jsx`:
- Import `NotesPage` and `NoteEditorPage`.
- Add three routes:
  - `/notes` -> `NotesPage`
  - `/notes/new` -> `NoteEditorPage`
  - `/notes/:id` -> `NoteEditorPage`
- The root redirect (`/` -> `/contacts`) can remain or be changed to `/notes`
  — leave it pointing to `/contacts` to avoid breaking existing behaviour.

`client/src/components/Sidebar.jsx`:
- Add `{ label: 'Notes', to: '/notes' }` to the `NAV_LINKS` array.
- The `end` prop should be omitted (or set to `false`) for the Notes link so
  that `/notes/new` and `/notes/:id` also highlight the sidebar item.

**Done when:**
- Navigating to `/notes` renders `NotesPage`
- Navigating to `/notes/new` renders `NoteEditorPage` in create mode
- Navigating to `/notes/:id` renders `NoteEditorPage` in edit mode
- Sidebar shows "Notes" link with active highlight on any `/notes/*` path
- Existing contacts routes are unaffected
- Unit test in `tests/unit/app-routing.test.jsx` is updated to include the
  three new routes (or a new assertion block added to the existing file)

**Commit:** `feat(notes): add Notes routes and sidebar link`

---

## Task 17 — E2E test: notes happy path

**Files:** `tests/e2e/notes.spec.js`

**What:** Playwright end-to-end test covering the full Notes user journey.

**Done when:** The test passes end-to-end for this sequence:
1. Navigate to `/notes`; see the empty state.
2. Click "New Note"; land on `/notes/<id>`.
3. Type a multi-line note with Markdown (a heading, a list item, bold text).
4. Wait 1 second for auto-save to fire; verify `"Saved"` indicator appears.
5. Open the `TagCombobox`; type a new tag name and press Enter.
6. Verify the tag chip appears.
7. Navigate back to `/notes`; verify the note card shows the title (first line),
   a preview, and the tag badge.
8. Return to the note; toggle the pin; navigate back; verify the note appears
   at the top of the list.
9. Open the note again; click Delete; cancel in `ConfirmDialog`; verify the
   note is still there.
10. Click Delete again; confirm; verify redirect to `/notes` and note is gone.

**Commit:** `test(notes): E2E happy path with Playwright`

---

## Implementation Complete

After Task 17, run:

```bash
npm test
npm run test:e2e
```

Then run `/spec-review notes` to invoke the Reviewer Agent.
