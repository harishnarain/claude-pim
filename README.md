# Claude Code — Spec-Driven Development with Agent Teams

> A hands-on learning project for modern AI-assisted engineering. Build a full-stack Personal Information Manager while mastering Claude Code, CLAUDE.md, custom slash commands, and a five-agent development team.

---

## The Origin Story

This project started with a single prompt:

> *"I would like to learn to upgrade my skills to use Claude Code and new engineering paradigms. I would like Claude Code to work through a project whereby I get to learn and use the various markdown files such as CLAUDE.md, and others. I would like to learn Agent Skills, Agent Teams, spec-driven development, and other modern paradigms. Would this be possible with Claude Code? For example we could do this all part of creating a web-based personal information manager."*

The answer was yes. Everything in this repository is the result of that conversation — six feature modules, a five-agent team, spec-driven development from idea to merged PR, and a full-stack application that actually works.

This README is your guide to understanding how it works and how to replicate it for your own projects.

---

## What You Will Learn

| Concept | What it means | Where you see it |
|---|---|---|
| **CLAUDE.md** | A project constitution that governs every agent and session | `CLAUDE.md` |
| **Spec-Driven Development** | Write requirements → design → tasks before a single line of code | `.claudedoc/` |
| **Agent Teams** | Five specialized sub-agents with distinct roles | `.claude/agents/` |
| **Custom Slash Commands** | `/spec-create`, `/spec-implement`, `/spec-review` | `.claude/commands/` |
| **Branch Discipline** | Hard rules that prevent accidental commits to `main` | `CLAUDE.md` → Git Conventions |
| **One Task, One Commit** | Atomic commits tied to spec tasks — reviewable, revertible | Every PR in this repo |

---

## The Application: A Personal Information Manager

The PIM is a full-stack web app built with:

- **Frontend:** React + Vite + Tailwind CSS + Zustand
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **Tests:** Vitest (unit) + Playwright (E2E)

It ships six modules, each built spec-first:

| Phase | Module    | What it does |
|-------|-----------|---|
| 1 | Contacts  | Address book — add, search, view, edit contacts |
| 2 | Notes     | Rich text notes with pinning |
| 3 | Tasks     | Task manager with priority, status, and due dates |
| 4 | Calendar  | Week/month/day calendar with events and task chips |
| 5 | Search    | Cross-module full-text search with module filters |
| 6 | Dashboard | Home screen with today's agenda, overdue tasks, pinned items |

Every module followed the same workflow. Not one line of application code was written before its spec was approved.

---

## The Core Concept: CLAUDE.md

`CLAUDE.md` is the heart of this harness. It is a plain Markdown file that Claude Code reads at the start of every session. It answers three questions:

1. **What are we building?** (project overview, tech stack, structure)
2. **How do we build it?** (coding conventions, API design, testing rules)
3. **What are the non-negotiables?** (branch rules, commit discipline, spec gates)

Because Claude Code reads `CLAUDE.md` automatically, every session — and every sub-agent — starts from the same shared understanding. You do not re-explain the project in every conversation.

```
your-project/
└── CLAUDE.md   ← Claude reads this first, every time, always
```

Think of it as a team handbook that never gets ignored.

### The Branch Rule (the Most Important Rule)

`CLAUDE.md` contains one hard rule that was enforced throughout this project:

> **Never commit to `main` or `master` directly. Ever.**

Every session begins with:

```bash
git branch --show-current
```

If the answer is `main`, work stops until a feature branch is created. This is not a preference — it is a project constitution clause that Claude Code is instructed to treat as non-negotiable.

---

## The Workflow: Spec-Driven Development

Every feature in this project followed this pipeline:

```
[IDEA]
  │
  ▼
requirements.md   ← WHAT: user stories, acceptance criteria
  │  (human approves: "requirements approved")
  ▼
design.md         ← HOW: data model, API contract, components
  │  (human approves: "design approved")
  ▼
tasks.md          ← WHEN: ordered, atomic implementation steps
  │  (human approves: "tasks approved")
  ▼
[IMPLEMENT]       ← one task, one commit, tests must pass
  │
  ▼
review.md         ← did the code match the spec?
```

The human never types a line of code. The human reviews, approves, and steers.

### Phase Gates

Each arrow in the pipeline is a **phase gate** — work cannot proceed until the human explicitly says so:

| Gate | Phrase that unlocks the next phase |
|---|---|
| Requirements → Design | `"requirements approved"` |
| Design → Tasks | `"design approved"` |
| Tasks → Implementation | `"tasks approved"` |
| Implementation → Merge | Review verdict + PR approval |

This keeps the human in control of scope. Spec changes happen before code is written, not during.

---

## The Agent Team

