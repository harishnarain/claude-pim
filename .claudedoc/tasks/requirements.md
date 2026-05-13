# Tasks — Requirements

**Feature:** Tasks
**Phase:** 3
**Status:** Draft
**Date:** 2026-05-07

---

## Problem Statement

The user needs a lightweight task manager inside the PIM — a place to capture time-bound to-do items, track their progress through defined status phases, and prioritise work at a glance. Tasks differ from Notes in that they carry structured metadata (due date, status, priority) and are intended to drive action rather than store reference material. The feature must also lay the groundwork for a future Calendar integration, where tasks will appear on the calendar automatically.

---

## User Stories

- As a user, I want to create a task with a title and optional body so that I can capture what needs to be done and any relevant context.
- As a user, I want to set a due date on a task so that I know when it must be completed.
- As a user, I want to assign a priority (Low, Medium, High) to a task so that I can communicate and sort by urgency.
- As a user, I want to set and update a task's status (Not Started, Blocked, In Progress, Completed, Cancelled) so that I can track where each piece of work stands.
- As a user, I want to tag tasks with labels so that I can group related work across different projects or themes.
- As a user, I want to pin important tasks so that they always appear at the top of my list.
- As a user, I want to filter my task list by status and by priority so that I can focus on what matters right now.
- As a user, I want completed tasks to stay visible at the bottom of the list (with a done style) so that I can see what I've accomplished and undo a completion if needed.
- As a user, I want to sort tasks by due date so that I can identify what is coming up soonest.
- As a user, I want to edit and delete tasks so that I can keep my list accurate and clean.
- As a user, I want each module in the sidebar to have a recognisable icon so that I can navigate the app quickly at a glance.

---

## Acceptance Criteria

### Create & Edit

- [ ] A task can be created with at minimum a non-empty Title.
- [ ] Title is required; the UI prevents saving a task with a blank title.
- [ ] Body is optional freeform text (no Markdown rendering required — plain text is sufficient for this phase).
- [ ] Title is limited to 255 characters; body is limited to 10,000 characters. The UI enforces these limits.
- [ ] Tasks are saved automatically (debounced keypress / on blur) or via an explicit Save button — decision deferred to Design Agent.

### Fields

- [ ] **Title** — required string, max 255 characters.
- [ ] **Body** — optional string, max 10,000 characters, plain text.
- [ ] **Due Date** — optional date (date only, no time component). Displayed as a human-readable date (e.g. "May 12, 2026"). Overdue dates are visually highlighted.
- [ ] **Priority** — required enum: Low (default), Medium, High. Displayed as a coloured badge on the card and detail view.
- [ ] **Status** — required enum: Not Started (default), Blocked, In Progress, Completed, Cancelled. Displayed as a badge. Changing status is possible from both the list card and the detail view.
- [ ] **Tags** — 0–5 tags per task, managed via a dropdown/combobox (same UX pattern as Notes). Tags can be created on the fly. A tag is automatically deleted from the system when no tasks reference it (task tags are stored in a separate `task_tags` table and are not yet unified with Notes tags).
- [ ] **Pin** — boolean, default false. A pinned task always appears before unpinned tasks in the list.

### List View

- [ ] The task list shows each task as a card containing: title, short body preview (truncated), due date, priority badge, status badge, and tags.
- [ ] Pinned tasks appear above unpinned tasks.
- [ ] Completed and Cancelled tasks sink to the bottom of the list, below all active tasks, with a visual "done" treatment (e.g. muted colours, strikethrough title).
- [ ] Completed tasks can be un-completed (status changed back to In Progress or Not Started) from the list or detail view.
- [ ] The user can filter the list by status (one or more statuses) and by priority (one or more priorities). Filters can be combined.
- [ ] The user can sort the list by due date (ascending — soonest first — is the default).
- [ ] Filter and sort selections persist for the session (persistence across sessions is a design decision).

### Delete

