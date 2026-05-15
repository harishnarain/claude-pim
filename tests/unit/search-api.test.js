/**
 * Integration tests for the GET /api/search endpoint.
 * Creates a minimal Express app that mounts the search router directly,
 * without requiring the full server/index.js wiring (Task 3).
 * Applies migrations and seeds data across all four module types.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import express from 'express';
import { getDb, closeDb, runMigrations } from '../../server/db.js';
import searchRouter from '../../server/routes/search.js';

/** @type {http.Server} */
let server;

/** @type {string} Base URL for the running test server. */
let baseUrl;

/**
 * Build a minimal Express app that mounts only the search and supporting routers.
 * Supporting routers (contacts, notes, tasks, events) are needed to seed data via API.
 * @returns {import('express').Express} Configured Express application.
 */
async function buildApp() {
  const app = express();
  app.use(express.json());

  // Dynamically import the other routers so we can seed test data via HTTP.
  const [
    { default: contactsRouter },
    { default: notesRouter },
    { default: tasksRouter },
    { default: taskTagsRouter },
    { default: eventsRouter },
  ] = await Promise.all([
    import('../../server/routes/contacts.js'),
    import('../../server/routes/notes.js'),
    import('../../server/routes/tasks.js'),
    import('../../server/routes/task-tags.js'),
    import('../../server/routes/events.js'),
  ]);

  app.use('/api/contacts', contactsRouter);
  app.use('/api/notes', notesRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/task-tags', taskTagsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/search', searchRouter);

  return app;
}

/**
 * Start the test server on an OS-assigned port before all tests.
 * Apply migrations so all module tables exist.
 */
beforeAll(async () => {
  const db = getDb();
  runMigrations(db);

  const app = await buildApp();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

/**
 * Wipe all module tables between tests to keep them isolated.
 */
beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM task_tags').run();
  db.prepare('DELETE FROM task_tags_vocab').run();
  db.prepare('DELETE FROM tasks').run();
  db.prepare('DELETE FROM note_tags').run();
  db.prepare('DELETE FROM tags').run();
  db.prepare('DELETE FROM notes').run();
  db.prepare('DELETE FROM contacts').run();
  db.prepare('DELETE FROM events').run();
});

/**
 * Close the server and database after all tests finish.
 */
