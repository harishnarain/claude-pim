/**
 * Database seed utilities for the PIM server.
 * Provides date helpers, a table-clear utility, and the top-level runSeed
 * entry point that wraps all seed operations in a single transaction.
 * @module seed
 */

import logger from './logger.js';

/**
 * Return a UTC date string in 'YYYY-MM-DD' format for today plus an offset.
 * @param {number} offsetDays - Number of days to add to today (may be negative).
 * @returns {string} Date string in 'YYYY-MM-DD' format.
 */
function isoDate(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Return a UTC datetime string in 'YYYY-MM-DD HH:MM:SS' format for today
 * plus an offset at the given hour and minute (seconds always 00).
 * @param {number} offsetDays - Number of days to add to today (may be negative).
 * @param {number} hour - UTC hour (0–23).
 * @param {number} minute - UTC minute (0–59).
 * @returns {string} Datetime string in 'YYYY-MM-DD HH:MM:SS' format.
 */
function isoDateTime(offsetDays, hour, minute) {
  const datePart = isoDate(offsetDays);
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${datePart} ${hh}:${mm}:00`;
}

/**
 * Delete all rows from every module table in FK-safe dependency order.
 * Order: task_tags → task_tags_vocab → tasks → note_tags → tags → notes
 *        → contacts → events
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function clearAllTables(db) {
  const TABLES = [
    'task_tags',
    'task_tags_vocab',
    'tasks',
    'note_tags',
    'tags',
    'notes',
    'contacts',
    'events',
  ];
  for (const table of TABLES) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
}

/**
 * Insert 20 realistic tech-firm contacts into the contacts table.
 * Job titles are distributed per spec: Software Engineer (×2),
 * Senior Software Engineer (×2), Engineering Manager (×2),
 * Product Manager (×2), Product Designer (×2), QA Engineer (×2),
 * DevOps Engineer (×2), Data Scientist (×2), VP of Engineering (×1),
 * CTO (×1). Companies rotate across Arion Tech, Nexus Systems,
 * ByteForge, and CloudPeak. Exactly 5 contacts have a phone value
 * and exactly 5 contacts have a notes value.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function seedContacts(db) {
  const insert = db.prepare(`
    INSERT INTO contacts (first_name, last_name, email, phone, company, notes)
    VALUES (@first_name, @last_name, @email, @phone, @company, @notes)
  `);

  // 20 contacts; job titles: Software Engineer (×2), Senior Software Engineer (×2),
  // Engineering Manager (×2), Product Manager (×2), Product Designer (×2),
  // QA Engineer (×2), DevOps Engineer (×2), Data Scientist (×2),
  // VP of Engineering (×1), CTO (×1).
  // Exactly 5 have phone; exactly 5 have notes.
  const contacts = [
    // Software Engineer ×2
    {
      first_name: 'Alice',
      last_name: 'Chen',
      email: 'alice.chen@ariontech.com',
      phone: '+1-415-555-0101',
      company: 'Arion Tech',
      notes: 'Software Engineer. Works on the core authentication service.',
    },
    {
      first_name: 'Brian',
      last_name: 'Okafor',
      email: 'brian.okafor@nexussystems.com',
      phone: null,
      company: 'Nexus Systems',
      notes: null,
    },
    // Senior Software Engineer ×2
    {
      first_name: 'Carmen',
      last_name: 'Lopez',
      email: 'carmen.lopez@byteforge.io',
      phone: '+1-650-555-0202',
      company: 'ByteForge',
      notes: 'Senior Software Engineer. Leads the payments service team.',
    },
    {
      first_name: 'David',
      last_name: 'Park',
      email: 'david.park@cloudpeak.io',
      phone: null,
      company: 'CloudPeak',
      notes: null,
    },
    // Engineering Manager ×2
    {
      first_name: 'Elena',
      last_name: 'Vasquez',
      email: 'elena.vasquez@ariontech.com',
      phone: '+1-408-555-0303',
      company: 'Arion Tech',
      notes: 'Engineering Manager. Oversees the mobile squad.',
    },
    {
      first_name: 'Frank',
      last_name: 'Nakamura',
      email: 'frank.nakamura@nexussystems.com',
      phone: null,
      company: 'Nexus Systems',
      notes: null,
    },
    // Product Manager ×2
    {
      first_name: 'Grace',
      last_name: 'Mbeki',
      email: 'grace.mbeki@byteforge.io',
      phone: '+1-206-555-0404',
      company: 'ByteForge',
      notes: 'Product Manager. Drives the roadmap for the analytics platform.',
    },
    {
      first_name: 'Henry',
      last_name: 'Torres',
      email: 'henry.torres@cloudpeak.io',
      phone: null,
      company: 'CloudPeak',
      notes: null,
    },
    // Product Designer ×2
    {
      first_name: 'Isabel',
      last_name: 'Johansson',
      email: 'isabel.johansson@ariontech.com',
      phone: '+1-512-555-0505',
      company: 'Arion Tech',
      notes: 'Product Designer. Key collaborator on the design system.',
    },
    {
      first_name: 'James',
      last_name: 'Osei',
      email: 'james.osei@nexussystems.com',
      phone: null,
      company: 'Nexus Systems',
      notes: null,
    },
    // QA Engineer ×2
    {
      first_name: 'Karen',
      last_name: 'Reyes',
      email: 'karen.reyes@byteforge.io',
      phone: null,
      company: 'ByteForge',
      notes: null,
    },
    {
      first_name: 'Liam',
      last_name: 'Fernandez',
      email: 'liam.fernandez@cloudpeak.io',
      phone: null,
      company: 'CloudPeak',
      notes: null,
    },
    // DevOps Engineer ×2
    {
      first_name: 'Maya',
      last_name: 'Patel',
      email: 'maya.patel@ariontech.com',
      phone: null,
      company: 'Arion Tech',
      notes: null,
    },
    {
      first_name: 'Nathan',
      last_name: 'Kim',
      email: 'nathan.kim@nexussystems.com',
      phone: null,
      company: 'Nexus Systems',
      notes: null,
    },
    // Data Scientist ×2
    {
      first_name: 'Olivia',
      last_name: 'Schmidt',
      email: 'olivia.schmidt@byteforge.io',
      phone: null,
      company: 'ByteForge',
      notes: null,
    },
    {
      first_name: 'Pedro',
      last_name: 'Alves',
      email: 'pedro.alves@cloudpeak.io',
      phone: null,
      company: 'CloudPeak',
      notes: null,
    },
    // VP of Engineering ×1
    {
      first_name: 'Quinn',
      last_name: 'Andersen',
      email: 'quinn.andersen@ariontech.com',
      phone: null,
      company: 'Arion Tech',
      notes: null,
    },
    // CTO ×1
    {
      first_name: 'Rachel',
      last_name: 'Nguyen',
      email: 'rachel.nguyen@nexussystems.com',
      phone: null,
      company: 'Nexus Systems',
      notes: null,
    },
    // Technical Program Manager ×1
    {
      first_name: 'Samuel',
      last_name: 'Ekwueme',
      email: 'samuel.ekwueme@byteforge.io',
      phone: null,
      company: 'ByteForge',
      notes: null,
    },
    // Security Engineer ×1
    {
      first_name: 'Tina',
      last_name: 'Holbrook',
      email: 'tina.holbrook@cloudpeak.io',
      phone: null,
      company: 'CloudPeak',
      notes: null,
    },
  ];

  for (const contact of contacts) {
    insert.run(contact);
  }

  logger.info(`Seeded ${contacts.length} contacts`);
}

/**
 * Insert 7 tags and 20 realistic notes into the notes and tags tables,
 * then link at least 5 notes to tags via the note_tags join table.
 * Note topics include meeting summaries, architecture decision records,
 * sprint retrospectives, onboarding checklists, technical research, and
 * team announcements. Exactly 3 notes have is_pinned = 1.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function seedNotes(db) {
  // --- Tags ---
  const insertTag = db.prepare(
    `INSERT INTO tags (name) VALUES (@name)`
  );
  const tagNames = [
    'engineering',
    'design',
    'product',
    'ops',
    'team',
    'sprint',
    'research',
  ];
  const tagIds = {};
  for (const name of tagNames) {
    const { lastInsertRowid } = insertTag.run({ name });
    tagIds[name] = lastInsertRowid;
  }
  logger.info(`Seeded ${tagNames.length} tags`);

  // --- Notes ---
  const insertNote = db.prepare(`
    INSERT INTO notes (content, is_pinned, created_at, updated_at)
    VALUES (@content, @is_pinned, @created_at, @updated_at)
  `);

  // Each note has: content (first line = title, ≥2 body lines), is_pinned, timestamps.
  // Exactly 3 notes are pinned (is_pinned = 1).
  const notes = [
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

  const noteIds = [];
  for (const note of notes) {
    const { lastInsertRowid } = insertNote.run(note);
    noteIds.push(lastInsertRowid);
  }
  logger.info(`Seeded ${noteIds.length} notes`);

  // --- note_tags links ---
  // Link at least 5 notes to tags (mix of single and multiple tags per note).
  // Index map: 0=Weekly Eng Sync, 1=Prod-Eng Alignment, 2=Ops Review,
  //            3=ADR-001, 4=ADR-002, 5=ADR-003,
  //            6=Retro 41, 7=Retro 40, 8=Retro 39,
  //            9=Onboarding Eng, 10=Onboarding PM, 11=Onboarding Designer,
  //            12=Research WASM, 13=Research FTS, 14=Research Observability,
  //            15=Announce on-call, 16=Announce office hours,
  //            17=Announce blog, 18=Q3 planning, 19=Hackathon results
  const insertNoteTag = db.prepare(
    `INSERT INTO note_tags (note_id, tag_id) VALUES (@note_id, @tag_id)`
  );

  const links = [
    // Weekly Engineering Sync → engineering, sprint
    { noteIndex: 0, tagName: 'engineering' },
    { noteIndex: 0, tagName: 'sprint' },
    // Product–Engineering Alignment → product, engineering
    { noteIndex: 1, tagName: 'product' },
    { noteIndex: 1, tagName: 'engineering' },
    // Cross-Team Ops Review → ops, engineering
    { noteIndex: 2, tagName: 'ops' },
    { noteIndex: 2, tagName: 'engineering' },
    // ADR-001 → engineering
    { noteIndex: 3, tagName: 'engineering' },
    // ADR-002 → engineering, ops
    { noteIndex: 4, tagName: 'engineering' },
    { noteIndex: 4, tagName: 'ops' },
    // ADR-003 → engineering, research
    { noteIndex: 5, tagName: 'engineering' },
    { noteIndex: 5, tagName: 'research' },
    // Sprint 41 Retro → sprint, team
    { noteIndex: 6, tagName: 'sprint' },
    { noteIndex: 6, tagName: 'team' },
    // New Engineer Onboarding → engineering, team
    { noteIndex: 9, tagName: 'engineering' },
    { noteIndex: 9, tagName: 'team' },
    // New PM Onboarding → product, team
    { noteIndex: 10, tagName: 'product' },
    { noteIndex: 10, tagName: 'team' },
    // New Designer Onboarding → design, team
    { noteIndex: 11, tagName: 'design' },
    { noteIndex: 11, tagName: 'team' },
    // Research WASM → research, engineering
    { noteIndex: 12, tagName: 'research' },
    { noteIndex: 12, tagName: 'engineering' },
    // Research FTS → research, engineering
    { noteIndex: 13, tagName: 'research' },
    { noteIndex: 13, tagName: 'engineering' },
    // Research Observability → research, ops
    { noteIndex: 14, tagName: 'research' },
    { noteIndex: 14, tagName: 'ops' },
    // Q3 Planning → product, team
    { noteIndex: 18, tagName: 'product' },
    { noteIndex: 18, tagName: 'team' },
  ];

  for (const { noteIndex, tagName } of links) {
    insertNoteTag.run({ note_id: noteIds[noteIndex], tag_id: tagIds[tagName] });
  }
  logger.info(`Seeded ${links.length} note_tags links`);
}

/**
 * Top-level seed entry point.
 * Wraps all seed operations in a single better-sqlite3 transaction.
 * Clears all tables, then seeds contacts and notes with tags.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function runSeed(db) {
  const seed = db.transaction(() => {
    clearAllTables(db);
    logger.info('Seeding database...');
    seedContacts(db);
    seedNotes(db);
    logger.info('Seed complete');
  });
  seed();
}

export { isoDate, isoDateTime, clearAllTables, runSeed };
