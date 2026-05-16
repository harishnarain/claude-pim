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
