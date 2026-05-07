/**
 * Integration tests for the /api/tasks REST endpoints.
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
 * Apply migrations so the tasks/task_tags tables exist.
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
 * Wipe the tasks and task_tags tables between tests to keep them isolated.
 */
beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM task_tags').run();
  db.prepare('DELETE FROM task_tags_vocab').run();
  db.prepare('DELETE FROM tasks').run();
});

/**
 * Close the server and database after all tests finish.
 * Wipe all test data first so subsequent test suites start with a clean DB.
 */
afterAll(async () => {
  const db = getDb();
  db.prepare('DELETE FROM task_tags').run();
  db.prepare('DELETE FROM task_tags_vocab').run();
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
 * @param {string} path - URL path (e.g. '/api/tasks').
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
// POST /api/tasks
// ---------------------------------------------------------------------------

describe('POST /api/tasks', () => {
  it('creates a task and returns 201 with the new record including tags', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Buy milk', body: 'From the corner shop.', tags: ['work', 'errands'] },
    });

    expect(status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ title: 'Buy milk', body: 'From the corner shop.' });
    expect(body.data.id).toBeTypeOf('number');
    expect(Array.isArray(body.data.tags)).toBe(true);
    expect(body.data.tags.map((t) => t.name)).toContain('work');
    expect(body.data.tags.map((t) => t.name)).toContain('errands');
  });

  it('creates a task with no tags when tags field is omitted', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Simple task' },
    });

    expect(status).toBe(201);
    expect(body.data.tags).toEqual([]);
  });

  it('creates a task with default priority Low and status Not Started', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Default task' },
    });

    expect(status).toBe(201);
    expect(body.data.priority).toBe('Low');
    expect(body.data.status).toBe('Not Started');
  });

  it('creates a task with all optional fields supplied', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: {
        title: 'Full task',
        body: 'Detailed body.',
        due_date: '2026-12-31',
        priority: 'High',
        status: 'In Progress',
        is_pinned: true,
        tags: ['feature'],
      },
    });

    expect(status).toBe(201);
    expect(body.data.priority).toBe('High');
    expect(body.data.status).toBe('In Progress');
    expect(body.data.due_date).toBe('2026-12-31');
    expect(body.data.is_pinned).toBe(1);
  });

  it('returns 422 when title is missing', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { body: 'No title here' },
    });

    expect(status).toBe(422);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.title).toBeDefined();
  });

  it('returns 422 when title is empty string', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: '   ' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.title).toBeDefined();
  });

  it('returns 422 when title exceeds 255 characters', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'a'.repeat(256) },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.title).toBeDefined();
  });

  it('accepts title of exactly 255 characters', async () => {
    const { status } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'a'.repeat(255) },
    });

    expect(status).toBe(201);
  });

  it('returns 422 when body exceeds 10,000 characters', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', body: 'x'.repeat(10_001) },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.body).toBeDefined();
  });

  it('accepts body of exactly 10,000 characters', async () => {
    const { status } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', body: 'x'.repeat(10_000) },
    });

    expect(status).toBe(201);
  });

  it('returns 422 when due_date has invalid format', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', due_date: '31-12-2026' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.due_date).toBeDefined();
  });

  it('returns 422 when due_date is not a valid calendar date', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', due_date: '2026-13-01' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.due_date).toBeDefined();
  });

  it('accepts a valid due_date in YYYY-MM-DD format', async () => {
    const { status } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', due_date: '2026-06-15' },
    });

    expect(status).toBe(201);
  });

  it('returns 422 when priority is invalid', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', priority: 'Critical' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.priority).toBeDefined();
  });

  it('returns 422 when status is invalid', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', status: 'Done' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.status).toBeDefined();
  });

  it('returns 422 when tags array exceeds 5 items', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', tags: ['a', 'b', 'c', 'd', 'e', 'f'] },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.tags).toBeDefined();
  });

  it('returns 422 when a tag name exceeds 30 characters', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', tags: ['a'.repeat(31)] },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.tags).toBeDefined();
  });

  it('normalises tag names to lowercase and trimmed', async () => {
    const { status, body } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', tags: ['  Work  ', 'ERRANDS'] },
    });

    expect(status).toBe(201);
    const names = body.data.tags.map((t) => t.name);
    expect(names).toContain('work');
    expect(names).toContain('errands');
    expect(names).not.toContain('Work');
  });
});

// ---------------------------------------------------------------------------
// GET /api/tasks
// ---------------------------------------------------------------------------

