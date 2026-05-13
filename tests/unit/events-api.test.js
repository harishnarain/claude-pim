/**
 * Integration tests for the /api/events REST endpoints.
 * Spins up the Express app on a random port using the in-memory test database,
 * then exercises all five endpoints via the native fetch API.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { app } from '../../server/index.js';
import { getDb, closeDb, runMigrations } from '../../server/db.js';

/** @type {http.Server} */
let server;

/** @type {string} Base URL for the running test server. */
let baseUrl;

/**
 * Start the Express app on an OS-assigned port before all tests.
 * Apply migrations so the events table exists.
 */
beforeAll(async () => {
  const db = getDb();
  runMigrations(db);

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
 * Wipe the events and tasks tables between tests to keep them isolated.
 */
beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM events').run();
  db.prepare('DELETE FROM tasks').run();
});

/**
 * Close the server and database after all tests finish.
 */
afterAll(async () => {
  const db = getDb();
  db.prepare('DELETE FROM events').run();
  db.prepare('DELETE FROM tasks').run();

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
 * @param {string} path - URL path (e.g. '/api/events').
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

// ---------------------------------------------------------------------------
// POST /api/events
// ---------------------------------------------------------------------------

describe('POST /api/events', () => {
  it('creates an event and returns 201 with camelCase fields', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: {
        title: 'Team standup',
        startAt: '2026-06-10T09:00',
        endAt: '2026-06-10T09:30',
      },
    });

    expect(status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.id).toBeTypeOf('number');
    expect(body.data.title).toBe('Team standup');
    expect(body.data.startAt).toBe('2026-06-10T09:00');
    expect(body.data.endAt).toBe('2026-06-10T09:30');
    expect(body.data).toHaveProperty('allDay');
    expect(body.data).toHaveProperty('createdAt');
    expect(body.data).toHaveProperty('updatedAt');
  });

  it('creates an event with all optional fields supplied', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: {
        title: 'Full event',
        description: 'A detailed description.',
        location: 'Conference Room A',
        allDay: false,
        startAt: '2026-07-01T10:00',
        endAt: '2026-07-01T11:00',
        color: 'green',
      },
    });

    expect(status).toBe(201);
    expect(body.data.description).toBe('A detailed description.');
    expect(body.data.location).toBe('Conference Room A');
    expect(body.data.color).toBe('green');
  });

  it('returns 422 when title is missing', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: { startAt: '2026-06-10T09:00', endAt: '2026-06-10T09:30' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.title).toBeDefined();
  });

  it('returns 422 when startAt is missing', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: { title: 'No start', endAt: '2026-06-10T09:30' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.startAt).toBeDefined();
  });

  it('returns 422 when endAt is missing', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: { title: 'No end', startAt: '2026-06-10T09:00' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.endAt).toBeDefined();
  });

  it('returns 422 when endAt is before startAt', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Backwards', startAt: '2026-06-10T10:00', endAt: '2026-06-10T09:00' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.endAt).toBeDefined();
  });

  it('returns 422 when color is invalid', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Bad color', startAt: '2026-06-10T09:00', endAt: '2026-06-10T10:00', color: 'rainbow' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.color).toBeDefined();
  });

  it('returns 422 when title exceeds 255 characters', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: { title: 'a'.repeat(256), startAt: '2026-06-10T09:00', endAt: '2026-06-10T10:00' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.title).toBeDefined();
  });

  it('accepts title of exactly 255 characters', async () => {
    const { status } = await request('/api/events', {
      method: 'POST',
      body: { title: 'a'.repeat(255), startAt: '2026-06-10T09:00', endAt: '2026-06-10T10:00' },
    });

    expect(status).toBe(201);
  });

  it('accepts startAt equal to endAt (zero-duration event)', async () => {
    const { status } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Instant', startAt: '2026-06-10T09:00', endAt: '2026-06-10T09:00' },
    });

    expect(status).toBe(201);
  });

  it('returns 422 for startAt with invalid date (month 13)', async () => {
    const { status, body } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Bad date', startAt: '2026-13-01T09:00', endAt: '2026-13-01T10:00' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not include snake_case keys in response', async () => {
    const { body } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Check keys', startAt: '2026-06-10T09:00', endAt: '2026-06-10T10:00' },
    });

    expect(body.data).not.toHaveProperty('all_day');
    expect(body.data).not.toHaveProperty('start_at');
    expect(body.data).not.toHaveProperty('end_at');
    expect(body.data).not.toHaveProperty('created_at');
    expect(body.data).not.toHaveProperty('updated_at');
  });
});

