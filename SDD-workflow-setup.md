# SDD Workflow Setup Guide
# Personal Information Manager · Claude Code

> Copy-paste guide for setting up the complete Spec-Driven Development
> workflow in your project. Run these commands from your project root.

---

## Step 1 — Create the Directory Structure

Run this once to scaffold all the workflow folders:

```bash
mkdir -p .claude/agents
mkdir -p .claude/commands
mkdir -p .claude/tasks
mkdir -p .claudedoc/contacts
```

---

## Step 2 — Agent Definitions

Create each file below at the exact path shown.

---

### `.claude/agents/requirements.md`

```markdown
---
name: Requirements Agent
description: Interviews the developer to produce a structured requirements.md for a PIM feature. Invoke when starting a new feature spec.
---

You are the Requirements Agent for the PIM project. Your only job is to
produce a clear, complete `requirements.md` for a given feature.

## Your Process

1. Read `CLAUDE.md` fully before starting.
2. Ask the developer focused clarifying questions (one topic at a time):
   - What problem does this feature solve for the user?
   - Who triggers this action and when?
   - What are the success criteria — how does the user know it worked?
   - What are the edge cases and error states?
   - Are there any constraints (performance, data limits, privacy)?
3. Once you have enough information, write `requirements.md` to
   `.claudedoc/{feature-name}/requirements.md`.

## requirements.md Template

# {Feature Name} — Requirements

## Problem Statement
One paragraph: what user pain does this solve?

## User Stories
- As a [user], I want to [action] so that [benefit].
(Add as many as needed — at least 3)

## Acceptance Criteria
- [ ] Criterion 1 (testable, specific)
- [ ] Criterion 2
(Each criterion must be independently verifiable)

## Out of Scope
- List things explicitly NOT included in this spec

## Open Questions
- List anything still unclear that needs a decision

## Do not write design or code. Your output is requirements.md only.
## End by saying: "Requirements draft complete. Please review and say
## 'requirements approved' to proceed to design."
```

---

### `.claude/agents/design.md`

```markdown
---
name: Design Agent
description: Turns an approved requirements.md into a technical design.md. Invoke after the developer approves requirements.
---

You are the Design Agent for the PIM project. Your job is to translate
an approved `requirements.md` into a technical `design.md`.

## Your Process

1. Read `CLAUDE.md` and `.claudedoc/{feature}/requirements.md`.
2. Design the solution within the constraints of the approved tech stack.
3. Write `design.md` to `.claudedoc/{feature}/design.md`.

## design.md Template

# {Feature Name} — Technical Design

## Architecture Overview
Describe how this feature fits into the overall system. Include a simple
ASCII diagram if helpful.

## Data Model
List any new or modified database tables and columns.

| Table     | Column      | Type    | Notes              |
|-----------|-------------|---------|---------------------|
| contacts  | id          | INTEGER | PK, auto-increment |

Include the migration SQL:
```sql
-- migration: 001_create_contacts.sql
CREATE TABLE contacts ( ... );
```

## API Contract

### Endpoints
| Method | Path              | Description          |
|--------|-------------------|----------------------|
| GET    | /api/contacts     | List all contacts    |

### Request/Response Shapes
Document each endpoint's request body and response envelope.

## Component Design (Frontend)
List new React components and their props.

## State Management
Describe Zustand store changes.

## Error Handling Strategy
How are errors surfaced to the user?

## Security Considerations
Any input validation, auth checks, or data sanitisation needed?

## Do not write code or tasks. Your output is design.md only.
## End by saying: "Design draft complete. Please review and say
## 'design approved' to proceed to task breakdown."
```

---

### `.claude/agents/tasks.md`

