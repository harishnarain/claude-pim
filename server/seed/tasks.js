/**
 * Seed function for the tasks, task_tags_vocab, and task_tags tables.
 * @module seed/tasks
 */

import logger from '../logger.js';
import { isoDate } from './helpers.js';

/** Tag vocabulary names shared with the notes tag set. */
const VOCAB_NAMES = ['engineering', 'design', 'product', 'ops', 'team', 'sprint', 'research'];

/**
 * Twenty tech-firm tasks distributed across all status and priority values.
 * Priority: 7 × Low, 8 × Medium, 5 × High.
 * Status: 5 × Not Started, 7 × In Progress, 5 × Completed, 3 × Blocked.
 * Exactly 3 tasks have is_pinned = 1.
 * Due dates spread from isoDate(-7) through isoDate(7).
 */
const TASKS = [
  // Not Started × 5
  { title: 'Upgrade Node.js runtime to v22 LTS',             body: 'The current runtime is Node 18 which reaches EOL in April. Upgrade all services to Node 22 LTS and update CI pipeline images accordingly.',                                                                           due_date: isoDate(-7), priority: 'High',   status: 'Not Started', is_pinned: 1 },
  { title: 'Write ADR for event-driven messaging layer',      body: 'Document the decision to adopt an event bus for cross-service communication. Cover options evaluated (Redis Streams, NATS, Kafka) and rationale for the chosen approach.',                                              due_date: isoDate(-6), priority: 'Medium', status: 'Not Started', is_pinned: 0 },
  { title: 'Set up Dependabot for automated dependency PRs',  body: 'Configure Dependabot in the GitHub repo to open weekly PRs for outdated npm and GitHub Actions dependencies.',                                                                                                          due_date: isoDate(-5), priority: 'Low',    status: 'Not Started', is_pinned: 0 },
  { title: 'Create design tokens for dark mode palette',      body: 'Define Tailwind CSS design tokens for a dark-mode colour palette. Coordinate with Isabel on contrast ratios and accessibility compliance.',                                                                             due_date: isoDate(-4), priority: 'Medium', status: 'Not Started', is_pinned: 0 },
  { title: 'Draft Q3 capacity plan for the platform team',    body: 'Collect headcount and project load estimates from each squad lead. Produce a capacity spreadsheet for the Q3 planning session.',                                                                                        due_date: isoDate(-3), priority: 'Low',    status: 'Not Started', is_pinned: 0 },

  // In Progress × 7
  { title: 'Fix race condition in session token refresh',     body: 'Concurrent requests during token expiry trigger duplicate refresh calls, causing intermittent 401 errors. Implement a mutex-based refresh queue to serialise token renewal.',                                          due_date: isoDate(-2), priority: 'High',   status: 'In Progress', is_pinned: 1 },
  { title: 'Migrate staging environment to Kubernetes',       body: 'Move the staging workloads from EC2 instances to the new EKS cluster. Update Terraform modules and validate all health checks.',                                                                                        due_date: isoDate(-1), priority: 'Low',    status: 'In Progress', is_pinned: 0 },
  { title: 'Review PR #384 — add full-text search to notes API', body: 'Thoroughly review the implementation for correctness of FTS5 triggers and index hygiene. Check for SQL injection vectors and edge cases with special characters.',                                                 due_date: isoDate(0),  priority: 'Medium', status: 'In Progress', is_pinned: 0 },
  { title: 'Update API documentation for v2 endpoints',       body: 'Reflect the new envelope response format and authentication changes in the OpenAPI spec. Regenerate the Swagger UI and publish to the developer portal.',                                                               due_date: isoDate(0),  priority: 'Low',    status: 'In Progress', is_pinned: 0 },
  { title: 'Implement pagination for contacts list endpoint', body: 'Add cursor-based pagination to GET /api/contacts to handle large datasets. Include total count, next cursor, and limit params in the response meta.',                                                                   due_date: isoDate(1),  priority: 'Medium', status: 'In Progress', is_pinned: 0 },
  { title: 'Sprint 43 planning — break down search feature tickets', body: 'Decompose the search epic into sprint-sized tickets. Estimate story points with the engineering team and assign ownership before the sprint kickoff.',                                                          due_date: isoDate(2),  priority: 'Medium', status: 'In Progress', is_pinned: 1 },
  { title: 'Add read-replica connection pooling to database layer', body: 'Route all SELECT queries through the read-replica pool. Ensure write transactions still target the primary. Monitor connection counts in staging after rollout.',                                                due_date: isoDate(3),  priority: 'High',   status: 'In Progress', is_pinned: 0 },

  // Completed × 5
  { title: 'Deploy hotfix for invoice PDF generation bug',    body: 'A null-pointer error in the PDF renderer caused blank invoices for customers with special characters in their names. Patched the renderer and deployed to production.',                                                 due_date: isoDate(-7), priority: 'High',   status: 'Completed',   is_pinned: 0 },
  { title: 'Conduct sprint 42 retrospective',                 body: 'Facilitated the retrospective session. Action items documented and assigned. Meeting notes published to the team wiki.',                                                                                                due_date: isoDate(-5), priority: 'Low',    status: 'Completed',   is_pinned: 0 },
  { title: 'Refactor authentication middleware to support API keys', body: 'Extracted token validation into a reusable middleware function. Added support for long-lived API key authentication alongside JWT bearer tokens.',                                                              due_date: isoDate(-4), priority: 'Medium', status: 'Completed',   is_pinned: 0 },
  { title: 'Update onboarding checklist for new engineers',   body: 'Added steps for requesting Datadog access and joining the on-call rotation. Checklist is now version-controlled in the team wiki.',                                                                                     due_date: isoDate(-3), priority: 'Low',    status: 'Completed',   is_pinned: 0 },
  { title: 'Resolve flaky unit tests in the billing service', body: 'Identified timer-dependent tests causing intermittent CI failures. Replaced real timers with fake timers via Vitest; all 47 affected tests now pass consistently.',                                                    due_date: isoDate(-2), priority: 'Medium', status: 'Completed',   is_pinned: 0 },

  // Blocked × 3
  { title: 'Integrate third-party identity provider (Okta)',  body: 'SSO integration is blocked pending procurement approval for the Okta enterprise plan. Resume implementation once the licence agreement is signed.',                                                                     due_date: isoDate(4),  priority: 'Medium', status: 'Blocked',     is_pinned: 0 },
  { title: 'Enable end-to-end encryption for messages',       body: 'E2E encryption design is blocked until the security audit of the proposed key-exchange protocol is complete. Awaiting sign-off from the security team.',                                                               due_date: isoDate(5),  priority: 'High',   status: 'Blocked',     is_pinned: 0 },
  { title: 'Provision production Kubernetes cluster',         body: 'Cluster provisioning is blocked on the cloud-spend approval from Finance. Terraform modules and runbook are ready to execute once budget is approved.',                                                                 due_date: isoDate(7),  priority: 'Low',    status: 'Blocked',     is_pinned: 0 },
];

