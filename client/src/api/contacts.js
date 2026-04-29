/**
 * Frontend API client for the /api/contacts resource.
 * Thin wrapper around fetch that converts snake_case API fields to camelCase
 * and camelCase inputs back to snake_case before sending.
 * Throws an Error with a descriptive message on any non-2xx response.
 * @module api/contacts
 */

/** @type {string} Base path for the contacts API. */
const BASE_URL = '/api/contacts';

/**
 * Convert a snake_case contact object from the API into a camelCase object
 * for use in the frontend.
 * @param {object} contact - Raw contact object from the API response.
 * @returns {object} Contact object with camelCase keys.
 */
function toCamel(contact) {
  return {
    id: contact.id,
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    notes: contact.notes,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
  };
}

/**
 * Convert a camelCase contact input object into a snake_case object
 * suitable for sending to the API.
 * @param {object} contact - Contact data with camelCase keys.
 * @returns {object} Contact object with snake_case keys.
 */
function toSnake(contact) {
  const result = {};
  if (contact.firstName !== undefined) result.first_name = contact.firstName;
  if (contact.lastName !== undefined) result.last_name = contact.lastName;
  if (contact.email !== undefined) result.email = contact.email;
  if (contact.phone !== undefined) result.phone = contact.phone;
  if (contact.company !== undefined) result.company = contact.company;
  if (contact.notes !== undefined) result.notes = contact.notes;
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
 * Fetch all contacts, optionally filtered by a search query.
 * @param {{ search?: string }} [params={}] - Optional query parameters.
 * @returns {Promise<object[]>} Array of camelCase contact objects.
 */
export async function getContacts({ search } = {}) {
  const url = new URL(BASE_URL, 'http://localhost');
  if (search) {
    url.searchParams.set('search', search);
  }
  const data = await apiFetch(`${BASE_URL}${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  return data.map(toCamel);
}

/**
 * Fetch a single contact by its ID.
 * @param {number} id - The contact ID.
 * @returns {Promise<object>} A camelCase contact object.
 */
export async function getContact(id) {
  const data = await apiFetch(`${BASE_URL}/${id}`);
  return toCamel(data);
}

/**
 * Create a new contact.
 * @param {object} contact - Contact data with camelCase keys (firstName, lastName required).
 * @returns {Promise<object>} The newly created camelCase contact object.
 */
export async function createContact(contact) {
  const data = await apiFetch(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(toSnake(contact)),
  });
  return toCamel(data);
}

/**
 * Partially update an existing contact.
 * @param {number} id - The contact ID to update.
 * @param {object} contact - Partial contact data with camelCase keys.
 * @returns {Promise<object>} The updated camelCase contact object.
 */
export async function updateContact(id, contact) {
  const data = await apiFetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toSnake(contact)),
  });
  return toCamel(data);
}

/**
 * Delete a contact by its ID.
 * @param {number} id - The contact ID to delete.
 * @returns {Promise<{ deleted: boolean }>} Confirmation object.
 */
export async function deleteContact(id) {
  const data = await apiFetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  return data;
}