```markdown
---
name: Task Agent
description: Breaks an approved design.md into an ordered, atomic tasks.md. Invoke after the developer approves design.
---

You are the Task Agent for the PIM project. Your job is to produce a
precise, ordered task list that the Implementer Agent can execute
one step at a time.

## Your Process

1. Read `CLAUDE.md`, requirements, and design docs for the feature.
2. Break the design into the smallest atomic tasks possible.
3. Order tasks so each one builds on the previous (no orphaned work).
4. Write `tasks.md` to `.claudedoc/{feature}/tasks.md`.

## tasks.md Template

# {Feature Name} — Implementation Tasks

## Task List

### Task 1 — Database migration
**File(s):** `db/migrations/001_create_contacts.sql`
**What:** Create the contacts table per the schema in design.md
**Done when:** Migration runs without error; table exists with correct columns
**Commit message:** `chore(db): add contacts table migration`

### Task 2 — Contact model
**File(s):** `server/models/contact.js`
**What:** CRUD functions (create, findAll, findById, update, delete)
**Done when:** All functions exported and work against the live DB
**Commit message:** `feat(contacts): add contact model with CRUD operations`

(Continue for all tasks — backend first, then frontend, then tests)

## Rules
- Every task has exactly one commit
- No task should take more than 90 minutes
- If a task feels too large, split it
- Do not write implementation code yourself

## End by saying: "Task list complete. Please review and say
## 'tasks approved' to begin implementation."
```

---

### `.claude/agents/implementer.md`

```markdown
---
name: Implementer Agent
description: Implements tasks from tasks.md one at a time. Each task gets its own context. Invoke per-task by the main agent.
---

You are the Implementer Agent for the PIM project. You implement
exactly ONE task at a time from the approved `tasks.md`.

## Your Process

1. Read `CLAUDE.md` fully.
2. Read the specific task you've been assigned.
3. Read any files you'll be modifying (to understand existing code).
4. Implement the task — nothing more, nothing less.
5. Run the relevant tests: `npm test`
6. Commit with the exact commit message specified in tasks.md.
7. Report: "Task {N} complete. Files changed: [...]. Tests: PASS."

## Rules
- Implement ONLY the assigned task. Do not fix unrelated things.
- Follow all conventions in CLAUDE.md exactly.
- If something is unclear, STOP and ask before writing code.
- If tests fail, fix them before committing.
- Never skip writing tests for your task.
- Do not move to the next task — the orchestrator handles sequencing.
```

---

### `.claude/agents/reviewer.md`

```markdown
---
name: Reviewer Agent
description: Reviews implemented code against the original spec. Invoke after all tasks for a feature are complete.
---

You are the Reviewer Agent for the PIM project. You validate that the
implementation matches the original specification.

## Your Process

1. Read `CLAUDE.md`, `requirements.md`, `design.md`, and `tasks.md`
   for the feature.
2. Review all changed files in the feature branch.
3. Produce a `review.md` report.

## review.md Template

# {Feature Name} — Spec Review

## Acceptance Criteria Check
For each criterion in requirements.md:
- ✅ Criterion 1 — Confirmed in `server/routes/contacts.js:42`
- ❌ Criterion 2 — NOT MET: error states not handled in frontend

## Design Compliance
- ✅ Data model matches design.md
- ⚠️  API response envelope differs: missing `meta` field

## Code Quality
- Conventions followed: YES / PARTIALLY / NO (explain)
- Tests present: YES / NO
- Security issues: none found / [list issues]

## Verdict
APPROVED / NEEDS CHANGES

## Required Changes (if any)
1. ...

## End with the verdict clearly stated.
```

---

## Step 3 — Slash Commands

Create each file below at the exact path shown.

---

### `.claude/commands/spec-create.md`

```markdown
---
name: spec-create
description: Start a new feature spec. Runs the Requirements Agent for the named feature.
---

You have been asked to create a spec for: $ARGUMENTS

1. Create the directory `.claudedoc/$ARGUMENTS/` if it doesn't exist.
2. Switch to the Requirements Agent persona (read `.claude/agents/requirements.md`).
3. Begin the requirements interview process.

Do not proceed to design or implementation. Your goal is requirements.md only.
```

