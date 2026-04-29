/**
 * Unit tests for the SQLite connection helper (server/db.js).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { getDb, closeDb } from '../../server/db.js';

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
