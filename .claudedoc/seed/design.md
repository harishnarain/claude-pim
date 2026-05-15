# Seed — Technical Design

## Architecture Overview

The seed is a pure server-side startup hook with no new tables, no API endpoints, and no frontend changes. It runs synchronously in `server/index.js` immediately after `runMigrations()`, before the HTTP server begins accepting requests.

```
server/index.js  start()
  ├── getDb()
  ├── runMigrations(db)
  ├── runSeed(db)          ← NEW
  └── app.listen(PORT)

server/seed.js             ← NEW FILE
  └── runSeed(db)
        ├── clearAllTables(db)
        ├── seedContacts(db)
        ├── seedNotes(db)
        ├── seedTasks(db)
        └── seedEvents(db)
```

`runSeed` is a synchronous, all-or-nothing operation wrapped in a single SQLite transaction so the database is never left partially seeded if the process crashes mid-way.

---

## Data Model

No new tables or migrations. The seed writes to the eight existing tables:

| Table            | Operation     | Notes                                      |
|------------------|---------------|--------------------------------------------|
| `contacts`       | DELETE + INSERT | 20 rows                                  |
| `notes`          | DELETE + INSERT | 20 rows                                  |
| `tags`           | DELETE + INSERT | 7 shared note-tag names                  |
| `note_tags`      | DELETE + INSERT | join rows for 5+ notes                   |
| `tasks`          | DELETE + INSERT | 20 rows                                  |
| `task_tags_vocab`| DELETE + INSERT | 7 task-tag names (same names as `tags`)  |
| `task_tags`      | DELETE + INSERT | join rows for 5+ tasks                   |
| `events`         | DELETE + INSERT | 20 rows                                  |

### Clear order (respects FK constraints)
```
task_tags → task_tags_vocab → tasks
note_tags → tags → notes
contacts
events
```

---

## Module-by-module Data Spec

### Date helpers (private to `seed.js`)

All dates are computed in UTC relative to `new Date()` at the moment `runSeed` is called — no hardcoded year/month/day values anywhere.

| Helper | Signature | Returns |
|---|---|---|
| `isoDate` | `(offsetDays: number) → string` | `'YYYY-MM-DD'` |
| `isoDateTime` | `(offsetDays: number, hour: number, minute: number) → string` | `'YYYY-MM-DD HH:MM:SS'` |

`isoDate(0)` = today, `isoDate(-3)` = 3 days ago, `isoDate(7)` = 7 days from now.

### Contacts — 20 rows

| Field | Strategy |
|---|---|
| `first_name`, `last_name` | Fixed list of 20 realistic full names |
| `email` | `firstname.lastname@{company-domain}` (lowercase, dot-separated) |
| `company` | Rotated across 4 fictional tech firms: Arion Tech, Nexus Systems, ByteForge, CloudPeak |
| `phone` | Populated for exactly 5 contacts |
| `notes` | Populated for exactly 5 contacts; content is a short bio + job title (e.g. "Senior Software Engineer. Leads the payments service team.") |

Job titles (no dedicated column; embedded in `notes` when present): Software Engineer, Senior Software Engineer, Engineering Manager, Product Manager, Product Designer, QA Engineer, DevOps Engineer, Data Scientist, VP of Engineering, CTO.

### Notes — 20 rows

| Field | Strategy |
|---|---|
| `content` | First line = title; subsequent lines = body (2–4 lines). Topics: meeting summaries, architecture decision records, sprint retrospectives, onboarding checklists, technical research, team announcements. |
| `is_pinned` | `1` for exactly 3 notes, `0` for the rest |
| Tags | 7 tag names: `engineering`, `design`, `product`, `ops`, `team`, `sprint`, `research`. Inserted into `tags` table once, then linked to at least 5 notes via `note_tags`. |

### Tasks — 20 rows

| Field | Strategy |
|---|---|
| `title` | Fixed list: code reviews, bug fixes, deployments, PR reviews, documentation, design reviews, sprint ceremonies, infra upgrades |
| `body` | 1–3 sentences of detail per task |
| `due_date` | Spread across `isoDate(-7)` through `isoDate(7)` — approximately 1–2 tasks per day |
| `priority` | Distribution: 7 × Low, 8 × Medium, 5 × High |
| `status` | Distribution: 5 × Not Started, 7 × In Progress, 5 × Completed, 3 × Blocked |
| `is_pinned` | `1` for exactly 3 tasks, `0` for the rest |
| Tags | Same 7 names as notes, inserted into `task_tags_vocab`. At least 5 tasks linked via `task_tags`. |

### Events — exactly 20 rows

Event generation uses a two-step process:

**Step 1 — Standups (dynamic):**  
Collect all weekday day-offsets in the `[-7, +7]` window (typically 10). For each, create one daily standup:

| Field | Value |
|---|---|
| `title` | `'Daily Standup'` |
| `start_at` | `isoDateTime(offset, 9, 30)` |
| `end_at` | `isoDateTime(offset, 10, 0)` (30 min) |
| `location` | `'Zoom'` |
| `color` | `'blue'` |

**Step 2 — Other events (static, fills to 20):**  
Define a fixed list of 12 other event templates (more than needed). Assign day offsets spread across the window. Take `20 - standupCount` templates (typically 10). Each template specifies a day offset, start hour, duration, title, location, description, and color. Examples:

| Title | Offset | Start | Duration | Location | Color |
|---|---|---|---|---|---|
| Sprint Planning | -6 | 10:00 | 2 h | Conference Room A | green |
| 1:1 — Engineering Manager | -5 | 14:00 | 30 min | Zoom | purple |
| Design Review: Onboarding Flow | -3 | 11:00 | 1 h | Conference Room B | orange |
| All-Hands Meeting | -1 | 17:00 | 1 h | Main Auditorium | red |
| Architecture Discussion | +1 | 13:00 | 1 h | Conference Room A | blue |
| Sprint Retrospective | +2 | 15:00 | 1.5 h | Conference Room A | green |
| Customer Demo | +3 | 10:00 | 1 h | Zoom | orange |
| Code Review Session | +4 | 14:00 | 1 h | Zoom | blue |
| Quarterly OKR Check-in | +5 | 11:00 | 1.5 h | Board Room | purple |
| On-Call Handoff | +6 | 09:00 | 30 min | Zoom | red |
| Product Roadmap Review | +7 | 14:00 | 1 h | Conference Room B | green |
| Team Lunch | 0 | 12:00 | 1 h | The Atrium | orange |

All `all_day = 0`. At least 4 templates include a `description`.

---

## API Contract

No new endpoints. The seed runs entirely at startup with no HTTP interface.

---

## Component Design (Frontend)

No changes. The frontend benefits automatically — the seeded data is served by the existing REST endpoints.

---

## State Management

No Zustand store changes.

---

## Error Handling Strategy

- If `runSeed` throws (e.g. a constraint violation), the error propagates out of `start()` and crashes the process with a non-zero exit code. This is intentional — a failed seed means the app would start with partial or no data, which is worse than not starting at all.
- The error is logged by the existing logger before propagation.

---

## Security Considerations

- All SQL uses parameterised `?` placeholders — no string interpolation of seed values into SQL.
- No user input is involved; the seed data is entirely static, so there is no injection surface.

---

## Files Changed

| File | Change |
|---|---|
| `server/seed.js` | New file — exports `runSeed(db)` |
| `server/index.js` | Add `import { runSeed }` + one `runSeed(db)` call in `start()` |
