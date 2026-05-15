# Search — Implementation Tasks

## Task List

---

### Task 1 — Server: query parser utility
**File(s):** `server/utils/search-query-parser.js`
**What:** Write and export `parseQuery(rawQuery)`. It must:
- Tokenise the raw string by whitespace
- Recognise `key:value` tokens for `type`, `status`, `priority`, `tag`, `date` (case-insensitive keys)
- Recognise `#tagname` tokens as tag filters
- Treat unrecognised key:value tokens and bare words as free text
- Normalise `status:` values to DB casing (`not-started` → `Not Started`, etc.)
- Normalise `priority:` values to DB casing (`low` → `Low`, etc.)
- Validate `type:` values against `['contact','note','task','event']`; silently drop unknown values
- Resolve `date:` values: `today`, `tomorrow`, `this-week` (Mon–Sun of current ISO week), or `YYYY-MM-DD`
- When `date:` is present and no `type:` is given, implicitly set types to `['task','event']`
- When `status:` or `priority:` is present and no `type:` is given, implicitly set types to `['task']`
- Return `{ types: Set|null, status, priority, tags, date: {start,end}|null, text }`

**Done when:** A suite of unit tests (in the same commit) covers: plain text, all filter keys, `#tag`, combinations, unknown keys falling through as text, implicit type narrowing for `date:`/`status:`/`priority:`, all four `date:` value forms.
**Commit message:** `feat(search): add server-side query parser utility`

---

### Task 2 — Server: search route
**File(s):** `server/routes/search.js`
**What:** Implement `GET /api/search`. Steps:
- Validate `q` is present and ≤ 500 chars; return 422 `MISSING_PARAMS` / `VALIDATION_ERROR` otherwise
- Parse `q` with `parseQuery`
- For each active module type, run parameterised SQL `LIKE '%term%'` queries against the correct columns:
  - **contacts**: `first_name`, `last_name`, `email`, `phone`, `company`, `notes`
  - **notes**: `content`; JOIN `note_tags` + `tags WHERE tags.name LIKE ?` for tag filter
  - **tasks**: `title`, `body`; JOIN `task_tags` + `task_tags_vocab WHERE task_tags_vocab.name LIKE ?` for tag filter; apply `status` / `priority` / `due_date` filters
  - **events**: `title`, `description`, `location`; apply `start_at` date range filter
- Score each candidate in JavaScript per the ranking table in design.md (title exact +100, starts-with +80, contains +60, body contains +30, is_pinned +50, recency 0–20)
- Merge all candidates, sort by score DESC then `updated_at` DESC
- Record `total` before slicing; slice to `[offset, offset+limit]` (limit capped at 50)
- Build `SearchResult` objects with `kind`, `id`, `title`, `subtitle`, `url`, `updatedAt`, `isPinned`; subtitle rules per design.md
- Return `ok({ results, total }, { count, total, q })`

**Done when:** `GET /api/search?q=meeting` returns ranked results from all modules; `GET /api/search?q=type:task status:completed` returns only completed tasks; `GET /api/search` (no `q`) returns 422; tag filter works for both notes and tasks.
**Commit message:** `feat(search): add GET /api/search route`

---

### Task 3 — Server: register search router
**File(s):** `server/index.js`
**What:** Import `server/routes/search.js` and mount it at `/api/search` — exactly as the other routers are registered.
**Done when:** `curl "http://localhost:3001/api/search?q=test"` returns a valid JSON envelope.
**Commit message:** `chore(server): register /api/search router`

---

### Task 4 — Frontend: search API client
**File(s):** `client/src/api/search.js`
**What:** Export `search({ q, limit = 10, offset = 0 })`. Uses the shared fetch pattern from other API clients. Throws a descriptive `Error` on non-2xx. Returns `{ results, total }` from the response envelope.
**Done when:** The function can be imported and called; it hits `GET /api/search` with the correct query string; errors are thrown with the API error code.
**Commit message:** `feat(search): add search API client`

---

### Task 5 — Frontend: useRecentSearches hook
**File(s):** `client/src/hooks/useRecentSearches.js`
**What:** Custom hook managing recent searches in `localStorage` key `pim_recent_searches` (JSON array, max 5, newest first). Export:
- `recentSearches: string[]`
- `addRecentSearch(q)` — prepend, dedupe (remove existing entry first), trim to 5
- `deleteRecentSearch(q)` — remove by value
- `clearAllRecentSearches()` — empty the list

**Done when:** Unit tests confirm: adding a new entry, deduplication on re-add, trimming at 5 entries, deleting an entry, clearing all.
**Commit message:** `feat(search): add useRecentSearches hook`

