# Notes — Technical Design

## Architecture Overview

The Notes module is a self-contained feature that sits alongside Contacts in the
PIM application. It introduces two new backend models (`note`, `tag`) and a join
table (`note_tags`), three new API route files, a new Zustand store, a new API
client module, and a set of React pages and components under the existing
`client/src/` tree.

Notes are entirely standalone — no foreign keys to `contacts`. Tags are shared
vocabulary owned by the `tags` table; they are created on-the-fly and
auto-deleted by a server-side cleanup step triggered after any note save or
delete that changes the tag set.

```
Browser
  |
  |  React Router (/notes, /notes/:id, /notes/new)
  v
NotesPage          NoteEditorPage
  |                      |
  |                  NoteEditor  (textarea + Markdown renderer)
  |                  TagCombobox (select + create tags)
  |                  NoteToolbar (pin toggle, sort, delete)
  |
  v
useNotesStore (Zustand)
  |
  v
client/src/api/notes.js     client/src/api/tags.js
  |                                |
  v                                v
GET /api/notes              GET /api/tags
POST /api/notes             (tag CRUD is implicit via note save)
PATCH /api/notes/:id
DELETE /api/notes/:id
  |
  v
server/routes/notes.js    server/routes/tags.js
  |
  v
server/models/note.js     server/models/tag.js
  |
  v
SQLite  (notes, tags, note_tags tables)
```

---

## Data Model

### Tables

| Table      | Column       | Type    | Notes                                         |
|------------|--------------|---------|-----------------------------------------------|
| notes      | id           | INTEGER | PK, auto-increment                            |
| notes      | content      | TEXT    | Raw Markdown body; max 25,000 chars enforced  |
| notes      | is_pinned    | INTEGER | Boolean (0/1); default 0                      |
| notes      | created_at   | TEXT    | datetime('now') default                       |
| notes      | updated_at   | TEXT    | datetime('now') default; updated on every PATCH|
| tags       | id           | INTEGER | PK, auto-increment                            |
| tags       | name         | TEXT    | Unique, trimmed, max 30 chars, NOT NULL       |
| tags       | created_at   | TEXT    | datetime('now') default                       |
| note_tags  | note_id      | INTEGER | FK -> notes.id ON DELETE CASCADE              |
| note_tags  | tag_id       | INTEGER | FK -> tags.id ON DELETE CASCADE               |

`note_tags` has a composite PK of `(note_id, tag_id)`.

**Derived title:** The display title is derived from the first line of
`content` entirely in the frontend and API response — it is NOT stored as a
separate column. The API computes it at read time and includes it in the
response envelope for list views (see Response Shapes).

**Design decision — no `title` column:** Keeping a separate `title` column
creates a sync problem (title drifts from content). Computing at read time is
cheap for SQLite row counts typical of a solo-user PIM.

### Migration SQL

```sql
-- migration: 002_create_notes.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  content    TEXT    NOT NULL DEFAULT '',
  is_pinned  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_updated_at
  ON notes(is_pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id
  ON note_tags(tag_id);
```

---

## API Contract

### Endpoints

| Method | Path                         | Description                                    |
|--------|------------------------------|------------------------------------------------|
| GET    | /api/notes                   | List all notes (sorted, with derived title)    |
| GET    | /api/notes/:id               | Get a single note with its full tag list       |
| POST   | /api/notes                   | Create a new note                              |
| PATCH  | /api/notes/:id               | Update content, pin state, or tags             |
| DELETE | /api/notes/:id               | Delete a note; orphan tags auto-cleaned        |
| GET    | /api/tags                    | List all tags (for TagCombobox population)     |

Tags are not individually created via a dedicated POST endpoint. They are
created implicitly when a tag name is sent in the `tags` array of a note
create or update request. Deletion is handled automatically server-side.

### Query Parameters

`GET /api/notes` accepts:
- `sort` — `updated_desc` (default) | `updated_asc` | `title_asc`

Sorting is applied server-side. Pinned notes always sort before unpinned
within any chosen secondary sort order.

### Request / Response Shapes

All responses use the `{ data, error, meta }` envelope established by the
contacts module. Error objects always include a `code` string.

---

#### GET /api/notes

