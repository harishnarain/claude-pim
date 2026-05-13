/**
 * Frontend API client for the /api/search resource.
 * Thin wrapper around fetch that uses the standard { data, error, meta } envelope.
 * Throws an Error with a descriptive message on any non-2xx response.
 * @module api/search
 */

/** @type {string} Base path for the search API. */
const BASE_URL = '/api/search';

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
 * Search across all PIM modules (contacts, notes, tasks, events).
 * Sends a GET request to /api/search with the query string and pagination params.
 * Returns the ranked, paginated results along with the total match count.
 * @param {{ q: string, limit?: number, offset?: number }} params - Search parameters.
 * @param {string} params.q - The raw search query string.
 * @param {number} [params.limit=10] - Maximum number of results to return (capped at 50 server-side).
 * @param {number} [params.offset=0] - Number of results to skip for pagination.
 * @returns {Promise<{ results: object[], total: number }>} Ranked search results and total count.
 */
export async function search({ q, limit = 10, offset = 0 } = {}) {
  const query = new URLSearchParams();
  if (q !== undefined) query.set('q', q);
  query.set('limit', String(limit));
  query.set('offset', String(offset));
  const data = await apiFetch(`${BASE_URL}?${query.toString()}`);
  return { results: data.results, total: data.total };
}