// ---------------------------------------------------------------------------
// GET /api/events
// ---------------------------------------------------------------------------

describe('GET /api/events', () => {
  it('returns 422 MISSING_PARAMS when start param is absent', async () => {
    const { status, body } = await request('/api/events?end=2026-06-30');

    expect(status).toBe(422);
    expect(body.error.code).toBe('MISSING_PARAMS');
  });

  it('returns 422 MISSING_PARAMS when end param is absent', async () => {
    const { status, body } = await request('/api/events?start=2026-06-01');

    expect(status).toBe(422);
    expect(body.error.code).toBe('MISSING_PARAMS');
  });

  it('returns 422 MISSING_PARAMS when both params are absent', async () => {
    const { status, body } = await request('/api/events');

    expect(status).toBe(422);
    expect(body.error.code).toBe('MISSING_PARAMS');
  });

  it('returns 200 with empty data when no events or tasks fall in range', async () => {
    const { status, body } = await request('/api/events?start=2026-06-01&end=2026-06-30');

    expect(status).toBe(200);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
    expect(body.meta.count).toBe(0);
    expect(body.meta.start).toBe('2026-06-01');
    expect(body.meta.end).toBe('2026-06-30');
  });

  it('returns events in the range with kind: event', async () => {
    await request('/api/events', {
      method: 'POST',
      body: { title: 'In range', startAt: '2026-06-15T10:00', endAt: '2026-06-15T11:00' },
    });

    await request('/api/events', {
      method: 'POST',
      body: { title: 'Out of range', startAt: '2026-07-15T10:00', endAt: '2026-07-15T11:00' },
    });

    const { status, body } = await request('/api/events?start=2026-06-01&end=2026-06-30');

    expect(status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].title).toBe('In range');
    expect(body.data[0].kind).toBe('event');
    expect(body.meta.count).toBe(1);
  });

  it('merges task chips with due dates in range with kind: task', async () => {
    const db = getDb();
    db.prepare(
      "INSERT INTO tasks (title, due_date, status, priority) VALUES ('Task in range', '2026-06-20', 'Not Started', 'Low')"
    ).run();

    const { status, body } = await request('/api/events?start=2026-06-01&end=2026-06-30');

    expect(status).toBe(200);
    const taskItems = body.data.filter((item) => item.kind === 'task');
    expect(taskItems.length).toBe(1);
    expect(taskItems[0].title).toBe('Task in range');
    expect(taskItems[0]).toHaveProperty('dueDate');
    expect(taskItems[0]).toHaveProperty('status');
    expect(taskItems[0]).toHaveProperty('priority');
    expect(taskItems[0]).not.toHaveProperty('due_date');
  });

  it('excludes tasks without a due date', async () => {
    const db = getDb();
    db.prepare("INSERT INTO tasks (title, status, priority) VALUES ('No due date', 'Not Started', 'Low')").run();

    const { status, body } = await request('/api/events?start=2026-06-01&end=2026-06-30');

    expect(status).toBe(200);
    expect(body.data.length).toBe(0);
  });

  it('returns merged events and tasks in a single array', async () => {
    await request('/api/events', {
      method: 'POST',
      body: { title: 'Meeting', startAt: '2026-06-10T14:00', endAt: '2026-06-10T15:00' },
    });
    const db = getDb();
    db.prepare(
      "INSERT INTO tasks (title, due_date, status, priority) VALUES ('Task due', '2026-06-10', 'Not Started', 'High')"
    ).run();

    const { body } = await request('/api/events?start=2026-06-01&end=2026-06-30');

    expect(body.data.length).toBe(2);
    expect(body.meta.count).toBe(2);
    const kinds = body.data.map((item) => item.kind);
    expect(kinds).toContain('event');
    expect(kinds).toContain('task');
  });
});