Response `data` is an array of note summary objects:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Meeting notes",
      "preview": "Discussed the Q3 roadmap and agreed on...",
      "is_pinned": true,
      "tags": [{ "id": 3, "name": "work" }],
      "created_at": "2026-04-29T10:00:00",
      "updated_at": "2026-04-29T12:30:00"
    }
  ],
  "error": null,
  "meta": { "count": 1 }
}
```

- `title` — first line of `content` trimmed; `"Untitled"` when content is blank
- `preview` — first 140 characters of content after the first line, stripped of
  Markdown syntax, trimmed; empty string when unavailable

---

#### GET /api/notes/:id

Response `data` is the full note object including all tags and the raw
Markdown `content`:

```json
{
  "data": {
    "id": 1,
    "content": "# Meeting notes\n\nDiscussed the Q3 roadmap...",
    "title": "Meeting notes",
    "is_pinned": true,
    "tags": [{ "id": 3, "name": "work" }],
    "created_at": "2026-04-29T10:00:00",
    "updated_at": "2026-04-29T12:30:00"
  },
  "error": null,
  "meta": null
}
```

---

#### POST /api/notes

Request body:

```json
{
  "content": "# New idea\n\nSome thoughts here.",
  "is_pinned": false,
  "tags": ["work", "idea"]
}
```

- `content` — optional (defaults to `""`); max 25,000 characters
- `is_pinned` — optional boolean; defaults to `false`
- `tags` — optional array of tag name strings (0–5); new names are created
  automatically, existing names are matched case-insensitively

Response: `201 Created` with the full note object (same shape as GET /:id).

Validation errors (`422`):

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": {
      "content": "exceeds 25000 character limit",
      "tags": "maximum 5 tags allowed"
    }
  },
  "meta": null
}
```

---

#### PATCH /api/notes/:id

Request body (all fields optional — partial update):

```json
{
  "content": "# Updated note\n\nEdited content.",
  "is_pinned": true,
  "tags": ["work"]
}
```

When `tags` is present, it **replaces** the entire tag set for the note. After
the update, any tags no longer referenced by any note are deleted.

Response: `200 OK` with the full updated note object.

---

#### DELETE /api/notes/:id

No request body. Response:

```json
{
  "data": { "deleted": true },
  "error": null,
  "meta": null
}
```

After deletion, the server runs the orphan-tag cleanup query.

---

#### GET /api/tags

Response:

```json
{
  "data": [
    { "id": 1, "name": "idea" },
    { "id": 3, "name": "work" }
  ],
  "error": null,
  "meta": { "count": 2 }
}
```

Tags are sorted `name ASC`.

---

### Server-Side Tag Lifecycle

Tag creation and cleanup are handled inside `server/models/tag.js` using a
SQLite transaction. The steps for any note write that includes a `tags` payload:

1. For each tag name: `INSERT OR IGNORE INTO tags (name) VALUES (?)` (creates
   if new, skips if exists).
2. Resolve tag IDs by name.
3. Delete all existing rows from `note_tags` where `note_id = ?`.
4. Insert new rows into `note_tags` for the resolved tag IDs.
5. Delete orphaned tags: `DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)`.

All five steps run inside a single `db.transaction()` call to keep state
consistent.

---

## Component Design (Frontend)

New files follow the same `kebab-case.jsx` naming and functional-component
conventions as the contacts module.

### Pages

| Component        | Path                              | Responsibility                                       |
|------------------|-----------------------------------|------------------------------------------------------|
| `NotesPage`      | `client/src/pages/NotesPage.jsx`  | List view: renders NoteList, sort controls, New button |
| `NoteEditorPage` | `client/src/pages/NoteEditorPage.jsx` | Create and edit: renders NoteEditor, TagCombobox, toolbar |

### Components

| Component        | Path                                    | Props                                              | Responsibility                                         |
|------------------|-----------------------------------------|----------------------------------------------------|--------------------------------------------------------|
| `NoteList`       | `client/src/components/NoteList.jsx`    | `notes[]`, `onSelect(note)`                        | Renders a list of `NoteCard` rows                      |
| `NoteCard`       | `client/src/components/NoteCard.jsx`    | `note`, `onSelect(note)`                           | Single row: title, preview, tags, pin indicator        |
| `NoteEditor`     | `client/src/components/NoteEditor.jsx`  | `content`, `onChange(content)`, `charLimit`        | Textarea + live Markdown renderer; character counter   |
| `MarkdownView`   | `client/src/components/MarkdownView.jsx`| `content`                                          | Pure render: converts Markdown string to React elements using the renderer pipeline |
| `TagCombobox`    | `client/src/components/TagCombobox.jsx` | `selected[]`, `available[]`, `onChange(tags[])`    | Multi-select combobox; creates tags on the fly; enforces 5-tag max |
| `NoteToolbar`    | `client/src/components/NoteToolbar.jsx` | `isPinned`, `onTogglePin`, `onDelete`, `isSaving`  | Pin toggle, auto-save status indicator, Delete button  |
| `SortControl`    | `client/src/components/SortControl.jsx` | `value`, `onChange(sortKey)`                       | Dropdown to choose sort order (used in NotesPage)      |
| `ConfirmDialog`  | already exists (contacts pattern)       | —                                                  | Re-used unchanged                                      |
| `EmptyState`     | already exists (contacts pattern)       | —                                                  | Re-used unchanged                                      |

