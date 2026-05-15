# Search — Technical Design

## Architecture Overview

Search is a read-only cross-module feature. A single `GET /api/search` endpoint accepts a raw query string, parses it into filters + free text on the server, queries the four existing tables, scores results in JavaScript, and returns a unified ranked array.

On the frontend, the existing two-panel layout (sidebar + main) gains a `TopNavbar` row above it. The navbar houses a `SearchBar` component that controls an inline dropdown. A new `SearchPage` at `/search` handles the full results view.

```
┌──────────────────── TopNavbar ─────────────────────┐
│  PIM   [          search bar          ]            │
└─────────────────────────────────────────────────────┘
┌── Sidebar ──┬──────────── main content ─────────────┐
│  Contacts   │                                       │
│  Notes      │   <Routes />                          │
│  Tasks      │     /contacts, /notes, /tasks,        │
│  Calendar   │     /calendar, /search, …             │
│  (Search    │                                       │
│   via bar)  │                                       │
└─────────────┴───────────────────────────────────────┘
```

**Data flow:**

```
SearchBar (input)
  → 300 ms debounce
  → useSearchStore.search(q)
  → GET /api/search?q=…&limit=10
  → server: parseQuery → SQL queries → score → sort
  → results → SearchDropdown (10 items) or SearchPage (50 items)
```

---

## Data Model

No new database tables or migrations are required. All search queries operate against existing tables using parameterised `LIKE '%term%'` clauses.

Searchable fields per module:

| Module   | Searchable columns                              | Tag table(s)                  | Pinnable | Date field  |
|----------|-------------------------------------------------|-------------------------------|----------|-------------|
| contacts | `first_name`, `last_name`, `email`, `phone`, `company`, `notes` | — | no | — |
| notes    | `content`                                       | `tags` via `note_tags`        | yes      | —           |
| tasks    | `title`, `body`                                 | `task_tags_vocab` via `task_tags` | yes  | `due_date`  |
| events   | `title`, `description`, `location`              | —                             | no       | `start_at`  |

---

## Query Parser (`server/utils/search-query-parser.js`)

Parses the raw query string into a structured object consumed by the search route.

**Grammar:**

```
query      := token*
token      := filter | hashtag | word
filter     := key ":" value
hashtag    := "#" word
key        := "type" | "status" | "priority" | "tag" | "date"
              (case-insensitive; unknown keys become plain words)
value      := non-whitespace string
word       := non-whitespace string not matching filter or hashtag
```

**Output shape:**

```js
{
  types:    Set<'contact'|'note'|'task'|'event'> | null, // null = all types
  status:   string | null,   // normalised to DB casing e.g. 'In Progress'
  priority: string | null,   // normalised to DB casing e.g. 'High'
  tags:     string[],        // names from tag: and #, lowercased
  date:     { start: string, end: string } | null,  // YYYY-MM-DD pair
  text:     string,          // remaining free-text terms joined with space
}
```

**Filter normalisation rules:**

- `type:` values: `contact`, `note`, `task`, `event` (case-insensitive). Unknown values ignored.
- `status:` maps `not-started` → `Not Started`, `in-progress` → `In Progress`, `completed` → `Completed`, `blocked` → `Blocked`, `cancelled` → `Cancelled`.
- `priority:` maps `low` → `Low`, `medium` → `Medium`, `high` → `High`.
- `date:` resolves on the server:
  - `today` → current date (YYYY-MM-DD)
  - `tomorrow` → current date + 1 day
  - `this-week` → Monday of the current ISO calendar week → Sunday of the same week
  - `YYYY-MM-DD` → exact date (start = end = that value)
- When `date:` is present and `types` is null, `types` is implicitly set to `new Set(['task', 'event'])`.
- When `status:` or `priority:` is present and `types` is null, `types` is implicitly narrowed to `new Set(['task'])`.

---

## API Contract

### Endpoint

| Method | Path          | Description                          |
|--------|---------------|--------------------------------------|
| GET    | /api/search   | Unified search across all modules    |

### Query Parameters

