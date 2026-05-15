# Seed — Implementation Tasks

## Task List

---

### Task 1 — Date helpers and table-clear utility
**File(s):** `server/seed.js`
**What:** Create `server/seed.js` with:
- `isoDate(offsetDays)` — returns a `'YYYY-MM-DD'` string for today UTC + offsetDays
- `isoDateTime(offsetDays, hour, minute)` — returns a `'YYYY-MM-DD HH:MM:SS'` string for today UTC + offsetDays at the given hour and minute
- `clearAllTables(db)` — deletes all rows from every module table in FK-safe dependency order: `task_tags`, `task_tags_vocab`, `tasks`, `note_tags`, `tags`, `notes`, `contacts`, `events`
- A stub `runSeed(db)` that calls `clearAllTables(db)`, logs `'Seeding database...'`, and logs `'Seed complete'` — no data inserted yet

All functions must be exported. `runSeed` wraps everything in a single `db.transaction(...)` call (even though it's a stub for now — the transaction wrapper stays for all subsequent tasks).

**Done when:** `server/seed.js` exists; `isoDate(0)` returns today's date in `YYYY-MM-DD`; `isoDate(1)` returns tomorrow; `isoDateTime(0, 9, 30)` returns today at `09:30:00`; `clearAllTables` executes without error against the live DB.
**Commit message:** `feat(seed): add date helpers, table-clear utility, and runSeed stub`

---

### Task 2 — Seed contacts
**File(s):** `server/seed.js`
**What:** Implement `seedContacts(db)` and call it from `runSeed`. Insert exactly 20 contacts covering a variety of tech-firm roles. Requirements:
- Every contact has: `first_name`, `last_name`, `email` (`firstname.lastname@{domain}`), `company` (rotate across Arion Tech, Nexus Systems, ByteForge, CloudPeak)
- Exactly 5 contacts have a `phone` value
- Exactly 5 contacts have a `notes` value containing the person's job title and a one-line relationship note (e.g. `"Senior Software Engineer. Leads the payments service team."`)
- Job titles represented: Software Engineer (×2), Senior Software Engineer (×2), Engineering Manager (×2), Product Manager (×2), Product Designer (×2), QA Engineer (×2), DevOps Engineer (×2), Data Scientist (×2), VP of Engineering (×1), CTO (×1)

**Done when:** After server start, `SELECT COUNT(*) FROM contacts` returns 20; at least 5 rows have a non-null `phone`; at least 5 rows have a non-null `notes`.
**Commit message:** `feat(seed): seed 20 tech-firm contacts`

---

### Task 3 — Seed notes with tags
**File(s):** `server/seed.js`
**What:** Implement `seedNotes(db)` and call it from `runSeed`. Steps:
1. Insert 7 rows into `tags`: `engineering`, `design`, `product`, `ops`, `team`, `sprint`, `research`. Capture the returned IDs.
2. Insert exactly 20 notes. Each note's `content` has a first line (title) and at least 2 body lines. Topics: meeting summaries, architecture decision records, sprint retrospectives, onboarding checklists, technical research, team announcements. Exactly 3 notes have `is_pinned = 1`.
3. Link at least 5 notes to tags via `note_tags` (mix of single and multiple tags per note).

**Done when:** `SELECT COUNT(*) FROM notes` = 20; `SELECT COUNT(*) FROM tags` = 7; `SELECT COUNT(DISTINCT note_id) FROM note_tags` ≥ 5; exactly 3 notes have `is_pinned = 1`.
**Commit message:** `feat(seed): seed 20 notes with tags`

---

### Task 4 — Seed tasks with tags
**File(s):** `server/seed.js`
**What:** Implement `seedTasks(db)` and call it from `runSeed`. Steps:
1. Insert the same 7 tag names into `task_tags_vocab`. Capture returned IDs.
2. Insert exactly 20 tasks. Each task has `title`, `body` (1–3 sentences), `due_date` (spread from `isoDate(-7)` through `isoDate(7)`, approx 1–2 per day), `priority`, `status`, `is_pinned`.
   - Priority distribution: 7 × `'Low'`, 8 × `'Medium'`, 5 × `'High'`
   - Status distribution: 5 × `'Not Started'`, 7 × `'In Progress'`, 5 × `'Completed'`, 3 × `'Blocked'`
   - Exactly 3 tasks have `is_pinned = 1`
   - Task titles reflect tech-firm work: code reviews, bug fixes, deployments, PR reviews, documentation, design reviews, sprint ceremonies, infra upgrades
3. Link at least 5 tasks to tags via `task_tags` (mix of single and multiple tags per task).

**Done when:** `SELECT COUNT(*) FROM tasks` = 20; distribution of `status` and `priority` values matches the spec; `SELECT COUNT(DISTINCT task_id) FROM task_tags` ≥ 5; exactly 3 tasks pinned; all `due_date` values fall within ±7 days of today.
**Commit message:** `feat(seed): seed 20 tasks with tags and date-relative due dates`

---

### Task 5 — Seed events
**File(s):** `server/seed.js`
**What:** Implement `seedEvents(db)` and call it from `runSeed`. The function must always insert exactly 20 events using a two-step process:

**Step 1 — Standups (dynamic):**
Collect all day offsets in `[-7, +7]` whose UTC weekday is Monday–Friday (1–5). For each, insert one standup:
- `title`: `'Daily Standup'`
- `start_at`: `isoDateTime(offset, 9, 30)`
- `end_at`: `isoDateTime(offset, 10, 0)`
- `location`: `'Zoom'`
- `color`: `'blue'`
- `all_day`: 0

**Step 2 — Other events (static, fills to 20):**
Define a fixed array of at least 12 event templates, each with a day offset, start hour, duration in minutes, title, location, optional description, and color. Take the first `(20 - standupCount)` templates from this list and insert them. The template list must include at minimum:

| Title | Offset | Start | Dur | Location | Color |
|---|---|---|---|---|---|
| Sprint Planning | −6 | 10:00 | 120 | Conference Room A | green |
| 1:1 — Engineering Manager | −5 | 14:00 | 30 | Zoom | purple |
| Design Review: Onboarding Flow | −3 | 11:00 | 60 | Conference Room B | orange |
| All-Hands Meeting | −1 | 17:00 | 60 | Main Auditorium | red |
| Architecture Discussion | +1 | 13:00 | 60 | Conference Room A | blue |
| Sprint Retrospective | +2 | 15:00 | 90 | Conference Room A | green |
| Customer Demo | +3 | 10:00 | 60 | Zoom | orange |
| Code Review Session | +4 | 14:00 | 60 | Zoom | blue |
| Quarterly OKR Check-in | +5 | 11:00 | 90 | Board Room | purple |
| On-Call Handoff | +6 | 9:00 | 30 | Zoom | red |
| Product Roadmap Review | +7 | 14:00 | 60 | Conference Room B | green |
| Team Lunch | 0 | 12:00 | 60 | The Atrium | orange |

At least 4 templates must include a non-empty `description`. Compute `end_at` as `start_at + duration minutes`.

**Done when:** `SELECT COUNT(*) FROM events` = 20 on any day of the week; all standup `start_at` values fall on weekdays; all `start_at` values fall within the ±7 day window; at least 4 events have a non-null `description`; at least 10 events have a non-null `location`.
**Commit message:** `feat(seed): seed 20 date-relative calendar events including daily standups`

---

### Task 6 — Wire runSeed into server startup
**File(s):** `server/index.js`
**What:**
- Add `import { runSeed } from './seed.js'` to the imports
- In the `start()` function, call `runSeed(db)` immediately after `runMigrations(db)` and before `app.listen()`
- No other changes to `server/index.js`

**Done when:** Running `npm run dev` (or `node server/index.js`) clears all tables and logs `'Seeding database...'` followed by `'Seed complete: 20 contacts, 20 notes, 20 tasks, 20 events'`; after startup all four module list views in the browser are populated.
**Commit message:** `chore(server): wire runSeed into startup sequence`

---

## Rules

- Every task has exactly one commit
- No task should take more than 90 minutes
- Tasks 1–5 build `seed.js` incrementally; each is self-contained
- Task 6 must come last — it activates the seed in production startup
- Do not wire `runSeed` into `server/index.js` before Task 6