describe('GET /api/tasks', () => {
  beforeEach(async () => {
    await request('/api/tasks', { method: 'POST', body: { title: 'Task A' } });
    await request('/api/tasks', { method: 'POST', body: { title: 'Task B' } });
  });

  it('returns 200 with all tasks and a count in meta', async () => {
    const { status, body } = await request('/api/tasks');

    expect(status).toBe(200);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.meta.count).toBe(2);
  });

  it('each task in the list includes a tags array', async () => {
    const { body } = await request('/api/tasks');

    for (const task of body.data) {
      expect(Array.isArray(task.tags)).toBe(true);
    }
  });

  it('returns an empty array when no tasks exist', async () => {
    getDb().prepare('DELETE FROM tasks').run();
    const { status, body } = await request('/api/tasks');

    expect(status).toBe(200);
    expect(body.data.length).toBe(0);
    expect(body.meta.count).toBe(0);
  });

  it('accepts ?sort=priority_desc without error', async () => {
    const { status, body } = await request('/api/tasks?sort=priority_desc');

    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('accepts ?sort=due_desc without error', async () => {
    const { status, body } = await request('/api/tasks?sort=due_desc');

    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('falls back to due_asc for an unknown sort value', async () => {
    const { status, body } = await request('/api/tasks?sort=bogus_sort');

    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
  });

  it('filters by status when ?status= is provided', async () => {
    await request('/api/tasks', { method: 'POST', body: { title: 'Completed Task', status: 'Completed' } });

    const { body } = await request('/api/tasks?status=Not%20Started');
    const statuses = body.data.map((t) => t.status);
    expect(statuses.every((s) => s === 'Not Started')).toBe(true);
  });

  it('filters by priority when ?priority= is provided', async () => {
    await request('/api/tasks', { method: 'POST', body: { title: 'High Task', priority: 'High' } });

    const { body } = await request('/api/tasks?priority=High');
    const priorities = body.data.map((t) => t.priority);
    expect(priorities.every((p) => p === 'High')).toBe(true);
    expect(body.data.length).toBe(1);
  });

  it('drops unknown status values from the filter', async () => {
    const { status, body } = await request('/api/tasks?status=Not%20Started,BOGUS');

    expect(status).toBe(200);
    // Only the valid "Not Started" filter is applied
    const statuses = body.data.map((t) => t.status);
    expect(statuses.every((s) => s === 'Not Started')).toBe(true);
  });

  it('drops unknown priority values from the filter', async () => {
    const { status, body } = await request('/api/tasks?priority=Low,BOGUS');

    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('each task has a body_preview column not the full body field', async () => {
    const { body } = await request('/api/tasks');

    for (const task of body.data) {
      expect(task).toHaveProperty('body_preview');
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/tasks/:id
// ---------------------------------------------------------------------------

describe('GET /api/tasks/:id', () => {
  it('returns 200 with the task and its tags when found', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Searchable task', tags: ['test'] },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`);

    expect(status).toBe(200);
    expect(body.data.id).toBe(id);
    expect(body.data.title).toBe('Searchable task');
    expect(body.data.tags.map((t) => t.name)).toContain('test');
    expect(body.error).toBeNull();
  });

  it('returns the full body (not a preview) for a single task', async () => {
    const longBody = 'x'.repeat(200);
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Full body task', body: longBody },
    });
    const id = created.data.id;

    const { body } = await request(`/api/tasks/${id}`);
    expect(body.data.body).toBe(longBody);
    expect(body.data.body.length).toBe(200);
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/tasks/999999');

    expect(status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-integer id', async () => {
    const { status, body } = await request('/api/tasks/abc');

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/tasks/:id', () => {
  it('updates title and returns 200 with the updated task', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Original title' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { title: 'Updated title' },
    });

    expect(status).toBe(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.error).toBeNull();
  });

  it('updates status and priority', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Status task' },
    });
    const id = created.data.id;

    const { body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { status: 'Completed', priority: 'High' },
    });

    expect(body.data.status).toBe('Completed');
    expect(body.data.priority).toBe('High');
  });

  it('replaces the tag set when tags are provided', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Tagged task', tags: ['old-tag'] },
    });
    const id = created.data.id;

    const { body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { tags: ['new-tag'] },
    });

    const names = body.data.tags.map((t) => t.name);
    expect(names).toContain('new-tag');
    expect(names).not.toContain('old-tag');
  });

  it('preserves tags when tags field is absent from the patch body', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Persistent tags', tags: ['keep-me'] },
    });
    const id = created.data.id;

    const { body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { title: 'New title only' },
    });

    expect(body.data.tags.map((t) => t.name)).toContain('keep-me');
  });

  it('clears tags when tags is set to an empty array', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task with tags', tags: ['remove-me'] },
    });
    const id = created.data.id;

    const { body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { tags: [] },
    });

    expect(body.data.tags).toEqual([]);
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/tasks/999999', {
      method: 'PATCH',
      body: { title: 'Nobody home' },
    });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 when title exceeds 255 characters', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Short' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { title: 'a'.repeat(256) },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.title).toBeDefined();
  });

  it('returns 422 when body exceeds 10,000 characters', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Short' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { body: 'x'.repeat(10_001) },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.body).toBeDefined();
  });

  it('returns 422 when due_date has invalid format', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { due_date: 'not-a-date' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.due_date).toBeDefined();
  });

  it('returns 422 when priority is invalid in patch', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { priority: 'Ultra' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.priority).toBeDefined();
  });

  it('returns 422 when status is invalid in patch', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { status: 'Done' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.status).toBeDefined();
  });

  it('returns 422 when patch tags array exceeds 5 items', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { tags: ['a', 'b', 'c', 'd', 'e', 'f'] },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.tags).toBeDefined();
  });

  it('returns 404 for a non-integer id', async () => {
    const { status, body } = await request('/api/tasks/abc', {
      method: 'PATCH',
      body: { title: 'Ghost' },
    });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/tasks/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/tasks/:id', () => {
  it('deletes the task and returns 200 with { deleted: true }', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'To be deleted' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/tasks/${id}`, { method: 'DELETE' });

    expect(status).toBe(200);
    expect(body.data).toEqual({ deleted: true });
    expect(body.error).toBeNull();
  });

  it('confirms the task is gone after deletion', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Ephemeral' },
    });
    const id = created.data.id;

    await request(`/api/tasks/${id}`, { method: 'DELETE' });

    const { status } = await request(`/api/tasks/${id}`);
    expect(status).toBe(404);
  });

  it('cleans up orphaned task tags after deletion', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Tagged task', tags: ['orphan-tag'] },
    });
    const id = created.data.id;

    await request(`/api/tasks/${id}`, { method: 'DELETE' });

    const db = getDb();
    const tag = db.prepare("SELECT id FROM task_tags_vocab WHERE name = 'orphan-tag'").get();
    expect(tag).toBeUndefined();
  });

  it('does not delete tags that are still used by other tasks', async () => {
    const { body: task1 } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task 1', tags: ['shared-tag'] },
    });
    const { body: task2 } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task 2', tags: ['shared-tag'] },
    });

    await request(`/api/tasks/${task1.data.id}`, { method: 'DELETE' });

    const db = getDb();
    const tag = db.prepare("SELECT id FROM task_tags_vocab WHERE name = 'shared-tag'").get();
    expect(tag).toBeDefined();

    const { body: task2Full } = await request(`/api/tasks/${task2.data.id}`);
    expect(task2Full.data.tags.map((t) => t.name)).toContain('shared-tag');
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/tasks/999999', { method: 'DELETE' });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-integer id', async () => {
    const { status, body } = await request('/api/tasks/abc', { method: 'DELETE' });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Tag attach / detach lifecycle
// ---------------------------------------------------------------------------

describe('Tag attach / detach lifecycle', () => {
  it('attaches tags on create and detaches replaced tags on update', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', tags: ['alpha', 'beta'] },
    });
    const id = created.data.id;

    expect(created.data.tags.map((t) => t.name)).toContain('alpha');
    expect(created.data.tags.map((t) => t.name)).toContain('beta');

    const { body: patched } = await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { tags: ['gamma'] },
    });

    const names = patched.data.tags.map((t) => t.name);
    expect(names).toContain('gamma');
    expect(names).not.toContain('alpha');
    expect(names).not.toContain('beta');
  });

  it('orphaned tags are removed from vocab after the tag set is replaced', async () => {
    const { body: created } = await request('/api/tasks', {
      method: 'POST',
      body: { title: 'Task', tags: ['temp-tag'] },
    });
    const id = created.data.id;

    await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: { tags: [] },
    });

    const db = getDb();
    const tag = db.prepare("SELECT id FROM task_tags_vocab WHERE name = 'temp-tag'").get();
    expect(tag).toBeUndefined();
  });
});
