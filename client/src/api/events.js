/**
 * Frontend API client for the /api/events resource.
 * Thin wrapper around fetch that converts snake_case API fields to camelCase
 * and camelCase inputs back to snake_case before sending.
 * The GET /api/events endpoint returns a merged array of events and tasks;
 * each item is routed through the appropriate converter based on its `kind` field.
 * Throws an Error with a descriptive message on any non-2xx response.
 * @module api/events
 */

/** @type {string} Base path for the events API. */
const BASE_URL = '/api/events';

/**
 * Convert a snake_case event object from the API into a camelCase object
 * for use in the frontend.
 * @param {object} event - Raw event object from the API response.
 * @returns {object} Event object with camelCase keys.
 */
function toCamelEvent(event) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    color: event.color,
    allDay: event.all_day,
    startAt: event.start_at,
    endAt: event.end_at,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

/**
 * Convert a snake_case task chip object from the API into a camelCase object
 * for use in the calendar view. Adds `kind: 'task'` to distinguish it from events.
 * @param {object} task - Raw task chip object from the API response.
 * @returns {object} Task chip object with camelCase keys and `kind` set to `'task'`.
 */
function toCamelTask(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    dueTime: task.due_time,
    isPinned: task.is_pinned,
    kind: 'task',
  };
}

/**
 * Convert a camelCase event input object into a snake_case object
 * suitable for sending to the API. Only includes keys that are defined
 * in the input to support partial PATCH requests.
 * @param {object} event - Event data with camelCase keys.
 * @returns {object} Event object with snake_case keys (only defined keys included).
 */
function toSnakeEvent(event) {
  const result = {};
  if (event.title !== undefined) result.title = event.title;
  if (event.description !== undefined) result.description = event.description;
  if (event.location !== undefined) result.location = event.location;
  if (event.color !== undefined) result.color = event.color;
  if (event.allDay !== undefined) result.all_day = event.allDay;
  if (event.startAt !== undefined) result.start_at = event.startAt;
  if (event.endAt !== undefined) result.end_at = event.endAt;
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
 * Fetch all events (and task chips) within a date range.
 * Returns a merged array where each item is converted through the appropriate
 * mapper based on its `kind` field (`'event'` or `'task'`).
 * @param {{ start: string, end: string }} params - ISO date strings for the range boundaries.
 * @returns {Promise<object[]>} Array of camelCase event and task chip objects.
 */
export async function getEvents({ start, end } = {}) {
  const query = new URLSearchParams();
  if (start) query.set('start', start);
  if (end) query.set('end', end);
  const qs = query.toString();
  const data = await apiFetch(`${BASE_URL}${qs ? `?${qs}` : ''}`);
  return data.map((item) => (item.kind === 'task' ? toCamelTask(item) : toCamelEvent(item)));
}

/**
 * Fetch a single event by its ID.
 * @param {number} id - The event ID.
 * @returns {Promise<object>} A camelCase event object.
 */
export async function getEvent(id) {
  const data = await apiFetch(`${BASE_URL}/${id}`);
  return toCamelEvent(data);
}

/**
 * Create a new calendar event.
 * @param {object} event - Event data with camelCase keys (title and startAt required).
 * @returns {Promise<object>} The newly created camelCase event object.
 */
export async function createEvent(event) {
  const data = await apiFetch(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(toSnakeEvent(event)),
  });
  return toCamelEvent(data);
}

/**
 * Partially update an existing calendar event.
 * @param {number} id - The event ID to update.
 * @param {object} event - Partial event data with camelCase keys.
 * @returns {Promise<object>} The updated camelCase event object.
 */
export async function updateEvent(id, event) {
  const data = await apiFetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toSnakeEvent(event)),
  });
  return toCamelEvent(data);
}

/**
 * Delete a calendar event by its ID.
 * @param {number} id - The event ID to delete.
 * @returns {Promise<{ deleted: boolean }>} Confirmation object.
 */
export async function deleteEvent(id) {
  const data = await apiFetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  return data;
}