Five specialized agents share the work. Each reads `CLAUDE.md` first, then its own role definition from `.claude/agents/`.

### Requirements Agent
**File:** `.claude/agents/requirements.md`

Interviews you about a feature. Asks one question at a time: what problem does this solve? who uses it? what are the edge cases? Produces `requirements.md` — user stories and testable acceptance criteria. **Writes no code and no design.**

### Design Agent
**File:** `.claude/agents/design.md`

Takes the approved requirements and produces `design.md` — the data model, database migration SQL, API endpoints with request/response shapes, React component list, and Zustand store design. **Writes no code and no tasks.**

### Task Agent
**File:** `.claude/agents/tasks.md`

Takes the approved design and breaks it into the smallest possible atomic tasks. Each task specifies exactly which files to touch, what "done" means, and what the commit message should be. **Writes no code.**

### Implementer Agent
**File:** `.claude/agents/implementer.md`

Executes exactly one task from `tasks.md`. Reads the relevant files, writes the code, runs `npm test`, and commits with the message from the task spec. Reports completion and stops — it does not move to the next task on its own.

### Reviewer Agent
**File:** `.claude/agents/reviewer.md`

After all tasks are done, checks the implementation against every acceptance criterion in `requirements.md`. Produces a `review.md` verdict: `APPROVED` or `NEEDS CHANGES`. Lists any gaps with exact file and line references.

---

## The Slash Commands

Three custom slash commands wire the agent team to the workflow:

### `/spec-create <feature-name>`

**File:** `.claude/commands/spec-create.md`

Activates the Requirements Agent. Creates the `.claudedoc/<feature-name>/` directory and begins the requirements interview.

```
You: /spec-create contacts
Claude: [becomes Requirements Agent, starts asking questions]
```

### `/spec-implement <feature-name>`

**File:** `.claude/commands/spec-implement.md`

Reads `tasks.md` and spawns the Implementer Agent once per task, in order. Waits for each task to complete before starting the next. Runs the Reviewer Agent automatically when all tasks are done.

```
You: /spec-implement contacts
Claude: [implements Task 1, commits, Task 2, commits, ..., runs review]
```

### `/spec-review <feature-name>`

**File:** `.claude/commands/spec-review.md`

Activates the Reviewer Agent for any feature at any time. Useful for re-reviewing a feature after changes, or auditing a module that was built before the review workflow was in place.

```
You: /spec-review contacts
Claude: [reads spec, reads code, writes review.md, presents verdict]
```

---

## The Spec Workspace

`.claudedoc/` holds one folder per feature. Each folder is a complete paper trail:

```
.claudedoc/
├── contacts/
│   ├── requirements.md   ← approved by human
│   ├── design.md         ← approved by human
│   ├── tasks.md          ← approved by human
│   └── review.md         ← written by Reviewer Agent
├── notes/
├── tasks/
├── calendar/
├── search/
└── dashboard/
```

Six months from now you can open any feature folder and understand exactly what was intended, how it was designed, and whether the implementation matched the spec.

---

## How to Use This Harness in Your Own Project

The `start-here/` folder contains everything you need to copy into a blank project.

### Step 1 — Copy the scaffolding

```bash
# In your new project root
cp path/to/claude-pim/start-here/CLAUDE.md .
cp -r path/to/claude-pim/start-here/.claude .
mkdir -p .claudedoc
```

The files you are copying:

```
start-here/
├── CLAUDE.md                        ← edit this for your project
└── .claude/
    ├── agents/
    │   ├── requirements.md          ← Requirements Agent role
    │   ├── design.md                ← Design Agent role
    │   ├── tasks.md                 ← Task Agent role
    │   ├── implementer.md           ← Implementer Agent role
    │   └── reviewer.md              ← Reviewer Agent role
    └── commands/
        ├── spec-create.md           ← /spec-create slash command
        ├── spec-implement.md        ← /spec-implement slash command
        └── spec-review.md           ← /spec-review slash command
```

### Step 2 — Customize CLAUDE.md

Open `CLAUDE.md` and fill in:
- **Project name and goal** — one sentence describing what you are building
- **Tech stack** — what you are actually using (keep the table format)
- **Project structure** — your actual directory layout
- **Coding conventions** — your team's rules

The workflow, agent roster, session checklist, and branch rules sections are intentionally generic — they apply to any project and can stay as-is.

### Step 3 — Initialise git

```bash
git init
git add .
git commit -m "chore: add Claude Code harness scaffolding"
```

### Step 4 — Start your first feature

Open Claude Code and run:

```
/spec-create my-first-feature
```

Claude becomes the Requirements Agent and starts asking you questions. Answer them honestly — the quality of the spec drives the quality of the implementation. When the `requirements.md` looks right, say:

