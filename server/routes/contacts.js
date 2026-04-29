/**
 * Express router for the /api/contacts resource.
 * Implements all five REST endpoints: list, get-one, create, update, delete.
 * @module routes/contacts
 */

import { Router } from 'express';
import * as Contact from '../models/contact.js';
import logger from '../logger.js';

const router = Router();

/** @type {RegExp} Basic email format validator (server-side). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate contact input fields. Returns a map of field -> error message for
 * any fields that fail validation, or an empty object if all is valid.
 * @param {{ first_name?: unknown, last_name?: unknown, email?: unknown }} fields - Request body fields to validate.
 * @param {boolean} [requireNames=true] - Whether first_name and last_name are required.
 * @returns {Record<string, string>} Map of field name to error message.
 */
function validateFields(fields, requireNames = true) {
  const errors = {};

  if (requireNames) {
    if (!fields.first_name || String(fields.first_name).trim() === '') {
      errors.first_name = 'required';
    }
    if (!fields.last_name || String(fields.last_name).trim() === '') {
      errors.last_name = 'required';
    }
  }

  if (fields.email !== undefined && fields.email !== null && fields.email !== '') {
    if (!EMAIL_REGEX.test(String(fields.email))) {
      errors.email = 'invalid email format';
    }
  }

  return errors;
}

/**
 * Build a successful response envelope.
 * @param {unknown} data - The response payload.
 * @param {object|null} [meta=null] - Optional metadata (e.g. count).
 * @returns {{ data: unknown, error: null, meta: object|null }} Envelope object.
 */
function ok(data, meta = null) {
  return { data, error: null, meta };
}

/**
 * Build an error response envelope.
 * @param {string} code - Machine-readable error code (e.g. 'NOT_FOUND').
 * @param {Record<string, string>|null} [fields=null] - Per-field validation errors.
 * @returns {{ data: null, error: { code: string, fields?: Record<string, string> }, meta: null }} Envelope object.
 */
function fail(code, fields = null) {
  const error = { code };
  if (fields) {
    error.fields = fields;
  }
  return { data: null, error, meta: null };
}

/**
 * GET /api/contacts
 * List all contacts, optionally filtered by ?search= query param.
 */
router.get('/', (req, res) => {
  const { search } = req.query;
  const contacts = Contact.findAll({ search: search ?? undefined });
  logger.info(`GET /api/contacts — returned ${contacts.length} record(s)`);
  res.status(200).json(ok(contacts, { count: contacts.length }));
});

/**
 * GET /api/contacts/:id
 * Retrieve a single contact by its integer ID.
 */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const contact = Contact.findById(id);

  if (!contact) {
    logger.warn(`GET /api/contacts/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  logger.info(`GET /api/contacts/${id} — found`);
  res.status(200).json(ok(contact));
});

/**
 * POST /api/contacts
 * Create a new contact. first_name and last_name are required.
 */
router.post('/', (req, res) => {
  const { first_name, last_name, email, phone, company, notes } = req.body ?? {};

  const errors = validateFields({ first_name, last_name, email });

  if (Object.keys(errors).length > 0) {
    logger.warn('POST /api/contacts — validation error');
    return res.status(422).json(fail('VALIDATION_ERROR', errors));
  }

  const contact = Contact.create({ first_name, last_name, email, phone, company, notes });
  logger.info(`POST /api/contacts — created id=${contact.id}`);
  res.status(201).json(ok(contact));
});

/**
 * PATCH /api/contacts/:id
 * Partially update an existing contact. Validates any provided fields.
 */
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const existing = Contact.findById(id);

  if (!existing) {
    logger.warn(`PATCH /api/contacts/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const { first_name, last_name, email, phone, company, notes } = req.body ?? {};

  // Validate only the fields that were provided; names are not required for partial update.
  const fieldsToValidate = {};
  if (first_name !== undefined) fieldsToValidate.first_name = first_name;
  if (last_name !== undefined) fieldsToValidate.last_name = last_name;
  if (email !== undefined) fieldsToValidate.email = email;

  // If provided, first_name / last_name must not be empty strings.
  const errors = {};
  if (fieldsToValidate.first_name !== undefined && String(fieldsToValidate.first_name).trim() === '') {
    errors.first_name = 'required';
  }
  if (fieldsToValidate.last_name !== undefined && String(fieldsToValidate.last_name).trim() === '') {
    errors.last_name = 'required';
  }
  if (
    fieldsToValidate.email !== undefined &&
    fieldsToValidate.email !== null &&
    fieldsToValidate.email !== '' &&
    !EMAIL_REGEX.test(String(fieldsToValidate.email))
  ) {
    errors.email = 'invalid email format';
  }

  if (Object.keys(errors).length > 0) {
    logger.warn(`PATCH /api/contacts/${id} — validation error`);
    return res.status(422).json(fail('VALIDATION_ERROR', errors));
  }

  const updateFields = {};
  if (first_name !== undefined) updateFields.first_name = first_name;
  if (last_name !== undefined) updateFields.last_name = last_name;
  if (email !== undefined) updateFields.email = email;
  if (phone !== undefined) updateFields.phone = phone;
  if (company !== undefined) updateFields.company = company;
  if (notes !== undefined) updateFields.notes = notes;

  const updated = Contact.update(id, updateFields);
  logger.info(`PATCH /api/contacts/${id} — updated`);
  res.status(200).json(ok(updated));
});

/**
 * DELETE /api/contacts/:id
 * Remove a contact by ID. Returns 404 if the contact does not exist.
 */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json(fail('NOT_FOUND'));
  }

  const existing = Contact.findById(id);

  if (!existing) {
    logger.warn(`DELETE /api/contacts/${id} — not found`);
    return res.status(404).json(fail('NOT_FOUND'));
  }

  Contact.destroy(id);
  logger.info(`DELETE /api/contacts/${id} — deleted`);
  res.status(200).json(ok({ deleted: true }));
});

export default router;