### Component Tree

```
NotesPage
  SortControl
  NoteList
    NoteCard (x N)
  EmptyState (conditional)

NoteEditorPage
  NoteToolbar
    (pin toggle, auto-save indicator, Delete button)
  NoteEditor
    <textarea>
    MarkdownView (rendered preview, overlaid or below)
  TagCombobox
  ConfirmDialog (delete confirmation)
```

---

## State Management

### Store: `useNotesStore`

File: `client/src/store/notesStore.js`

```
State
  notes            {object[]}      Full list from last fetch (camelCase)
  selectedNote     {object|null}   Currently open note (full content + tags)
  tags             {object[]}      All available tags (for TagCombobox)
  isLoading        {boolean}
  isSaving         {boolean}       True during an auto-save PATCH request
  error            {string|null}
  sortKey          {string}        'updated_desc' | 'updated_asc' | 'title_asc'
  sortedNotes      {object[]}      Derived: pinned-first then sorted by sortKey

Actions
  fetchNotes()                    GET /api/notes?sort=<sortKey>; updates notes + sortedNotes
  fetchNote(id)                   GET /api/notes/:id; sets selectedNote
  createNote(data)                POST /api/notes; prepends to notes list; returns created note
  updateNote(id, data)            PATCH /api/notes/:id; updates notes list + selectedNote
  deleteNote(id)                  DELETE /api/notes/:id; removes from list; clears selectedNote
  fetchTags()                     GET /api/tags; updates tags
  setSortKey(key)                 Updates sortKey + re-derives sortedNotes client-side; persists to localStorage
  setSelectedNote(note)           Set selected note directly (optimistic updates during auto-save)
```

`sortedNotes` is derived inside the store whenever `notes` or `sortKey` changes.
The derivation mirrors the server-side sort so that optimistic updates feel
instant — the server sort is the source of truth on next fetch.

### Auto-Save Integration

Auto-save state (`isSaving`) lives in the store rather than component local
state so that `NoteToolbar` can display the saving indicator without prop
drilling.

---

## API Client

File: `client/src/api/notes.js`

Follows the same pattern as `client/src/api/contacts.js`:
- `toCamel(note)` converts snake_case API fields (`is_pinned`, `created_at`,
  `updated_at`) to camelCase (`isPinned`, `createdAt`, `updatedAt`).
- `toSnake(note)` converts camelCase inputs back to snake_case for the request
  body.
- Tags array is passed through as-is (array of name strings on write; array of
  `{id, name}` objects on read, so a separate `tagsToPayload` helper converts
  `tag.name` strings for write operations).
- A shared `apiFetch` helper (same signature as in `contacts.js`) handles the
  envelope unwrapping and error throwing.

File: `client/src/api/tags.js`

Single function `getTags()` — fetches `GET /api/tags` and returns a camelCase
array of `{id, name}` objects.

---

## Markdown Editor Architecture

### Decision: Hybrid Live Preview (not inline Typora-style)

The requirements describe a Typora-style inline editor where Markdown syntax
renders in place and reverts when the cursor is on that line. Implementing true
inline rendering in a `<textarea>` requires replacing it with a
`contentEditable` div and a custom cursor-position system — significant
complexity for the scope of Phase 2 and a maintenance risk.

**Decision:** Use a **side-by-side or below-pane live preview** approach instead:
- The left/top pane is a plain `<textarea>` (raw Markdown).
- The right/bottom pane is `MarkdownView`, which re-renders on every content
  change.
- On mobile / narrow screens the preview is shown below the textarea.

This meets the acceptance criterion of "see it render as I type" while keeping
the editor architecture simple and maintainable. The Typora-style inline
rendering is noted as a future enhancement.

### Extensible Renderer Design

`MarkdownView` uses a **rule pipeline** pattern. The Markdown string is
converted to a list of React elements by passing it through an ordered array of
renderer rules. Each rule is a plain object with two functions:

```
{
  name: string,          // identifier for debugging
  test(line): boolean,   // returns true if this rule handles the line/block
  render(line, key): JSX.Element  // returns the React element
}
```

The renderer pipeline iterates the rules in order for each line (or block, for
multi-line constructs like code blocks and blockquotes). The first rule whose
`test()` returns `true` wins. Inline rules (bold, italic, inline code,
hyperlinks) are applied as a secondary pass over the text content of a matched
block-level element.

