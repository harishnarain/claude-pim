/**
 * Integration tests for the /api/notes REST endpoints.
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
 * Apply migrations so the notes/tags tables exist.
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
 * Wipe the notes and tags tables between tests to keep them isolated.
 */
beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM note_tags').run();
  db.prepare('DELETE FROM notes').run();
  db.prepare('DELETE FROM tags').run();
});

/**
 * Close the server and database after all tests finish.
 * Wipe all test data first so subsequent test suites start with a clean DB.
 */
afterAll(async () => {
  const db = getDb();
  db.prepare('DELETE FROM note_tags').run();
  db.prepare('DELETE FROM notes').run();
  db.prepare('DELETE FROM tags').run();

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
 * @param {string} path - URL path (e.g. '/api/notes').
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
// POST /api/notes
// ---------------------------------------------------------------------------

describe('POST /api/notes', () => {
  it('creates a note and returns 201 with the new record including tags', async () => {
    const { status, body } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'First line\nBody text', tags: ['work', 'ideas'] },
    });

    expect(status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ content: 'First line\nBody text' });
    expect(body.data.id).toBeTypeOf('number');
    expect(Array.isArray(body.data.tags)).toBe(true);
    expect(body.data.tags.map((t) => t.name)).toContain('work');
    expect(body.data.tags.map((t) => t.name)).toContain('ideas');
  });

  it('creates a note with no tags when tags field is omitted', async () => {
    const { status, body } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Simple note' },
    });

    expect(status).toBe(201);
    expect(body.data.tags).toEqual([]);
  });

  it('creates a note with empty content when content is omitted', async () => {
    const { status, body } = await request('/api/notes', {
      method: 'POST',
      body: {},
    });

    expect(status).toBe(201);
    expect(body.data.content).toBe('');
  });

  it('returns 422 when content exceeds 25,000 characters', async () => {
    const { status, body } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'x'.repeat(25_001) },
    });

    expect(status).toBe(422);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.content).toBeDefined();
  });

  it('returns 422 when tags array exceeds 5 items', async () => {
    const { status, body } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'hello', tags: ['a', 'b', 'c', 'd', 'e', 'f'] },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.tags).toBeDefined();
  });

  it('returns 422 when a tag name exceeds 30 characters', async () => {
    const { status, body } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'hello', tags: ['a'.repeat(31)] },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.tags).toBeDefined();
  });

  it('normalises tag names to lowercase and trimmed', async () => {
    const { status, body } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'hello', tags: ['  Work  ', 'IDEAS'] },
    });

    expect(status).toBe(201);
    const names = body.data.tags.map((t) => t.name);
    expect(names).toContain('work');
    expect(names).toContain('ideas');
    expect(names).not.toContain('Work');
  });

  it('accepts exactly 25,000 character content without error', async () => {
    const { status } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'x'.repeat(25_000) },
    });

    expect(status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// GET /api/notes
// ---------------------------------------------------------------------------

describe('GET /api/notes', () => {
  beforeEach(async () => {
    await request('/api/notes', { method: 'POST', body: { content: 'Note A' } });
    await request('/api/notes', { method: 'POST', body: { content: 'Note B' } });
  });

  it('returns 200 with all notes and a count in meta', async () => {
    const { status, body } = await request('/api/notes');

    expect(status).toBe(200);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.meta.count).toBe(2);
  });

  it('each note in the list includes a tags array', async () => {
    const { body } = await request('/api/notes');

    for (const note of body.data) {
      expect(Array.isArray(note.tags)).toBe(true);
    }
  });

  it('returns an empty array when no notes exist', async () => {
    getDb().prepare('DELETE FROM notes').run();
    const { status, body } = await request('/api/notes');

    expect(status).toBe(200);
    expect(body.data.length).toBe(0);
    expect(body.meta.count).toBe(0);
  });

  it('accepts ?sort=title_asc without error', async () => {
    const { status, body } = await request('/api/notes?sort=title_asc');

    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/notes/:id
// ---------------------------------------------------------------------------

describe('GET /api/notes/:id', () => {
  it('returns 200 with the note and its tags when found', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Searchable note', tags: ['test'] },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/notes/${id}`);

    expect(status).toBe(200);
    expect(body.data.id).toBe(id);
    expect(body.data.content).toBe('Searchable note');
    expect(body.data.tags.map((t) => t.name)).toContain('test');
    expect(body.error).toBeNull();
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/notes/999999');

    expect(status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-integer id', async () => {
    const { status, body } = await request('/api/notes/abc');

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/notes/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/notes/:id', () => {
  it('updates content and returns 200 with the updated note', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Original content' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/notes/${id}`, {
      method: 'PATCH',
      body: { content: 'Updated content' },
    });

    expect(status).toBe(200);
    expect(body.data.content).toBe('Updated content');
    expect(body.error).toBeNull();
  });

  it('replaces the tag set when tags are provided', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Tagged note', tags: ['old-tag'] },
    });
    const id = created.data.id;

    const { body } = await request(`/api/notes/${id}`, {
      method: 'PATCH',
      body: { tags: ['new-tag'] },
    });

    const names = body.data.tags.map((t) => t.name);
    expect(names).toContain('new-tag');
    expect(names).not.toContain('old-tag');
  });

  it('preserves tags when tags field is absent from the patch body', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Persistent tags', tags: ['keep-me'] },
    });
    const id = created.data.id;

    const { body } = await request(`/api/notes/${id}`, {
      method: 'PATCH',
      body: { content: 'New content only' },
    });

    expect(body.data.tags.map((t) => t.name)).toContain('keep-me');
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/notes/999999', {
      method: 'PATCH',
      body: { content: 'Nobody home' },
    });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 when content exceeds 25,000 characters', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Short' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/notes/${id}`, {
      method: 'PATCH',
      body: { content: 'x'.repeat(25_001) },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.content).toBeDefined();
  });

  it('returns 422 when patch tags array exceeds 5 items', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Short' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/notes/${id}`, {
      method: 'PATCH',
      body: { tags: ['a', 'b', 'c', 'd', 'e', 'f'] },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.tags).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/notes/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/notes/:id', () => {
  it('deletes the note and returns 200 with { deleted: true }', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'To be deleted' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/notes/${id}`, { method: 'DELETE' });

    expect(status).toBe(200);
    expect(body.data).toEqual({ deleted: true });
    expect(body.error).toBeNull();
  });

  it('confirms the note is gone after deletion', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Ephemeral' },
    });
    const id = created.data.id;

    await request(`/api/notes/${id}`, { method: 'DELETE' });

    const { status } = await request(`/api/notes/${id}`);
    expect(status).toBe(404);
  });

  it('cleans up orphaned tags after deletion', async () => {
    const { body: created } = await request('/api/notes', {
      method: 'POST',
      body: { content: 'Tagged note', tags: ['orphan-tag'] },
    });
    const id = created.data.id;

    await request(`/api/notes/${id}`, { method: 'DELETE' });

    const db = getDb();
    const tag = db.prepare("SELECT id FROM tags WHERE name = 'orphan-tag'").get();
    expect(tag).toBeUndefined();
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/notes/999999', { method: 'DELETE' });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-integer id', async () => {
    const { status, body } = await request('/api/notes/abc', { method: 'DELETE' });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// GET /api/tags
// ---------------------------------------------------------------------------

describe('GET /api/tags', () => {
  it('returns 200 with an empty array when no tags exist', async () => {
    const { status, body } = await request('/api/tags');

    expect(status).toBe(200);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
    expect(body.meta.count).toBe(0);
  });

  it('returns all tags sorted by name after notes with tags are created', async () => {
    await request('/api/notes', {
      method: 'POST',
      body: { content: 'Note with tags', tags: ['zebra', 'alpha'] },
    });

    const { status, body } = await request('/api/tags');

    expect(status).toBe(200);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.count).toBe(2);

    const names = body.data.map((t) => t.name);
    expect(names).toContain('alpha');
    expect(names).toContain('zebra');
    // Tags are sorted by name ascending — alpha comes before zebra.
    expect(names.indexOf('alpha')).toBeLessThan(names.indexOf('zebra'));
  });
});
