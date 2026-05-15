# Search — Requirements

## Problem Statement

As the PIM grows across four modules, finding a specific contact, note, task, or event requires navigating to the right module and scanning manually. A unified search bar gives the user a single place to locate anything across the entire app instantly, with structured filters for when they know exactly what they're looking for.

---

## User Stories

- As a user, I want to type a query in the top navbar and see matching results from all modules in a dropdown so that I can jump to any item without knowing which module it lives in.
- As a user, I want to press Enter or click "See all results" to open a full results page so that I can browse and filter a larger result set.
- As a user, I want to use `type:task` or `status:completed` in the search bar so that I can narrow results using structured filters without leaving the keyboard.
- As a user, I want to type `#tagname` or `tag:tagname` to filter by tag so that I can find all notes and tasks associated with a specific topic.
- As a user, I want to use `date:2026-05-13` or `date:today` in the search bar so that I can find tasks due or events starting on a specific date.
- As a user, I want to click into the search box and see my recent searches so that I can re-run a previous query with one click.
- As a user, I want to toggle between a flat list and a grouped-by-module view on the full results page so that I can choose the layout that suits what I'm looking for.
- As a user, I want pinned items that match my query to appear near the top of results so that my most important items surface first.

---

## Acceptance Criteria

### Search Bar (Navbar)
- [ ] A search input is permanently visible in the top navbar on every page.
- [ ] Clicking the search input with no prior query shows a "Recent searches" list (up to 5 entries); if no recent searches exist, the dropdown does not appear until at least 1 character is typed.
- [ ] Recent searches are persisted in `localStorage` and cleared when the user explicitly deletes them.
- [ ] Typing triggers a 300 ms debounce before the search fires, preventing excessive requests on fast keystrokes.
- [ ] The dropdown shows up to 10 results in a flat ranked list; each result has a small module-type icon (contact, note, task, event).
- [ ] A "See all results" row appears at the bottom of the dropdown whenever results exist; clicking it navigates to `/search?q=<query>`.
- [ ] Pressing Enter in the search bar navigates to `/search?q=<query>`.
- [ ] Pressing Escape closes the dropdown and returns focus to the previously focused element.
- [ ] Clicking outside the dropdown closes it.
- [ ] The dropdown shows a friendly empty state ("No results for …") when the query matches nothing.

### Structured Filter Query Language
- [ ] The following filter keys are supported, combinable with free-text in any order:

  | Key | Accepted values | Modules affected |
  |---|---|---|
  | `type:` | `contact`, `note`, `task`, `event` | all |
  | `status:` | `not-started`, `in-progress`, `completed`, `blocked`, `cancelled` | tasks only |
  | `priority:` | `low`, `medium`, `high` | tasks only |
  | `tag:` / `#` | any tag name (case-insensitive) | notes, tasks |
  | `date:` | `YYYY-MM-DD`, `today`, `tomorrow`, `this-week` | tasks (due_date), events (start_at) |

- [ ] `date:` automatically excludes contacts and notes from results (they have no date field).
- [ ] Unrecognised filter keys are treated as plain text.
- [ ] Multiple filters compose with AND logic (all conditions must match).
- [ ] Filter keys are case-insensitive (`Type:Task` = `type:task`).

### Result Ranking
- [ ] Results are ranked by relevance: title/name exact match > title partial match > body/description match.
- [ ] Among equal-relevance results, pinned items (tasks, notes) are ranked above unpinned items.
- [ ] Recency (most recently updated) is the final tiebreaker.

### Full Results Page (`/search?q=…`)
- [ ] Navigating to `/search?q=<query>` renders a full results page pre-populated with the query.
- [ ] The search input in the navbar reflects the current query on the results page.
- [ ] Results default to a flat ranked list with a module-type icon beside each result.
- [ ] A "Group by module" toggle switches to a view where results are separated into labeled sections (Contacts, Notes, Tasks, Events); sections with zero results are hidden.
- [ ] Each module section shows up to 20 results; a "Show more" control loads additional results within that section.
- [ ] A module filter sidebar (or tab row) allows the user to narrow results to a single module.
- [ ] Applying a module filter updates the URL (`/search?q=…&type=task`) so the filtered view is bookmarkable/shareable.
- [ ] The results page shows the total match count ("42 results").
- [ ] The results page shows a friendly empty state when no results are found, with a suggestion to remove filters if any are active.
- [ ] Clicking a result navigates to the relevant detail page for that item.

### Performance & Constraints
- [ ] The search API responds in under 300 ms for typical queries against a dataset of up to 10,000 items per module.
- [ ] SQLite `LIKE` or FTS5 is used for full-text matching; no external search service is introduced.
- [ ] No more than 50 total results are returned per API call.

---

## Out of Scope

- Fuzzy/typo-tolerant matching (e.g. "meating" matching "meeting").
- Search result highlighting / snippet extraction showing matched text in context.
- Saved/named searches (beyond recent search history).
- Searching within file attachments.
- Cross-device sync of recent search history.
- OR logic between filters.

---

## Decisions

- `date:this-week` spans Mon–Sun of the current calendar week.
- Clicking a recent search entry immediately re-runs the search (does not pre-fill for editing).