/** Task-to-tag link definitions mapping task index to tag name. */
const TASK_TAG_LINKS = [
  { taskIndex: 0,  tagName: 'engineering' }, { taskIndex: 0,  tagName: 'ops'         },
  { taskIndex: 1,  tagName: 'engineering' }, { taskIndex: 1,  tagName: 'research'     },
  { taskIndex: 3,  tagName: 'design'      },
  { taskIndex: 4,  tagName: 'product'     }, { taskIndex: 4,  tagName: 'team'         },
  { taskIndex: 5,  tagName: 'engineering' },
  { taskIndex: 6,  tagName: 'ops'         }, { taskIndex: 6,  tagName: 'engineering'  },
  { taskIndex: 7,  tagName: 'engineering' }, { taskIndex: 7,  tagName: 'sprint'       },
  { taskIndex: 10, tagName: 'sprint'      }, { taskIndex: 10, tagName: 'team'         },
  { taskIndex: 11, tagName: 'ops'         }, { taskIndex: 11, tagName: 'engineering'  },
  { taskIndex: 15, tagName: 'team'        },
  { taskIndex: 19, tagName: 'ops'         },
];

/**
 * Insert task tag vocabulary, 20 tasks, and task-tag links into the database.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
export function seedTasks(db) {
  const insertVocab = db.prepare('INSERT INTO task_tags_vocab (name) VALUES (@name)');
  const vocabIds = {};
  for (const name of VOCAB_NAMES) {
    const { lastInsertRowid } = insertVocab.run({ name });
    vocabIds[name] = lastInsertRowid;
  }
  logger.info(`Seeded ${VOCAB_NAMES.length} task_tags_vocab entries`);

  const insertTask = db.prepare(`
    INSERT INTO tasks (title, body, due_date, priority, status, is_pinned)
    VALUES (@title, @body, @due_date, @priority, @status, @is_pinned)
  `);
  const taskIds = [];
  for (const task of TASKS) {
    const { lastInsertRowid } = insertTask.run(task);
    taskIds.push(lastInsertRowid);
  }
  logger.info(`Seeded ${taskIds.length} tasks`);

  const insertTaskTag = db.prepare(
    'INSERT INTO task_tags (task_id, tag_id) VALUES (@task_id, @tag_id)'
  );
  for (const { taskIndex, tagName } of TASK_TAG_LINKS) {
    insertTaskTag.run({ task_id: taskIds[taskIndex], tag_id: vocabIds[tagName] });
  }
  logger.info(`Seeded ${TASK_TAG_LINKS.length} task_tags links`);
}
