# CLAUDE.md — Personal Information Manager (PIM)
# Project Constitution · Version 1.0

> This file is the single source of truth for all agents and sessions working on this project.
> Read it fully before taking any action. Update it when architectural decisions change.

---

## Project Overview

**Name:** PIM — Personal Information Manager  
**Goal:** A web-based application for managing contacts, notes, tasks, and calendar events in one unified interface.  
**Audience:** Solo users who want a private, fast, self-hosted alternative to fragmented productivity tools.  
**Status:** Phase 1 — Contacts Module (active)

---

## Tech Stack

| Layer        | Choice              | Reason                                      |
|--------------|---------------------|---------------------------------------------|
| Frontend     | React + Vite        | Fast dev server, modern JSX, HMR            |
| Styling      | Tailwind CSS        | Utility-first, consistent design system     |
| State        | Zustand             | Simple, no boilerplate                      |
| Backend      | Node.js + Express   | Lightweight REST API                        |
| Database     | SQLite (via better-sqlite3) | Zero-config, file-based, fast       |
| Auth         | JWT (local only)    | Single-user, no OAuth needed initially      |
| Testing      | Vitest + Playwright | Unit + E2E coverage                         |

**Do not introduce new dependencies without updating this file and getting approval.**

---

## Project Structure

```
claude-pim/
├── CLAUDE.md                  ← YOU ARE HERE (project constitution)
├── .claude/
│   ├── agents/                ← Sub-agent definitions (SKILL.md files)
│   │   ├── requirements.md
│   │   ├── design.md
│   │   ├── tasks.md
│   │   ├── implementer.md
│   │   └── reviewer.md
│   ├── commands/              ← Custom slash commands
│   │   ├── spec-create.md
│   │   ├── spec-implement.md
│   │   └── spec-review.md
│   └── tasks/                 ← Active task tracking (auto-managed)
├── .claudedoc/                ← Spec workspace (one folder per feature)
│   └── contacts/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
├── client/                    ← React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/             ← Zustand stores
│   │   ├── hooks/
│   │   ├── api/               ← API client functions
│   │   └── main.jsx
│   └── vite.config.js
├── server/                    ← Express backend
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── index.js
├── db/
│   ├── schema.sql             ← Source of truth for DB schema
│   └── migrations/
└── tests/
    ├── unit/
    └── e2e/
```

---

## Coding Conventions

### General
- Use **ES modules** (`import`/`export`) everywhere — no CommonJS `require()`
- Use **async/await** — never raw `.then()` chains
- All functions must have a **JSDoc comment** describing purpose, params, return value
- Max file length: **300 lines** — split into modules if exceeded
- No `console.log` in committed code — use the logger utility

### Naming
- Files: `kebab-case.js` / `kebab-case.jsx`
- Components: `PascalCase`
- Functions & variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case` (plural: `contacts`, `notes`, `tasks`)
- Database columns: `snake_case`

### API Design
- REST endpoints follow: `GET /api/contacts`, `POST /api/contacts`, `PATCH /api/contacts/:id`, `DELETE /api/contacts/:id`
- All responses: `{ data, error, meta }` envelope
- Errors always include a `code` string (e.g. `NOT_FOUND`, `VALIDATION_ERROR`)
- HTTP status codes must be semantically correct

### React
- Functional components only — no class components
- Custom hooks live in `client/src/hooks/` and are prefixed `use`
- No inline styles — use Tailwind classes exclusively
- Forms use controlled components with local state

### Database
- All schema changes go through a migration file in `db/migrations/`
- Never mutate `schema.sql` directly after initial creation
- Use parameterised queries — **never string-interpolate user input into SQL**

---

## Spec-Driven Development Workflow

Every feature follows this pipeline. **No implementation starts without an approved spec.**

```
[IDEA] → requirements.md → design.md → tasks.md → [IMPLEMENT] → [REVIEW]
          (Requirements    (Design      (Task        (Implementer  (Reviewer
           Agent)          Agent)       Agent)        Agent)        Agent)
```

### Phase Gate Rules
1. **Requirements → Design:** You (the human) must explicitly say "requirements approved" before the Design Agent runs
2. **Design → Tasks:** You must say "design approved" before the Task Agent runs
3. **Tasks → Implementation:** You must say "tasks approved" before the Implementer Agent runs
4. **Implementation → Merge:** The Reviewer Agent runs automatically; you approve the review

### Spec File Locations
```
.claudedoc/{feature-name}/
├── requirements.md    ← WHAT it does (user stories, acceptance criteria)
├── design.md          ← HOW it works (architecture, data model, API contract)
└── tasks.md           ← ordered, atomic implementation steps
```

---

## Agent Roster

| Agent          | File                        | Responsibility                                      |
|----------------|-----------------------------|-----------------------------------------------------|
| Requirements   | `.claude/agents/requirements.md` | Interviews user, writes `requirements.md`      |
| Design         | `.claude/agents/design.md`       | Writes `design.md` from requirements           |
| Task           | `.claude/agents/tasks.md`        | Writes `tasks.md` from design                  |
| Implementer    | `.claude/agents/implementer.md`  | Writes code per task, one commit per task      |
| Reviewer       | `.claude/agents/reviewer.md`     | Validates code against spec, reports gaps      |

---

## Git Conventions

- Branch naming: `feature/{feature-name}`, `fix/{issue}`, `chore/{topic}`
- One commit per completed task from `tasks.md`
- Commit message format: `feat(contacts): add create contact API endpoint`
- **Never commit directly to `main`** — use PRs (even when solo)
- Each commit must pass `npm test` before being committed (enforced by hook)

---

## Testing Requirements

- Every API endpoint must have at least one integration test
- Every React component with user interaction must have a unit test
- E2E tests cover the happy path of each major user flow
- Run tests: `npm test` (unit) | `npm run test:e2e` (Playwright)

---

## Current Phase Status

| Phase | Module      | Status      | Spec Location              |
|-------|-------------|-------------|----------------------------|
| 1     | Contacts    | ✅ Complete    | `.claudedoc/contacts/`  |
| 2     | Notes       | ✅ Complete    | `.claudedoc/notes/`     |
| 3     | Tasks       | ✅ Complete    | `.claudedoc/tasks/`     |
| 4     | Calendar    | ⬜ Not Started | —                        |
| 5     | Search      | ⬜ Not Started | —                        |

---

## Do's and Don'ts for All Agents

### DO
- Read this file at the start of every session
- Update the Phase Status table when a phase completes
- Ask clarifying questions before writing specs or code
- Make one atomic change at a time; commit before moving on
- Reference spec files using `@.claudedoc/contacts/requirements.md` syntax

### DON'T
- Start implementing before a spec is approved
- Add dependencies not listed in the Tech Stack section
- Skip writing tests
- Write SQL with string interpolation
- Modify another agent's output without noting it in a comment