// ---------------------------------------------------------------------------
// GET /api/events/:id
// ---------------------------------------------------------------------------

describe('GET /api/events/:id', () => {
  it('returns 200 with the event in camelCase when found', async () => {
    const { body: created } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Findable event', startAt: '2026-08-01T10:00', endAt: '2026-08-01T11:00' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/events/${id}`);

    expect(status).toBe(200);
    expect(body.data.id).toBe(id);
    expect(body.data.title).toBe('Findable event');
    expect(body.data).toHaveProperty('allDay');
    expect(body.data).toHaveProperty('startAt');
    expect(body.data).toHaveProperty('endAt');
    expect(body.data).not.toHaveProperty('kind');
    expect(body.error).toBeNull();
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/events/999999');

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-integer id', async () => {
    const { status, body } = await request('/api/events/abc');

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/events/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/events/:id', () => {
  it('updates title and returns 200 with the updated event', async () => {
    const { body: created } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Original', startAt: '2026-09-01T09:00', endAt: '2026-09-01T10:00' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/events/${id}`, {
      method: 'PATCH',
      body: { title: 'Updated title' },
    });

    expect(status).toBe(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.error).toBeNull();
  });

  it('updates color to a valid value', async () => {
    const { body: created } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Color test', startAt: '2026-09-01T09:00', endAt: '2026-09-01T10:00', color: 'blue' },
    });
    const id = created.data.id;

    const { body } = await request(`/api/events/${id}`, {
      method: 'PATCH',
      body: { color: 'purple' },
    });

    expect(body.data.color).toBe('purple');
  });

  it('returns 422 for an invalid color in PATCH', async () => {
    const { body: created } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Event', startAt: '2026-09-01T09:00', endAt: '2026-09-01T10:00' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/events/${id}`, {
      method: 'PATCH',
      body: { color: 'neon' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.color).toBeDefined();
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/events/999999', {
      method: 'PATCH',
      body: { title: 'Ghost' },
    });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-integer id', async () => {
    const { status, body } = await request('/api/events/abc', {
      method: 'PATCH',
      body: { title: 'Ghost' },
    });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 when patched endAt is before existing startAt (both supplied)', async () => {
    const { body: created } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Time order', startAt: '2026-09-01T10:00', endAt: '2026-09-01T11:00' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/events/${id}`, {
      method: 'PATCH',
      body: { startAt: '2026-09-01T14:00', endAt: '2026-09-01T13:00' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.endAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/events/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/events/:id', () => {
  it('deletes the event and returns 200 with { deleted: true }', async () => {
    const { body: created } = await request('/api/events', {
      method: 'POST',
      body: { title: 'To be deleted', startAt: '2026-10-01T09:00', endAt: '2026-10-01T10:00' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/events/${id}`, { method: 'DELETE' });

    expect(status).toBe(200);
    expect(body.data).toEqual({ deleted: true });
    expect(body.error).toBeNull();
  });

  it('confirms the event is gone after deletion', async () => {
    const { body: created } = await request('/api/events', {
      method: 'POST',
      body: { title: 'Ephemeral', startAt: '2026-10-01T09:00', endAt: '2026-10-01T10:00' },
    });
    const id = created.data.id;

    await request(`/api/events/${id}`, { method: 'DELETE' });

    const { status } = await request(`/api/events/${id}`);
    expect(status).toBe(404);
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/events/999999', { method: 'DELETE' });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-integer id', async () => {
    const { status, body } = await request('/api/events/abc', { method: 'DELETE' });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
