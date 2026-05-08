/**
 * Frontend API client for the /api/tasks resource.
 * Thin wrapper around fetch that converts snake_case API fields to camelCase
 * and camelCase inputs back to snake_case before sending.
 * Throws an Error with a descriptive message on any non-2xx response.
 * @module api/tasks
 */

/** @type {string} Base path for the tasks API. */
const BASE_URL = '/api/tasks';

/**
 * Convert a snake_case task object from the API into a camelCase object
 * for use in the frontend.
 * @param {object} task - Raw task object from the API response.
 * @returns {object} Task object with camelCase keys.
 */
function toCamel(task) {
  return {
    id: task.id,
    title: task.title,
    body: task.body,
    bodyPreview: task.body_preview,
    dueDate: task.due_date,
    dueTime: task.due_time,
    priority: task.priority,
    status: task.status,
    tags: task.tags,
    isPinned: task.is_pinned,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

/**
 * Convert an array of tag values into an array of name strings.
 * Accepts either `{ id, name }` objects or plain strings.
 * @param {Array<{id: number, name: string}|string>} tags - Array of tag values.
 * @returns {string[]} Array of tag name strings.
 */
function tagsToPayload(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => (typeof t === 'string' ? t : t.name));
}

/**
 * Convert a camelCase task input object into a snake_case object
 * suitable for sending to the API.
 * @param {object} task - Task data with camelCase keys.
 * @returns {object} Task object with snake_case keys.
 */
function toSnake(task) {
  const result = {};
  if (task.title !== undefined) result.title = task.title;
  if (task.body !== undefined) result.body = task.body;
  if (task.dueDate !== undefined) result.due_date = task.dueDate;
  if (task.dueTime !== undefined) result.due_time = task.dueTime;
  if (task.priority !== undefined) result.priority = task.priority;
  if (task.status !== undefined) result.status = task.status;
  if (task.isPinned !== undefined) result.is_pinned = task.isPinned;
  if (task.tags !== undefined) result.tags = tagsToPayload(task.tags);
  return result;
}

/**
 * Perform a fetch request and parse the JSON response envelope.
 * Throws an Error if the HTTP status is not in the 2xx range.
 * @param {string} url - The full URL to request.
 * @param {RequestInit} [init={}] - Fetch init options (method, headers, body, etc.).
 * @returns {Promise<object>} The parsed `data` field from the API envelope.
 */
async function apiFetch(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const envelope = await response.json();

  if (!response.ok) {
    const code = envelope?.error?.code ?? 'UNKNOWN_ERROR';
    throw new Error(`API error ${response.status}: ${code}`);
  }

  return envelope.data;
}

/**
 * Fetch all tasks, optionally filtered and sorted.
 * @param {{ sort?: string, status?: string, priority?: string }} [params={}] - Optional query parameters.
 * @returns {Promise<object[]>} Array of camelCase task objects.
 */
export async function getTasks({ sort, status, priority } = {}) {
  const query = new URLSearchParams();
  if (sort) query.set('sort', sort);
  if (status) query.set('status', status);
  if (priority) query.set('priority', priority);
  const qs = query.toString();
  const data = await apiFetch(`${BASE_URL}${qs ? `?${qs}` : ''}`);
  return data.map(toCamel);
}

/**
 * Fetch a single task by its ID.
 * @param {number} id - The task ID.
 * @returns {Promise<object>} A camelCase task object.
 */
export async function getTask(id) {
  const data = await apiFetch(`${BASE_URL}/${id}`);
  return toCamel(data);
}

/**
 * Create a new task.
 * @param {object} task - Task data with camelCase keys (title required).
 * @returns {Promise<object>} The newly created camelCase task object.
 */
export async function createTask(task) {
  const data = await apiFetch(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(toSnake(task)),
  });
  return toCamel(data);
}

/**
 * Partially update an existing task.
 * @param {number} id - The task ID to update.
 * @param {object} task - Partial task data with camelCase keys.
 * @returns {Promise<object>} The updated camelCase task object.
 */
export async function updateTask(id, task) {
  const data = await apiFetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toSnake(task)),
  });
  return toCamel(data);
}

/**
 * Delete a task by its ID.
 * @param {number} id - The task ID to delete.
 * @returns {Promise<{ deleted: boolean }>} Confirmation object.
 */
export async function deleteTask(id) {
  const data = await apiFetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  return data;
}