---

### Task 6 — Frontend: useSearchStore
**File(s):** `client/src/store/searchStore.js`
**What:** Zustand store with state: `query` (string), `results` (array), `total` (number), `isLoading` (boolean), `error` (string|null), `dropdownOpen` (boolean). Actions:
- `setQuery(q)` — update `query` only (no API call)
- `search(q, limit)` — set `isLoading`, call `search()` API client, set `results`/`total`, clear `isLoading`; set `error` on failure
- `openDropdown()` / `closeDropdown()`
- `clearResults()`

**Done when:** Store can be imported; `search()` action updates `results` and `total`; `isLoading` is true during the fetch and false after; `error` is set on API failure.
**Commit message:** `feat(search): add useSearchStore Zustand store`

---

### Task 7 — Frontend: TypeIcon component
**File(s):** `client/src/components/TypeIcon.jsx`
**What:** Renders a 14×14 inline SVG appropriate for each `kind` prop value:
- `contact` — person silhouette
- `note` — document with lines
- `task` — checkbox square (reuse or mirror the icon style from TaskChip)
- `event` — small calendar grid

All SVGs are `aria-hidden="true"`. The root element accepts a `className` prop for colour overrides.

**Done when:** All four icons render distinctly without broken SVG; component is exported.
**Commit message:** `feat(search): add TypeIcon component`

---

### Task 8 — Frontend: SearchResultItem component
**File(s):** `client/src/components/SearchResultItem.jsx`
**What:** A single result row used in both the dropdown and the full results page.
- Layout: `[TypeIcon] [title] · [subtitle]` in a single line (subtitle muted/smaller)
- Full-width clickable (`role="button"`, keyboard accessible via Enter/Space)
- Hover: light gray background
- Props: `result` (SearchResult object), `onClick` (function)

**Done when:** Renders correctly for all four `kind` values; keyboard-activatable; subtitle is visually subordinate.
**Commit message:** `feat(search): add SearchResultItem component`

---

### Task 9 — Frontend: SearchDropdown component
**File(s):** `client/src/components/SearchDropdown.jsx`
**What:** The panel rendered below `SearchBar`. Three render modes:
1. **Recent** (`query === ''` and `recentSearches.length > 0`): list of up to 5 recent searches, each with a clock icon and an ✕ delete button; clicking the row calls `onRecentClick(q)`; clicking ✕ calls `onDeleteRecent(q)`.
2. **Results** (`results.length > 0`): up to 10 `SearchResultItem` rows, then a "See all results →" footer row that calls `onSeeAll()`.
3. **Empty** (`query !== ''` and `results.length === 0` and `!isLoading`): "No results for «query»" message.
4. **Loading**: subtle spinner or skeleton.

Props: `{ results, recentSearches, isLoading, query, onResultClick, onSeeAll, onRecentClick, onDeleteRecent }`.

Styling: white card, shadow-lg, rounded-lg, `z-50`, `absolute` below the input, `w-96` min-width.

**Done when:** All three content states render correctly; recent searches show ✕ buttons; "See all results" row is present when results exist.
**Commit message:** `feat(search): add SearchDropdown component`

---

### Task 10 — Frontend: SearchBar component
**File(s):** `client/src/components/SearchBar.jsx`
**What:** The navbar search input + dropdown controller.
- Renders a text input (placeholder "Search…", `role="search"`)
- On focus: opens dropdown via `store.openDropdown()`; if query is empty shows recent searches
- On input change: calls `store.setQuery(q)`; after 300 ms debounce calls `store.search(q, 10)`
- On Enter: save to recent searches via `addRecentSearch`; navigate to `/search?q=<encoded>`; close dropdown
- On Escape: close dropdown; blur input
- Click outside (using a `useEffect` + `mousedown` listener on `document`): close dropdown
- On result click: `addRecentSearch(result.title)`; navigate to `result.url`; close dropdown
- On "See all results": `addRecentSearch(query)`; navigate to `/search?q=<encoded>`; close dropdown
- On recent search click: `store.search(q, 10)`; navigate to `/search?q=<encoded>`
- Renders `<SearchDropdown>` when `store.dropdownOpen === true`

**Done when:** Debounced search fires correctly; Escape closes dropdown; Enter navigates; clicking a result navigates to the correct URL; clicking outside closes the dropdown.
**Commit message:** `feat(search): add SearchBar component`

---

### Task 11 — Frontend: TopNavbar component
**File(s):** `client/src/components/TopNavbar.jsx`
**What:** A fixed-height (`h-14`) top bar rendered above the sidebar+content area.
- Left: "PIM" wordmark in the same style as the current Sidebar heading
- Centre/right: `<SearchBar />`
- Styling: white background, bottom border (`border-b border-gray-200`), `z-20`, full width, flex layout
- No props

