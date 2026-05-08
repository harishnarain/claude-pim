/**
 * Frontend API client for the /api/task-tags resource.
 * Thin wrapper around fetch that returns task tag objects as-is from the API.
 * Throws an Error with a descriptive message on any non-2xx response.
 * @module api/task-tags
 */

/** @type {string} Base path for the task-tags API. */
const BASE_URL = '/api/task-tags';

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
 * Fetch all task tags from the vocabulary table.
 * @returns {Promise<Array<{id: number, name: string}>>} Array of task tag objects.
 */
export async function getTaskTags() {
  const data = await apiFetch(BASE_URL);
  return data;
}
