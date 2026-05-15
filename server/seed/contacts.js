/**
 * Seed function for the contacts table.
 * Inserts 20 realistic tech-firm contacts with job titles for all entries.
 * @module seed/contacts
 */

import logger from '../logger.js';

/**
 * Insert 20 realistic tech-firm contacts into the contacts table.
 * Every contact has a title (job title) column populated.
 * Priority distribution: Software Engineer (×2), Senior Software Engineer (×2),
 * Engineering Manager (×2), Product Manager (×2), Product Designer (×2),
 * QA Engineer (×2), DevOps Engineer (×2), Data Scientist (×2),
 * VP of Engineering (×1), CTO (×1), Technical Program Manager (×1),
 * Security Engineer (×1). Companies rotate across four fictional tech firms.
 * Exactly 5 contacts have a phone value; exactly 5 have a notes value.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
export function seedContacts(db) {
  const insert = db.prepare(`
    INSERT INTO contacts (first_name, last_name, email, phone, company, notes, title)
    VALUES (@first_name, @last_name, @email, @phone, @company, @notes, @title)
  `);

  const contacts = [
    // Software Engineer ×2
    { first_name: 'Alice',   last_name: 'Chen',       email: 'alice.chen@ariontech.com',      phone: '+1-415-555-0101', company: 'Arion Tech',    title: 'Software Engineer',            notes: 'Works on the core authentication service.' },
    { first_name: 'Brian',   last_name: 'Okafor',     email: 'brian.okafor@nexussystems.com', phone: null,              company: 'Nexus Systems', title: 'Software Engineer',            notes: null },
    // Senior Software Engineer ×2
    { first_name: 'Carmen',  last_name: 'Lopez',      email: 'carmen.lopez@byteforge.io',     phone: '+1-650-555-0202', company: 'ByteForge',     title: 'Senior Software Engineer',     notes: 'Leads the payments service team.' },
    { first_name: 'David',   last_name: 'Park',       email: 'david.park@cloudpeak.io',       phone: null,              company: 'CloudPeak',     title: 'Senior Software Engineer',     notes: null },
    // Engineering Manager ×2
    { first_name: 'Elena',   last_name: 'Vasquez',    email: 'elena.vasquez@ariontech.com',   phone: '+1-408-555-0303', company: 'Arion Tech',    title: 'Engineering Manager',          notes: 'Oversees the mobile squad.' },
    { first_name: 'Frank',   last_name: 'Nakamura',   email: 'frank.nakamura@nexussystems.com', phone: null,            company: 'Nexus Systems', title: 'Engineering Manager',          notes: null },
    // Product Manager ×2
    { first_name: 'Grace',   last_name: 'Mbeki',      email: 'grace.mbeki@byteforge.io',      phone: '+1-206-555-0404', company: 'ByteForge',     title: 'Product Manager',              notes: 'Drives the roadmap for the analytics platform.' },
    { first_name: 'Henry',   last_name: 'Torres',     email: 'henry.torres@cloudpeak.io',     phone: null,              company: 'CloudPeak',     title: 'Product Manager',              notes: null },
    // Product Designer ×2
    { first_name: 'Isabel',  last_name: 'Johansson',  email: 'isabel.johansson@ariontech.com', phone: '+1-512-555-0505', company: 'Arion Tech',   title: 'Product Designer',             notes: 'Key collaborator on the design system.' },
    { first_name: 'James',   last_name: 'Osei',       email: 'james.osei@nexussystems.com',   phone: null,              company: 'Nexus Systems', title: 'Product Designer',             notes: null },
    // QA Engineer ×2
    { first_name: 'Karen',   last_name: 'Reyes',      email: 'karen.reyes@byteforge.io',      phone: null,              company: 'ByteForge',     title: 'QA Engineer',                  notes: null },
    { first_name: 'Liam',    last_name: 'Fernandez',  email: 'liam.fernandez@cloudpeak.io',   phone: null,              company: 'CloudPeak',     title: 'QA Engineer',                  notes: null },
    // DevOps Engineer ×2
    { first_name: 'Maya',    last_name: 'Patel',      email: 'maya.patel@ariontech.com',      phone: null,              company: 'Arion Tech',    title: 'DevOps Engineer',              notes: null },
    { first_name: 'Nathan',  last_name: 'Kim',        email: 'nathan.kim@nexussystems.com',   phone: null,              company: 'Nexus Systems', title: 'DevOps Engineer',              notes: null },
    // Data Scientist ×2
    { first_name: 'Olivia',  last_name: 'Schmidt',    email: 'olivia.schmidt@byteforge.io',   phone: null,              company: 'ByteForge',     title: 'Data Scientist',               notes: null },
    { first_name: 'Pedro',   last_name: 'Alves',      email: 'pedro.alves@cloudpeak.io',      phone: null,              company: 'CloudPeak',     title: 'Data Scientist',               notes: null },
    // VP of Engineering ×1
    { first_name: 'Quinn',   last_name: 'Andersen',   email: 'quinn.andersen@ariontech.com',  phone: null,              company: 'Arion Tech',    title: 'VP of Engineering',            notes: null },
    // CTO ×1
    { first_name: 'Rachel',  last_name: 'Nguyen',     email: 'rachel.nguyen@nexussystems.com', phone: null,             company: 'Nexus Systems', title: 'CTO',                          notes: null },
    // Technical Program Manager ×1
    { first_name: 'Samuel',  last_name: 'Ekwueme',    email: 'samuel.ekwueme@byteforge.io',   phone: null,              company: 'ByteForge',     title: 'Technical Program Manager',    notes: null },
    // Security Engineer ×1
    { first_name: 'Tina',    last_name: 'Holbrook',   email: 'tina.holbrook@cloudpeak.io',    phone: null,              company: 'CloudPeak',     title: 'Security Engineer',            notes: null },
  ];

  for (const contact of contacts) {
    insert.run(contact);
  }

  logger.info(`Seeded ${contacts.length} contacts`);
}