**Adding a new Markdown element** = adding one object to the rules array and
exporting it from `client/src/lib/markdownRules.js`. No changes to
`MarkdownView` itself are required.

### Initial Rule Set

Block rules (evaluated in this order):

| Rule name       | Pattern matched                         | Output element      |
|-----------------|-----------------------------------------|---------------------|
| `codeBlock`     | Fenced ``` opening/closing triple-tick  | `<pre><code>`       |
| `heading1`      | Line starting with `# `                 | `<h1>`              |
| `heading2`      | Line starting with `## `                | `<h2>`              |
| `heading3`      | Line starting with `### `               | `<h3>`              |
| `blockquote`    | Line starting with `> `                 | `<blockquote>`      |
| `unorderedList` | Line starting with `- ` or `* `         | `<ul><li>`          |
| `orderedList`   | Line starting with `N. ` (digit + dot)  | `<ol><li>`          |
| `paragraph`     | Fallthrough                             | `<p>`               |

Consecutive list items are grouped into a single `<ul>` or `<ol>` by a
pre-processing step before rules are applied. Consecutive fenced code lines are
collected into a single `<pre>` block.

Inline rules (applied to text content within any block):

| Rule name    | Pattern                 | Output element             |
|--------------|-------------------------|----------------------------|
| `bold`       | `**text**`              | `<strong>`                 |
| `italic`     | `*text*` or `_text_`    | `<em>`                     |
| `inlineCode` | `` `code` ``            | `<code>`                   |
| `link`       | `[label](url)`          | `<a>` (target _blank)      |

Inline rules are applied via a regex-split approach that produces an array of
strings and React elements, preserving the relative order of mixed content.

File locations:
- `client/src/lib/markdownRules.js` — exports `BLOCK_RULES` and `INLINE_RULES`
- `client/src/lib/markdownRenderer.js` — exports `renderMarkdown(content)` which returns `ReactNode[]`
- `client/src/components/MarkdownView.jsx` — calls `renderMarkdown` and wraps output in a `<div>`

---

## Tag Management Design

### On-the-fly Creation

