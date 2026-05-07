/**
 * Unit tests for client/src/api/notes.js and client/src/api/tags.js.
 * Verifies that each function issues the correct HTTP method, URL, headers,
 * and body, and that snake_case fields from the API are converted to camelCase.
 * Also verifies that tagsToPayload correctly handles both tag object and string
 * input forms when sending notes to the API.
 * Uses a mocked global.fetch to avoid real network requests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from '../../client/src/api/notes.js';
import { getTags } from '../../client/src/api/tags.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake snake_case note as the API would return it.
 * @param {Partial<object>} overrides - Field overrides.
 * @returns {object} A snake_case note object.
 */
function makeApiNote(overrides = {}) {
  return {
    id: 1,
    title: 'My First Note',
    preview: 'This is a preview...',
    tags: [{ id: 1, name: 'work' }],
    is_pinned: 0,
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
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
// getNotes
// ---------------------------------------------------------------------------

describe('getNotes', () => {
  it('sends GET /api/notes and returns camelCase notes', async () => {
    const apiNote = makeApiNote();
    global.fetch = mockFetchOk([apiNote]);

    const result = await getNotes();

    expect(global.fetch).toHaveBeenCalledOnce();
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/notes');
    expect(init.method).toBeUndefined(); // default GET — no explicit method required

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      title: 'My First Note',
      preview: 'This is a preview...',
      tags: [{ id: 1, name: 'work' }],
      isPinned: 0,
      createdAt: '2026-05-01T10:00:00Z',
      updatedAt: '2026-05-01T10:00:00Z',
    });
  });

  it('appends ?sort= query param when sort is provided', async () => {
    global.fetch = mockFetchOk([]);

    await getNotes({ sort: 'updated_at' });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/notes?sort=updated_at');
  });

  it('sends Content-Type: application/json header', async () => {
    global.fetch = mockFetchOk([]);

    await getNotes();

    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('maps is_pinned to isPinned on each note', async () => {
    const pinnedNote = makeApiNote({ is_pinned: 1 });
    global.fetch = mockFetchOk([pinnedNote]);

    const result = await getNotes();

    expect(result[0].isPinned).toBe(1);
    expect(result[0].is_pinned).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getNote
// ---------------------------------------------------------------------------

describe('getNote', () => {
  it('sends GET /api/notes/:id and returns a camelCase note', async () => {
    const apiNote = makeApiNote({ id: 7 });
    global.fetch = mockFetchOk(apiNote);

    const result = await getNote(7);

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/notes/7');
    expect(result.id).toBe(7);
    expect(result.title).toBe('My First Note');
    expect(result.isPinned).toBe(0);
    expect(result.createdAt).toBe('2026-05-01T10:00:00Z');
  });

  it('throws an Error on 404 with NOT_FOUND message', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(getNote(999)).rejects.toThrow('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// createNote
// ---------------------------------------------------------------------------

describe('createNote', () => {
  it('sends POST /api/notes with snake_case body and returns camelCase note', async () => {
    const apiNote = makeApiNote({ id: 2 });
    global.fetch = mockFetchOk(apiNote, 201);

    const result = await createNote({
      title: 'My First Note',
      content: 'Full content here.',
      isPinned: false,
      tags: [{ id: 1, name: 'work' }],
    });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/notes');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');

    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({
      title: 'My First Note',
      content: 'Full content here.',
      is_pinned: false,
      tags: ['work'],
    });

    expect(result.id).toBe(2);
    expect(result.title).toBe('My First Note');
    expect(result.isPinned).toBe(0);
  });

  it('converts tag objects { id, name } to array of name strings in request body', async () => {
    global.fetch = mockFetchOk(makeApiNote(), 201);

    await createNote({
      title: 'Tagged Note',
      content: 'Some content.',
      tags: [{ id: 1, name: 'work' }, { id: 2, name: 'personal' }],
    });

    const [, init] = global.fetch.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody.tags).toEqual(['work', 'personal']);
  });

  it('converts plain string tags to array of name strings in request body', async () => {
    global.fetch = mockFetchOk(makeApiNote(), 201);

    await createNote({
      title: 'Tagged Note',
      content: 'Some content.',
      tags: ['work', 'personal'],
    });

    const [, init] = global.fetch.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody.tags).toEqual(['work', 'personal']);
  });

  it('throws an Error on 422 VALIDATION_ERROR', async () => {
    global.fetch = mockFetchError(422, 'VALIDATION_ERROR');

    await expect(createNote({ title: '' })).rejects.toThrow(
      'API error 422: VALIDATION_ERROR'
    );
  });
});

// ---------------------------------------------------------------------------
// updateNote
// ---------------------------------------------------------------------------

describe('updateNote', () => {
  it('sends PATCH /api/notes/:id with snake_case body and returns camelCase note', async () => {
    const apiNote = makeApiNote({ is_pinned: 1 });
    global.fetch = mockFetchOk(apiNote);

    const result = await updateNote(1, { isPinned: true });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/notes/1');
    expect(init.method).toBe('PATCH');
    expect(init.headers['Content-Type']).toBe('application/json');

    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({ is_pinned: true });

    expect(result.isPinned).toBe(1);
  });

  it('converts all updatable camelCase fields to snake_case in request body', async () => {
    const apiNote = makeApiNote();
    global.fetch = mockFetchOk(apiNote);

    await updateNote(1, {
      title: 'Updated Title',
      content: 'Updated content.',
      isPinned: true,
      tags: [{ id: 2, name: 'personal' }],
    });

    const [, init] = global.fetch.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({
      title: 'Updated Title',
      content: 'Updated content.',
      is_pinned: true,
      tags: ['personal'],
    });
  });

  it('throws an Error on 404 NOT_FOUND', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(updateNote(999, { title: 'Ghost' })).rejects.toThrow(
      'API error 404: NOT_FOUND'
    );
  });
});

// ---------------------------------------------------------------------------
// deleteNote
// ---------------------------------------------------------------------------

describe('deleteNote', () => {
  it('sends DELETE /api/notes/:id and returns { deleted: true }', async () => {
    global.fetch = mockFetchOk({ deleted: true });

    const result = await deleteNote(5);

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/notes/5');
    expect(init.method).toBe('DELETE');

    expect(result).toEqual({ deleted: true });
  });

  it('throws an Error on 404 NOT_FOUND', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(deleteNote(999)).rejects.toThrow('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// getTags
// ---------------------------------------------------------------------------

describe('getTags', () => {
  it('sends GET /api/tags and returns array of tag objects as-is', async () => {
    const apiTags = [{ id: 1, name: 'work' }, { id: 2, name: 'personal' }];
    global.fetch = mockFetchOk(apiTags);

    const result = await getTags();

    expect(global.fetch).toHaveBeenCalledOnce();
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tags');
    expect(init.method).toBeUndefined(); // default GET

    expect(result).toEqual([
      { id: 1, name: 'work' },
      { id: 2, name: 'personal' },
    ]);
  });

  it('sends Content-Type: application/json header', async () => {
    global.fetch = mockFetchOk([]);

    await getTags();

    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('throws an Error on non-2xx response', async () => {
    global.fetch = mockFetchError(500, 'INTERNAL_SERVER_ERROR');

    await expect(getTags()).rejects.toThrow('API error 500: INTERNAL_SERVER_ERROR');
  });
});
