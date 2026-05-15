/**
 * Static data arrays for note seeding: tag names, note content, and tag links.
 * Timestamps use isoDateTime() so they stay relative to the seed run date.
 * @module seed/notes-data
 */

import { isoDateTime } from './helpers.js';

/** Tag names shared by the notes tag vocabulary. */
export const TAG_NAMES = [
  'engineering',
  'design',
  'product',
  'ops',
  'team',
  'sprint',
  'research',
];

/**
 * Twenty note records covering meeting summaries, ADRs, sprint retrospectives,
 * onboarding checklists, technical research, and team announcements.
 * Exactly 3 have is_pinned = 1.
 */
export const NOTES = [
  // --- Meeting summaries ---
  {
    content: [
      'Weekly Engineering Sync — Sprint 42',
      'Attendees: Alice Chen, Carmen Lopez, Elena Vasquez, Frank Nakamura.',
      'Discussed rollout of the new authentication service to staging.',
      'Action items: Alice to open PR by Thursday; Elena to schedule demo for Friday.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-14, 10, 0),
    updated_at: isoDateTime(-14, 10, 0),
  },
  {
    content: [
      'Product–Engineering Alignment Meeting',
      'Grace Mbeki walked through the updated analytics roadmap for Q3.',
      'Key decision: defer the real-time dashboard to Q4 to prioritise mobile parity.',
      'Follow-up: Henry Torres to revise the PRD and share with stakeholders by EOW.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-12, 14, 30),
    updated_at: isoDateTime(-12, 14, 30),
  },
  {
    content: [
      'Cross-Team Ops Review',
      'Maya Patel and Nathan Kim presented current infrastructure utilisation metrics.',
      'Database CPU peaks at 85% during morning traffic — immediate concern.',
      'Agreed to add two read replicas before the next major release.',
    ].join('\n'),
    is_pinned: 1,
    created_at: isoDateTime(-10, 9, 0),
    updated_at: isoDateTime(-10, 9, 0),
  },

  // --- Architecture Decision Records ---
  {
    content: [
      'ADR-001: Adopt GraphQL for the Public API',
      'Context: REST endpoints are proliferating; clients need flexible queries.',
      'Decision: Introduce a GraphQL gateway in front of existing REST services.',
      'Consequences: Teams must learn GraphQL schema design; adds one infra component.',
      'Status: Accepted.',
    ].join('\n'),
    is_pinned: 1,
    created_at: isoDateTime(-30, 11, 0),
    updated_at: isoDateTime(-5, 16, 0),
  },
  {
    content: [
      'ADR-002: Replace Redis with Valkey for Session Storage',
      'Context: Redis license change makes OSS use uncertain for future versions.',
      'Decision: Migrate to Valkey, a drop-in Redis-compatible fork under BSD.',
      'Consequences: Minimal code changes; team familiarity retained.',
      'Status: Proposed — awaiting CTO sign-off.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-20, 13, 45),
    updated_at: isoDateTime(-20, 13, 45),
  },
  {
    content: [
      'ADR-003: Use SQLite for Local-First Data Storage',
      'Context: Mobile clients need offline capability without a complex sync layer.',
      'Decision: Embed SQLite via better-sqlite3 on the server; SQLite WASM on client.',
      'Consequences: Reduced infrastructure cost; sync strategy still to be designed.',
      'Status: Accepted.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-25, 10, 15),
    updated_at: isoDateTime(-25, 10, 15),
  },

  // --- Sprint Retrospectives ---
  {
    content: [
      'Sprint 41 Retrospective',
      'What went well: CI pipeline improvements cut build time by 40%.',
      'What could improve: Too many scope changes mid-sprint disrupted focus.',
      'Action: Product to freeze scope 48 hours before sprint start going forward.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-7, 15, 0),
    updated_at: isoDateTime(-7, 15, 0),
  },
  {
    content: [
      'Sprint 40 Retrospective',
      'What went well: Onboarding the new QA engineer reduced regression rate.',
      'What could improve: Stand-ups running over 15 minutes — need timeboxing.',
      'Action: Rotate stand-up facilitator each week starting next sprint.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-21, 15, 0),
    updated_at: isoDateTime(-21, 15, 0),
  },
  {
    content: [
      'Sprint 39 Retrospective',
      'What went well: Successfully launched the Notes tagging feature on time.',
      'What could improve: Documentation lagged behind implementation.',
      'Action: Add "update docs" as a definition-of-done checklist item.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-35, 15, 0),
    updated_at: isoDateTime(-35, 15, 0),
  },

  // --- Onboarding Checklists ---
  {
    content: [
      'New Engineer Onboarding Checklist',
      '- [ ] Complete HR paperwork and sign NDAs.',
      '- [ ] Set up laptop with standard dev tools (see Confluence page).',
      '- [ ] Request access: GitHub org, AWS console, PagerDuty.',
      '- [ ] Pair with a buddy engineer for the first two weeks.',
      '- [ ] Complete first PR within 5 business days.',
    ].join('\n'),
    is_pinned: 1,
    created_at: isoDateTime(-60, 9, 0),
    updated_at: isoDateTime(-3, 11, 0),
  },
  {
    content: [
      'New Product Manager Onboarding Checklist',
      '- [ ] Shadow customer support calls for the first week.',
      '- [ ] Read the last 3 sprint retrospective notes.',
      '- [ ] Meet with each engineering team lead within 10 days.',
      '- [ ] Set up access to analytics dashboard and usage metrics.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-45, 9, 30),
    updated_at: isoDateTime(-45, 9, 30),
  },
  {
    content: [
      'New Designer Onboarding Checklist',
      '- [ ] Access the Figma organisation and review the design system.',
      '- [ ] Attend the next product-design sync.',
      '- [ ] Review accessibility guidelines in the design handbook.',
      '- [ ] Introduce yourself in #design Slack channel.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-40, 10, 0),
    updated_at: isoDateTime(-40, 10, 0),
  },

  // --- Technical Research ---
  {
    content: [
      'Research: WebAssembly for Compute-Heavy Client Tasks',
      'Investigated using WASM modules to offload image processing from the server.',
      'Benchmarks show 3–5× speed-up over equivalent JS for matrix operations.',
      'Concern: Bundle size increases by ~200 KB; lazy-loading mitigates this.',
      'Recommendation: Prototype a WASM image-resize module in Q3.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-18, 14, 0),
    updated_at: isoDateTime(-18, 14, 0),
  },
  {
    content: [
      'Research: Full-Text Search Options for SQLite',
      'Evaluated FTS5 (built-in), Tantivy (Rust), and Meilisearch (external service).',
      'FTS5 covers current scale with zero extra infrastructure.',
      'Tantivy and Meilisearch offer better relevance scoring at higher operational cost.',
      'Decision: Use FTS5 for now; revisit at 1 M+ document scale.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-9, 13, 0),
    updated_at: isoDateTime(-9, 13, 0),
  },
  {
    content: [
      'Research: Observability Stack Comparison',
      'Compared Prometheus + Grafana vs Datadog vs OpenTelemetry + Jaeger.',
      'Team preference: OpenTelemetry for vendor-neutral instrumentation.',
      'Cost estimate: self-hosted OTel collector + Grafana Cloud free tier fits budget.',
      'Next step: spike implementation in the staging environment.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-6, 11, 30),
    updated_at: isoDateTime(-6, 11, 30),
  },

  // --- Team Announcements ---
  {
    content: [
      'Team Announcement: New On-Call Rotation Policy',
      'Starting next month, on-call shifts move from weekly to bi-weekly.',
      'Each engineer is paired with a senior buddy for their first rotation.',
      'Runbooks have been updated in Confluence — please review before your shift.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-4, 9, 0),
    updated_at: isoDateTime(-4, 9, 0),
  },
  {
    content: [
      'Team Announcement: Office Hours for Platform Team',
      'The Platform team will hold open office hours every Tuesday 14:00–15:00 UTC.',
      'Bring questions about CI/CD, infra provisioning, or developer tooling.',
      'No sign-up required — drop in via the #platform-office-hours Slack huddle.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-2, 8, 0),
    updated_at: isoDateTime(-2, 8, 0),
  },
  {
    content: [
      'Team Announcement: Engineering Blog Initiative',
      'We are launching a quarterly engineering blog series on our tech website.',
      'First post deadline: end of this sprint — volunteers welcome.',
      'Topics can include architecture decisions, lessons learned, or tool reviews.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-1, 10, 0),
    updated_at: isoDateTime(-1, 10, 0),
  },
  {
    content: [
      'Team Announcement: Q3 Planning Kickoff',
      'The Q3 planning session is scheduled for next Monday at 10:00 UTC.',
      'All team leads must submit their capacity estimates by Friday 17:00 UTC.',
      'Grace will share the planning template in #product-planning before EOD today.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-3, 16, 0),
    updated_at: isoDateTime(-3, 16, 0),
  },
  {
    content: [
      'Team Announcement: Hackathon Results',
      'Congratulations to Team Async Avengers for winning the internal hackathon!',
      'Their project — an AI-assisted code-review bot — will move to an incubation sprint.',
      'Runner-up projects are documented in the #hackathon-2026 Slack channel.',
    ].join('\n'),
    is_pinned: 0,
    created_at: isoDateTime(-8, 17, 0),
    updated_at: isoDateTime(-8, 17, 0),
  },
];

/**
 * Note-to-tag link definitions. Each entry maps a note index (into NOTES)
 * to a tag name (from TAG_NAMES). At least 5 distinct notes are linked.
 */
export const NOTE_TAG_LINKS = [
  { noteIndex: 0,  tagName: 'engineering' }, { noteIndex: 0,  tagName: 'sprint'      },
  { noteIndex: 1,  tagName: 'product'     }, { noteIndex: 1,  tagName: 'engineering' },
  { noteIndex: 2,  tagName: 'ops'         }, { noteIndex: 2,  tagName: 'engineering' },
  { noteIndex: 3,  tagName: 'engineering' },
  { noteIndex: 4,  tagName: 'engineering' }, { noteIndex: 4,  tagName: 'ops'         },
  { noteIndex: 5,  tagName: 'engineering' }, { noteIndex: 5,  tagName: 'research'    },
  { noteIndex: 6,  tagName: 'sprint'      }, { noteIndex: 6,  tagName: 'team'        },
  { noteIndex: 9,  tagName: 'engineering' }, { noteIndex: 9,  tagName: 'team'        },
  { noteIndex: 10, tagName: 'product'     }, { noteIndex: 10, tagName: 'team'        },
  { noteIndex: 11, tagName: 'design'      }, { noteIndex: 11, tagName: 'team'        },
  { noteIndex: 12, tagName: 'research'    }, { noteIndex: 12, tagName: 'engineering' },
  { noteIndex: 13, tagName: 'research'    }, { noteIndex: 13, tagName: 'engineering' },
  { noteIndex: 14, tagName: 'research'    }, { noteIndex: 14, tagName: 'ops'         },
  { noteIndex: 18, tagName: 'product'     }, { noteIndex: 18, tagName: 'team'        },
];
