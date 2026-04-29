/**
 * Integration tests for the /api/contacts REST endpoints.
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
 * Apply migrations so the contacts table exists.
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
 * Wipe the contacts table between tests to keep them isolated.
 */
beforeEach(() => {
  getDb().prepare('DELETE FROM contacts').run();
});

/**
 * Close the server and database after all tests finish.
 */
afterAll(async () => {
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
 * @param {string} path - URL path (e.g. '/api/contacts').
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
// POST /api/contacts
// ---------------------------------------------------------------------------

describe('POST /api/contacts', () => {
  it('creates a contact and returns 201 with the new record', async () => {
    const { status, body } = await request('/api/contacts', {
      method: 'POST',
      body: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        company: 'Analytical Engine Co.',
      },
    });

    expect(status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engine Co.',
    });
    expect(body.data.id).toBeTypeOf('number');
  });

  it('returns 422 when first_name is missing', async () => {
    const { status, body } = await request('/api/contacts', {
      method: 'POST',
      body: { last_name: 'Lovelace' },
    });

    expect(status).toBe(422);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.first_name).toBeDefined();
  });

  it('returns 422 when last_name is missing', async () => {
    const { status, body } = await request('/api/contacts', {
      method: 'POST',
      body: { first_name: 'Ada' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.last_name).toBeDefined();
  });

  it('returns 422 when email format is invalid', async () => {
    const { status, body } = await request('/api/contacts', {
      method: 'POST',
      body: { first_name: 'Ada', last_name: 'Lovelace', email: 'not-an-email' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.email).toBeDefined();
  });

  it('accepts a contact without optional fields', async () => {
    const { status, body } = await request('/api/contacts', {
      method: 'POST',
      body: { first_name: 'Alan', last_name: 'Turing' },
    });

    expect(status).toBe(201);
    expect(body.data.email).toBeNull();
    expect(body.data.phone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GET /api/contacts
// ---------------------------------------------------------------------------

describe('GET /api/contacts', () => {
  beforeEach(async () => {
    await request('/api/contacts', { method: 'POST', body: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' } });
    await request('/api/contacts', { method: 'POST', body: { first_name: 'Alan', last_name: 'Turing', email: 'turing@example.com' } });
  });

  it('returns 200 with all contacts and a count in meta', async () => {
    const { status, body } = await request('/api/contacts');

    expect(status).toBe(200);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.meta.count).toBe(2);
  });

  it('filters contacts when ?search= is provided', async () => {
    const { status, body } = await request('/api/contacts?search=Turing');

    expect(status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].last_name).toBe('Turing');
    expect(body.meta.count).toBe(1);
  });

  it('returns an empty array when search matches nothing', async () => {
    const { status, body } = await request('/api/contacts?search=nonexistent');

    expect(status).toBe(200);
    expect(body.data.length).toBe(0);
    expect(body.meta.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/contacts/:id
// ---------------------------------------------------------------------------

describe('GET /api/contacts/:id', () => {
  it('returns 200 with the contact when found', async () => {
    const { body: created } = await request('/api/contacts', {
      method: 'POST',
      body: { first_name: 'Grace', last_name: 'Hopper' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/contacts/${id}`);

    expect(status).toBe(200);
    expect(body.data.id).toBe(id);
    expect(body.data.last_name).toBe('Hopper');
    expect(body.error).toBeNull();
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/contacts/999999');

    expect(status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/contacts/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/contacts/:id', () => {
  it('updates specified fields and returns 200 with the updated contact', async () => {
    const { body: created } = await request('/api/contacts', {
      method: 'POST',
      body: { first_name: 'Grace', last_name: 'Hopper', email: 'grace@example.com' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: { company: 'US Navy', email: 'hopper@navy.mil' },
    });

    expect(status).toBe(200);
    expect(body.data.company).toBe('US Navy');
    expect(body.data.email).toBe('hopper@navy.mil');
    expect(body.data.first_name).toBe('Grace');
    expect(body.error).toBeNull();
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/contacts/999999', {
      method: 'PATCH',
      body: { company: 'Nobody Inc.' },
    });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 422 when patching with an invalid email', async () => {
    const { body: created } = await request('/api/contacts', {
      method: 'POST',
      body: { first_name: 'Grace', last_name: 'Hopper' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: { email: 'not-an-email' },
    });

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields.email).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/contacts/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/contacts/:id', () => {
  it('deletes the contact and returns 200 with { deleted: true }', async () => {
    const { body: created } = await request('/api/contacts', {
      method: 'POST',
      body: { first_name: 'Charles', last_name: 'Babbage' },
    });
    const id = created.data.id;

    const { status, body } = await request(`/api/contacts/${id}`, { method: 'DELETE' });

    expect(status).toBe(200);
    expect(body.data).toEqual({ deleted: true });
    expect(body.error).toBeNull();
  });

  it('confirms the contact is gone after deletion', async () => {
    const { body: created } = await request('/api/contacts', {
      method: 'POST',
      body: { first_name: 'Charles', last_name: 'Babbage' },
    });
    const id = created.data.id;

    await request(`/api/contacts/${id}`, { method: 'DELETE' });

    const { status } = await request(`/api/contacts/${id}`);
    expect(status).toBe(404);
  });

  it('returns 404 for a non-existent id', async () => {
    const { status, body } = await request('/api/contacts/999999', { method: 'DELETE' });

    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