**Done when:** Renders with the PIM wordmark on the left and `SearchBar` on the right; full width; visually separates from the content below.
**Commit message:** `feat(search): add TopNavbar component`

---

### Task 12 — Frontend: SearchPage component
**File(s):** `client/src/pages/SearchPage.jsx`
**What:** The full results page at `/search`.
- On mount and whenever URL `?q` or `?type` changes: call `store.search(q, 50)`
- Keep the navbar `SearchBar` input in sync with `?q` (via `store.setQuery`)
- Render:
  - Total count: "N results for «query»"
  - Module filter tabs: All · Contacts · Notes · Tasks · Events; active tab updates `?type=` in URL (using `useSearchParams`)
  - "Group by module" toggle button (local state, not URL)
  - `<SearchResultList>` with `grouped` prop driven by toggle state
  - Empty state when `results.length === 0` and not loading, with hint to clear filters if `?type` is set
- Clicking a result navigates to `result.url`

**Done when:** Navigating to `/search?q=meeting` shows results; changing `?type=task` filters to tasks only; group toggle switches layout; empty state appears when no results.
**Commit message:** `feat(search): add SearchPage component`

---

### Task 13 — Frontend: SearchResultList component
**File(s):** `client/src/components/SearchResultList.jsx`
**What:** Flat or grouped result list used inside `SearchPage`.
- **Flat mode** (`grouped={false}`): renders `SearchResultItem` rows in order.
- **Grouped mode** (`grouped={true}`): groups results by `kind`; renders a labelled section header per kind (e.g. "Tasks", "Notes"); sections with 0 results are hidden; each section shows up to 20 items with a "Show more" control (local state) that reveals the next 20.
- Props: `{ results, grouped, onResultClick }`

**Done when:** Flat mode renders all results in order; grouped mode shows section headers; "Show more" reveals additional items within a section; sections with no results are absent.
**Commit message:** `feat(search): add SearchResultList component`

---

### Task 14 — Frontend: wire App.jsx and Sidebar
**File(s):** `client/src/App.jsx`, `client/src/components/Sidebar.jsx`
**What:**
- In `App.jsx`: restructure the layout so `<TopNavbar />` sits above a `flex flex-1 overflow-hidden` row containing `<Sidebar />` and `<main>`. Add the `/search` route pointing to `<SearchPage />`. Import all new components.
- In `Sidebar.jsx`: remove the "PIM" heading/wordmark (it now lives in `TopNavbar`).

**Done when:** The app renders with the navbar across the top; sidebar no longer shows "PIM"; `/search` route resolves to `SearchPage`; all existing routes still work.
**Commit message:** `feat(search): wire TopNavbar, SearchPage into App and clean up Sidebar`

---

### Task 15 — E2E tests: search happy path
**File(s):** `tests/e2e/search.spec.js`
**What:** Playwright E2E tests covering:
1. **Search bar visible** — navigate to `/contacts`; assert search input is visible in the top navbar.
2. **Dropdown appears on typing** — type "test" in the search bar; assert the dropdown appears.
3. **Recent searches** — perform a search, press Enter to go to results page, navigate back, click the search bar; assert the previous query appears in recent searches.
4. **Full results page** — type a query for a known contact (created via API in `beforeEach`); press Enter; assert `/search?q=…` URL, result count visible, at least one result row with the contact's name.
5. **Type filter** — on the results page click the "Tasks" tab; assert URL contains `type=task`; results show only task-kind items.
6. **Group toggle** — click "Group by module"; assert section headers appear.
7. **Empty state** — search for a string guaranteed to match nothing; assert the empty state message is visible.

Use `beforeEach` to seed one contact, one note, and one task via the API; clean up with `afterEach`.

**Done when:** All 7 E2E tests pass; no existing tests are broken.
**Commit message:** `test(search): E2E happy path with Playwright`

---

## Rules

- Every task has exactly one commit
- No task should take more than 90 minutes
- Backend tasks (1–3) must be complete before frontend tasks (4–14) begin
- The query parser (Task 1) must be complete before the search route (Task 2)
- `useSearchStore` (Task 6) must be complete before `SearchBar` (Task 10) and `SearchPage` (Task 12)
- `SearchResultItem` (Task 8) must be complete before `SearchDropdown` (Task 9) and `SearchResultList` (Task 13)
- `TopNavbar` (Task 11) and `SearchPage` (Task 12) must be complete before the App wiring (Task 14)
- E2E tests (Task 15) run last
