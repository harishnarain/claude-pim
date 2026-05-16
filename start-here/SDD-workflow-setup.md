# SDD Workflow Setup Guide
# Claude Code · Spec-Driven Development

> Step-by-step guide for setting up the complete Spec-Driven Development
> harness in a new project. Run these commands from your project root.

---

## What You Are Setting Up

This harness gives you:

| File / Folder | Purpose |
|---|---|
| `CLAUDE.md` | Project constitution — read by every agent, every session |
| `.claude/agents/` | Five role definitions (Requirements, Design, Task, Implementer, Reviewer) |
| `.claude/commands/` | Three slash commands (`/spec-create`, `/spec-implement`, `/spec-review`) |
| `.claudedoc/` | Spec workspace — one folder per feature |
| `SKILL.md` | Reusable multi-step recipes agents can follow without being told |

---

## Step 1 — Create the Directory Structure

Run this once from your project root:

```bash
mkdir -p .claude/agents
mkdir -p .claude/commands
mkdir -p .claude/tasks
mkdir -p .claudedoc/my-first-feature
```

---

## Step 2 — Copy the Scaffold Files

Copy all files from `start-here/` into your project root:

```bash
cp start-here/CLAUDE.md .
cp start-here/SKILL.md .
cp -r start-here/.claude .
```

Then open `CLAUDE.md` and fill in the sections marked `[Your Project Name]`,
`[Your Goal]`, and the tech stack table. Everything else — the workflow,
agent roster, session checklist, and branch rules — is intentionally generic
and can stay as-is.

---

## Step 3 — Understand the Files

### `CLAUDE.md` — The Project Constitution

The most important file in the harness. Claude Code reads it at the start of
every session and every sub-agent invocation. It answers:

1. **What are we building?** — project overview and tech stack
2. **How do we build it?** — coding conventions, API design, testing rules
3. **What are the non-negotiables?** — branch rules, commit discipline, spec gates

**Key rule:** Never commit to `main` directly. Every session begins by
running `git branch --show-current`. If the answer is `main`, a feature
branch must be created before any work proceeds.

### `SKILL.md` — Reusable Agent Recipes

A reference document that agents consult when performing common multi-step
operations (adding a new data entity, writing a migration, adding an API
endpoint). Unlike `CLAUDE.md`, which governs *how* to work, `SKILL.md`
documents *what steps* to take for specific recurring tasks.

Add new skills whenever you notice agents asking the same question twice, or
when a task spans multiple files in a fixed order.

### `.claude/agents/` — Role Definitions

Five Markdown files that define what each agent is, what it does, and what
it must not do:

| File | Agent | Responsibility |
|---|---|---|
| `requirements.md` | Requirements Agent | Interviews you, writes `requirements.md` |
| `design.md` | Design Agent | Writes `design.md` from approved requirements |
| `tasks.md` | Task Agent | Writes `tasks.md` from approved design |
| `implementer.md` | Implementer Agent | Executes one task, commits, stops |
| `reviewer.md` | Reviewer Agent | Checks code against spec, writes verdict |

Each agent reads `CLAUDE.md` first, then its own role file.

### `.claude/commands/` — Slash Commands

Three commands that wire the agents to the workflow:

| Command | What it does |
|---|---|
| `/spec-create <feature>` | Activates Requirements Agent, starts interview |
| `/spec-implement <feature>` | Runs Implementer Agent per task, then auto-reviews |
| `/spec-review <feature>` | Activates Reviewer Agent, writes `review.md` |

### `.claudedoc/` — Spec Workspace

One folder per feature. Each folder holds the full paper trail:

```
.claudedoc/
└── my-first-feature/
    ├── requirements.md   ← what: user stories, acceptance criteria
    ├── design.md         ← how: data model, API, components
    ├── tasks.md          ← when: ordered atomic steps with commit messages
    └── review.md         ← verdict: approved or needs changes
```

---

## Step 4 — Initialise Git

```bash
git init
git add CLAUDE.md SKILL.md .claude/ .claudedoc/ SDD-workflow-setup.md
git commit -m "chore: add Claude Code SDD harness scaffolding"
```

---

## Step 5 — Start Your First Feature

Open your project in Claude Code and run:

```
/spec-create my-first-feature
```

Claude becomes the Requirements Agent and starts asking focused questions —
one topic at a time. Answer them. When `requirements.md` looks right, say:

```
requirements approved
```

The Design Agent takes over. Review `design.md`, then say:

```
design approved
```

The Task Agent breaks it into ordered atomic tasks. Review `tasks.md`, then:

```
tasks approved
/spec-implement my-first-feature
```

The Implementer Agent works through every task — one commit per task, tests
required before each commit. When all tasks are done it automatically hands
off to the Reviewer Agent, which writes a `review.md` verdict.

---

## Step 6 — Quick Reference Card

```
WORKFLOW PIPELINE
─────────────────────────────────────────────────────────────────────
/spec-create {feature}      → Requirements Agent interviews you
                               → writes .claudedoc/{feature}/requirements.md

"requirements approved"     → Design Agent reads requirements
                               → writes .claudedoc/{feature}/design.md

"design approved"           → Task Agent reads design
                               → writes .claudedoc/{feature}/tasks.md

"tasks approved"            → Implementer Agent runs per task
  /spec-implement {feature}    one commit per task, tests required

/spec-review {feature}      → Reviewer Agent checks spec vs code
                               → writes .claudedoc/{feature}/review.md

PR approved + merged        → Feature complete
─────────────────────────────────────────────────────────────────────

BRANCH RULES (non-negotiable)
─────────────────────────────────────────────────────────────────────
git branch --show-current   ← run this first, every session
feature/{feature-name}      ← all work happens here
main                        ← never commit here directly
gh pr create                ← always open a PR to merge
─────────────────────────────────────────────────────────────────────
```

---

## You Are Ready

Once the files are in place and git is initialised, open your project in
Claude Code and type:

```
/spec-create my-first-feature
```

The workflow begins.