- [ ] A task can be deleted from the detail view.
- [ ] Deletion requires a confirmation dialog (same ConfirmDialog pattern as Contacts and Notes).
- [ ] After deletion the user is redirected to the Tasks list.
- [ ] Deleting a task removes any `task_tags` entries that are no longer referenced by any other task.

### Navigation & Routing

- [ ] Tasks has its own sidebar link and dedicated route (e.g. `/tasks`).
- [ ] Clicking a task card navigates to a task detail/edit page (e.g. `/tasks/:id`).
- [ ] A "New Task" button is accessible from the task list view.

### Module Icons (cross-cutting)

- [ ] Every module link in the sidebar displays a small, recognisable icon alongside its label: Contacts, Notes, Tasks, and any future modules (Calendar, Search).
- [ ] Icons are implemented using inline SVG or a zero-dependency icon approach — no new npm packages.
- [ ] Icons are visually consistent in size and style across all modules.
- [ ] The active sidebar link highlights both the icon and the label.

---

## Field Definitions

| Field      | Type    | Required | Default     | Constraints                              |
|------------|---------|----------|-------------|------------------------------------------|
| id         | integer | yes      | auto        | Primary key                              |
| title      | string  | yes      | —           | Max 255 characters                       |
| body       | string  | no       | null        | Max 10,000 characters, plain text        |
| due_date   | date    | no       | null        | Date only (no time); ISO 8601 date       |
| priority   | enum    | yes      | Low         | Low / Medium / High                      |
| status     | enum    | yes      | Not Started | Not Started / Blocked / In Progress / Completed / Cancelled |
| is_pinned  | boolean | yes      | false       |                                          |
| created_at | datetime| yes      | now()       | Set on insert, never updated             |
| updated_at | datetime| yes      | now()       | Updated on every save                    |

Tags are stored in a separate `task_tags` join table (task_id, tag_id) referencing a `tags` table for tasks. The Design Agent must decide whether to introduce a shared `tags` table or keep task tags fully isolated.

---

## Out of Scope

- Subtasks or nested task hierarchies
- Recurring tasks
- Time-of-day on due dates (date only in this phase)
- Full-text or title search (deferred to Phase 5 — Search module)
- Task sharing, export, or collaboration
- Attachments or file linking
- Revision history
- Reminders or notifications
- Calendar integration implementation (the data model must not block it, but Calendar rendering of tasks is a Phase 4 concern)
- Unification of task tags with Notes tags (deferred to a later phase)
- Rich-text / Markdown rendering in the body field
- Animated or interactive icons (static SVG only)

---

## Notes for the Design Agent

- **Calendar compatibility:** The `due_date` field on tasks must be accessible to the Calendar module in Phase 4. Tasks will appear on the Calendar on their due date. The schema should make this join straightforward. Do not couple the implementation to Calendar, but do not create a schema that would require a migration to support it.
- **Tags isolation:** For now, `task_tags` is a separate table. The Design Agent should document the intended unification path so Phase 5 can merge tags without breaking existing data.
- **Status transitions:** There are no enforced transition rules (e.g. Blocked can move directly to Completed). All transitions are valid.
- **Sort default:** Default sort is due date ascending (soonest first). Tasks with no due date should sort after tasks with a due date.
- **Priority badge colours:** Suggest a consistent palette (e.g. Low = grey, Medium = yellow/amber, High = red). Final colours are a design decision.

---

## Open Questions

- **Auto-save vs explicit Save:** Should tasks save automatically (debounced) or require an explicit Save action? (Recommend auto-save for consistency with Notes — decision for Design Agent.)
- **Filter persistence:** Should filter and sort selections persist across sessions (localStorage) or be session-only (Zustand state)?
- **No-due-date sort placement:** Tasks without a due date — should they sort to the top or bottom when sorting by due date ascending? (Recommend bottom — confirm at design time.)
- **Tag character limits:** Should individual tag names have a maximum length? (Suggest 30 characters — consistent with Notes tags once unified.)
- **Status change from list:** Should status be changeable directly from the task card (e.g. a dropdown inline on the card), or only from the detail view?
