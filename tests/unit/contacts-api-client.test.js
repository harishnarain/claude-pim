/**
 * Unit tests for client/src/api/contacts.js.
 * Verifies that each function issues the correct HTTP method, URL, headers,
 * and body, and that snake_case fields from the API are converted to camelCase.
 * Uses a mocked global.fetch to avoid real network requests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from '../../client/src/api/contacts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake snake_case contact as the API would return it.
 * @param {Partial<object>} overrides - Field overrides.
 * @returns {object} A snake_case contact object.
 */
function makeApiContact(overrides = {}) {
  return {
    id: 1,
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    phone: null,
    company: 'Analytical Engine Co.',
    notes: null,
    created_at: '2026-04-28T10:00:00Z',
    updated_at: '2026-04-28T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock fetch that resolves to a successful API envelope containing
 * the supplied data.
 * @param {unknown} data - The value to place in the `data` field.
 * @param {number} [status=200] - HTTP status code to simulate.
 * @returns {ReturnType<typeof vi.fn>} Vitest mock function.
 */
function mockFetchOk(data, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue({ data, error: null, meta: null }),
  });
}

/**
 * Create a mock fetch that simulates a non-2xx API error response.
 * @param {number} status - HTTP status code (e.g. 404, 422).
 * @param {string} code - Error code string from the API (e.g. 'NOT_FOUND').
 * @returns {ReturnType<typeof vi.fn>} Vitest mock function.
 */
function mockFetchError(status, code) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ data: null, error: { code }, meta: null }),
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getContacts
// ---------------------------------------------------------------------------

describe('getContacts', () => {
  it('sends GET /api/contacts and returns camelCase contacts', async () => {
    const apiContact = makeApiContact();
    global.fetch = mockFetchOk([apiContact]);

    const result = await getContacts();

    expect(global.fetch).toHaveBeenCalledOnce();
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/contacts');
    expect(init.method).toBeUndefined(); // default GET — no explicit method required

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: null,
      company: 'Analytical Engine Co.',
      notes: null,
      createdAt: '2026-04-28T10:00:00Z',
      updatedAt: '2026-04-28T10:00:00Z',
    });
  });

  it('appends ?search= query param when search is provided', async () => {
    global.fetch = mockFetchOk([]);

    await getContacts({ search: 'Turing' });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/contacts?search=Turing');
  });

  it('sends Content-Type: application/json header', async () => {
    global.fetch = mockFetchOk([]);

    await getContacts();

    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// getContact
// ---------------------------------------------------------------------------

describe('getContact', () => {
  it('sends GET /api/contacts/:id and returns a camelCase contact', async () => {
    const apiContact = makeApiContact({ id: 7 });
    global.fetch = mockFetchOk(apiContact);

    const result = await getContact(7);

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/contacts/7');
    expect(result.id).toBe(7);
    expect(result.firstName).toBe('Ada');
    expect(result.lastName).toBe('Lovelace');
    expect(result.createdAt).toBe('2026-04-28T10:00:00Z');
  });

  it('throws an Error on 404 with NOT_FOUND message', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(getContact(999)).rejects.toThrow('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// createContact
// ---------------------------------------------------------------------------

describe('createContact', () => {
  it('sends POST /api/contacts with snake_case body and returns camelCase contact', async () => {
    const apiContact = makeApiContact({ id: 2 });
    global.fetch = mockFetchOk(apiContact, 201);

    const result = await createContact({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engine Co.',
    });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/contacts');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');

    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engine Co.',
    });

    expect(result.id).toBe(2);
    expect(result.firstName).toBe('Ada');
    expect(result.lastName).toBe('Lovelace');
  });

  it('throws an Error on 422 VALIDATION_ERROR', async () => {
    global.fetch = mockFetchError(422, 'VALIDATION_ERROR');

    await expect(createContact({ firstName: 'Ada' })).rejects.toThrow(
      'API error 422: VALIDATION_ERROR'
    );
  });
});

// ---------------------------------------------------------------------------
// updateContact
// ---------------------------------------------------------------------------

describe('updateContact', () => {
  it('sends PATCH /api/contacts/:id with snake_case body and returns camelCase contact', async () => {
    const apiContact = makeApiContact({ company: 'US Navy' });
    global.fetch = mockFetchOk(apiContact);

    const result = await updateContact(1, { company: 'US Navy' });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/contacts/1');
    expect(init.method).toBe('PATCH');
    expect(init.headers['Content-Type']).toBe('application/json');

    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({ company: 'US Navy' });

    expect(result.company).toBe('US Navy');
    expect(result.firstName).toBe('Ada');
  });

  it('converts all updatable camelCase fields to snake_case in request body', async () => {
    const apiContact = makeApiContact();
    global.fetch = mockFetchOk(apiContact);

    await updateContact(1, {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      phone: '555-1234',
      company: 'US Navy',
      notes: 'Amazing compiler pioneer',
    });

    const [, init] = global.fetch.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({
      first_name: 'Grace',
      last_name: 'Hopper',
      email: 'grace@example.com',
      phone: '555-1234',
      company: 'US Navy',
      notes: 'Amazing compiler pioneer',
    });
  });

  it('throws an Error on 404 NOT_FOUND', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(updateContact(999, { company: 'Nobody' })).rejects.toThrow(
      'API error 404: NOT_FOUND'
    );
  });
});

// ---------------------------------------------------------------------------
// deleteContact
// ---------------------------------------------------------------------------

describe('deleteContact', () => {
  it('sends DELETE /api/contacts/:id and returns { deleted: true }', async () => {
    global.fetch = mockFetchOk({ deleted: true });

    const result = await deleteContact(5);

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/contacts/5');
    expect(init.method).toBe('DELETE');

    expect(result).toEqual({ deleted: true });
  });

  it('throws an Error on 404 NOT_FOUND', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(deleteContact(999)).rejects.toThrow('API error 404: NOT_FOUND');
  });
});