| Param    | Type    | Default | Description                                       |
|----------|---------|---------|---------------------------------------------------|
| `q`      | string  | —       | Raw query string (unparsed; server does parsing)  |
| `limit`  | integer | 10      | Max results to return (capped at 50)              |
| `offset` | integer | 0       | Pagination offset                                 |

### Response Envelope

```json
{
  "data": {
    "results": [ /* SearchResult[] */ ],
    "total": 42
  },
  "error": null,
  "meta": { "count": 10, "total": 42, "q": "meeting #work" }
}
```

### SearchResult Shape

```json
{
  "kind":      "task",
  "id":        7,
  "title":     "Meeting prep",
  "subtitle":  "Due 2026-05-14 · High · In Progress",
  "url":       "/tasks/7",
  "updatedAt": "2026-05-13T10:00:00Z",
  "isPinned":  false
}
```

**Subtitle generation (server-side per kind):**

| Kind    | Subtitle content                                                    |
|---------|---------------------------------------------------------------------|
| contact | `company` if set, else `email` if set, else `phone` if set, else — |
| note    | First 80 chars of `content` after stripping the first line         |
| task    | `Due YYYY-MM-DD · Priority · Status` (omit Due if no due_date)     |
| event   | `start_at` date formatted as `MMM D, YYYY` + ` · location` if set |

### Ranking Algorithm

Scoring is performed in JavaScript after the SQL queries return candidates. Each result accumulates points:

| Signal                            | Points |
|-----------------------------------|--------|
| Title/name exact match            | 100    |
| Title/name starts with text term  | 80     |
| Title/name contains text term     | 60     |
| Body/content/description contains | 30     |
| `is_pinned = 1`                   | 50     |
| Recency: `20 / (days_old + 1)`    | 0–20   |

Where multiple text terms are present, scores are summed across all matched terms. Final sort: score DESC, then `updated_at` DESC.

---

## Component Design (Frontend)

### New Components

#### `TopNavbar`
Top bar rendered above the sidebar + main content area.

```
Props: none
```

Contains the PIM logo/wordmark on the left and `SearchBar` centred/right. Replaces the "PIM" heading currently in the Sidebar.

---

#### `SearchBar`
The search input + dropdown controller. Lives inside `TopNavbar`.

```
Props: none  (reads/writes useSearchStore; manages dropdown visibility locally)
```

- On focus with empty query → renders `SearchDropdown` in "recent" mode.
- On input change (debounced 300 ms) → calls `store.search(q, 10)`.
- On Enter → navigate to `/search?q=<encoded query>`.
- On Escape → close dropdown, blur input.
- Clicking outside the dropdown → close dropdown.

---

#### `SearchDropdown`
The panel that appears below `SearchBar`.

```
Props:
  results:        SearchResult[]
  recentSearches: string[]
  isLoading:      boolean
  query:          string
  onResultClick:  (result) => void
  onSeeAll:       () => void
  onRecentClick:  (query: string) => void
  onDeleteRecent: (query: string) => void
```

Three render states:
1. **Recent searches** — shown when `query === ''`; lists up to 5 recent searches with a clock icon and an ✕ to delete each.
2. **Results** — up to 10 `SearchResultItem` rows + a "See all results →" footer row.
3. **Empty** — "No results for «query»" message.

---

#### `SearchResultItem`
A single row in the dropdown or the full results list.

```
Props:
  result: SearchResult
  onClick: () => void
```

Layout: `[TypeIcon] [title · subtitle]`

---

#### `TypeIcon`
Small inline SVG (14×14) identifying the module kind.

```
Props:
  kind: 'contact' | 'note' | 'task' | 'event'
```

Uses simple distinct shapes: person silhouette (contact), document lines (note), checkbox (task), calendar grid (event).

---

#### `SearchPage`
Route component at `/search`.

```
Props: none  (reads ?q and ?type from URL search params)
```

- On mount and on URL param change → calls `store.search(q, 50)`.
- Keeps the navbar `SearchBar` value in sync with the URL `?q` param.
- Renders: total count, module filter tabs, group toggle, `SearchResultList`.
- Module filter tabs: All · Contacts · Notes · Tasks · Events. Clicking updates `?type=` in the URL.
- "Group by module" toggle: switches `SearchResultList` between flat and grouped modes.

