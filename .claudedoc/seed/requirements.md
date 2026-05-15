# Seed — Requirements

## Problem Statement
The PIM database is file-based (SQLite at `db/pim.db`) and persists between server restarts, but during active development the UI is often stale or empty, making it hard to exercise list views, search ranking, grouped results, and calendar layouts without manually entering data first. A deterministic seed that runs on every restart and populates all four modules with realistic, date-relative mock data removes that friction — every developer session starts with a fully-populated, calendar-accurate dataset that reflects the current two-week window.

## User Stories
- As a developer, I want the database to be cleared and repopulated with realistic mock data on every server restart so that I always have a fully-populated UI to work with.
- As a developer, I want task due dates and calendar events to be anchored to the current date so that the data is always relevant to today's view, never stale or in the distant past.
- As a developer, I want the mock data to reflect a generic tech-firm work context (engineers, PMs, sprints, standups, code reviews) so that the UI feels realistic during development and demos.
- As a developer, I want each module to contain 15–25 records so that list pagination, search ranking, and grouped search results are all exercisable without additional setup.
- As a developer, I want tag, status, and priority variety across tasks and notes so that filter and search features can be tested across all allowed values.

## Acceptance Criteria

### Trigger
- [ ] The seed runs automatically every time the Express server starts (in `server/index.js`, after migrations).
- [ ] Before seeding, all rows are deleted from every module table in dependency order: `task_tags`, `task_tags_vocab`, `tasks`, `note_tags`, `tags`, `notes`, `contacts`, `events`.
- [ ] The seed completes synchronously before the server begins accepting requests.

### Data volume
- [ ] Exactly 20 contacts are created.
- [ ] Exactly 20 notes are created.
- [ ] Exactly 20 tasks are created.
- [ ] Exactly 20 calendar events are created.

### Date window
- [ ] All date-sensitive values (task `due_date`, event `start_at` / `end_at`) are computed relative to the date at seed time — no hardcoded year/month/day values.
- [ ] Task due dates are distributed across the window from 7 days before today through 7 days after today (inclusive).
- [ ] Calendar events are distributed across the same −7 / +7 day window, with realistic working-hours start times (08:00–17:00) and durations of 30 minutes to 2 hours.

### Content — Contacts
- [ ] Each contact has a realistic tech-firm name (first + last), a company email, a job title drawn from a variety of roles (Software Engineer, Product Manager, Designer, QA Engineer, Engineering Manager, DevOps Engineer, Data Scientist, etc.), and a company name.
- [ ] At least 3 contacts include a phone number.
- [ ] At least 3 contacts include a `notes` field with a short biographical or relationship note.

### Content — Notes
- [ ] Each note has a multi-line `content` field: the first line is the note title, subsequent lines are the body.
- [ ] Note topics reflect a tech-firm context: meeting summaries, architecture decisions, onboarding checklists, retrospective notes, technical research, team announcements, etc.
- [ ] At least 5 notes have at least one tag (tags are drawn from a set such as `engineering`, `design`, `product`, `ops`, `team`, `sprint`, `research`).
- [ ] At least 3 notes have `is_pinned = 1`.

### Content — Tasks
- [ ] Each task has a `title`, a `body` (1–3 sentences of detail), a `status`, a `priority`, and a `due_date` within the two-week window.
- [ ] Status values are distributed across all allowed values: `Not Started`, `In Progress`, `Completed`, `Blocked`.
- [ ] Priority values are distributed across `Low`, `Medium`, `High`.
- [ ] At least 5 tasks have at least one tag from the same vocabulary used for notes.
- [ ] At least 3 tasks have `is_pinned = 1`.
- [ ] Task titles reflect tech-firm work: code reviews, bug fixes, deployments, sprint planning, documentation, design reviews, etc.

### Content — Events
- [ ] Each event has a `title`, a `start_at`, an `end_at` (start + duration), and at least half include a `location` (e.g. "Zoom", "Conference Room A", "Google Meet").
- [ ] At least 4 events include a `description`.
- [ ] Event titles reflect a tech-firm calendar: daily standups, sprint planning, retrospectives, 1:1s, all-hands, demo days, design reviews, on-call handoffs, etc.
- [ ] At least one standup event recurs on each weekday within the window (i.e. 5–10 standup entries).

### Logging
- [ ] The server logs a single INFO line when the seed starts (e.g. `Seeding database...`) and a single INFO line when it completes (e.g. `Seed complete: 20 contacts, 20 notes, 20 tasks, 20 events`).

## Out of Scope
- Seeding is not environment-gated (e.g. no `NODE_ENV=development` check) — it runs unconditionally on every restart.
- No CLI flag or API endpoint to trigger seeding on demand.
- No option to skip seeding or preserve existing data.
- Seed data does not need to be randomised — a deterministic, fixed dataset is acceptable as long as dates are always computed relative to `Date.now()`.
- No seed data for the `_migrations` tracking table.
- No dedicated seed tests — correctness is verified by the existing integration and E2E test suites which wipe the DB before each test.

## Open Questions
- None — all decisions confirmed by the developer.