`TagCombobox` is a controlled component. It receives `available` (all existing
tags from the store) and `selected` (current note's tags). When the user types a
string that does not match any existing tag and presses Enter or selects the
"Create tag" option, the combobox adds the typed string to the `selected` array
as a plain string (not yet an object with an `id`). The string is sent to the
API in the `tags` array of the next save. The server resolves or creates the
tag and returns the full `{id, name}` tag objects in the note response, which
the store merges back. The `fetchTags()` action is called after any note save
to refresh the available tag list.

### Tag Character Limit

Individual tag names are limited to **30 characters**. Enforced:
- Client-side: `TagCombobox` prevents typing beyond 30 characters.
- Server-side: route validation returns `VALIDATION_ERROR` if any tag name
  exceeds 30 characters.

Tag names are stored in trimmed lowercase to avoid near-duplicate tags ("Work"
vs "work"). The server normalises the name before the `INSERT OR IGNORE` step.

### Auto-cleanup (Orphan Deletion)

Orphan-tag cleanup runs inside the same database transaction as the note update
or deletion. The query is:

```sql
DELETE FROM tags
WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags);
```

This query is safe and efficient for the expected data volume of a solo-user
PIM. No background job or cron is needed.

---

## Auto-Save vs Explicit Save

**Decision: Auto-save with a debounced write and a status indicator.**

Rationale from requirements: notes are described as a "scratchpad" — immediate
capture is the primary goal. An explicit Save button adds friction and risks
data loss if the user closes the tab. Auto-save is consistent with Notion,
Bear, and Apple Notes.

Implementation:
- The `NoteEditor` component fires `onChange(content)` on every keystroke.
- `NoteEditorPage` holds a `useRef` debounce timer. After 800 ms of inactivity,
  it calls `updateNote(id, { content })` in the store.
- On blur (tab switch / navigation away), the debounce is flushed immediately —
  `updateNote` is called synchronously if there are unsaved changes.
- `isSaving` in the store drives a "Saving…" / "Saved" indicator in
  `NoteToolbar`.
- Pin toggle and tag changes are saved immediately (no debounce) since they are
  discrete user actions.

**Character limit enforcement:** The `NoteEditor` component displays a live
character count (e.g. "2,450 / 25,000"). When the count reaches 25,000 the
textarea becomes read-only and an inline warning is shown. The auto-save
request is also blocked client-side when over the limit, and the server
enforces the limit independently.

---

## Sort Order Persistence

**Decision: Persist to `localStorage`.**

Rationale: Session-only (Zustand in-memory) would reset on every page refresh,
which is annoying for a user who always prefers "Title A–Z". Writing the
preference to the database adds a settings table not yet in scope. `localStorage`
is the right trade-off: zero-config, survives refresh, does not require a server
round-trip.

Implementation:
- `setSortKey(key)` in the store calls `localStorage.setItem('notes_sort', key)`.
- On store initialisation, `sortKey` is read from
  `localStorage.getItem('notes_sort') ?? 'updated_desc'`.

---

## Error Handling Strategy

The Notes module follows the same pattern as Contacts:

- **API errors** are caught in store actions; `error` state is set to the error
  message string.
- **404 errors** on `NoteEditorPage` (note not found) trigger a `useEffect`
  redirect to `/notes` with a router-state toast message.
- **Validation errors** (422) surface field-level messages; the `NoteEditorPage`
  displays them inline below the relevant input.
- **Auto-save failures** are surfaced as an inline "Save failed" status in
  `NoteToolbar` rather than a blocking dialog; the user can continue editing.
- **Network failures** display the generic error string from the store's `error`
  field in a red banner, consistent with `ContactsPage`.
- `ConfirmDialog` is reused for the delete confirmation flow, identical to the
  contacts pattern.

---

## Security Considerations

- **Input validation (server):** `content` length checked server-side (≤ 25,000
  chars). Tag names checked for length (≤ 30 chars) and max count (≤ 5 per
  note). Invalid values return `422 VALIDATION_ERROR`.
- **Parameterised queries:** All SQL uses `better-sqlite3` prepared statements
  with named parameters. No string interpolation of user input.
- **Tag name normalisation:** Names are lowercased and trimmed server-side
  before storage to prevent injection via near-duplicate names.
- **Markdown rendering:** `MarkdownView` constructs React elements
  programmatically — no `dangerouslySetInnerHTML`. Hyperlinks rendered by the
  `link` inline rule use `rel="noopener noreferrer"` and `target="_blank"` to
  prevent tab-napping.
- **Foreign key enforcement:** `PRAGMA foreign_keys = ON` is set in the database
  connection initialisation (already present in `server/db.js` following the
  contacts pattern, to be confirmed during implementation).
- **Auth:** JWT middleware that protects `/api/contacts` routes must equally
  protect `/api/notes` and `/api/tags` routes. No anonymous access.

---

## File Inventory

### New server files

| File                                | Purpose                                 |
|-------------------------------------|-----------------------------------------|
| `server/models/note.js`             | CRUD for `notes` table                  |
| `server/models/tag.js`              | Tag resolution, creation, orphan cleanup|
| `server/routes/notes.js`            | Express router for /api/notes           |
| `server/routes/tags.js`             | Express router for /api/tags            |

### New client files

| File                                         | Purpose                             |
|----------------------------------------------|-------------------------------------|
| `client/src/api/notes.js`                    | Fetch wrapper for /api/notes        |
| `client/src/api/tags.js`                     | Fetch wrapper for /api/tags         |
| `client/src/store/notesStore.js`             | Zustand store for Notes             |
| `client/src/pages/NotesPage.jsx`             | Notes list view                     |
| `client/src/pages/NoteEditorPage.jsx`        | Note create/edit view               |
| `client/src/components/NoteList.jsx`         | Renders list of NoteCard rows       |
| `client/src/components/NoteCard.jsx`         | Single note card in list            |
| `client/src/components/NoteEditor.jsx`       | Textarea + character counter        |
| `client/src/components/MarkdownView.jsx`     | Pure Markdown renderer              |
| `client/src/components/TagCombobox.jsx`      | Multi-select tag input              |
| `client/src/components/NoteToolbar.jsx`      | Pin toggle, save status, delete     |
| `client/src/components/SortControl.jsx`      | Sort order dropdown                 |
| `client/src/lib/markdownRules.js`            | BLOCK_RULES + INLINE_RULES arrays   |
| `client/src/lib/markdownRenderer.js`         | renderMarkdown(content) function    |

### New database files

| File                                | Purpose                             |
|-------------------------------------|-------------------------------------|
| `db/migrations/002_create_notes.sql`| Creates notes, tags, note_tags      |

### Modified files

| File                         | Change required                                              |
|------------------------------|--------------------------------------------------------------|
| `server/index.js`            | Mount `/api/notes` and `/api/tags` routers                   |
| `client/src/main.jsx`        | Add routes `/notes`, `/notes/new`, `/notes/:id`              |

---

Design draft complete.