afterAll(async () => {
  const db = getDb();
  db.prepare('DELETE FROM task_tags').run();
  db.prepare('DELETE FROM task_tags_vocab').run();
  db.prepare('DELETE FROM tasks').run();
  db.prepare('DELETE FROM note_tags').run();
  db.prepare('DELETE FROM tags').run();
  db.prepare('DELETE FROM notes').run();
  db.prepare('DELETE FROM contacts').run();
  db.prepare('DELETE FROM events').run();

  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  closeDb();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Perform a JSON request against the test server.
 * @param {string} path - URL path (e.g. '/api/search?q=foo').
 * @param {{ method?: string, body?: object }} [options={}] - Request options.
 * @returns {Promise<{ status: number, body: object }>} Response status and parsed JSON body.
 */
async function request(path, { method = 'GET', body } = {}) {
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, init);
  const json = await res.json();
  return { status: res.status, body: json };
}

/**
 * Insert a contact directly via the API.
 * @param {{ first_name: string, last_name: string, email?: string, phone?: string, company?: string }} fields
 * @returns {Promise<object>} Created contact data.
 */
async function createContact(fields) {
  const { body } = await request('/api/contacts', { method: 'POST', body: fields });
  return body.data;
}

/**
 * Insert a note directly via the API.
 * @param {string} content - Note content.
 * @param {string[]} [tags=[]] - Optional tag names.
 * @returns {Promise<object>} Created note data.
 */
async function createNote(content, tags = []) {
  const { body } = await request('/api/notes', { method: 'POST', body: { content, tags } });
  return body.data;
}

/**
 * Insert a task directly via the API.
 * @param {{ title: string, body?: string, status?: string, priority?: string, due_date?: string, tags?: string[] }} fields
 * @returns {Promise<object>} Created task data.
 */
async function createTask(fields) {
  const { body } = await request('/api/tasks', { method: 'POST', body: fields });
  return body.data;
}

/**
 * Insert an event directly via the API.
 * @param {{ title: string, description?: string, location?: string, startAt?: string, endAt?: string }} fields
 * @returns {Promise<object>} Created event data.
 */
async function createEvent(fields) {
  const startAt = fields.startAt ?? '2026-06-01T10:00';
  const endAt = fields.endAt ?? '2026-06-01T11:00';
  const { body } = await request('/api/events', { method: 'POST', body: { ...fields, startAt, endAt } });
  return body.data;
}

// ---------------------------------------------------------------------------
// Validation — missing / invalid q
// ---------------------------------------------------------------------------

describe('GET /api/search — validation', () => {
  it('returns 422 MISSING_PARAMS when q is absent', async () => {
    const { status, body } = await request('/api/search');

    expect(status).toBe(422);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('MISSING_PARAMS');
    expect(body.error.fields.q).toBeDefined();
  });

  it('returns 422 MISSING_PARAMS when q is an empty string', async () => {
    const { status, body } = await request('/api/search?q=');

    expect(status).toBe(422);
    expect(body.error.code).toBe('MISSING_PARAMS');
  });

  it('returns 422 VALIDATION_ERROR when q exceeds 500 characters', async () => {
    const longQ = encodeURIComponent('a'.repeat(501));
    const { status, body } = await request(`/api/search?q=${longQ}`);

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.q).toBeDefined();
  });

  it('accepts q of exactly 500 characters', async () => {
    const q = encodeURIComponent('a'.repeat(500));
    const { status } = await request(`/api/search?q=${q}`);

    expect(status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Response envelope shape
// ---------------------------------------------------------------------------

describe('GET /api/search — response envelope', () => {
  it('returns 200 with correct envelope shape', async () => {
    const { status, body } = await request('/api/search?q=foo');

    expect(status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toHaveProperty('results');
    expect(body.data).toHaveProperty('total');
    expect(Array.isArray(body.data.results)).toBe(true);
    expect(typeof body.data.total).toBe('number');
  });

  it('returns meta with count, total, and q', async () => {
    const { body } = await request('/api/search?q=hello');

    expect(body.meta).toHaveProperty('count');
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('q');
    expect(body.meta.q).toBe('hello');
  });

  it('returns empty results when no data matches', async () => {
    const { body } = await request('/api/search?q=zzz_no_match_xyzzy');

    expect(body.data.results).toEqual([]);
    expect(body.data.total).toBe(0);
    expect(body.meta.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Each result has the required SearchResult fields
// ---------------------------------------------------------------------------

describe('GET /api/search — SearchResult shape', () => {
  it('each result has kind, id, title, subtitle, url, updatedAt, isPinned', async () => {
    await createContact({ first_name: 'Alice', last_name: 'Smith' });

    const { body } = await request('/api/search?q=Alice');

    expect(body.data.results.length).toBeGreaterThan(0);
    const result = body.data.results[0];
    expect(result).toHaveProperty('kind');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('subtitle');
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('updatedAt');
    expect(result).toHaveProperty('isPinned');
    expect(result).not.toHaveProperty('_score');
    expect(result).not.toHaveProperty('_updatedAt');
  });
});

// ---------------------------------------------------------------------------
// Contacts search
// ---------------------------------------------------------------------------

describe('GET /api/search — contacts', () => {
  it('finds a contact by first name', async () => {
    await createContact({ first_name: 'Jonathan', last_name: 'Doe' });

    const { body } = await request('/api/search?q=Jonathan');

    const found = body.data.results.find((r) => r.kind === 'contact' && r.title.includes('Jonathan'));
    expect(found).toBeDefined();
  });

  it('finds a contact by last name', async () => {
    await createContact({ first_name: 'Jane', last_name: 'Wonderland' });

    const { body } = await request('/api/search?q=Wonderland');

    const found = body.data.results.find((r) => r.kind === 'contact' && r.title.includes('Wonderland'));
    expect(found).toBeDefined();
  });

  it('finds a contact by email', async () => {
    await createContact({ first_name: 'Bob', last_name: 'Test', email: 'bob@example.org' });

    const { body } = await request('/api/search?q=bob@example.org');

    const found = body.data.results.find((r) => r.kind === 'contact');
    expect(found).toBeDefined();
  });

  it('contact url is /contacts/:id', async () => {
    const contact = await createContact({ first_name: 'Ursula', last_name: 'Example' });

    const { body } = await request('/api/search?q=Ursula');

    const found = body.data.results.find((r) => r.kind === 'contact');
    expect(found.url).toBe(`/contacts/${contact.id}`);
  });

  it('contact subtitle shows company when set', async () => {
    await createContact({ first_name: 'Ada', last_name: 'Lovelace', company: 'Analytical Engine Co' });

    const { body } = await request('/api/search?q=Ada');

    const found = body.data.results.find((r) => r.kind === 'contact');
    expect(found.subtitle).toBe('Analytical Engine Co');
  });

  it('contact subtitle falls back to email when no company', async () => {
    await createContact({ first_name: 'Grace', last_name: 'Hopper', email: 'grace@navy.mil' });

    const { body } = await request('/api/search?q=Grace');

    const found = body.data.results.find((r) => r.kind === 'contact');
    expect(found.subtitle).toBe('grace@navy.mil');
  });

  it('contact subtitle falls back to phone when no company or email', async () => {
    await createContact({ first_name: 'Alan', last_name: 'Turing', phone: '555-1234' });

    const { body } = await request('/api/search?q=Alan');

    const found = body.data.results.find((r) => r.kind === 'contact');
    expect(found.subtitle).toBe('555-1234');
  });

  it('contact subtitle is empty when no company, email, or phone', async () => {
    await createContact({ first_name: 'Ringo', last_name: 'Starr' });

    const { body } = await request('/api/search?q=Ringo');

    const found = body.data.results.find((r) => r.kind === 'contact');
    expect(found.subtitle).toBe('');
  });

  it('restricts to contacts only when type:contact is specified', async () => {
    await createContact({ first_name: 'TypeFilter', last_name: 'User' });
    await createTask({ title: 'TypeFilter task' });

    const { body } = await request('/api/search?q=type:contact+TypeFilter');

    expect(body.data.results.every((r) => r.kind === 'contact')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Notes search
// ---------------------------------------------------------------------------

describe('GET /api/search — notes', () => {
  it('finds a note by content', async () => {
    await createNote('Meeting agenda for quarterly review');

    const { body } = await request('/api/search?q=quarterly');

    const found = body.data.results.find((r) => r.kind === 'note');
    expect(found).toBeDefined();
  });

  it('note title is the first line of content', async () => {
    await createNote('Project Roadmap\nThis is the detail line.');

    const { body } = await request('/api/search?q=Roadmap');

    const found = body.data.results.find((r) => r.kind === 'note');
    expect(found.title).toBe('Project Roadmap');
  });

  it('note subtitle is up to 80 chars of content after the first line', async () => {
    const rest = 'This is the detail section of the note.';
    await createNote(`Title line\n${rest}`);

    const { body } = await request('/api/search?q=detail+section');

    const found = body.data.results.find((r) => r.kind === 'note');
    expect(found.subtitle).toBe(rest.slice(0, 80));
  });

  it('note url is /notes/:id', async () => {
    const note = await createNote('Unique note content omega');

    const { body } = await request('/api/search?q=omega');

    const found = body.data.results.find((r) => r.kind === 'note');
    expect(found.url).toBe(`/notes/${note.id}`);
  });

  it('note isPinned is true when is_pinned=1', async () => {
    const db = getDb();
    db.prepare("INSERT INTO notes (content, is_pinned) VALUES (?, 1)").run('Pinned note gamma');

    const { body } = await request('/api/search?q=gamma');

    const found = body.data.results.find((r) => r.kind === 'note');
    expect(found).toBeDefined();
    expect(found.isPinned).toBe(true);
  });

  it('filters notes by tag', async () => {
    await createNote('Note with tagalpha', ['tagalpha']);
    await createNote('Note without the tag');

    const { body } = await request('/api/search?q=type:note+tag:tagalpha');

    const noteResults = body.data.results.filter((r) => r.kind === 'note');
    expect(noteResults.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tasks search
// ---------------------------------------------------------------------------

describe('GET /api/search — tasks', () => {
  it('finds a task by title', async () => {
    await createTask({ title: 'Deploy production hotfix' });

    const { body } = await request('/api/search?q=hotfix');

    const found = body.data.results.find((r) => r.kind === 'task' && r.title.includes('hotfix'));
    expect(found).toBeDefined();
  });

  it('finds a task by body content', async () => {
    await createTask({ title: 'Generic task', body: 'Contains the keyword xylophone in body' });

    const { body } = await request('/api/search?q=xylophone');

    const found = body.data.results.find((r) => r.kind === 'task');
    expect(found).toBeDefined();
  });

  it('task url is /tasks/:id', async () => {
    const task = await createTask({ title: 'Unique task omega' });

    const { body } = await request('/api/search?q=omega');

    const found = body.data.results.find((r) => r.kind === 'task');
    expect(found.url).toBe(`/tasks/${task.id}`);
  });

  it('task subtitle includes priority and status', async () => {
    await createTask({ title: 'Subtitle task', priority: 'High', status: 'In Progress' });

    const { body } = await request('/api/search?q=Subtitle+task');

    const found = body.data.results.find((r) => r.kind === 'task');
    expect(found.subtitle).toContain('High');
    expect(found.subtitle).toContain('In Progress');
  });

  it('task subtitle includes due date when set', async () => {
    await createTask({ title: 'Due date task', due_date: '2026-12-31' });

    const { body } = await request('/api/search?q=Due+date+task');

    const found = body.data.results.find((r) => r.kind === 'task');
    expect(found.subtitle).toContain('2026-12-31');
  });

  it('task subtitle omits "Due" when no due_date', async () => {
    await createTask({ title: 'No due date task' });

    const { body } = await request('/api/search?q=No+due+date+task');

    const found = body.data.results.find((r) => r.kind === 'task');
    expect(found.subtitle).not.toContain('Due');
  });

  it('filters tasks by status via type:task status:completed', async () => {
    await createTask({ title: 'Completed task alpha', status: 'Completed' });
    await createTask({ title: 'Active task beta', status: 'In Progress' });

    const { body } = await request('/api/search?q=type:task+status:completed');

    expect(body.data.results.length).toBeGreaterThan(0);
    expect(body.data.results.every((r) => r.kind === 'task')).toBe(true);
    const completedTitles = body.data.results.map((r) => r.title);
    expect(completedTitles).toContain('Completed task alpha');
    expect(completedTitles).not.toContain('Active task beta');
  });

  it('implicit type narrowing: status:completed returns only tasks', async () => {
    await createTask({ title: 'Another done task', status: 'Completed' });
    await createNote('Some unrelated note content');

    const { body } = await request('/api/search?q=status:completed');

    expect(body.data.results.every((r) => r.kind === 'task')).toBe(true);
  });

  it('filters tasks by tag', async () => {
    await createTask({ title: 'Task with betatag', tags: ['betatag'] });
    await createTask({ title: 'Task without the tag' });

    const { body } = await request('/api/search?q=type:task+tag:betatag');

    const taskResults = body.data.results.filter((r) => r.kind === 'task');
    expect(taskResults.length).toBe(1);
    expect(taskResults[0].title).toBe('Task with betatag');
  });

  it('filters tasks by priority via priority:high', async () => {
    await createTask({ title: 'High priority task', priority: 'High' });
    await createTask({ title: 'Low priority task', priority: 'Low' });

    const { body } = await request('/api/search?q=type:task+priority:high');

    expect(body.data.results.every((r) => r.kind === 'task')).toBe(true);
    const titles = body.data.results.map((r) => r.title);
    expect(titles).toContain('High priority task');
    expect(titles).not.toContain('Low priority task');
  });
});

// ---------------------------------------------------------------------------
// Events search
// ---------------------------------------------------------------------------

describe('GET /api/search — events', () => {
  it('finds an event by title', async () => {
    await createEvent({ title: 'Team standup meeting' });

    const { body } = await request('/api/search?q=standup');

    const found = body.data.results.find((r) => r.kind === 'event');
    expect(found).toBeDefined();
    expect(found.title).toBe('Team standup meeting');
  });

  it('finds an event by description', async () => {
    await createEvent({ title: 'Board meeting', description: 'Discuss quarterly financials' });

    const { body } = await request('/api/search?q=financials');

    const found = body.data.results.find((r) => r.kind === 'event');
    expect(found).toBeDefined();
  });

  it('finds an event by location', async () => {
    await createEvent({ title: 'Off-site event', location: 'Mountain View HQ' });

    const { body } = await request('/api/search?q=Mountain+View');

    const found = body.data.results.find((r) => r.kind === 'event');
    expect(found).toBeDefined();
  });

  it('event subtitle includes the formatted start date', async () => {
    await createEvent({ title: 'Date event', startAt: '2026-06-15T09:00', endAt: '2026-06-15T10:00' });

    const { body } = await request('/api/search?q=Date+event');

    const found = body.data.results.find((r) => r.kind === 'event');
    expect(found.subtitle).toContain('2026');
  });

  it('event subtitle includes location when set', async () => {
    await createEvent({ title: 'Located event', location: 'Room 42' });

    const { body } = await request('/api/search?q=Located+event');

    const found = body.data.results.find((r) => r.kind === 'event');
    expect(found.subtitle).toContain('Room 42');
  });

  it('restricts to events only when type:event is specified', async () => {
    await createEvent({ title: 'Exclusive event result' });
    await createTask({ title: 'Exclusive task result' });

    const { body } = await request('/api/search?q=type:event+Exclusive');

    expect(body.data.results.every((r) => r.kind === 'event')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('GET /api/search — pagination', () => {
  it('respects limit parameter', async () => {
    for (let i = 0; i < 5; i++) {
      await createContact({ first_name: `Pagination${i}`, last_name: 'User' });
    }

    const { body } = await request('/api/search?q=Pagination&limit=2');

    expect(body.data.results.length).toBeLessThanOrEqual(2);
    expect(body.data.total).toBeGreaterThanOrEqual(5);
    expect(body.meta.count).toBeLessThanOrEqual(2);
  });

  it('respects offset parameter', async () => {
    for (let i = 0; i < 5; i++) {
      await createContact({ first_name: `Offset${i}`, last_name: 'User' });
    }

    const page1 = await request('/api/search?q=Offset&limit=3&offset=0');
    const page2 = await request('/api/search?q=Offset&limit=3&offset=3');

    const page1Ids = page1.body.data.results.map((r) => r.id);
    const page2Ids = page2.body.data.results.map((r) => r.id);

    // No overlap between pages.
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap.length).toBe(0);
  });

  it('caps limit at 50', async () => {
    for (let i = 0; i < 5; i++) {
      await createContact({ first_name: `Cap${i}`, last_name: 'Test' });
    }

    const { body } = await request('/api/search?q=Cap&limit=100');

    expect(body.data.results.length).toBeLessThanOrEqual(50);
  });

  it('total reflects full count before slicing', async () => {
    for (let i = 0; i < 5; i++) {
      await createContact({ first_name: `TotalCount${i}`, last_name: 'Example' });
    }

    const { body } = await request('/api/search?q=TotalCount&limit=2');

    expect(body.data.total).toBeGreaterThanOrEqual(5);
    expect(body.data.results.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Scoring — pinned items rank higher
// ---------------------------------------------------------------------------

describe('GET /api/search — scoring', () => {
  it('pinned notes appear before unpinned notes with the same relevance', async () => {
    const db = getDb();
    // Insert unpinned note first so it has slightly older updated_at.
    db.prepare("INSERT INTO notes (content, is_pinned, updated_at) VALUES (?, 0, datetime('now', '-1 second'))").run('Pinning test note');
    db.prepare("INSERT INTO notes (content, is_pinned, updated_at) VALUES (?, 1, datetime('now'))").run('Pinning test note pinned');

    const { body } = await request('/api/search?q=type:note+Pinning+test+note');

    const noteResults = body.data.results.filter((r) => r.kind === 'note');
    expect(noteResults.length).toBeGreaterThanOrEqual(2);
    const pinnedIdx = noteResults.findIndex((r) => r.isPinned === true);
    const unpinnedIdx = noteResults.findIndex((r) => r.isPinned === false);
    expect(pinnedIdx).toBeLessThan(unpinnedIdx);
  });
});
