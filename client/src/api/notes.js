/**
 * Frontend API client for the /api/notes resource.
 * Thin wrapper around fetch that converts snake_case API fields to camelCase
 * and camelCase inputs back to snake_case before sending.
 * Throws an Error with a descriptive message on any non-2xx response.
 * @module api/notes
 */

/** @type {string} Base path for the notes API. */
const BASE_URL = '/api/notes';

/**
 * Convert a snake_case note object from the API into a camelCase object
 * for use in the frontend.
 * @param {object} note - Raw note object from the API response.
 * @returns {object} Note object with camelCase keys.
 */
function toCamel(note) {
  return {
    id: note.id,
    title: note.title,
    preview: note.preview,
    tags: note.tags,
    isPinned: note.is_pinned,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
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
 * Convert a camelCase note input object into a snake_case object
 * suitable for sending to the API.
 * @param {object} note - Note data with camelCase keys.
 * @returns {object} Note object with snake_case keys.
 */
function toSnake(note) {
  const result = {};
  if (note.title !== undefined) result.title = note.title;
  if (note.content !== undefined) result.content = note.content;
  if (note.isPinned !== undefined) result.is_pinned = note.isPinned;
  if (note.tags !== undefined) result.tags = tagsToPayload(note.tags);
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
 * Fetch all notes, optionally sorted by a given field.
 * @param {{ sort?: string }} [params={}] - Optional query parameters.
 * @returns {Promise<object[]>} Array of camelCase note objects.
 */
export async function getNotes({ sort } = {}) {
  const data = await apiFetch(`${BASE_URL}${sort ? `?sort=${encodeURIComponent(sort)}` : ''}`);
  return data.map(toCamel);
}

/**
 * Fetch a single note by its ID.
 * @param {number} id - The note ID.
 * @returns {Promise<object>} A camelCase note object.
 */
export async function getNote(id) {
  const data = await apiFetch(`${BASE_URL}/${id}`);
  return toCamel(data);
}

/**
 * Create a new note.
 * @param {object} note - Note data with camelCase keys (title required).
 * @returns {Promise<object>} The newly created camelCase note object.
 */
export async function createNote(note) {
  const data = await apiFetch(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(toSnake(note)),
  });
  return toCamel(data);
}

/**
 * Partially update an existing note.
 * @param {number} id - The note ID to update.
 * @param {object} note - Partial note data with camelCase keys.
 * @returns {Promise<object>} The updated camelCase note object.
 */
export async function updateNote(id, note) {
  const data = await apiFetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toSnake(note)),
  });
  return toCamel(data);
}

/**
 * Delete a note by its ID.
 * @param {number} id - The note ID to delete.
 * @returns {Promise<{ deleted: boolean }>} Confirmation object.
 */
export async function deleteNote(id) {
  const data = await apiFetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  return data;
}
