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
 * Top-level seed entry point.
 * Wraps all seed operations in a single better-sqlite3 transaction.
 * Clears all tables, then seeds contacts.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
function runSeed(db) {
  const seed = db.transaction(() => {
    clearAllTables(db);
    logger.info('Seeding database...');
    seedContacts(db);
    logger.info('Seed complete');
  });
  seed();
}

export { isoDate, isoDateTime, clearAllTables, runSeed };