---

#### `SearchResultList`
Flat or grouped result list.

```
Props:
  results:   SearchResult[]
  total:     number
  grouped:   boolean
  onResultClick: (result) => void
```

- **Flat mode**: renders `SearchResultItem` rows in ranked order.
- **Grouped mode**: groups by `kind`, renders a labelled section per kind; sections with 0 results are hidden. Each section shows up to 20 items with a "Show more" control that increments the visible count by 20.

---

### Modified Files

| File | Change |
|------|--------|
| `client/src/App.jsx` | Wrap layout in `TopNavbar` + inner flex row; add `/search` route |
| `client/src/components/Sidebar.jsx` | Remove the "PIM" heading (moves to `TopNavbar`) |

---

## State Management

### `useSearchStore` (`client/src/store/searchStore.js`)

```js
{
  // State
  query:       string,      // current value of the search input
  results:     SearchResult[],
  total:       number,
  isLoading:   boolean,
  error:       string | null,
  dropdownOpen: boolean,

  // Actions
  setQuery(q: string): void,        // update input value only (no search)
  search(q: string, limit: number): Promise<void>,  // fire API call
  openDropdown(): void,
  closeDropdown(): void,
  clearResults(): void,
}
```

### `useRecentSearches` hook (`client/src/hooks/useRecentSearches.js`)

Thin hook over `localStorage` key `pim_recent_searches` (JSON array of strings, max 5, newest first).

```js
{
  recentSearches: string[],
  addRecentSearch(q: string): void,   // prepends; dedupes; trims to 5
  deleteRecentSearch(q: string): void,
  clearAllRecentSearches(): void,
}
```

---

## API Client (`client/src/api/search.js`)

```js
/**
 * @param {{ q: string, limit?: number, offset?: number }} params
 * @returns {Promise<{ results: SearchResult[], total: number }>}
 */
export async function search({ q, limit = 10, offset = 0 }) { … }
```

---

## Server Route (`server/routes/search.js`)

Registered at `GET /api/search` in `server/index.js`.

**Processing steps:**
1. Validate `q` is a non-empty string (max 500 chars); return 422 if missing.
2. Parse `q` with `parseQuery(q)` → `{ types, status, priority, tags, date, text }`.
3. For each module in `types` (or all four if null), run the appropriate SQL query using parameterised `LIKE '%term%'` for each text term.
4. Tag filter: for notes, JOIN `note_tags` + `tags WHERE name LIKE ?`; for tasks, JOIN `task_tags` + `task_tags_vocab WHERE name LIKE ?`.
5. Merge all candidate rows into one array; assign each a score using the ranking algorithm.
6. Sort by score DESC, `updated_at` DESC.
7. Slice to `[offset, offset + limit]`; record `total` before slicing.
8. Map each row to the `SearchResult` shape (including subtitle generation).
9. Return `ok({ results, total }, { count, total, q })`.

---

## Error Handling

| Error condition | HTTP status | `error.code`      | UI behaviour                       |
|-----------------|-------------|-------------------|------------------------------------|
| `q` missing     | 422         | `MISSING_PARAMS`  | Dropdown stays closed              |
| `q` too long    | 422         | `VALIDATION_ERROR`| Inline "Query too long" message    |
| Server error    | 500         | `SERVER_ERROR`    | Dropdown/page shows error banner   |

Empty results (0 hits) is a 200 with `results: []` — not an error.

---

## Security Considerations

- All text terms and tag names are passed as parameterised query values (`?` placeholders via `better-sqlite3`); no string interpolation into SQL.
- `type:`, `status:`, `priority:` values are validated against explicit allowlists before use; unrecognised values are silently dropped.
- `limit` is capped server-side at 50 regardless of the client-supplied value.
- `q` is capped at 500 characters server-side; excess is rejected with 422.
- No authentication bypass — all queried data is accessible to the single-user app by design.