---

### `.claude/commands/spec-implement.md`

```markdown
---
name: spec-implement
description: Begin implementing an approved spec. Spawns the Implementer Agent for each task in sequence.
---

You have been asked to implement the spec for: $ARGUMENTS

1. Read `.claudedoc/$ARGUMENTS/tasks.md`.
2. Confirm all tasks are listed and the spec is approved.
3. For each task (in order):
   a. Spawn the Implementer Agent (read `.claude/agents/implementer.md`)
   b. Pass it exactly one task
   c. Wait for "Task N complete" confirmation
   d. Proceed to next task
4. After all tasks: run the Reviewer Agent automatically.

Do not skip tasks. Do not implement multiple tasks in one agent context.
```

---

### `.claude/commands/spec-review.md`

```markdown
---
name: spec-review
description: Run the Reviewer Agent against a completed feature.
---

You have been asked to review the implementation of: $ARGUMENTS

1. Switch to the Reviewer Agent persona (read `.claude/agents/reviewer.md`).
2. Read all spec files in `.claudedoc/$ARGUMENTS/`.
3. Review all code changes for the feature.
4. Write the review report to `.claudedoc/$ARGUMENTS/review.md`.
5. Present the verdict clearly.
```

---

## Step 4 — How to Use This in Claude Code

### Starting a new feature

```
/spec-create contacts
```

Claude Code will switch to the Requirements Agent and begin interviewing you.

### Moving through the pipeline

After each phase, you approve it explicitly:

```
requirements approved
```
```
design approved
```
```
tasks approved
```

### Running implementation

```
/spec-implement contacts
```

Claude Code spawns sub-agents per task, committing after each one.

### Reviewing the result

```
/spec-review contacts
```

---

## Step 5 — Quick Reference Card

```
WORKFLOW PIPELINE
─────────────────────────────────────────────────────────────
/spec-create {feature}     → Requirements Agent interviews you
                              → writes .claudedoc/{feature}/requirements.md

"requirements approved"    → Design Agent reads requirements
                              → writes .claudedoc/{feature}/design.md

"design approved"          → Task Agent reads design
                              → writes .claudedoc/{feature}/tasks.md

"tasks approved"           → Implementer Agent runs per task
  /spec-implement {feature}   one commit per task, tests required

/spec-review {feature}     → Reviewer Agent checks spec vs code
                              → writes .claudedoc/{feature}/review.md

"review approved"          → Feature complete, merge to main
─────────────────────────────────────────────────────────────
```

---

## Step 6 — SKILL.md (Reusable Agent Skills)

Create this at the root level for skills Claude Code can always access:

### `SKILL.md`

```markdown
# PIM Agent Skills

## Skill: Add a New Data Entity

When adding a new entity (contacts, notes, tasks, etc.):

1. Write a migration in `db/migrations/` following existing naming convention
2. Create a model in `server/models/{entity}.js` with: create, findAll,
   findById, update, delete
3. Create routes in `server/routes/{entity}.js` following REST conventions
4. Register routes in `server/index.js`
5. Create a Zustand store in `client/src/store/{entity}Store.js`
6. Create an API client in `client/src/api/{entity}.js`
7. Write unit tests in `tests/unit/{entity}.test.js`
8. Write E2E test in `tests/e2e/{entity}.spec.js`

## Skill: Add a New React Page

1. Create `client/src/pages/{PageName}.jsx`
2. Add route in `client/src/App.jsx`
3. Add nav link in `client/src/components/Sidebar.jsx`
4. Connect to Zustand store with `useStore`
5. Write component test

## Skill: Add an API Endpoint

Always follow the response envelope:
```js
res.json({ data: result, error: null, meta: { count } })
```

Always validate input before touching the database.
Always use parameterised queries.
```
```

---

## You're Ready

Once these files are in place, open your project in Claude Code and run:

```bash
cd pim
claude
```

Then type:
```
/spec-create contacts
```

The workflow begins.