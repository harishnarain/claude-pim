/**
 * Unit tests for the Contact model (server/models/contact.js).
 * Uses an in-memory SQLite database via the db helper.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb, runMigrations } from '../../server/db.js';
import { create, findAll, findById, update, destroy } from '../../server/models/contact.js';

/**
 * Set up a fresh in-memory database with migrations applied before each test.
 * Tear it down after each test to keep tests isolated.
 */
beforeEach(() => {
  const db = getDb();
  runMigrations(db);
});

afterEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM contacts').run();
  closeDb();
});

describe('create()', () => {
  it('inserts a contact and returns the full row', () => {
    const contact = create({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      phone: null,
      company: 'Analytical Engine Co.',
      notes: 'Pioneer',
    });

    expect(contact).toBeDefined();
    expect(contact.id).toBeTypeOf('number');
    expect(contact.first_name).toBe('Ada');
    expect(contact.last_name).toBe('Lovelace');
    expect(contact.email).toBe('ada@example.com');
    expect(contact.company).toBe('Analytical Engine Co.');
    expect(contact.notes).toBe('Pioneer');
    expect(contact.created_at).toBeDefined();
    expect(contact.updated_at).toBeDefined();
  });

  it('stores null for optional fields when omitted', () => {
    const contact = create({ first_name: 'Alan', last_name: 'Turing' });
    expect(contact.email).toBeNull();
    expect(contact.phone).toBeNull();
    expect(contact.company).toBeNull();
    expect(contact.notes).toBeNull();
  });
});

describe('findAll()', () => {
  beforeEach(() => {
    create({ first_name: 'Charles', last_name: 'Babbage', email: 'babbage@example.com' });
    create({ first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' });
    create({ first_name: 'Alan', last_name: 'Turing', email: 'turing@example.com' });
  });

  it('returns all contacts', () => {
    const contacts = findAll();
    expect(contacts.length).toBe(3);
  });

  it('sorts results by last_name ASC, first_name ASC', () => {
    const contacts = findAll();
    expect(contacts[0].last_name).toBe('Babbage');
    expect(contacts[1].last_name).toBe('Lovelace');
    expect(contacts[2].last_name).toBe('Turing');
  });

  it('filters by first_name with search param', () => {
    const contacts = findAll({ search: 'Ada' });
    expect(contacts.length).toBe(1);
    expect(contacts[0].first_name).toBe('Ada');
  });

  it('filters by last_name with search param', () => {
    const contacts = findAll({ search: 'Turing' });
    expect(contacts.length).toBe(1);
    expect(contacts[0].last_name).toBe('Turing');
  });

  it('filters by email with search param', () => {
    const contacts = findAll({ search: 'babbage@example.com' });
    expect(contacts.length).toBe(1);
    expect(contacts[0].last_name).toBe('Babbage');
  });

  it('returns empty array when search matches nothing', () => {
    const contacts = findAll({ search: 'nonexistent' });
    expect(contacts.length).toBe(0);
  });

  it('returns all contacts when search is an empty string', () => {
    const contacts = findAll({ search: '' });
    expect(contacts.length).toBe(3);
  });

  it('is case-insensitive for search', () => {
    const contacts = findAll({ search: 'turing' });
    expect(contacts.length).toBe(1);
    expect(contacts[0].last_name).toBe('Turing');
  });
});

describe('findById()', () => {
  it('returns the correct contact when found', () => {
    const created = create({ first_name: 'Grace', last_name: 'Hopper' });
    const found = findById(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
    expect(found.last_name).toBe('Hopper');
  });

  it('returns undefined for a non-existent id', () => {
    const found = findById(999999);
    expect(found).toBeUndefined();
  });
});

describe('update()', () => {
  it('updates specified fields and returns the updated row', () => {
    const contact = create({ first_name: 'Grace', last_name: 'Hopper', email: 'grace@example.com' });
    const updated = update(contact.id, { email: 'hopper@navy.mil', company: 'US Navy' });

    expect(updated.email).toBe('hopper@navy.mil');
    expect(updated.company).toBe('US Navy');
    expect(updated.first_name).toBe('Grace');
    expect(updated.last_name).toBe('Hopper');
  });

  it('updates the updated_at timestamp', () => {
    const contact = create({ first_name: 'Grace', last_name: 'Hopper' });
    const updated = update(contact.id, { notes: 'COBOL inventor' });
    expect(updated.updated_at).toBeDefined();
  });

  it('returns undefined when id does not exist', () => {
    const result = update(999999, { first_name: 'Nobody' });
    expect(result).toBeUndefined();
  });

  it('returns the unchanged contact when no valid fields are provided', () => {
    const contact = create({ first_name: 'Grace', last_name: 'Hopper' });
    const result = update(contact.id, {});
    expect(result.id).toBe(contact.id);
    expect(result.first_name).toBe('Grace');
  });
});

describe('destroy()', () => {
  it('deletes the contact and returns { deleted: true }', () => {
    const contact = create({ first_name: 'Grace', last_name: 'Hopper' });
    const result = destroy(contact.id);
    expect(result).toEqual({ deleted: true });
    expect(findById(contact.id)).toBeUndefined();
  });

  it('returns { deleted: false } when id does not exist', () => {
    const result = destroy(999999);
    expect(result).toEqual({ deleted: false });
  });
});
