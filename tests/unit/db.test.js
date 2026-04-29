/**
 * Unit tests for the SQLite connection helper and migration runner (server/db.js).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { getDb, closeDb, runMigrations } from '../../server/db.js';

describe('getDb()', () => {
  afterEach(() => {
    closeDb();
  });

  it('returns a Database instance', () => {
    const db = getDb();
    expect(db).toBeDefined();
  });

  it('returns the same singleton instance on repeated calls', () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it('can execute a basic SELECT query', () => {
    const db = getDb();
    const row = db.prepare('SELECT 1 AS value').get();
    expect(row.value).toBe(1);
  });
});

describe('closeDb()', () => {
  it('closes the connection without throwing', () => {
    getDb(); // ensure connection is open
    expect(() => closeDb()).not.toThrow();
  });

  it('is safe to call when no connection is open', () => {
    // closeDb was already called in previous test; calling again should be safe.
    expect(() => closeDb()).not.toThrow();
  });
});

describe('runMigrations()', () => {
  afterEach(() => {
    closeDb();
  });

  it('creates the _migrations table on first run', () => {
    const db = getDb();
    runMigrations(db);
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
      )
      .get();
    expect(row).toBeDefined();
    expect(row.name).toBe('_migrations');
  });

  it('creates the contacts table after applying migration 001', () => {
    const db = getDb();
    runMigrations(db);
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'"
      )
      .get();
    expect(row).toBeDefined();
    expect(row.name).toBe('contacts');
  });

  it('records applied migrations in the _migrations table', () => {
    const db = getDb();
    runMigrations(db);
    const rows = db.prepare('SELECT filename FROM _migrations').all();
    const filenames = rows.map((r) => r.filename);
    expect(filenames).toContain('001_create_contacts.sql');
  });

  it('is idempotent — running again does not throw or duplicate entries', () => {
    const db = getDb();
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
    const rows = db
      .prepare(
        "SELECT COUNT(*) AS cnt FROM _migrations WHERE filename = '001_create_contacts.sql'"
      )
      .get();
    expect(rows.cnt).toBe(1);
  });

  it('creates the idx_contacts_last_name index', () => {
    const db = getDb();
    runMigrations(db);
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_contacts_last_name'"
      )
      .get();
    expect(row).toBeDefined();
    expect(row.name).toBe('idx_contacts_last_name');
  });
});