```
requirements approved
```

The Design Agent takes over. Review `design.md`, then say:

```
design approved
```

The Task Agent breaks the design into ordered atomic tasks. Review `tasks.md`, then say:

```
tasks approved
/spec-implement my-first-feature
```

Watch the Implementer Agent work through the tasks one by one, committing after each.

---

## A Real Session: What It Actually Looks Like

Here is a condensed version of what building the Dashboard module looked like.

**You:**
```
/spec-create dashboard
```

**Claude (Requirements Agent):**
```
First question: what is the primary job of the dashboard — 
a quick overview of everything, or focused on today's work specifically?
```

**You:** *(answers questions over several exchanges)*

**Claude:**
```
Requirements draft complete. Please review and say 
"requirements approved" to proceed to design.
```

**You:** `requirements approved`

**Claude (Design Agent):** *(writes design.md)*
```
Design draft complete. Please review and say 
"design approved" to proceed to task breakdown.
```

**You:** `design approved`

**Claude (Task Agent):** *(writes tasks.md with 13 ordered tasks)*
```
Task list complete. Please review and say 
"tasks approved" to begin implementation.
```

**You:** `tasks approved` → `/spec-implement dashboard`

**Claude (Implementer Agent):**
```
Task 1 complete. Files changed: [client/src/utils/dashboard-dates.js,
tests/unit/dashboard-dates.test.js]. Tests: PASS.

Task 2 complete. Files changed: [client/src/hooks/use-dashboard-data.js,
tests/unit/use-dashboard-data.test.js]. Tests: PASS.

...

Task 13 complete. Files changed: [tests/e2e/dashboard.spec.js]. Tests: PASS.
```

**Claude (Reviewer Agent):**
```
## Verdict: NEEDS CHANGES

1. TodayAgendaWidget reads event.start_at but the API mapper returns
   event.startAt — will throw TypeError when todayEvents is non-empty.
2. use-dashboard-data uses .then()/.catch() chains; CLAUDE.md requires async/await.
```

**You:** `fix both issues`

**Claude:** *(fixes, commits)*

**You:** `open pr`

**Claude:** *(creates PR with spec reference, test plan, summary)*

**You:** `merge the pr`

---

## Running the Project

```bash
# Install dependencies
npm install

# Seed the database with sample data
npm run seed

# Start the development server (frontend + backend)
npm run dev

# Run unit tests
npm test

# Run E2E tests (requires dev server running on port 5173)
npm run test:e2e
```

Visit `http://localhost:5173` to see the PIM.

---

## Project Structure

```
claude-pim/
├── CLAUDE.md                    ← project constitution
├── README.md                    ← you are here
├── start-here/                  ← copy into your own project to get started
│   ├── CLAUDE.md                ← template constitution
│   └── .claude/
│       ├── agents/              ← five agent role definitions
│       └── commands/            ← three slash commands
├── .claude/
│   ├── agents/                  ← live agent definitions (used by this project)
│   └── commands/                ← live slash commands
├── .claudedoc/                  ← spec workspace
│   ├── contacts/
│   ├── notes/
│   ├── tasks/
│   ├── calendar/
│   ├── search/
│   └── dashboard/
├── client/src/
│   ├── components/              ← React components
│   ├── pages/                   ← route-level page components
│   ├── store/                   ← Zustand stores (one per module)
│   ├── hooks/                   ← custom React hooks
│   ├── api/                     ← API client functions
│   └── utils/                   ← shared utilities
├── server/
│   ├── routes/                  ← Express route handlers
│   ├── models/                  ← database access layer
│   └── middleware/
├── db/
│   ├── schema.sql               ← source of truth for DB schema
│   └── migrations/              ← incremental schema changes
└── tests/
    ├── unit/                    ← Vitest component and hook tests
    └── e2e/                     ← Playwright happy-path tests
```

---

## Key Takeaways

**CLAUDE.md is a force multiplier.** One well-written project constitution means every session — and every agent — starts from the same shared context. You spend less time re-explaining and more time building.

**Spec-first thinking catches mistakes early.** Writing requirements and design before code forces clarity. Vague ideas get questioned before they become vague code. The review step then catches what slipped through.

**Agent specialization keeps context tight.** The Requirements Agent doesn't know about database schemas. The Implementer Agent doesn't second-guess the spec. Each agent does one job well. The human steers between them.

**Phase gates keep you in control.** Nothing happens without your explicit approval. The harness accelerates execution — it does not replace judgment.

**One task, one commit, always.** The git log tells the full story of every feature. Each commit maps to a spec task. Finding when a behaviour changed, or why, takes seconds.

---

## License

MIT
