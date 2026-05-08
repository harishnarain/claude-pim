/**
 * Unit tests for client/src/api/tasks.js and client/src/api/task-tags.js.
 * Verifies that each function issues the correct HTTP method, URL, headers,
 * and body, and that snake_case fields from the API are converted to camelCase.
 * Also verifies that tagsToPayload correctly handles both tag object and string
 * input forms when sending tasks to the API.
 * Uses a mocked global.fetch to avoid real network requests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from '../../client/src/api/tasks.js';
import { getTaskTags } from '../../client/src/api/task-tags.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake snake_case task as the API would return it in a list response.
 * Uses body_preview instead of body to match the list endpoint shape.
 * @param {Partial<object>} overrides - Field overrides.
 * @returns {object} A snake_case task object.
 */
function makeApiTask(overrides = {}) {
  return {
    id: 1,
    title: 'Write design doc',
    body_preview: 'Cover data model, API...',
    due_date: '2026-05-12',
    priority: 'High',
    status: 'In Progress',
    is_pinned: 0,
    tags: [{ id: 2, name: 'work' }],
    created_at: '2026-05-07T10:00:00Z',
    updated_at: '2026-05-07T11:30:00Z',
    ...overrides,
  };
}

/**
 * Build a fake snake_case task as the API would return it in a detail response.
 * Includes full body instead of body_preview.
 * @param {Partial<object>} overrides - Field overrides.
 * @returns {object} A snake_case task object with full body.
 */
function makeApiTaskDetail(overrides = {}) {
  return {
    id: 1,
    title: 'Write design doc',
    body: 'Cover data model, API, components, state, error handling, and security.',
    due_date: '2026-05-12',
    priority: 'High',
    status: 'In Progress',
    is_pinned: 0,
    tags: [{ id: 2, name: 'work' }],
    created_at: '2026-05-07T10:00:00Z',
    updated_at: '2026-05-07T11:30:00Z',
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
// getTasks
// ---------------------------------------------------------------------------

describe('getTasks', () => {
  it('sends GET /api/tasks and returns camelCase tasks', async () => {
    const apiTask = makeApiTask();
    global.fetch = mockFetchOk([apiTask]);

    const result = await getTasks();

    expect(global.fetch).toHaveBeenCalledOnce();
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tasks');
    expect(init.method).toBeUndefined(); // default GET — no explicit method required

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      title: 'Write design doc',
      body: undefined,
      bodyPreview: 'Cover data model, API...',
      dueDate: '2026-05-12',
      priority: 'High',
      status: 'In Progress',
      isPinned: 0,
      tags: [{ id: 2, name: 'work' }],
      createdAt: '2026-05-07T10:00:00Z',
      updatedAt: '2026-05-07T11:30:00Z',
    });
  });

  it('sends Content-Type: application/json header', async () => {
    global.fetch = mockFetchOk([]);

    await getTasks();

    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('maps is_pinned to isPinned on each task', async () => {
    const pinnedTask = makeApiTask({ is_pinned: 1 });
    global.fetch = mockFetchOk([pinnedTask]);

    const result = await getTasks();

    expect(result[0].isPinned).toBe(1);
    expect(result[0].is_pinned).toBeUndefined();
  });

  it('maps due_date to dueDate on each task', async () => {
    const apiTask = makeApiTask({ due_date: '2026-06-01' });
    global.fetch = mockFetchOk([apiTask]);

    const result = await getTasks();

    expect(result[0].dueDate).toBe('2026-06-01');
    expect(result[0].due_date).toBeUndefined();
  });

  it('appends ?sort= query param when sort is provided', async () => {
    global.fetch = mockFetchOk([]);

    await getTasks({ sort: 'due_asc' });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tasks?sort=due_asc');
  });

  it('appends ?status= query param when status is provided', async () => {
    global.fetch = mockFetchOk([]);

    await getTasks({ status: 'In Progress' });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tasks?status=In+Progress');
  });

  it('appends ?priority= query param when priority is provided', async () => {
    global.fetch = mockFetchOk([]);

    await getTasks({ priority: 'High' });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tasks?priority=High');
  });

  it('appends all three query params when all are provided', async () => {
    global.fetch = mockFetchOk([]);

    await getTasks({ sort: 'updated_desc', status: 'Not Started', priority: 'Medium' });

    const [url] = global.fetch.mock.calls[0];
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.searchParams.get('sort')).toBe('updated_desc');
    expect(parsed.searchParams.get('status')).toBe('Not Started');
    expect(parsed.searchParams.get('priority')).toBe('Medium');
  });
});

// ---------------------------------------------------------------------------
// getTask
// ---------------------------------------------------------------------------

describe('getTask', () => {
  it('sends GET /api/tasks/:id and returns a camelCase task', async () => {
    const apiTask = makeApiTaskDetail({ id: 7 });
    global.fetch = mockFetchOk(apiTask);

    const result = await getTask(7);

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tasks/7');
    expect(result.id).toBe(7);
    expect(result.title).toBe('Write design doc');
    expect(result.isPinned).toBe(0);
    expect(result.dueDate).toBe('2026-05-12');
    expect(result.createdAt).toBe('2026-05-07T10:00:00Z');
    expect(result.updatedAt).toBe('2026-05-07T11:30:00Z');
  });

  it('throws an Error on 404 with NOT_FOUND message', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(getTask(999)).rejects.toThrow('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

describe('createTask', () => {
  it('sends POST /api/tasks with snake_case body and returns camelCase task', async () => {
    const apiTask = makeApiTaskDetail({ id: 2 });
    global.fetch = mockFetchOk(apiTask, 201);

    const result = await createTask({
      title: 'Write design doc',
      body: 'Cover all sections.',
      dueDate: '2026-05-12',
      priority: 'High',
      status: 'Not Started',
      isPinned: false,
      tags: [{ id: 1, name: 'work' }],
    });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tasks');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');

    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({
      title: 'Write design doc',
      body: 'Cover all sections.',
      due_date: '2026-05-12',
      priority: 'High',
      status: 'Not Started',
      is_pinned: false,
      tags: ['work'],
    });

    expect(result.id).toBe(2);
    expect(result.title).toBe('Write design doc');
    expect(result.isPinned).toBe(0);
    expect(result.dueDate).toBe('2026-05-12');
  });

  it('converts tag objects { id, name } to array of name strings in request body', async () => {
    global.fetch = mockFetchOk(makeApiTaskDetail(), 201);

    await createTask({
      title: 'Tagged Task',
      tags: [{ id: 1, name: 'work' }, { id: 2, name: 'personal' }],
    });

    const [, init] = global.fetch.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody.tags).toEqual(['work', 'personal']);
  });

  it('converts plain string tags to array of name strings in request body', async () => {
    global.fetch = mockFetchOk(makeApiTaskDetail(), 201);

    await createTask({
      title: 'Tagged Task',
      tags: ['work', 'personal'],
    });

    const [, init] = global.fetch.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody.tags).toEqual(['work', 'personal']);
  });

  it('throws an Error on 422 VALIDATION_ERROR', async () => {
    global.fetch = mockFetchError(422, 'VALIDATION_ERROR');

    await expect(createTask({ title: '' })).rejects.toThrow(
      'API error 422: VALIDATION_ERROR'
    );
  });
});

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

describe('updateTask', () => {
  it('sends PATCH /api/tasks/:id with snake_case body and returns camelCase task', async () => {
    const apiTask = makeApiTaskDetail({ is_pinned: 1 });
    global.fetch = mockFetchOk(apiTask);

    const result = await updateTask(1, { isPinned: true });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tasks/1');
    expect(init.method).toBe('PATCH');
    expect(init.headers['Content-Type']).toBe('application/json');

    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({ is_pinned: true });

    expect(result.isPinned).toBe(1);
  });

  it('converts all updatable camelCase fields to snake_case in request body', async () => {
    const apiTask = makeApiTaskDetail();
    global.fetch = mockFetchOk(apiTask);

    await updateTask(1, {
      title: 'Updated Task',
      body: 'Updated body.',
      dueDate: '2026-06-01',
      priority: 'Medium',
      status: 'Completed',
      isPinned: false,
      tags: [{ id: 2, name: 'personal' }],
    });

    const [, init] = global.fetch.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody).toEqual({
      title: 'Updated Task',
      body: 'Updated body.',
      due_date: '2026-06-01',
      priority: 'Medium',
      status: 'Completed',
      is_pinned: false,
      tags: ['personal'],
    });
  });

  it('throws an Error on 404 NOT_FOUND', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(updateTask(999, { title: 'Ghost' })).rejects.toThrow(
      'API error 404: NOT_FOUND'
    );
  });
});

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

