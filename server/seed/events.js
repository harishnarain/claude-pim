/**
 * Seed function for the events table.
 * Always inserts exactly 20 events: one standup per weekday in the ±7-day
 * window, then fills the remainder from a fixed template list.
 * @module seed/events
 */

import logger from '../logger.js';
import { isoDateTime, addMinutes } from './helpers.js';

/** Fixed event templates used to fill slots after standups are placed. */
const TEMPLATES = [
  { title: 'Sprint Planning',               offset: -6, startHour: 10, startMinute: 0,  durationMinutes: 120, location: 'Conference Room A', description: 'Plan sprint tasks, review backlog, and assign story points.',           color: 'green'  },
  { title: '1:1 — Engineering Manager',     offset: -5, startHour: 14, startMinute: 0,  durationMinutes: 30,  location: 'Zoom',              description: null,                                                                    color: 'purple' },
  { title: 'Design Review: Onboarding Flow',offset: -3, startHour: 11, startMinute: 0,  durationMinutes: 60,  location: 'Conference Room B', description: 'Review updated onboarding screens with the design and product teams.',  color: 'orange' },
  { title: 'All-Hands Meeting',             offset: -1, startHour: 17, startMinute: 0,  durationMinutes: 60,  location: 'Main Auditorium',   description: 'Company-wide update on Q2 priorities and product roadmap.',           color: 'red'    },
  { title: 'Architecture Discussion',       offset:  1, startHour: 13, startMinute: 0,  durationMinutes: 60,  location: 'Conference Room A', description: null,                                                                    color: 'blue'   },
  { title: 'Sprint Retrospective',          offset:  2, startHour: 15, startMinute: 0,  durationMinutes: 90,  location: 'Conference Room A', description: 'Review sprint velocity, blockers, and team feedback.',                 color: 'green'  },
  { title: 'Customer Demo',                 offset:  3, startHour: 10, startMinute: 0,  durationMinutes: 60,  location: 'Zoom',              description: null,                                                                    color: 'orange' },
  { title: 'Code Review Session',           offset:  4, startHour: 14, startMinute: 0,  durationMinutes: 60,  location: 'Zoom',              description: null,                                                                    color: 'blue'   },
  { title: 'Quarterly OKR Check-in',        offset:  5, startHour: 11, startMinute: 0,  durationMinutes: 90,  location: 'Board Room',        description: null,                                                                    color: 'purple' },
  { title: 'On-Call Handoff',               offset:  6, startHour:  9, startMinute: 0,  durationMinutes: 30,  location: 'Zoom',              description: null,                                                                    color: 'red'    },
  { title: 'Product Roadmap Review',        offset:  7, startHour: 14, startMinute: 0,  durationMinutes: 60,  location: 'Conference Room B', description: null,                                                                    color: 'green'  },
  { title: 'Team Lunch',                    offset:  0, startHour: 12, startMinute: 0,  durationMinutes: 60,  location: 'The Atrium',        description: null,                                                                    color: 'orange' },
];

/**
 * Insert exactly 20 calendar events into the events table.
 * Step 1: One Daily Standup per weekday (Mon–Fri) in the ±7-day window.
 * Step 2: Fill remaining slots to reach 20 using TEMPLATES in order.
 * @param {import('better-sqlite3').Database} db - The open database instance.
 * @returns {void}
 */
export function seedEvents(db) {
  const insert = db.prepare(`
    INSERT INTO events (title, description, location, all_day, start_at, end_at, color)
    VALUES (@title, @description, @location, @all_day, @start_at, @end_at, @color)
  `);

  let standupCount = 0;
  for (let offset = -7; offset <= 7; offset++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) {
      const start_at = isoDateTime(offset, 9, 30);
      insert.run({ title: 'Daily Standup', description: null, location: 'Zoom', all_day: 0, start_at, end_at: isoDateTime(offset, 10, 0), color: 'blue' });
      standupCount++;
    }
  }
  logger.info(`Seeded ${standupCount} Daily Standup events`);

  const selected = TEMPLATES.slice(0, 20 - standupCount);
  for (const tmpl of selected) {
    const start_at = isoDateTime(tmpl.offset, tmpl.startHour, tmpl.startMinute);
    insert.run({ title: tmpl.title, description: tmpl.description, location: tmpl.location, all_day: 0, start_at, end_at: addMinutes(start_at, tmpl.durationMinutes), color: tmpl.color });
  }
  logger.info(`Seeded ${selected.length} additional events (total 20)`);
}