describe('deleteTask', () => {
  it('sends DELETE /api/tasks/:id and returns { deleted: true }', async () => {
    global.fetch = mockFetchOk({ deleted: true });

    const result = await deleteTask(5);

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/tasks/5');
    expect(init.method).toBe('DELETE');

    expect(result).toEqual({ deleted: true });
  });

  it('throws an Error on 404 NOT_FOUND', async () => {
    global.fetch = mockFetchError(404, 'NOT_FOUND');

    await expect(deleteTask(999)).rejects.toThrow('API error 404: NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// getTaskTags
// ---------------------------------------------------------------------------

describe('getTaskTags', () => {
  it('sends GET /api/task-tags and returns array of tag objects as-is', async () => {
    const apiTags = [{ id: 1, name: 'admin' }, { id: 2, name: 'work' }];
    global.fetch = mockFetchOk(apiTags);

    const result = await getTaskTags();

    expect(global.fetch).toHaveBeenCalledOnce();
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/task-tags');
    expect(init.method).toBeUndefined(); // default GET

    expect(result).toEqual([
      { id: 1, name: 'admin' },
      { id: 2, name: 'work' },
    ]);
  });

  it('sends Content-Type: application/json header', async () => {
    global.fetch = mockFetchOk([]);

    await getTaskTags();

    const [, init] = global.fetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('throws an Error on non-2xx response', async () => {
    global.fetch = mockFetchError(500, 'INTERNAL_SERVER_ERROR');

    await expect(getTaskTags()).rejects.toThrow('API error 500: INTERNAL_SERVER_ERROR');
  });
});
